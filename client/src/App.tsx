import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ScrollToTop } from './components/ScrollToTop';
import { SEO } from './components/SEO';

// Core Immediate Shell & Home Page (Required for initial customer experience)
import { HomePage } from './pages/HomePage';

// Lazy-loaded Guest Pages
const RoomsPage = React.lazy(() => import('./pages/RoomsPage').then((m) => ({ default: m.RoomsPage })));
const BookingConfirmationPage = React.lazy(() => import('./pages/BookingConfirmationPage').then((m) => ({ default: m.BookingConfirmationPage })));
const DiningPage = React.lazy(() => import('./pages/DiningPage').then((m) => ({ default: m.DiningPage })));
const PartyHallPage = React.lazy(() => import('./pages/PartyHallPage').then((m) => ({ default: m.PartyHallPage })));
const AttractionsPage = React.lazy(() => import('./pages/AttractionsPage').then((m) => ({ default: m.AttractionsPage })));
const LocationPage = React.lazy(() => import('./pages/LocationPage').then((m) => ({ default: m.LocationPage })));
const MyBookingsOrdersPage = React.lazy(() => import('./pages/MyBookingsOrdersPage').then((m) => ({ default: m.MyBookingsOrdersPage })));
const PrivacyPolicyPage = React.lazy(() => import('./pages/PrivacyPolicyPage').then((m) => ({ default: m.PrivacyPolicyPage })));
const TermsOfBookingPage = React.lazy(() => import('./pages/TermsOfBookingPage').then((m) => ({ default: m.TermsOfBookingPage })));
const CustomerFeedbackPage = React.lazy(() => import('./pages/CustomerFeedbackPage').then((m) => ({ default: m.CustomerFeedbackPage })));

// Lazy-loaded QR Order Pages
const QrOrderingSectionPage = React.lazy(() => import('./pages/QrOrderingSectionPage').then((m) => ({ default: m.QrOrderingSectionPage })));
const QrOrderPage = React.lazy(() => import('./pages/QrOrderPage').then((m) => ({ default: m.QrOrderPage })));
const OrderTrackingPage = React.lazy(() => import('./pages/OrderTrackingPage').then((m) => ({ default: m.OrderTrackingPage })));

// Lazy-loaded Admin Pages
const AdminLoginPage = React.lazy(() => import('./pages/admin/AdminLoginPage').then((m) => ({ default: m.AdminLoginPage })));
const ProtectedAdminRoute = React.lazy(() => import('./pages/admin/ProtectedAdminRoute').then((m) => ({ default: m.ProtectedAdminRoute })));
const AdminLayout = React.lazy(() => import('./pages/admin/AdminLayout').then((m) => ({ default: m.AdminLayout })));
const AdminDashboardView = React.lazy(() => import('./pages/admin/AdminDashboardView').then((m) => ({ default: m.AdminDashboardView })));
const AdminOrdersView = React.lazy(() => import('./pages/admin/AdminOrdersView').then((m) => ({ default: m.AdminOrdersView })));
const AdminMenuView = React.lazy(() => import('./pages/admin/AdminMenuView').then((m) => ({ default: m.AdminMenuView })));
const AdminBookingsView = React.lazy(() => import('./pages/admin/AdminBookingsView').then((m) => ({ default: m.AdminBookingsView })));
const AdminInventoryView = React.lazy(() => import('./pages/admin/AdminInventoryView').then((m) => ({ default: m.AdminInventoryView })));
const AdminRoomsView = React.lazy(() => import('./pages/admin/AdminRoomsView').then((m) => ({ default: m.AdminRoomsView })));
const AdminCustomerHistoryView = React.lazy(() => import('./pages/admin/AdminCustomerHistoryView').then((m) => ({ default: m.AdminCustomerHistoryView })));
const AdminFeedbackView = React.lazy(() => import('./pages/admin/AdminFeedbackView').then((m) => ({ default: m.AdminFeedbackView })));

const PageSkeleton: React.FC = () => (
  <div className="min-h-[70vh] max-w-6xl mx-auto px-6 py-12 space-y-8 animate-pulse">
    <div className="h-8 bg-[#E5DBC7] rounded w-1/3 mb-4" />
    <div className="h-4 bg-[#E5DBC7] rounded w-2/3 mb-8" />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="h-64 bg-[#E5DBC7] rounded-sm" />
      <div className="h-64 bg-[#E5DBC7] rounded-sm" />
      <div className="h-64 bg-[#E5DBC7] rounded-sm" />
    </div>
  </div>
);

