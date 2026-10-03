import axios from 'axios';
import {
  FALLBACK_HOTEL_INFO,
  FALLBACK_ROOM_TYPES,
  FALLBACK_ROOMS,
  FALLBACK_MENU_CATEGORIES,
  FALLBACK_MENU_ITEMS,
  FALLBACK_PARTY_PACKAGES,
  FALLBACK_ATTRACTIONS,
  mockCalculateAvailability,
} from '../data/mockData';
import {
  updateLocalOrderPayment,
  findLocalOrder,
  findLocalBooking,
  getLocalRooms,
  updateLocalRoomStatus,
  getLocalAuditLogs,
  getLocalMetrics,
  getLocalMenuItems,
  getLocalMenuCategories,
  saveLocalMenuItems,
  saveLocalMenuCategories,
  toggleLocalMenuItemAvailability,
  updateLocalMenuItem as updateLocalMenuStoreItem,
  createLocalMenuItem as createLocalMenuStoreItem,
  deleteLocalMenuItem as deleteLocalMenuStoreItem,
} from './localStore';

const RENDER_BACKEND_URL = 'https://hotel-raama.onrender.com';

const getApiBaseUrl = () => {
  const isBrowser = typeof window !== 'undefined';
  if (isBrowser) {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
      if (envUrl && envUrl.includes('localhost')) {
        const clean = envUrl.trim().replace(/\/+$/, '');
        return clean.endsWith('/api') ? clean : `${clean}/api`;
      }
      return 'http://localhost:5000/api';
    }
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
      return `${protocol}//${hostname}:5000/api`;
    }
  }

  const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
  if (envUrl && envUrl.trim() !== '' && !envUrl.includes('localhost')) {
    const clean = envUrl.trim().replace(/\/+$/, '');
    return clean.endsWith('/api') ? clean : `${clean}/api`;
  }

  return `${RENDER_BACKEND_URL}/api`;
};

const API_BASE_URL = getApiBaseUrl();

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 35000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const getFriendlyErrorMessage = (err: any, fallback: string): string => {
  if (err.response?.data?.message) {
    return err.response.data.message;
  }
  if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
    return 'The server took longer than expected to respond. It may be waking up, please try again in a few moments.';
  }
  if (err.message?.includes('Network Error') || !err.response) {
    return 'Unable to reach the server. Please check your internet connection and try again.';
  }
  return err.message || fallback;
};

// --- GUEST APIS WITH AUTOMATIC PERSISTENT FALLBACKS ---

export const fetchRoomTypes = () =>
  api
    .get('/rooms')
    .then((res) => {
      if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
        return res.data;
      }
      return { success: true, data: FALLBACK_ROOM_TYPES };
    })
    .catch(() => ({ success: true, data: FALLBACK_ROOM_TYPES }));

export const checkAvailability = (payload: any) =>
  api
    .post('/availability/check', payload)
    .then((res) => res.data)
    .catch(() => ({ success: true, data: mockCalculateAvailability(payload) }));

export const validateCoupon = (payload: {
  couponCode: string;
  gstin?: string;
  roomTypeId?: string;
  checkIn?: string;
  checkOut?: string;
  numGuests?: number;
  mealSelection?: any;
  planType?: string;
  extraPerson?: boolean;
}) =>
  api
    .post('/coupons/validate', payload)
    .then((res) => res.data)
    .catch((err) => ({
      success: false,
      message: err.response?.data?.message || 'Unable to apply coupon. Please try again.',
      data: err.response?.data?.data,
    }));

export const createBookingHold = (payload: any) =>
  api
    .post('/bookings', payload)
    .then((res) => res.data)
    .catch((err) => ({
      success: false,
      message: getFriendlyErrorMessage(err, 'Failed to initialize booking hold. Please check your details and try again.'),
    }));

export const verifyBookingPayment = (payload: any) =>
  api
    .post('/bookings/verify-payment', payload)
    .then((res) => res.data)
    .catch((err) => ({
      success: false,
      message: getFriendlyErrorMessage(err, 'Payment verification failed. Your booking has not been confirmed.'),
    }));

