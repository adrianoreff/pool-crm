import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { AppShell } from "./components/layout/AppShell";
import Dashboard from "./pages/Dashboard";
import Calendar from "./pages/Calendar";
import Appointments from "./pages/Appointments";
import Customers from "./pages/Customers";
import Team from "./pages/Team";
import Services from "./pages/Services";
import ServiceAreas from "./pages/ServiceAreas";
import CallLogs from "./pages/CallLogs";
import Messages from "./pages/Messages";
import Invoices from "./pages/Invoices";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Onboarding from "./pages/Onboarding";
import BookingWidget from "./pages/BookingWidget";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public Widget Route - No auth required */}
            <Route path="/widget/:embedCode" element={<BookingWidget />} />
            
            {/* Public Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            
            {/* Onboarding (authenticated but no business yet) */}
            <Route 
              path="/onboarding" 
              element={
                <ProtectedRoute requiresOnboarding={false}>
                  <Onboarding />
                </ProtectedRoute>
              } 
            />
            
            {/* Protected Routes (require auth + business) */}
            <Route 
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/appointments" element={<Appointments />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/team" element={<Team />} />
              <Route path="/services" element={<Services />} />
              <Route path="/service-areas" element={<ServiceAreas />} />
              <Route path="/calls" element={<CallLogs />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/invoices" element={<Invoices />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
