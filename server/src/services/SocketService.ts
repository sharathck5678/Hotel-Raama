import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { isOriginAllowed } from '../utils/corsConfig';

let io: SocketIOServer | null = null;

export class SocketService {
  static init(httpServer: HttpServer, clientUrl: string) {
    io = new SocketIOServer(httpServer, {
      cors: {
        origin: (origin, callback) => {
          if (isOriginAllowed(origin)) {
            callback(null, true);
          } else {
            console.warn(`[Socket.IO CORS] Blocked origin: ${origin}`);
            callback(null, false);
          }
        },
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    io.on('connection', (socket: Socket) => {
      console.log(`[Socket.IO] Client connected: ${socket.id}`);

      socket.on('join_admin_room', () => {
        socket.join('admin_kitchen_channel');
        console.log(`[Socket.IO] Client ${socket.id} joined admin_kitchen_channel`);
      });

      socket.on('join_guest_order', (trackingToken: string) => {
        socket.join(`order_${trackingToken}`);
        console.log(`[Socket.IO] Client ${socket.id} joined room order_${trackingToken}`);
      });

      socket.on('disconnect', () => {
        console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
      });
    });

    return io;
  }

  static emitNewOrder(orderData: any) {
    if (io) {
      io.to('admin_kitchen_channel').emit('new_order', orderData);
    }
  }

  static emitOrderStatusUpdate(trackingToken: string, updatedOrder: any) {
    if (io) {
      io.to(`order_${trackingToken}`).emit('order_status_changed', updatedOrder);
      io.to('admin_kitchen_channel').emit('order_updated', updatedOrder);
    }
  }
}
