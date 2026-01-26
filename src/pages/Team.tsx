import { useState } from 'react';
import { 
  Plus, 
  MoreHorizontal,
  Phone,
  Mail,
  UserPlus,
  Grid,
  List,
  Calendar,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useTeam } from '@/hooks/useTeam';
import { useAppointments } from '@/hooks/useAppointments';
import { User as UserType } from '@/types/database';
import { InviteTeamModal } from '@/components/modals';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

type ViewMode = 'grid' | 'list';

const statusStyles = {
  available: { bg: 'bg-success/10', text: 'text-success', label: 'Available' },
  on_job: { bg: 'bg-primary/10', text: 'text-primary', label: 'On Job' },
  off: { bg: 'bg-muted', text: 'text-muted-foreground', label: 'Off' },
  break: { bg: 'bg-warning/10', text: 'text-warning', label: 'On Break' },
};

const roleStyles = {
  owner: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  admin: 'bg-primary/10 text-primary border-primary/20',
  technician: 'bg-info/10 text-info border-info/20',
  dispatcher: 'bg-accent text-accent-foreground',
};

const getInitials = (firstName: string | null, lastName: string | null) => {
  return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || 'U';
};

interface TeamMemberCardProps {
  member: UserType;
  todayJobs: number;
  onViewProfile: () => void;
  onEdit: () => void;
  onViewSchedule: () => void;
  onDeactivate: () => void;
}