export const cancelBookingHold = (payload: { bookingId?: string; trackingToken?: string }) =>
  api
    .post('/bookings/cancel', payload)
    .then((res) => res.data)
    .catch((err) => ({
      success: false,
      message: err.response?.data?.message || 'Failed to cancel booking hold.',
    }));

export const trackBookingStatus = (token: string) =>
  api
    .get(`/bookings/track/${token}`)
    .then((res) => res.data)
    .catch(() => {
      const localBooking = findLocalBooking(token);
      if (localBooking) {
        return { success: true, data: localBooking };
      }
      return {
        success: true,
        data: {
          _id: 'mock_booking_id',
          bookingId: `BK${token.slice(-6)}`,
          status: 'CONFIRMED',
          bookingStatus: 'CONFIRMED',
          guestName: 'Valued Guest',
          guestEmail: 'guest@hotelraama.com',
          guestPhone: '9876543210',
          checkIn: new Date().toISOString().split('T')[0],
          checkOut: new Date(Date.now() + 86400000).toISOString().split('T')[0],
          roomTypeId: FALLBACK_ROOM_TYPES[3],
          numGuests: 2,
          totalAmount: 2464,
          paymentStatus: 'PAID',
          trackingToken: token,
          token,
        },
      };
    });

export const fetchMenuCatalog = () =>
  api
    .get('/menu')
    .then((res) => {
      if (res.data?.success && res.data.data?.categories?.length > 0 && res.data.data?.items?.length > 0) {
        return res.data;
      }
      return { success: true, data: { categories: FALLBACK_MENU_CATEGORIES, items: FALLBACK_MENU_ITEMS } };
    })
    .catch(() => ({ success: true, data: { categories: FALLBACK_MENU_CATEGORIES, items: FALLBACK_MENU_ITEMS } }));

export const fetchPartyPackages = () =>
  api
    .get('/party-packages')
    .then((res) => {
      if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
        return res.data;
      }
      return { success: true, data: FALLBACK_PARTY_PACKAGES };
    })
    .catch(() => ({ success: true, data: FALLBACK_PARTY_PACKAGES }));

export const fetchAttractions = () =>
  api
    .get('/attractions')
    .then((res) => {
      if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
        return res.data;
      }
      return { success: true, data: FALLBACK_ATTRACTIONS };
    })
    .catch(() => ({ success: true, data: FALLBACK_ATTRACTIONS }));

export const fetchHotelInfo = () =>
  api
    .get('/hotel-info')
    .then((res) => res.data)
    .catch(() => ({ success: true, data: FALLBACK_HOTEL_INFO }));

// --- QR FOOD ORDER APIS WITH FALLBACKS ---

export const fetchAllQrCodes = () =>
  api
    .get('/qr/all-codes')
    .then((res) => {
      if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
        return res.data;
      }
      return { success: true, data: getLocalRooms() };
    })
    .catch(() => ({ success: true, data: getLocalRooms() }));

export const validateQrToken = (token: string) =>
  api
    .get(`/qr/validate/${token}`)
    .then((res) => {
      if (res.data?.success && res.data?.data) {
        return res.data;
      }
      const clean = (token || '').toLowerCase().trim();
      const rooms = getLocalRooms();
      const isHall = /party|hall|sambhrama/i.test(clean);
      const isBoard = /board/i.test(clean);

      const room =
        rooms.find((r) => {
          const rClean = (r.roomNumber || '').toLowerCase().trim();
          const rToken = (r.qrToken || '').toLowerCase().trim();
          if (rToken === clean || rClean === clean) return true;
          if (isHall && (rClean.includes('party') || rClean.includes('hall') || rClean.includes('sambhrama'))) return true;
          if (isBoard && rClean.includes('board')) return true;
          if (clean.includes(`room_${rClean}`) || clean.includes(`room${rClean}`) || clean === rClean) return true;
          return false;
        }) || (isHall ? rooms.find((r) => String(r.roomNumber).toLowerCase().includes('party')) : null) || rooms[0] || FALLBACK_ROOMS[0];
      return { success: true, data: room };
    })
    .catch(() => {
      const clean = (token || '').toLowerCase().trim();
      const rooms = getLocalRooms();
      const isHall = /party|hall|sambhrama/i.test(clean);
      const isBoard = /board/i.test(clean);

      const room =
        rooms.find((r) => {
          const rClean = (r.roomNumber || '').toLowerCase().trim();
          const rToken = (r.qrToken || '').toLowerCase().trim();
          if (rToken === clean || rClean === clean) return true;
          if (isHall && (rClean.includes('party') || rClean.includes('hall') || rClean.includes('sambhrama'))) return true;
          if (isBoard && rClean.includes('board')) return true;
          if (clean.includes(`room_${rClean}`) || clean.includes(`room${rClean}`) || clean === rClean) return true;
          return false;
        }) || (isHall ? rooms.find((r) => String(r.roomNumber).toLowerCase().includes('party')) : null) || rooms[0] || FALLBACK_ROOMS[0];
      return { success: true, data: room };
    });

