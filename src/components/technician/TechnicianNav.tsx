import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, History } from 'lucide-react';
import { cn } from '@/lib/utils';

export function TechnicianNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    {
      label: 'Dashboard',
      icon: LayoutDashboard,
      path: '/technician/dashboard',
    },
    {
      label: 'Jobs',
      icon: ClipboardList,
      path: '/technician/jobs',
    },
    {
      label: 'History',
      icon: History,
      path: '/technician/history',
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background">
      <div className="container mx-auto">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || 
              (item.path !== '/technician/dashboard' && location.pathname.startsWith(item.path));
            
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors',
                  isActive
                    ? 'text-[#F97316]'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
