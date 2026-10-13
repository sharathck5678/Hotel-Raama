import crypto from 'crypto';
import { DistributedLock } from '../models/DistributedLock';

/**
 * Keyed In-Memory Async Lock / Mutex for serializing tasks within a single Node.js process.
 */
export class KeyedAsyncLock {
  private queue = new Map<string, Promise<void>>();

  async acquire<T>(key: string, task: () => Promise<T>): Promise<T> {
    const currentPromise = this.queue.get(key) || Promise.resolve();

    let release: () => void = () => {};
    const taskPromise = new Promise<void>((resolve) => {
      release = resolve;
    });

    // Chain the task to the current queue for this key
    const newQueuePromise = currentPromise.then(
      () => taskPromise,
      () => taskPromise
    );
    this.queue.set(key, newQueuePromise);

    try {
      await currentPromise;
      return await task();
    } finally {
      release();
      if (this.queue.get(key) === newQueuePromise) {
        this.queue.delete(key);
      }
    }
  }
}

export interface LockOptions {
  ttlMs?: number;            // Lock lease duration before auto-expiry (default: 15000 ms)
  timeoutMs?: number;        // Maximum time to wait for lock acquisition (default: 10000 ms)
  retryDelayMs?: number;     // Delay between polling attempts (default: 50 ms)
  useInMemory?: boolean;     // Whether to also coordinate via in-memory lock (default: true)
  enableHeartbeat?: boolean; // Whether to periodically extend lease while task runs (default: true)
}

export interface LockContext {
  owner: string;
  fenceTokens: Map<string, number>;
  assertHeld: () => Promise<void>;
  assertFenceValid: (specificKeys?: string | string[]) => Promise<void>;
}

export type LockTask<T> = (context: LockContext) => Promise<T>;

/**
 * Distributed Lock Manager backed by MongoDB with atomic locking, auto-expiration,
 * lease renewal (heartbeat), fencing token tracking, deadlock prevention via canonical
 * key sorting, and local in-memory queuing.
 */
export class DistributedLockManager {
  private inMemoryLock: KeyedAsyncLock;
  public readonly instanceId: string;

  constructor(options?: { instanceId?: string; inMemoryLock?: KeyedAsyncLock }) {
    this.inMemoryLock = options?.inMemoryLock || new KeyedAsyncLock();
    this.instanceId = options?.instanceId || `inst-${process.pid}-${crypto.randomBytes(4).toString('hex')}`;
  }

  /**
   * Atomically try to acquire a lock key in MongoDB.
   * Returns whether acquired, and the associated fenceToken.
   */
  async tryAcquireKey(key: string, owner: string, ttlMs: number): Promise<{ acquired: boolean; fenceToken: number }> {
    const expiresAt = new Date(Date.now() + ttlMs);
    try {
      const doc = await DistributedLock.create({
        _id: key,
        owner,
        expiresAt,
        fenceToken: 1,
      });
      return { acquired: true, fenceToken: doc.fenceToken || 1 };
    } catch (err: any) {
      if (err?.code === 11000) {
        // Document already exists. Check if it has expired or is already held by this owner.
        const now = new Date();
        const updated = await DistributedLock.findOneAndUpdate(
          {
            _id: key,
            $or: [
              { expiresAt: { $lte: now } },
              { owner },
            ],
          },
          {
            $set: {
              owner,
              expiresAt,
            },
            $inc: {
              fenceToken: 1,
            },
          },
          { new: true }
        );
        return { acquired: !!updated, fenceToken: updated?.fenceToken || 0 };
      }
      throw err;
    }
  }

  /**
   * Repeatedly try to acquire a lock key until acquired or timeout expires.
   */
  async acquireKeyWithRetry(
    key: string,
    owner: string,
    ttlMs: number,
    timeoutMs: number,
    retryDelayMs: number
  ): Promise<number> {
    const start = Date.now();
    let attempts = 0;
    while (Date.now() - start < timeoutMs) {
      attempts++;
      const result = await this.tryAcquireKey(key, owner, ttlMs);
      if (result.acquired) {
        return result.fenceToken;
      }
      const elapsed = Date.now() - start;
      const remaining = timeoutMs - elapsed;
      if (remaining <= 0) break;
      await new Promise((resolve) => setTimeout(resolve, Math.min(retryDelayMs, remaining)));
    }
    throw new Error(`Lock acquisition timed out for key "${key}" after ${Date.now() - start}ms (${attempts} attempts)`);
  }

  /**
   * Atomically release a lock key in MongoDB if owned by the specified owner.
   */
  async releaseKey(key: string, owner: string): Promise<void> {
    try {
      await DistributedLock.deleteOne({ _id: key, owner });
    } catch (err) {
      console.error(`[DistributedLock] Error releasing lock "${key}":`, err);
    }
  }

  /**
   * Assert that the lock keys are still actively held by the given owner and not expired.
   * Throws an Error if any key was lost, expired, or overtaken by another worker.
   */
  async assertLockHeld(keys: string | string[], owner: string): Promise<void> {
    const keyArray = (Array.isArray(keys) ? keys : [keys]).filter(Boolean);
    if (keyArray.length === 0) return;
    const now = new Date();
    const activeCount = await DistributedLock.countDocuments({
      _id: { $in: keyArray },
      owner,
      expiresAt: { $gt: now },
    });
    if (activeCount !== keyArray.length) {
      throw new Error(
        `[DistributedLock] Lock lease expired or lost for keys: [${keyArray.join(', ')}]. Stale write prevented.`
      );
    }
  }

