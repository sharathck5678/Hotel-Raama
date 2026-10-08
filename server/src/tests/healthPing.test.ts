import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { app, httpServer } from '../index';
import mongoose from 'mongoose';

describe('Hotel Raama Health & Keep-Alive Ping Tests', () => {
  let server: http.Server;
  let baseUrl: string;

  before(async () => {
    await new Promise<void>((resolve) => {
      server = http.createServer(app);
      server.listen(0, '127.0.0.1', () => {
        const address = server.address() as any;
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    // Wait briefly for any background async startup tasks to complete cleanly
    await new Promise((r) => setTimeout(r, 400));
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    });
    await mongoose.connection.close();
    setTimeout(() => process.exit(0), 50);
  });

  it('1. GET /api/health/ping returns HTTP 200 with { status: "ok" }', async () => {
    const res = await fetch(`${baseUrl}/api/health/ping`);
    assert.equal(res.status, 200);

    const body = await res.json() as any;
    assert.deepEqual(body, { status: 'ok' });
  });

  it('2. GET /api/health/ping executes with ZERO MongoDB queries', async () => {
    let queryExecuted = false;
    const originalFindOne = mongoose.Model.findOne;
    const originalFind = mongoose.Model.find;

    (mongoose.Model as any).findOne = function () {
      queryExecuted = true;
      return originalFindOne.apply(this, arguments as any);
    };
    (mongoose.Model as any).find = function () {
      queryExecuted = true;
      return originalFind.apply(this, arguments as any);
    };

    try {
      const res = await fetch(`${baseUrl}/api/health/ping`);
      assert.equal(res.status, 200);
      assert.equal(queryExecuted, false, 'No MongoDB queries should be executed on /api/health/ping');
    } finally {
      mongoose.Model.findOne = originalFindOne;
      mongoose.Model.find = originalFind;
    }
  });

  it('3. GET /health preserves existing backend & database health check', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.status === 200 || res.status === 503, true);

    const body = await res.json() as any;
    assert.equal(typeof body.status, 'string');
    assert.equal(typeof body.database, 'string');
    assert.equal(body.service, 'Hotel Raama Backend API');
  });

  it('4. GET /api/health mirrors the full backend & database health check', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status === 200 || res.status === 503, true);

    const body = await res.json() as any;
    assert.equal(typeof body.status, 'string');
    assert.equal(typeof body.database, 'string');
    assert.equal(body.service, 'Hotel Raama Backend API');
  });
});
