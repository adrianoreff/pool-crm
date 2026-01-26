import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Calendar,
  ClipboardList,
  Users,
  MoreHorizontal,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Sidebar } from './Sidebar';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

const bottomNavItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Calendar', href: '/calendar', icon: Calendar },
  { label: 'Jobs', href: '/appointments', icon: ClipboardList },
  { label: 'Customers', href: '/customers', icon: Users },
  { label: 'More', href: '#more', icon: MoreHorizontal },
];

export function MobileNav({ isOpen, onClose }: MobileNavProps) {
  const location = useLocation();

  return (
    <>
      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background lg:hidden">
        <div className="flex items-center justify-around">
          {bottomNavItems.map((item) => {
            const isActive = item.href === '#more' 
              ? false 
              : location.pathname === item.href || 
                (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
            
            const isMore = item.href === '#more';

            return (
              <NavLink
                key={item.href}
                to={isMore ? '#' : item.href}
                onClick={(e) => {
                  if (isMore) {
                    e.preventDefault();
                    // This would open the full menu sheet
                  }
                }}
                className={cn(
                  'flex flex-1 flex-col items-center gap-1 py-3 text-xs transition-colors',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <item.icon className={cn('h-5 w-5', isActive && 'text-primary')} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* Full Navigation Sheet */}
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="left" className="w-[280px] p-0">
          <Sidebar collapsed={false} onToggle={() => {}} />
        </SheetContent>
      </Sheet>
    </>
  );
}
