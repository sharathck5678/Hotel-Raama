import {
  FALLBACK_ROOMS,
  FALLBACK_ROOM_TYPES,
  mockAdminMetrics,
} from '../data/mockData';

const ORDERS_KEY = 'raama_local_orders';
const BOOKINGS_KEY = 'raama_local_bookings';
const ROOMS_KEY = 'raama_local_rooms';
const AUDIT_LOGS_KEY = 'raama_local_audit_logs';

const SEED_ORDERS = [
  {
    _id: 'ord_1',
    orderId: 'ORD88291',
    guestName: 'Suresh Rao',
    guestPhone: '9741234567',
    roomNumber: '108',
    deliveryOption: 'ROOM_SERVICE',
    items: [
      { name: 'Paneer Butter Masala', price: 185, quantity: 1, potionSize: 'Standard' },
      { name: 'Butter Naan', price: 50, quantity: 3, potionSize: 'Standard' },
    ],
    totalAmount: 335,
    status: 'CONFIRMED',
    paymentStatus: 'PAID',
    paymentMethod: 'RAZORPAY',
    trackingToken: 'ORDTRK-88291',
    createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
  },
];

const SEED_BOOKINGS = [
  {
    _id: 'bk_1',
    bookingId: 'BK109482',
    guestName: 'Rajesh Kumar',
    guestEmail: 'rajesh@example.com',
    guestPhone: '9845012345',
    checkIn: '2026-08-28',
    checkOut: '2026-08-30',
    roomTypeId: FALLBACK_ROOM_TYPES[3],
    numGuests: 2,
    totalAmount: 4928,
    status: 'CONFIRMED',
    bookingStatus: 'CONFIRMED',
    paymentStatus: 'PAID',
    trackingToken: 'TRK-109482',
    token: 'TRK-109482',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
  },
];

const SEED_LOGS = [
  {
    _id: 'log_1',
    action: 'SYSTEM_BOOT',
    adminEmail: 'system@hotelraama.com',
    entity: 'Order',
    details: { message: 'Order #ORD88291 created' },
    timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
  },
];

// Helper to safely read from localStorage
const getStored = <T>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.warn(`[LocalStore] Failed to read ${key}:`, e);
    return fallback;
  }
};

// Helper to safely write to localStorage
const setStored = <T>(key: string, data: T) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn(`[LocalStore] Failed to write ${key}:`, e);
  }
};

// --- AUDIT LOGS ---
export const getLocalAuditLogs = () => getStored(AUDIT_LOGS_KEY, SEED_LOGS);

