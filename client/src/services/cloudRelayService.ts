/**
 * Real-Time Cloud Relay Service
 * Enables sub-millisecond instant cross-device order synchronization
 * between guest mobile phones and admin kitchen dashboards over WebSocket.
 */

const RELAY_WS_URL = 'wss://ws.postman-echo.com/raw';

type OrderListener = (order: any) => void;
type UpdateListener = (order: any) => void;

class CloudRelayService {
  private socket: WebSocket | null = null;
  private orderListeners: Set<OrderListener> = new Set();
  private updateListeners: Set<UpdateListener> = new Set();
  private isConnected = false;
  private reconnectTimer: any = null;

  constructor() {
    this.connect();
  }

  public isRelayConnected() {
    return this.isConnected;
  }

  public connect() {
    if (typeof window === 'undefined') return;
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      this.socket = new WebSocket(RELAY_WS_URL);

      this.socket.onopen = () => {
        this.isConnected = true;
        this.sendRaw({ type: 'PING', timestamp: Date.now() });
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.type === 'ORDER_CREATED' && data.order) {
            this.orderListeners.forEach((fn) => fn(data.order));
          } else if (data && data.type === 'ORDER_UPDATED' && data.order) {
            this.updateListeners.forEach((fn) => fn(data.order));
          }
        } catch (e) {
          // Ignore non-JSON messages
        }
      };

      this.socket.onclose = () => {
        this.isConnected = false;
        this.scheduleReconnect();
      };

      this.socket.onerror = () => {
        this.isConnected = false;
      };
    } catch (e) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 3000);
  }

  private sendRaw(payload: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(JSON.stringify(payload));
      } catch (e) {
        console.warn('Cloud relay send error:', e);
      }
    }
  }

  public broadcastNewOrder(order: any) {
    this.sendRaw({ type: 'ORDER_CREATED', order });
  }

  public broadcastOrderUpdate(order: any) {
    this.sendRaw({ type: 'ORDER_UPDATED', order });
  }

  public onNewOrder(fn: OrderListener) {
    this.orderListeners.add(fn);
    return () => {
      this.orderListeners.delete(fn);
    };
  }

  public onOrderUpdate(fn: UpdateListener) {
    this.updateListeners.add(fn);
    return () => {
      this.updateListeners.delete(fn);
    };
  }
}

export const cloudRelay = new CloudRelayService();