  /**
   * Atomically verifies that the lock keys are held by the owner with their unexpired leases
   * and expected fencing tokens. Performs an atomic conditional update on MongoDB.
   * Throws an Error if any key was lost, expired, or superseded by another owner/token.
   */
  async assertFenceValid(
    keys: string | string[],
    owner: string,
    fenceTokens: Map<string, number>
  ): Promise<void> {
    const keyArray = (Array.isArray(keys) ? keys : [keys]).filter(Boolean);
    if (keyArray.length === 0) return;
    const now = new Date();

    for (const key of keyArray) {
      const expectedToken = fenceTokens.get(key);
      const query: any = {
        _id: key,
        owner,
        expiresAt: { $gt: now },
      };
      if (expectedToken !== undefined) {
        query.fenceToken = expectedToken;
      }

      const match = await DistributedLock.findOneAndUpdate(
        query,
        { $set: { updatedAt: new Date() } },
        { new: true }
      );

      if (!match) {
        throw new Error(
          `[DistributedLock] Fencing validation failed for key "${key}". Lock lease expired or superseded (owner: ${owner}, expected token: ${expectedToken}). Stale write prevented.`
        );
      }
    }
  }

  /**
   * Acquire one or more lock keys in canonical sorted order (preventing deadlocks)
   * and execute the provided task with optional heartbeat auto-renewal and stale-write assertions.
   */
  async withLock<T>(
    keys: string | string[],
    task: LockTask<T>,
    options?: LockOptions
  ): Promise<T> {
    const keyArray = (Array.isArray(keys) ? keys : [keys]).filter(Boolean);
    const context: LockContext = {
      owner: `${this.instanceId}:${crypto.randomBytes(6).toString('hex')}`,
      fenceTokens: new Map<string, number>(),
      assertHeld: async () => {},
      assertFenceValid: async () => {},
    };

    if (keyArray.length === 0) {
      return await task(context);
    }

    // Sort keys canonically to strictly eliminate deadlocks across multiple resources
    const sortedKeys = Array.from(new Set(keyArray)).sort();
    const ttlMs = options?.ttlMs ?? 15000;
    const timeoutMs = options?.timeoutMs ?? 10000;
    const retryDelayMs = options?.retryDelayMs ?? 50;
    const useInMemory = options?.useInMemory ?? true;
    const enableHeartbeat = options?.enableHeartbeat ?? true;
    const owner = context.owner;

    context.assertHeld = () => this.assertLockHeld(sortedKeys, owner);
    context.assertFenceValid = (specificKeys?: string | string[]) =>
      this.assertFenceValid(specificKeys || sortedKeys, owner, context.fenceTokens);

    const runDistributed = async (): Promise<T> => {
      const acquiredKeys: string[] = [];
      let heartbeatTimer: NodeJS.Timeout | null = null;
      let isTaskActive = true;

      try {
        for (const key of sortedKeys) {
          const token = await this.acquireKeyWithRetry(key, owner, ttlMs, timeoutMs, retryDelayMs);
          acquiredKeys.push(key);
          context.fenceTokens.set(key, token);
        }

        // Background heartbeat to automatically renew lease while task is actively running
        if (enableHeartbeat && acquiredKeys.length > 0) {
          const heartbeatIntervalMs = Math.max(500, Math.floor(ttlMs / 3));
          heartbeatTimer = setInterval(async () => {
            if (!isTaskActive) return;
            try {
              await DistributedLock.updateMany(
                { _id: { $in: acquiredKeys }, owner },
                { $set: { expiresAt: new Date(Date.now() + ttlMs) } }
              );
            } catch (err) {
              console.warn(`[DistributedLock] Heartbeat lease renewal notice for owner ${owner}:`, err);
            }
          }, heartbeatIntervalMs);
        }

        return await task(context);
      } finally {
        isTaskActive = false;
        if (heartbeatTimer) {
          clearInterval(heartbeatTimer);
        }
        // Release MongoDB locks in reverse acquisition order
        for (const key of acquiredKeys.reverse()) {
          await this.releaseKey(key, owner);
        }
      }
    };

    if (!useInMemory) {
      return await runDistributed();
    }

    // Recursively acquire in-memory locks for sorted keys
    const acquireInMemory = async (index: number): Promise<T> => {
      if (index >= sortedKeys.length) {
        return await runDistributed();
      }
      return await this.inMemoryLock.acquire(sortedKeys[index], () => acquireInMemory(index + 1));
    };

    return await acquireInMemory(0);
  }
}

export const distributedLock = new DistributedLockManager();
export const withDistributedLock = distributedLock.withLock.bind(distributedLock);

/**
 * Backward compatibility alias for roomReassignmentLock.
 * Routes through the distributedLock instance to ensure cross-process safety.
 */
export const roomReassignmentLock = {
  acquire: <T>(key: string, task: () => Promise<T>): Promise<T> => {
    return distributedLock.withLock(key, task);
  },
};
