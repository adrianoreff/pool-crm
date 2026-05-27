import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { TechnicianRouteGuard } from "./components/auth/TechnicianRouteGuard";
import { AppShell } from "./components/layout/AppShell";
import { TechnicianLayout } from "./components/layout/TechnicianLayout";
import Dashboard from "./pages/Dashboard";
import Calendar from "./pages/Calendar";
import Appointments from "./pages/Appointments";
import Customers from "./pages/Customers";
import CustomerDetail from "./pages/CustomerDetail";
import Team from "./pages/Team";
import Services from "./pages/Services";
import ServiceAreas from "./pages/ServiceAreas";
import CallLogs from "./pages/CallLogs";
import Messages from "./pages/Messages";
import Invoices from "./pages/Invoices";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import EmailTemplates from "./pages/EmailTemplates";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Onboarding from "./pages/Onboarding";
import BookingWidget from "./pages/BookingWidget";
import NotFound from "./pages/NotFound";
import TechnicianLogin from "./pages/technician/Login";
import TechnicianDashboard from "./pages/technician/Dashboard";
import RouteDay from "./pages/technician/RouteDay";
import JobsList from "./pages/technician/JobsList";
import JobDetails from "./pages/technician/JobDetails";
import JobChecklist from "./pages/technician/JobChecklist";
import CompleteJob from "./pages/technician/CompleteJob";
import VisitFinish from "./pages/technician/VisitFinish";
import JobProblem from "./pages/technician/JobProblem";
import History from "./pages/technician/History";
import Profile from "./pages/technician/Profile";
import Routes from "./pages/Routes";
import RoutesMap from "./pages/RoutesMap";
import PoolChemistrySettings from "./pages/PoolChemistrySettings";
import AdminPanel from "./pages/AdminPanel";

const queryClient = new QueryClient();

function RootRedirect() {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab');
  if (tab === 'today' || tab === 'setup') {
    return <Navigate to={`/routes?tab=${tab}`} replace />;
  }
  return <Navigate to="/dashboard" replace />;
}

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
            <Route path="/reset-password" element={<ResetPassword />} />
            
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
                <ProtectedRoute allowedRoles={['owner', 'admin', 'dispatcher']}>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<RootRedirect />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/appointments" element={<Appointments />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/customers/:id" element={<CustomerDetail />} />
              <Route path="/team" element={<Team />} />
              <Route path="/services" element={<Services />} />
              <Route path="/service-areas" element={<ServiceAreas />} />
              <Route path="/calls" element={<CallLogs />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/invoices" element={<Invoices />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/email-templates" element={<EmailTemplates />} />
              <Route path="/routes" element={<Routes />} />
              <Route path="/routes/dashboard" element={<Navigate to="/routes?tab=today" replace />} />
              <Route path="/routes/manage" element={<Navigate to="/routes?tab=setup" replace />} />
              <Route path="/routes/map" element={<RoutesMap />} />
              <Route path="/pool/chemistry" element={<PoolChemistrySettings />} />
              <Route path="/admin/panel" element={<AdminPanel />} />
            </Route>

            {/* Technician Routes */}
            <Route path="/technician/login" element={<TechnicianLogin />} />
            <Route 
              element={
                <TechnicianRouteGuard>
                  <TechnicianLayout />
                </TechnicianRouteGuard>
              }
            >
              <Route path="/technician/dashboard" element={<TechnicianDashboard />} />
              <Route path="/technician/route/:date" element={<RouteDay />} />
              <Route path="/technician/jobs" element={<JobsList />} />
              <Route path="/technician/jobs/:id" element={<JobDetails />} />
              <Route path="/technician/jobs/:id/checklist" element={<JobChecklist />} />
              <Route path="/technician/jobs/:id/complete" element={<VisitFinish />} />
              <Route path="/technician/jobs/:id/finish" element={<VisitFinish />} />
              <Route path="/technician/jobs/:id/problem" element={<JobProblem />} />
              <Route path="/technician/history" element={<History />} />
              <Route path="/technician/profile" element={<Profile />} />
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
