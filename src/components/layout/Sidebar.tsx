import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Wrench,
  LayoutDashboard,
  Calendar,
  ClipboardList,
  Users,
  UserCog,
  Briefcase,
  MapPin,
  Phone,
  MessageSquare,
  Receipt,
  BarChart3,
  Settings,
  Mail,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';
import { useNotificationOptional } from '@/contexts/NotificationContext';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

const mainNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Calendar', href: '/calendar', icon: Calendar },
  { label: 'Appointments', href: '/appointments', icon: ClipboardList },
  { label: 'Customers', href: '/customers', icon: Users },
];

const operationsNavItems: NavItem[] = [
  { label: 'Team', href: '/team', icon: UserCog },
  { label: 'Services', href: '/services', icon: Briefcase },
  { label: 'Service Areas', href: '/service-areas', icon: MapPin },
];

const communicationNavItemsBase: Omit<NavItem, 'badge'>[] = [
  { label: 'Call Logs', href: '/calls', icon: Phone },
  { label: 'Messages', href: '/messages', icon: MessageSquare },
];

const businessNavItems: NavItem[] = [
  { label: 'Invoices', href: '/invoices', icon: Receipt },
  { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  { label: 'Email Templates', href: '/email-templates', icon: Mail },
  { label: 'Settings', href: '/settings', icon: Settings },
];

const adminToolsNavItems: NavItem[] = [
  { label: 'Tech Portal', href: '/technician/dashboard', icon: Wrench },
];

const NavSection = ({ 
  title, 
  items, 
  collapsed 
}: { 
  title: string; 
  items: NavItem[]; 
  collapsed: boolean;
}) => {
  const location = useLocation();

  return (
    <div className="mb-6">
      {!collapsed && (
        <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-muted">
          {title}
        </h3>
      )}
      <nav className="space-y-1">
        {items.map((item) => {
          const isActive = location.pathname === item.href || 
            (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
          
          const linkContent = (
            <NavLink
              to={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                collapsed && 'justify-center px-2'
              )}
            >
              <item.icon className={cn('h-5 w-5 flex-shrink-0', isActive && 'text-sidebar-primary-foreground')} />
              {!collapsed && (
                <>
                  <span className="flex-1">{item.label}</span>
                  {item.badge && item.badge > 0 && (
                    <Badge 
                      variant="secondary" 
                      className="bg-sidebar-primary/20 text-sidebar-primary-foreground hover:bg-sidebar-primary/30"
                    >
                      {item.badge}
                    </Badge>
                  )}
                </>
              )}
            </NavLink>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.href} delayDuration={0}>
                <TooltipTrigger asChild>
                  {linkContent}
                </TooltipTrigger>
                <TooltipContent side="right" className="flex items-center gap-2">
                  {item.label}
                  {item.badge && item.badge > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {item.badge}
                    </Badge>
                  )}
                </TooltipContent>
              </Tooltip>
            );
          }

          return <div key={item.href}>{linkContent}</div>;
        })}
      </nav>
    </div>
  );
};

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { business } = useAuth();
  const notification = useNotificationOptional();
  const messagesUnread = notification?.totalChatUnread ?? 0;
  const communicationNavItems: NavItem[] = communicationNavItemsBase.map((item) =>
    item.label === 'Messages'
      ? { ...item, badge: messagesUnread > 0 ? messagesUnread : undefined }
      : { ...item }
  );

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col bg-sidebar transition-all duration-300',
        collapsed ? 'w-[72px]' : 'w-[280px]'
      )}
    >
      {/* Logo Section */}
      <div className={cn(
        'flex h-16 items-center border-b border-sidebar-border px-4',
        collapsed && 'justify-center px-2'
      )}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg overflow-hidden bg-primary">
            {business?.logo_url ? (
              <img src={business.logo_url} alt="" className="h-full w-full object-contain" />
            ) : (
              <Wrench className="h-5 w-5 text-primary-foreground" />
            )}
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-lg font-bold text-sidebar-foreground truncate">{business?.name || 'TradeFlow'}</span>
              <span className="text-xs text-sidebar-muted">CRM</span>
            </div>
          )}
        </div>
      </div>

      {/* Business name (when logo section shows TradeFlow) */}
      {!collapsed && business && !business.logo_url && (
        <div className="border-b border-sidebar-border px-4 py-3">
          <p className="truncate text-sm font-medium text-sidebar-foreground">
            {business.name}
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <NavSection title="Main" items={mainNavItems} collapsed={collapsed} />
        <NavSection title="Operations" items={operationsNavItems} collapsed={collapsed} />
        <NavSection title="Communication" items={communicationNavItems} collapsed={collapsed} />
        <NavSection title="Business" items={businessNavItems} collapsed={collapsed} />
        <NavSection title="Admin Tools" items={adminToolsNavItems} collapsed={collapsed} />
      </div>

      {/* Collapse Toggle */}
      <div className="border-t border-sidebar-border p-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className={cn(
            'w-full justify-center text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground',
            !collapsed && 'justify-start'
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              <span>Collapse</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