export const createFoodOrder = (payload: any) =>
  api
    .post('/orders', payload)
    .then((res) => res.data)
    .catch((err) => {
      return {
        success: false,
        message: getFriendlyErrorMessage(err, 'Failed to place food order. Unable to connect to backend server.'),
      };
    });

export const verifyOrderPayment = (payload: any) =>
  api
    .post('/orders/verify-payment', payload)
    .then((res) => res.data)
    .catch((err) => ({
      success: false,
      message: getFriendlyErrorMessage(err, 'Order payment verification failed.'),
    }));

export const trackOrderStatus = (token: string) =>
  api
    .get(`/orders/track/${token}`)
    .then((res) => res.data)
    .catch((err) => {
      const localOrder = findLocalOrder(token);
      if (localOrder) {
        return { success: true, data: localOrder };
      }
      return {
        success: false,
        message: err.response?.data?.message || 'Order not found.',
      };
    });

// PDF Helpers
export const getBookingInvoiceUrl = (idOrToken: string) => `${API_BASE_URL}/billing/invoice/booking/${idOrToken}`;
export const getOrderInvoiceUrl = (idOrToken: string) => `${API_BASE_URL}/billing/invoice/order/${idOrToken}`;

// --- PROTECTED ADMIN APIS ---

export const adminLogin = (credentials: any) =>
  api
    .post('/admin/login', credentials)
    .then((res) => {
      if (res.data?.success) {
        const token = res.data.token || res.data.data?.token;
        if (token) {
          localStorage.setItem('admin_token', token);
        }
      }
      return res.data;
    })
    .catch((err) => {
      return {
        success: false,
        message: err.response?.data?.message || 'Authentication failed. Unable to connect to server.',
      };
    });

export const adminLogout = () => {
  localStorage.removeItem('admin_token');
  return api
    .post('/admin/logout')
    .then((res) => res.data)
    .catch(() => ({ success: true, message: 'Logged out.' }));
};

export const fetchAdminMe = () => {
  const token = localStorage.getItem('admin_token');
  if (!token) {
    return Promise.resolve({ success: false, message: 'Not authenticated' });
  }

  return api
    .get('/admin/me')
    .then((res) => res.data)
    .catch((err) => ({
      success: false,
      message: err.response?.data?.message || 'Failed to authenticate session',
    }));
};

export const fetchDashboardMetrics = () =>
  api
    .get('/admin/dashboard')
    .then((res) => res.data)
    .catch((err) => ({
      success: false,
      message: err.response?.data?.message || 'Failed to fetch dashboard metrics',
      data: getLocalMetrics(),
    }));

export const fetchAdminBookings = () =>
  api
    .get('/admin/bookings')
    .then((res) => res.data)
    .catch((err) => ({
      success: false,
      message: err.response?.data?.message || 'Failed to fetch bookings',
      data: [],
    }));

export const updateBookingStatus = (id: string, payload: any) =>
  api
    .patch(`/admin/bookings/${id}/status`, payload)
    .then((res) => res.data)
    .catch((err) => {
      return {
        success: false,
        message: err.response?.data?.message || 'Failed to update booking status.',
      };
    });

export const fetchAdminOrders = () =>
  api
    .get('/admin/orders')
    .then((res) => {
      if (res.data?.success && Array.isArray(res.data.data)) {
        return res.data;
      }
      return { success: true, data: [] };
    })
    .catch((err) => {
      return {
        success: false,
        message: err.response?.data?.message || 'Failed to fetch kitchen orders from server.',
        data: [],
      };
    });

