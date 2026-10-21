import { Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Navbar from "./components/Navbar.jsx";
import Footer from "./components/Footer.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import ListingDetail from "./pages/ListingDetail.jsx";
import CreateListing from "./pages/CreateListing.jsx";
import EditListing from "./pages/EditListing.jsx";
import Profile from "./pages/Profile.jsx";
import MyBookings from "./pages/MyBookings.jsx";
import BookingDetail from "./pages/BookingDetail.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import PaymentSettings from "./pages/PaymentSettings.jsx";
import Invoice from "./pages/Invoice.jsx";
import NotFound from "./pages/NotFound.jsx";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Toaster
        position="top-center"
        toastOptions={{
          style: { borderRadius: "12px", fontSize: "14px" },
          success: { iconTheme: { primary: "#0f9d76", secondary: "#fff" } },
        }}
      />
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/listings/:id" element={<ListingDetail />} />

          <Route
            path="/listings/new"
            element={
              <ProtectedRoute role="owner">
                <CreateListing />
              </ProtectedRoute>
            }
          />
          <Route
            path="/listings/:id/edit"
            element={
              <ProtectedRoute role="owner">
                <EditListing />
              </ProtectedRoute>
            }
          />

          <Route
            path="/bookings"
            element={
              <ProtectedRoute role="guest">
                <MyBookings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bookings/:id"
            element={
              <ProtectedRoute>
                <BookingDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bookings/:id/invoice"
            element={
              <ProtectedRoute>
                <Invoice />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute role="owner">
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payment-settings"
            element={
              <ProtectedRoute role="owner">
                <PaymentSettings />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
