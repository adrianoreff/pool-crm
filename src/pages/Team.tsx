import { useState, useEffect } from 'react';
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
import { Input } from '@/components/ui/input';
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
import { useTeamInvitations } from '@/hooks/useTeamInvitations';
import { ResendInvitationModal } from '@/components/modals/ResendInvitationModal';
import { Clock, RefreshCw, X, ImagePlus, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUpdateTeamMember } from '@/hooks/useTeam';

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
            <AvatarImage src={member.avatar_url || undefined} alt="" />
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
                Delete / Remove from team
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="space-y-3">
          <div>
            <h3 className="font-semibold text-lg cursor-pointer hover:text-primary" onClick={onViewProfile}>
              {member.first_name} {member.last_name}
            </h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge 
                variant="outline" 
                className={cn('capitalize text-xs', roleStyles[member.role])}
              >
                {member.role}
              </Badge>
              <Badge variant="secondary" className="text-xs bg-success/10 text-success border-success/20">
                Accepted
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

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'technician', label: 'Technician' },
  { value: 'dispatcher', label: 'Manager / Dispatcher' },
  { value: 'owner', label: 'Owner' },
];

function TeamMemberProfileSheet({ member, open, onOpenChange }: { member: UserType | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateTeamMember = useUpdateTeamMember();

  useEffect(() => {
    if (member) {
      setFirstName(member.first_name || '');
      setLastName(member.last_name || '');
      setPhone(member.phone || '');
    }
  }, [member]);

  const handleSave = async () => {
    if (!member) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
          phone: phone.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', member.id);

      if (error) throw error;

      toast({ title: 'Success', description: 'Profile updated successfully' });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['team'] });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleRoleChange = (role: string) => {
    if (!member) return;
    updateTeamMember.mutate({ id: member.id, role: role as UserType['role'] });
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !member) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please select an image (PNG, JPG, etc.)', variant: 'destructive' });
      return;
    }
    setPhotoUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `${member.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { cacheControl: '3600', upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      await supabase.from('users').update({ avatar_url: publicUrl, updated_at: new Date().toISOString() }).eq('id', member.id);
      queryClient.invalidateQueries({ queryKey: ['team'] });
      toast({ title: 'Photo updated' });
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err?.message || 'Could not upload. Ensure "avatars" storage bucket exists.', variant: 'destructive' });
    } finally {
      setPhotoUploading(false);
      e.target.value = '';
    }
  };

  if (!member) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Team Member Profile</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-20 w-20">
                <AvatarImage src={member.avatar_url || undefined} alt="" />
                <AvatarFallback 
                  className="text-2xl text-white font-medium"
                  style={{ backgroundColor: member.color || '#888' }}
                >
                  {getInitials(member.first_name, member.last_name)}
                </AvatarFallback>
              </Avatar>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                id="team-member-photo"
                onChange={handlePhotoChange}
                disabled={photoUploading}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full"
                onClick={() => document.getElementById('team-member-photo')?.click()}
                disabled={photoUploading}
              >
                {photoUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              </Button>
            </div>
            <div className="flex-1">
              {isEditing ? (
                <div className="space-y-2">
                  <Input
                    placeholder="First Name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                  <Input
                    placeholder="Last Name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              ) : (
                <div>
                  <h2 className="text-xl font-semibold">{member.first_name || ''} {member.last_name || ''}</h2>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Select value={member.role} onValueChange={handleRoleChange} disabled={updateTeamMember.isPending}>
                      <SelectTrigger className="w-[140px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.filter(r => r.value === 'owner' ? member.role === 'owner' : r.value !== 'owner').map((r) => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold">Contact Information</h3>
                {!isEditing ? (
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => {
                      setIsEditing(false);
                      setFirstName(member.first_name || '');
                      setLastName(member.last_name || '');
                      setPhone(member.phone || '');
                    }}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSave}>
                      Save
                    </Button>
                  </div>
                )}
              </div>
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm">{member.email}</span>
                  </div>
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <Input
                        placeholder="Phone number"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm">{member.phone || 'No phone'}</span>
                    </div>
                  )}
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
  const { data: pendingInvitations = [], isLoading: isLoadingInvitations } = useTeamInvitations();
  const [resendInvitationId, setResendInvitationId] = useState<string | null>(null);
  const today = new Date().toISOString().split('T')[0];
  // Get today's appointments for counting jobs per technician
  const { data: todayAppointments = [] } = useAppointments({ dateFrom: today, dateTo: today });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Count jobs per technician - include all statuses except cancelled
  const jobsByTechnician = todayAppointments.reduce((acc, apt) => {
    if (apt.technician_id && apt.status !== 'cancelled') {
      const techId = apt.technician_id;
      acc[techId] = (acc[techId] || 0) + 1;
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
    window.location.href = `/calendar?technicianId=${member.id}`;
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

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Invitations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingInvitations.map((invitation) => {
                const expiresAt = invitation.expires_at ? new Date(invitation.expires_at) : null;
                const isExpired = expiresAt ? expiresAt < new Date() : false;
                
                return (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <div className="font-medium">{invitation.email}</div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge variant="outline" className="text-xs">
                            {invitation.role}
                          </Badge>
                          {expiresAt && (
                            <>
                              <Clock className="h-3 w-3" />
                              <span>
                                {isExpired ? 'Expired' : `Expires ${expiresAt.toLocaleDateString()}`}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setResendInvitationId(invitation.id)}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Resend
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          const { error } = await supabase
                            .from('team_invitations')
                            .delete()
                            .eq('id', invitation.id);
                          
                          if (error) {
                            toast({ title: 'Error', description: error.message, variant: 'destructive' });
                          } else {
                            toast({ title: 'Invitation cancelled' });
                            queryClient.invalidateQueries({ queryKey: ['team-invitations'] });
                          }
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

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
                              <AvatarImage src={member.avatar_url || undefined} alt="" />
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
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge 
                              variant="outline" 
                              className={cn('capitalize', roleStyles[member.role])}
                            >
                              {member.role}
                            </Badge>
                            <Badge variant="secondary" className="text-xs bg-success/10 text-success border-success/20">
                              Accepted
                            </Badge>
                          </div>
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
                                Delete / Remove from team
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
      
      {resendInvitationId && (() => {
        const invitation = pendingInvitations.find(i => i.id === resendInvitationId);
        return invitation ? (
          <ResendInvitationModal
            open={!!resendInvitationId}
            onOpenChange={(open) => !open && setResendInvitationId(null)}
            invitationId={invitation.id}
            email={invitation.email}
            role={invitation.role}
          />
        ) : null;
      })()}

      <TeamMemberProfileSheet 
        member={selectedMember} 
        open={isProfileOpen} 
        onOpenChange={setIsProfileOpen} 
      />

      {/* Delete / Remove team member confirmation */}
      <AlertDialog open={!!memberToDeactivate} onOpenChange={(open) => !open && setMemberToDeactivate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {memberToDeactivate?.first_name} {memberToDeactivate?.last_name} from the team?
              They will no longer have access to the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeactivate} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