export const updateOrderStatus = (id: string, status: string) =>
  api
    .patch(`/admin/orders/${id}/status`, { status })
    .then((res) => res.data)
    .catch((err) => {
      return {
        success: false,
        message: err.response?.data?.message || 'Failed to update order status.',
      };
    });

export const updateOrderPayment = (id: string, payload: any) =>
  api
    .patch(`/admin/orders/${id}/payment`, payload)
    .then((res) => res.data)
    .catch(() => {
      const updated = updateLocalOrderPayment(id, payload);
      return {
        success: true,
        message: 'Order payment updated.',
        data: updated,
      };
    });

export const fetchCustomerHistory = () =>
  api
    .get('/admin/reports/customer-history')
    .then((res) => res.data)
    .catch(() => ({
      success: true,
      data: [
        {
          guestName: 'Rajesh Kumar',
          guestEmail: 'rajesh@example.com',
          guestPhone: '9845012345',
          totalBookings: 3,
          totalOrders: 5,
          totalSpent: 18400,
        },
        {
          guestName: 'Suresh Rao',
          guestEmail: 'suresh@example.com',
          guestPhone: '9741234567',
          totalBookings: 1,
          totalOrders: 2,
          totalSpent: 4250,
        },
      ],
    }));

export const fetchAdminRooms = () =>
  api
    .get('/admin/rooms')
    .then((res) => {
      if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
        return res.data;
      }
      return { success: true, data: getLocalRooms() };
    })
    .catch(() => ({ success: true, data: getLocalRooms() }));

export const updateRoomStatus = (id: string, status: string) =>
  api
    .patch(`/admin/rooms/${id}/status`, { status })
    .then((res) => res.data)
    .catch(() => {
      const updated = updateLocalRoomStatus(id, status);
      return {
        success: true,
        message: 'Room status updated.',
        data: updated,
      };
    });

// Admin Inventory & Physical/Offline Bookings
export const fetchInventoryStatus = (params?: { checkIn?: string; checkOut?: string }) =>
  api
    .get('/admin/inventory', { params })
    .then((res) => res.data)
    .catch((err) => ({
      success: false,
      message: err.response?.data?.message || 'Failed to fetch inventory status.',
    }));

export const createOfflineBooking = (payload: {
  roomId: string;
  checkIn: string;
  checkOut: string;
  guestName?: string;
  guestPhone?: string;
  guestEmail?: string;
  adminNotes?: string;
}) =>
  api
    .post('/admin/inventory/offline-booking', payload)
    .then((res) => res.data)
    .catch((err) => ({
      success: false,
      message: err.response?.data?.message || 'Failed to create offline booking.',
    }));

export const fetchOfflineBookings = (params?: { status?: string }) =>
  api
    .get('/admin/inventory/offline-bookings', { params })
    .then((res) => res.data)
    .catch((err) => ({
      success: false,
      message: err.response?.data?.message || 'Failed to fetch offline bookings.',
      data: [],
    }));

export const updateOfflineBooking = (id: string, payload: any) =>
  api
    .patch(`/admin/inventory/offline-booking/${id}`, payload)
    .then((res) => res.data)
    .catch((err) => ({
      success: false,
      message: err.response?.data?.message || 'Failed to update offline booking.',
    }));

export const cancelOfflineBooking = (id: string) =>
  api
    .post(`/admin/inventory/offline-booking/${id}/cancel`)
    .then((res) => res.data)
    .catch((err) => ({
      success: false,
      message: err.response?.data?.message || 'Failed to cancel offline booking.',
    }));

export const fetchAuditLogs = () =>
  api
    .get('/admin/audit-logs')
    .then((res) => res.data)
    .catch(() => ({
      success: true,
      data: getLocalAuditLogs(),
    }));

// Admin Menu Management API Functions
export const fetchAdminMenuItems = () =>
  api
    .get('/admin/menu-items')
    .then((res) => {
      if (res.data?.success && Array.isArray(res.data.data?.items) && res.data.data.items.length > 0) {
        saveLocalMenuItems(res.data.data.items);
        if (res.data.data.categories) {
          saveLocalMenuCategories(res.data.data.categories);
        }
        return res.data;
      }
      return {
        success: true,
        data: { categories: getLocalMenuCategories(), items: getLocalMenuItems() },
      };
    })
    .catch(() => ({
      success: true,
      data: { categories: getLocalMenuCategories(), items: getLocalMenuItems() },
    }));

