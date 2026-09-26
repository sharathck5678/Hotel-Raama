"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketService = void 0;
const socket_io_1 = require("socket.io");
const corsConfig_1 = require("../utils/corsConfig");
let io = null;
class SocketService {
    static init(httpServer, clientUrl) {
        io = new socket_io_1.Server(httpServer, {
            cors: {
                origin: (origin, callback) => {
                    if ((0, corsConfig_1.isOriginAllowed)(origin)) {
                        callback(null, true);
                    }
                    else {
                        callback(new Error(`CORS blocked for origin: ${origin}`));
                    }
                },
                methods: ['GET', 'POST'],
                credentials: true,
            },
        });
        io.on('connection', (socket) => {
            console.log(`[Socket.IO] Client connected: ${socket.id}`);
            socket.on('join_admin_room', () => {
                socket.join('admin_kitchen_channel');
                console.log(`[Socket.IO] Client ${socket.id} joined admin_kitchen_channel`);
            });
            socket.on('join_guest_order', (trackingToken) => {
                socket.join(`order_${trackingToken}`);
                console.log(`[Socket.IO] Client ${socket.id} joined room order_${trackingToken}`);
            });
            socket.on('disconnect', () => {
                console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
            });
        });
        return io;
    }
    static emitNewOrder(orderData) {
        if (io) {
            io.to('admin_kitchen_channel').emit('new_order', orderData);
        }
    }
    static emitOrderStatusUpdate(trackingToken, updatedOrder) {
        if (io) {
            io.to(`order_${trackingToken}`).emit('order_status_changed', updatedOrder);
            io.to('admin_kitchen_channel').emit('order_updated', updatedOrder);
        }
    }
}
exports.SocketService = SocketService;
