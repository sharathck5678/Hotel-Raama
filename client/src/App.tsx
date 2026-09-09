import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ScrollToTop } from './components/ScrollToTop';

// Guest Pages
import { HomePage } from './pages/HomePage';
import { RoomsPage } from './pages/RoomsPage';
import { BookingConfirmationPage } from './pages/BookingConfirmationPage';
import { DiningPage } from './pages/DiningPage';
import { PartyHallPage } from './pages/PartyHallPage';
import { AttractionsPage } from './pages/AttractionsPage';
import { LocationPage } from './pages/LocationPage';
import { MyBookingsOrdersPage } from './pages/MyBookingsOrdersPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { TermsOfBookingPage } from './pages/TermsOfBookingPage';

// QR Order Pages
import { QrOrderingSectionPage } from './pages/QrOrderingSectionPage';
import { QrOrderPage } from './pages/QrOrderPage';
import { OrderTrackingPage } from './pages/OrderTrackingPage';

// Admin Pages
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { ProtectedAdminRoute } from './pages/admin/ProtectedAdminRoute';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminDashboardView } from './pages/admin/AdminDashboardView';
import { AdminOrdersView } from './pages/admin/AdminOrdersView';
import { AdminMenuView } from './pages/admin/AdminMenuView';
import { AdminBookingsView } from './pages/admin/AdminBookingsView';
import { AdminRoomsView } from './pages/admin/AdminRoomsView';
import { AdminCustomerHistoryView } from './pages/admin/AdminCustomerHistoryView';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <ScrollToTop />
      <Toaster position="top-right" theme="dark" richColors />
      <div className="flex flex-col min-h-screen">
        <Navbar />

        <main className="flex-grow">
          <Routes>
            {/* Public Guest Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/rooms" element={<RoomsPage />} />
            <Route path="/booking/confirmation/:token" element={<BookingConfirmationPage />} />
            <Route path="/dining" element={<DiningPage />} />
            <Route path="/party-hall" element={<PartyHallPage />} />
            <Route path="/attractions" element={<AttractionsPage />} />
            <Route path="/location" element={<LocationPage />} />
            <Route path="/my-bookings-orders" element={<MyBookingsOrdersPage />} />
            <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
            <Route path="/terms-of-booking" element={<TermsOfBookingPage />} />

            {/* Room QR Scan & Tracking Routes for Guests */}
            <Route path="/order/:token" element={<QrOrderPage />} />
            <Route path="/track-order/:token" element={<OrderTrackingPage />} />

            {/* Admin Login */}
            <Route path="/admin/login" element={<AdminLoginPage />} />

            {/* Protected Admin Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedAdminRoute>
                  <AdminLayout />
                </ProtectedAdminRoute>
              }
            >
              <Route index element={<AdminDashboardView />} />
              <Route path="orders" element={<AdminOrdersView />} />
              <Route path="menu" element={<AdminMenuView />} />
              <Route path="bookings" element={<AdminBookingsView />} />
              <Route path="rooms" element={<AdminRoomsView />} />
              <Route path="qr-codes" element={<QrOrderingSectionPage />} />
              <Route path="customers" element={<AdminCustomerHistoryView />} />
            </Route>
          </Routes>
        </main>

        <Footer />
      </div>
    </ThemeProvider>
  );
};

export default App;