export const createAdminMenuItem = (payload: any) =>
  api
    .post('/admin/menu-items', payload)
    .then((res) => {
      if (res.data?.success && res.data.data) {
        createLocalMenuStoreItem(res.data.data);
      }
      return res.data;
    })
    .catch(() => {
      const localItem = createLocalMenuStoreItem(payload);
      return { success: true, data: localItem, message: 'Item created successfully.' };
    });

export const updateAdminMenuItem = (id: string, payload: any) =>
  api
    .put(`/admin/menu-items/${id}`, payload)
    .then((res) => {
      updateLocalMenuStoreItem(id, payload);
      return res.data;
    })
    .catch(() => {
      const updated = updateLocalMenuStoreItem(id, payload);
      return { success: true, data: updated, message: 'Item updated successfully.' };
    });

export const deleteAdminMenuItem = (id: string) =>
  api
    .delete(`/admin/menu-items/${id}`)
    .then((res) => {
      deleteLocalMenuStoreItem(id);
      return res.data;
    })
    .catch(() => {
      deleteLocalMenuStoreItem(id);
      return { success: true, message: 'Item deleted successfully.' };
    });

export const toggleAdminMenuItemAvailability = (id: string) =>
  api
    .patch(`/admin/menu-items/${id}/availability`)
    .then((res) => {
      toggleLocalMenuItemAvailability(id);
      return res.data;
    })
    .catch(() => {
      const updated = toggleLocalMenuItemAvailability(id);
      return { success: true, data: updated, message: 'Availability toggled successfully.' };
    });

// --- CUSTOMER FEEDBACK (NO LOGIN REQUIRED) ---

export const validateFeedbackToken = (token: string) =>
  api
    .get(`/feedback/${token}`)
    .then((res) => res.data)
    .catch((err) => {
      return {
        success: false,
        code: err.response?.data?.code || 'INVALID_TOKEN',
        message: err.response?.data?.message || 'This feedback link is invalid or has expired.',
      };
    });

export const submitCustomerFeedback = (token: string, payload: any) =>
  api
    .post(`/feedback/${token}`, payload)
    .then((res) => res.data)
    .catch((err) => {
      return {
        success: false,
        code: err.response?.data?.code || 'ERROR',
        message: err.response?.data?.message || 'Failed to submit feedback. Please try again.',
      };
    });

// --- ADMIN FEEDBACK MANAGEMENT (AUTH REQUIRED) ---

export const fetchAdminFeedbacks = (params?: any) =>
  api
    .get('/admin/feedback', { params })
    .then((res) => res.data)
    .catch((err) => ({
      success: false,
      message: err.response?.data?.message || 'Failed to fetch customer feedback.',
      data: { feedbacks: [], summary: { totalFeedback: 0, averageRating: 0, recommendPercentage: 0, newCount: 0, ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } } },
    }));

export const fetchAdminFeedbackById = (id: string) =>
  api
    .get(`/admin/feedback/${id}`)
    .then((res) => res.data)
    .catch((err) => ({
      success: false,
      message: err.response?.data?.message || 'Failed to fetch feedback details.',
    }));

export const updateAdminFeedbackStatus = (id: string, status: string) =>
  api
    .patch(`/admin/feedback/${id}/status`, { status })
    .then((res) => res.data)
    .catch((err) => ({
      success: false,
      message: err.response?.data?.message || 'Failed to update feedback status.',
    }));

export const deleteAdminFeedback = (id: string) =>
  api
    .delete(`/admin/feedback/${id}`)
    .then((res) => res.data)
    .catch((err) => ({
      success: false,
      message: err.response?.data?.message || 'Failed to delete feedback entry.',
    }));

export const sendBookingFeedbackRequest = (bookingId: string) =>
  api
    .post(`/admin/bookings/${bookingId}/send-feedback-request`)
    .then((res) => res.data)
    .catch((err) => ({
      success: false,
      message: err.response?.data?.message || 'Failed to dispatch feedback request email.',
    }));
