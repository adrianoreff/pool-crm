import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface TechnicianRouteGuardProps {
  children: React.ReactNode;
}

export function TechnicianRouteGuard({ children }: TechnicianRouteGuardProps) {
  const { user, loading, profile } = useAuth();

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
    return <Navigate to="/technician/login" replace />;
  }

  // Allow access if user is technician or admin
  if (profile) {
    if (profile.role === 'technician' || profile.role === 'admin' || profile.role === 'owner') {
      return <>{children}</>;
    }
  }

  // If not technician or admin, redirect to login
  return <Navigate to="/technician/login" replace />;
}
