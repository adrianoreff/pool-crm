import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiresOnboarding?: boolean;
  allowedRoles?: string[];
}

export function ProtectedRoute({ children, requiresOnboarding = true, allowedRoles }: ProtectedRouteProps) {
  const { user, loading, needsOnboarding, profile } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role-based access control
  if (allowedRoles && profile) {
    if (!allowedRoles.includes(profile.role)) {
      // If technician tries to access admin routes, redirect to technician dashboard
      if (profile.role === 'technician') {
        return <Navigate to="/technician/dashboard" replace />;
      }
      // Otherwise redirect to appropriate dashboard
      return <Navigate to="/dashboard" replace />;
    }
  }

  // If user needs onboarding and we require it, redirect to onboarding
  if (requiresOnboarding && needsOnboarding && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