const NoIndex: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <>
    <SEO
      title="Hotel Raama"
      description="Hotel Raama"
      noindex
    />
    {children}
  </>
);

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <ScrollToTop />
      <Toaster position="top-right" theme="dark" richColors />
      <div className="flex flex-col min-h-screen bg-[#F7F0DF]">
        <Navbar />

        <main className="flex-grow bg-[#F7F0DF]">
          <React.Suspense fallback={<PageSkeleton />}>
            <Routes>
              {/* Public Guest Routes */}
              <Route path="/" element={<HomePage />} />
            <Route path="/rooms" element={<RoomsPage />} />
            <Route
              path="/booking/confirmation/:token"
              element={
                <NoIndex>
                  <BookingConfirmationPage />
                </NoIndex>
              }
            />
            <Route path="/dining" element={<DiningPage />} />
            <Route path="/party-hall" element={<PartyHallPage />} />
            <Route path="/attractions" element={<AttractionsPage />} />
            <Route path="/location" element={<LocationPage />} />
            <Route
              path="/my-bookings-orders"
              element={
                <NoIndex>
                  <MyBookingsOrdersPage />
                </NoIndex>
              }
            />
            <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
            <Route path="/terms-of-booking" element={<TermsOfBookingPage />} />
            <Route
              path="/feedback/:token"
              element={
                <NoIndex>
                  <CustomerFeedbackPage />
                </NoIndex>
              }
            />
            <Route
              path="/feedback"
              element={
                <NoIndex>
                  <CustomerFeedbackPage />
                </NoIndex>
              }
            />

            {/* Room QR Scan & Tracking Routes for Guests */}
            <Route
              path="/order/:token"
              element={
                <NoIndex>
                  <QrOrderPage />
                </NoIndex>
              }
            />
            <Route
              path="/order"
              element={
                <NoIndex>
                  <QrOrderPage />
                </NoIndex>
              }
            />
            <Route
              path="/qr/:token"
              element={
                <NoIndex>
                  <QrOrderPage />
                </NoIndex>
              }
            />
            <Route
              path="/qr"
              element={
                <NoIndex>
                  <QrOrderPage />
                </NoIndex>
              }
            />
            <Route
              path="/menu/:token"
              element={
                <NoIndex>
                  <QrOrderPage />
                </NoIndex>
              }
            />
            <Route
              path="/menu"
              element={
                <NoIndex>
                  <QrOrderPage />
                </NoIndex>
              }
            />
            <Route
              path="/track-order/:token"
              element={
                <NoIndex>
                  <OrderTrackingPage />
                </NoIndex>
              }
            />

            {/* Admin Login */}
            <Route
              path="/admin/login"
              element={
                <NoIndex>
                  <AdminLoginPage />
                </NoIndex>
              }
            />

            {/* Protected Admin Routes */}
            <Route
              path="/admin"
              element={
                <NoIndex>
                  <ProtectedAdminRoute>
                    <AdminLayout />
                  </ProtectedAdminRoute>
                </NoIndex>
              }
            >
              <Route index element={<AdminDashboardView />} />
              <Route path="orders" element={<AdminOrdersView />} />
              <Route path="menu" element={<AdminMenuView />} />
              <Route path="bookings" element={<AdminBookingsView />} />
              <Route path="inventory" element={<AdminInventoryView />} />
              <Route path="inventory/availability" element={<AdminInventoryView initialTab="AVAILABILITY" />} />
              <Route path="inventory/base-rates" element={<AdminInventoryView initialTab="BASE_RATES" />} />
              <Route path="inventory/meal-addons" element={<AdminInventoryView initialTab="MEAL_ADDONS" />} />
              <Route path="feedback" element={<AdminFeedbackView />} />
              <Route path="rooms" element={<AdminRoomsView />} />
              <Route path="qr-codes" element={<QrOrderingSectionPage />} />
              <Route path="customers" element={<AdminCustomerHistoryView />} />
            </Route>
          </Routes>
          </React.Suspense>
        </main>

        <Footer />
      </div>
    </ThemeProvider>
  );
};

export default App;