export const addLocalAuditLog = (action: string, entity: string, details: any, adminEmail = 'admin@hotelraama.com') => {
  const logs = getLocalAuditLogs();
  const newLog = {
    _id: `log_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    action,
    entity,
    adminEmail,
    details,
    timestamp: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  const updated = [newLog, ...logs];
  setStored(AUDIT_LOGS_KEY, updated);
  return newLog;
};

// --- ORDERS ---
export const getLocalOrders = (): any[] => {
  return getStored(ORDERS_KEY, SEED_ORDERS);
};

export const saveLocalOrder = (orderData: any) => {
  const orders = getLocalOrders();
  const orderId = orderData.orderId || `ORD${Math.floor(100000 + Math.random() * 900000)}`;
  const trackingToken = orderData.trackingToken || `ORDTRK-${Date.now()}`;
  const _id = orderData._id || `ord_${Date.now()}`;
  
  const newOrder = {
    _id,
    orderId,
    trackingToken,
    guestName: orderData.guestName || 'Guest',
    guestPhone: orderData.guestPhone || '9876543210',
    roomNumber: orderData.roomNumber || '101',
    deliveryOption: orderData.deliveryOption || 'ROOM_SERVICE',
    items: orderData.items || [],
    specialInstructions: orderData.specialInstructions || '',
    totalAmount: orderData.totalAmount || 0,
    status: orderData.status || 'CONFIRMED',
    paymentStatus: orderData.paymentStatus || 'PAID',
    paymentMethod: orderData.paymentMethod || 'RAZORPAY',
    createdAt: orderData.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const updated = [newOrder, ...orders.filter((o) => o._id !== _id && o.orderId !== orderId)];
  setStored(ORDERS_KEY, updated);
  addLocalAuditLog('ORDER_CREATED', 'Order', { orderId, totalAmount: newOrder.totalAmount });
  return newOrder;
};

export const updateLocalOrderStatus = (idOrOrderId: string, newStatus: string) => {
  const orders = getLocalOrders();
  let updatedOrder: any = null;

  const updated = orders.map((ord) => {
    if (ord._id === idOrOrderId || ord.orderId === idOrOrderId || ord.trackingToken === idOrOrderId) {
      updatedOrder = {
        ...ord,
        status: newStatus,
        updatedAt: new Date().toISOString(),
      };
      return updatedOrder;
    }
    return ord;
  });

  if (!updatedOrder) {
    // If not found in local array, create an entry
    updatedOrder = {
      _id: idOrOrderId,
      orderId: idOrOrderId.startsWith('ORD') ? idOrOrderId : 'ORD88291',
      guestName: 'Suresh Rao',
      guestPhone: '9741234567',
      roomNumber: '108',
      deliveryOption: 'ROOM_SERVICE',
      items: [
        { name: 'Paneer Butter Masala', price: 185, quantity: 1, potionSize: 'Standard' },
        { name: 'Butter Naan', price: 50, quantity: 3, potionSize: 'Standard' },
      ],
      totalAmount: 335,
      status: newStatus,
      paymentStatus: 'PAID',
      paymentMethod: 'RAZORPAY',
      trackingToken: 'ORDTRK-88291',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    updated.unshift(updatedOrder);
  }

  setStored(ORDERS_KEY, updated);
  addLocalAuditLog('ORDER_STATUS_UPDATED', 'Order', {
    orderId: updatedOrder.orderId,
    status: newStatus,
  });
  return updatedOrder;
};

export const updateLocalOrderPayment = (idOrOrderId: string, payload: { paymentStatus?: string; paymentMethod?: string }) => {
  const orders = getLocalOrders();
  let updatedOrder: any = null;

  const updated = orders.map((ord) => {
    if (ord._id === idOrOrderId || ord.orderId === idOrOrderId || ord.trackingToken === idOrOrderId) {
      updatedOrder = {
        ...ord,
        paymentStatus: payload.paymentStatus || ord.paymentStatus,
        paymentMethod: payload.paymentMethod || ord.paymentMethod,
        updatedAt: new Date().toISOString(),
      };
      return updatedOrder;
    }
    return ord;
  });

  if (updatedOrder) {
    setStored(ORDERS_KEY, updated);
    addLocalAuditLog('ORDER_PAYMENT_SETTLED', 'Order', {
      orderId: updatedOrder.orderId,
      paymentStatus: updatedOrder.paymentStatus,
      paymentMethod: updatedOrder.paymentMethod,
    });
  }
  return updatedOrder;
};

export const findLocalOrder = (tokenOrId: string) => {
  const orders = getLocalOrders();
  return orders.find(
    (o) =>
      o._id === tokenOrId ||
      o.orderId === tokenOrId ||
      o.trackingToken === tokenOrId ||
      tokenOrId.includes(o.orderId) ||
      (o.trackingToken && tokenOrId.includes(o.trackingToken))
  );
};

// --- BOOKINGS ---
export const getLocalBookings = (): any[] => {
  return getStored(BOOKINGS_KEY, SEED_BOOKINGS);
};

export const saveLocalBooking = (bookingData: any) => {
  const bookings = getLocalBookings();
  const bookingId = bookingData.bookingId || `BK${Math.floor(100000 + Math.random() * 900000)}`;
  const trackingToken = bookingData.trackingToken || `TRK-${Date.now()}`;
  const _id = bookingData._id || `bk_${Date.now()}`;

  const newBooking = {
    _id,
    bookingId,
    trackingToken,
    token: trackingToken,
    guestName: bookingData.guestName || 'Valued Guest',
    guestEmail: bookingData.guestEmail || 'guest@hotelraama.com',
    guestPhone: bookingData.guestPhone || '9876543210',
    checkIn: bookingData.checkIn || new Date().toISOString().split('T')[0],
    checkOut: bookingData.checkOut || new Date(Date.now() + 86400000).toISOString().split('T')[0],
    roomTypeId: bookingData.roomTypeId || FALLBACK_ROOM_TYPES[3],
    numGuests: bookingData.numGuests || 2,
    totalAmount: bookingData.totalAmount || 2464,
    status: bookingData.status || 'CONFIRMED',
    bookingStatus: bookingData.bookingStatus || bookingData.status || 'CONFIRMED',
    paymentStatus: bookingData.paymentStatus || 'PAID',
    createdAt: new Date().toISOString(),
  };

  const updated = [newBooking, ...bookings.filter((b) => b._id !== _id && b.bookingId !== bookingId)];
  setStored(BOOKINGS_KEY, updated);
  addLocalAuditLog('BOOKING_CREATED', 'Booking', { bookingId, totalAmount: newBooking.totalAmount });
  return newBooking;
};

export const updateLocalBookingStatus = (idOrBookingId: string, payload: any) => {
  const bookings = getLocalBookings();
  let updatedBooking: any = null;

  const newStatus = payload.bookingStatus || payload.status || 'CONFIRMED';
  const updated = bookings.map((b) => {
    if (b._id === idOrBookingId || b.bookingId === idOrBookingId || b.trackingToken === idOrBookingId) {
      updatedBooking = {
        ...b,
        status: newStatus,
        bookingStatus: newStatus,
        ...payload,
        updatedAt: new Date().toISOString(),
      };
      return updatedBooking;
    }
    return b;
  });

  if (!updatedBooking) {
    updatedBooking = {
      _id: idOrBookingId,
      bookingId: 'BK109482',
      status: newStatus,
      bookingStatus: newStatus,
      ...payload,
    };
    updated.unshift(updatedBooking);
  }

  setStored(BOOKINGS_KEY, updated);
  addLocalAuditLog('BOOKING_STATUS_UPDATED', 'Booking', {
    bookingId: updatedBooking.bookingId,
    status: newStatus,
  });
  return updatedBooking;
};

export const findLocalBooking = (tokenOrId: string) => {
  const bookings = getLocalBookings();
  return bookings.find(
    (b) =>
      b._id === tokenOrId ||
      b.bookingId === tokenOrId ||
      b.trackingToken === tokenOrId ||
      b.token === tokenOrId ||
      tokenOrId.includes(b.bookingId) ||
      (b.trackingToken && tokenOrId.includes(b.trackingToken))
  );
};

// --- ROOMS ---
export const getLocalRooms = (): any[] => {
  return getStored(ROOMS_KEY, FALLBACK_ROOMS);
};

export const updateLocalRoomStatus = (roomId: string, status: string) => {
  const rooms = getLocalRooms();
  let updatedRoom: any = null;

  const updated = rooms.map((r) => {
    if (r._id === roomId || r.roomNumber === roomId) {
      updatedRoom = { ...r, status, updatedAt: new Date().toISOString() };
      return updatedRoom;
    }
    return r;
  });

  if (!updatedRoom) {
    updatedRoom = { _id: roomId, status };
  }

  setStored(ROOMS_KEY, updated);
  addLocalAuditLog('ROOM_STATUS_UPDATED', 'Room', {
    roomId: updatedRoom.roomNumber || roomId,
    status,
  });
  return updatedRoom;
};

// --- METRICS ---
export const getLocalMetrics = () => {
  const orders = getLocalOrders();
  const rooms = getLocalRooms();
  const bookings = getLocalBookings();

  const occupiedRooms = rooms.filter((r) => r.status === 'OCCUPIED').length;
  const reservedRooms = rooms.filter((r) => r.status === 'RESERVED').length;
  const availableRooms = rooms.filter((r) => r.status === 'AVAILABLE').length;
  const totalRooms = rooms.length || 40;
  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  const pendingOrdersCount = orders.filter(
    (o) => o.status === 'PENDING' || o.status === 'CONFIRMED' || o.status === 'PREPARING'
  ).length;

  const confirmedBookingsCount = bookings.filter(
    (b) => (b.bookingStatus || b.status) === 'CONFIRMED' || (b.bookingStatus || b.status) === 'CHECKED_IN'
  ).length;

  const ordersRevenue = orders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
  const bookingsRevenue = bookings.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);

  return {
    ...mockAdminMetrics,
    totalRooms,
    occupiedRooms,
    reservedRooms,
    availableRooms,
    occupancyRate,
    pendingOrdersCount,
    totalConfirmedBookings: confirmedBookingsCount,
    totalCombinedRevenue: ordersRevenue + bookingsRevenue,
  };
};