function TeamMemberCard({ member, todayJobs, onViewProfile, onEdit, onViewSchedule, onDeactivate }: TeamMemberCardProps) {
  const status = statusStyles.available;

  return (
    <Card className="shadow-card hover:shadow-elevated transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <Avatar className="h-16 w-16 cursor-pointer" onClick={onViewProfile}>
            <AvatarFallback 
              className="text-lg text-white font-medium"
              style={{ backgroundColor: member.color || '#888' }}
            >
              {getInitials(member.first_name, member.last_name)}
            </AvatarFallback>
          </Avatar>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onViewProfile}>View Profile</DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
              <DropdownMenuItem onClick={onViewSchedule}>View Schedule</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={onDeactivate}>
                Deactivate
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="space-y-3">
          <div>
            <h3 className="font-semibold text-lg cursor-pointer hover:text-primary" onClick={onViewProfile}>
              {member.first_name} {member.last_name}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge 
                variant="outline" 
                className={cn('capitalize text-xs', roleStyles[member.role])}
              >
                {member.role}
              </Badge>
              <div className={cn(
                'flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium',
                status.bg, status.text
              )}>
                <span className={cn('w-1.5 h-1.5 rounded-full', status.text.replace('text-', 'bg-'))} />
                {status.label}
              </div>
            </div>
          </div>
          
          <div className="text-sm text-muted-foreground space-y-1">
            <p className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5" />
              {member.phone || 'No phone'}
            </p>
            <p className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5" />
              <span className="truncate">{member.email}</span>
            </p>
          </div>
          
          {member.role === 'technician' && (
            <div className="pt-3 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Today's Jobs</span>
                <span className="font-semibold">{todayJobs}</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TeamMemberProfileSheet({ member, open, onOpenChange }: { member: UserType | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  if (!member) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Team Member Profile</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarFallback 
                className="text-2xl text-white font-medium"
                style={{ backgroundColor: member.color || '#888' }}
              >
                {getInitials(member.first_name, member.last_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-semibold">{member.first_name} {member.last_name}</h2>
              <Badge variant="outline" className={cn('capitalize', roleStyles[member.role])}>
                {member.role}
              </Badge>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold mb-2">Contact Information</h3>
              <Card>
                <CardContent className="p-4 space-y-2">
                  <p className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    {member.email}
                  </p>
                  <p className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    {member.phone || 'No phone'}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function Team() {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<UserType | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [memberToDeactivate, setMemberToDeactivate] = useState<UserType | null>(null);
  
  const { data: team = [], isLoading } = useTeam();
  const today = new Date().toISOString().split('T')[0];
  const { data: todayAppointments = [] } = useAppointments({ dateFrom: today, dateTo: today });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Count jobs per technician
  const jobsByTechnician = todayAppointments.reduce((acc, apt) => {
    if (apt.technician_id && apt.status !== 'cancelled') {
      acc[apt.technician_id] = (acc[apt.technician_id] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const activeToday = team.filter(m => m.is_active).length;
  const onJobsNow = Object.keys(jobsByTechnician).length;

  const stats = [
    { label: 'Total Team', value: team.length },
    { label: 'Active Today', value: activeToday },
    { label: 'On Jobs Now', value: onJobsNow },
  ];

  const handleViewProfile = (member: UserType) => {
    setSelectedMember(member);
    setIsProfileOpen(true);
  };

  const handleEdit = (member: UserType) => {
    setSelectedMember(member);
    // For now, we'll show the profile - you could create an EditTeamMemberModal
    setIsProfileOpen(true);
  };

  const handleViewSchedule = (member: UserType) => {
    // Navigate to calendar filtered by this technician
    toast({ title: 'View Schedule', description: `Viewing schedule for ${member.first_name}` });
  };

  const handleDeactivate = async () => {
    if (!memberToDeactivate) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: false })
        .eq('id', memberToDeactivate.id);

      if (error) throw error;

      toast({ title: 'Success', description: `${memberToDeactivate.first_name} has been deactivated` });
      queryClient.invalidateQueries({ queryKey: ['team'] });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setMemberToDeactivate(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team</h1>
          <p className="text-muted-foreground">Manage your team members and their schedules</p>
        </div>
        <Button className="gap-2 bg-primary hover:bg-primary-hover" onClick={() => setIsInviteOpen(true)}>
          <UserPlus className="h-4 w-4" />
          Invite Team Member
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="shadow-card">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-bold">{isLoading ? '-' : stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* View Toggle */}
      <div className="flex justify-end">
        <div className="flex rounded-lg border p-1">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="shadow-card">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <Skeleton className="h-16 w-16 rounded-full" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                  <Skeleton className="h-5 w-32 mb-2" />
                  <div className="flex gap-2 mb-3">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                  <Skeleton className="h-4 w-28 mb-1" />
                  <Skeleton className="h-4 w-36" />
                </CardContent>
              </Card>
            ))
          ) : team.length === 0 ? (
            <Card className="col-span-full shadow-card">
              <CardContent className="p-12 text-center">
                <User className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No team members yet</p>
                <Button onClick={() => setIsInviteOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite Your First Team Member
                </Button>
              </CardContent>
            </Card>
          ) : (
            team.map((member) => (
              <TeamMemberCard 
                key={member.id} 
                member={member} 
                todayJobs={jobsByTechnician[member.id] || 0}
                onViewProfile={() => handleViewProfile(member)}
                onEdit={() => handleEdit(member)}
                onViewSchedule={() => handleViewSchedule(member)}
                onDeactivate={() => setMemberToDeactivate(member)}
              />
            ))
          )}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <Card className="shadow-card">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Phone</TableHead>
                  <TableHead className="text-center hidden sm:table-cell">Today</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-full" /><div><Skeleton className="h-4 w-24 mb-1" /><Skeleton className="h-3 w-32" /></div></div></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell className="text-center hidden sm:table-cell"><Skeleton className="h-6 w-8 mx-auto" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                    </TableRow>
                  ))
                ) : (
                  team.map((member) => {
                    const status = statusStyles.available;
                    const todayJobs = jobsByTechnician[member.id] || 0;
                    
                    return (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleViewProfile(member)}>
                            <Avatar className="h-10 w-10">
                              <AvatarFallback 
                                className="text-sm text-white font-medium"
                                style={{ backgroundColor: member.color || '#888' }}
                              >
                                {getInitials(member.first_name, member.last_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium hover:text-primary">
                                {member.first_name} {member.last_name}
                              </p>
                              <p className="text-sm text-muted-foreground">{member.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={cn('capitalize', roleStyles[member.role])}
                          >
                            {member.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className={cn(
                            'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
                            status.bg, status.text
                          )}>
                            <span className={cn('w-1.5 h-1.5 rounded-full', status.text.replace('text-', 'bg-'))} />
                            {status.label}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {member.phone || 'No phone'}
                        </TableCell>
                        <TableCell className="text-center hidden sm:table-cell">
                          {member.role === 'technician' ? (
                            <Badge variant="secondary">{todayJobs}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewProfile(member)}>View Profile</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEdit(member)}>Edit</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleViewSchedule(member)}>View Schedule</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" onClick={() => setMemberToDeactivate(member)}>
                                Deactivate
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <InviteTeamModal 
        open={isInviteOpen} 
        onOpenChange={setIsInviteOpen} 
      />

      <TeamMemberProfileSheet 
        member={selectedMember} 
        open={isProfileOpen} 
        onOpenChange={setIsProfileOpen} 
      />

      {/* Deactivate Confirmation Dialog */}
      <AlertDialog open={!!memberToDeactivate} onOpenChange={() => setMemberToDeactivate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate {memberToDeactivate?.first_name} {memberToDeactivate?.last_name}? 
              They will no longer have access to the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeactivate} className="bg-destructive text-destructive-foreground">
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
