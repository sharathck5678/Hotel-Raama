/**
 * Local In-Memory Event Dispatcher (Decommissioned external relay)
 * All real-time synchronization is handled natively by the backend Socket.IO service.
 */

type OrderListener = (order: any) => void;
type UpdateListener = (order: any) => void;

class CloudRelayService {
  private orderListeners: Set<OrderListener> = new Set();
  private updateListeners: Set<UpdateListener> = new Set();

  public isRelayConnected() {
    return false;
  }

  public connect() {
    // No-op: Native Socket.IO handles all real-time order tracking
  }

  public broadcastNewOrder(order: any) {
    this.orderListeners.forEach((fn) => fn(order));
  }

  public broadcastOrderUpdate(order: any) {
    this.updateListeners.forEach((fn) => fn(order));
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

