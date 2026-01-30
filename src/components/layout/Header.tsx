import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, Menu, User, Settings, LogOut, ChevronDown, AlertCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { useNotificationCounts } from '@/hooks/useNotificationCounts';

interface HeaderProps {
  onMenuClick: () => void;
  sidebarCollapsed: boolean;
}

export function Header({ onMenuClick, sidebarCollapsed }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { totalCount, problemAppointments, pendingAppointments } = useNotificationCounts();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const userInitials = profile 
    ? `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || profile.email[0]}`.toUpperCase()
    : 'U';

  return (
    <header
      className={cn(
        'fixed right-0 top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 transition-all duration-300 lg:px-6',
        sidebarCollapsed ? 'left-[72px]' : 'left-[280px]',
        'max-lg:left-0'
      )}
    >
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle menu</span>
      </Button>

      {/* Search Bar */}
      <div className="flex-1 max-w-xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search customers, appointments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Notifications */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {totalCount > 0 && (
                <Badge 
                  className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-primary text-primary-foreground"
                >
                  {totalCount}
                </Badge>
              )}
              <span className="sr-only">Notifications</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="border-b px-4 py-3">
              <h3 className="font-semibold">Notifications</h3>
            </div>
            <ScrollArea className="h-[300px]">
              <div className="divide-y">
                {totalCount === 0 ? (
                  <div className="px-4 py-8 text-center text-muted-foreground text-sm">
                    No notifications
                  </div>
                ) : (
                  <>
                    {problemAppointments.length > 0 && (
                      <div className="py-2">
                        <div className="px-4 py-1.5 text-xs font-medium text-muted-foreground flex items-center gap-1">
                          <AlertCircle className="h-3.5 w-3.5" />
                          Reported problems
                        </div>
                        {problemAppointments.slice(0, 5).map((apt) => {
                          const name = apt.customer ? `${apt.customer.first_name || ''} ${apt.customer.last_name || ''}`.trim() || 'Customer' : 'Customer';
                          return (
                            <button
                              key={apt.id}
                              type="button"
                              className="w-full px-4 py-2.5 text-left text-sm hover:bg-muted/50 flex items-center justify-between gap-2"
                              onClick={() => navigate(`/appointments?problem=1`)}
                            >
                              <span className="truncate">{apt.ref_code || apt.id.slice(0, 8)} – {name}</span>
                            </button>
                          );
                        })}
                        {problemAppointments.length > 5 && (
                          <div className="px-4 py-1 text-xs text-muted-foreground">
                            +{problemAppointments.length - 5} more
                          </div>
                        )}
                      </div>
                    )}
                    {pendingAppointments.length > 0 && (
                      <div className="py-2">
                        <div className="px-4 py-1.5 text-xs font-medium text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          Pending confirmation
                        </div>
                        {pendingAppointments.slice(0, 5).map((apt) => {
                          const name = apt.customer ? `${apt.customer.first_name || ''} ${apt.customer.last_name || ''}`.trim() || 'Customer' : 'Customer';
                          return (
                            <button
                              key={apt.id}
                              type="button"
                              className="w-full px-4 py-2.5 text-left text-sm hover:bg-muted/50 flex items-center justify-between gap-2"
                              onClick={() => navigate('/appointments?status=pending_confirmation')}
                            >
                              <span className="truncate">{apt.ref_code || apt.id.slice(0, 8)} – {name}</span>
                            </button>
                          );
                        })}
                        {pendingAppointments.length > 5 && (
                          <div className="px-4 py-1 text-xs text-muted-foreground">
                            +{pendingAppointments.length - 5} more
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </ScrollArea>
            <div className="border-t p-2">
              <Button variant="ghost" size="sm" className="w-full text-sm" onClick={() => navigate('/appointments')}>
                View all appointments
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col items-start">
                <span className="text-sm font-medium">
                  {profile?.first_name || 'User'} {profile?.last_name || ''}
                </span>
                <span className="text-xs text-muted-foreground capitalize">
                  {profile?.role || 'member'}
                </span>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground hidden md:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{profile?.first_name || 'User'} {profile?.last_name || ''}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {profile?.email}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-destructive focus:text-destructive"
              onClick={handleSignOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
