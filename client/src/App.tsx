import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ScrollToTop } from './components/ScrollToTop';
import { SEO } from './components/SEO';

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
import { CustomerFeedbackPage } from './pages/CustomerFeedbackPage';

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
import { AdminFeedbackView } from './pages/admin/AdminFeedbackView';

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
              <Route path="feedback" element={<AdminFeedbackView />} />
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
