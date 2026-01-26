import { useState } from 'react';
import { 
  Plus, 
  MoreHorizontal,
  Phone,
  Mail,
  UserPlus,
  Grid,
  List,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import { cn } from '@/lib/utils';
import { mockTeam, mockAppointments, TeamMember } from '@/data/mockData';

type ViewMode = 'grid' | 'list';

const statusStyles = {
  available: { bg: 'bg-success/10', text: 'text-success', label: 'Available' },
  on_job: { bg: 'bg-primary/10', text: 'text-primary', label: 'On Job' },
  off: { bg: 'bg-muted', text: 'text-muted-foreground', label: 'Off' },
  break: { bg: 'bg-warning/10', text: 'text-warning', label: 'On Break' },
};

const roleStyles = {
  admin: 'bg-primary/10 text-primary border-primary/20',
  technician: 'bg-info/10 text-info border-info/20',
  dispatcher: 'bg-accent text-accent-foreground',
};

const getInitials = (firstName: string, lastName: string) => {
  return `${firstName[0]}${lastName[0]}`.toUpperCase();
};

const getTodayJobsCount = (memberId: string) => {
  const today = new Date().toISOString().split('T')[0];
  return mockAppointments.filter(
    a => a.technicianId === memberId && a.date === today && a.status !== 'cancelled'
  ).length;
};

const getWeekJobsCount = (memberId: string) => {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  
  return mockAppointments.filter(a => {
    const aptDate = new Date(a.date);
    return a.technicianId === memberId && 
           aptDate >= weekStart && 
           aptDate < weekEnd && 
           a.status !== 'cancelled';
  }).length;
};

function TeamMemberCard({ member }: { member: TeamMember }) {
  const status = statusStyles[member.status];
  const todayJobs = getTodayJobsCount(member.id);
  
  return (
    <Card className="shadow-card hover:shadow-elevated transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback 
              className="text-lg text-white font-medium"
              style={{ backgroundColor: member.color }}
            >
              {getInitials(member.firstName, member.lastName)}
            </AvatarFallback>
          </Avatar>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>View Profile</DropdownMenuItem>
              <DropdownMenuItem>Edit</DropdownMenuItem>
              <DropdownMenuItem>View Schedule</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">Deactivate</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="space-y-3">
          <div>
            <h3 className="font-semibold text-lg">
              {member.firstName} {member.lastName}
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
              {member.phone}
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

export default function Team() {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  
  const activeToday = mockTeam.filter(m => m.status !== 'off').length;
  const onJobsNow = mockTeam.filter(m => m.status === 'on_job').length;

  const stats = [
    { label: 'Total Team', value: mockTeam.length },
    { label: 'Active Today', value: activeToday },
    { label: 'On Jobs Now', value: onJobsNow },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team</h1>
          <p className="text-muted-foreground">Manage your team members and their schedules</p>
        </div>
        <Button className="gap-2 bg-primary hover:bg-primary-hover">
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
              <p className="text-2xl font-bold">{stat.value}</p>
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
          {mockTeam.map((member) => (
            <TeamMemberCard key={member.id} member={member} />
          ))}
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
                  <TableHead className="text-center hidden lg:table-cell">This Week</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockTeam.map((member) => {
                  const status = statusStyles[member.status];
                  const todayJobs = getTodayJobsCount(member.id);
                  const weekJobs = getWeekJobsCount(member.id);
                  
                  return (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback 
                              className="text-sm text-white font-medium"
                              style={{ backgroundColor: member.color }}
                            >
                              {getInitials(member.firstName, member.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {member.firstName} {member.lastName}
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
                        {member.phone}
                      </TableCell>
                      <TableCell className="text-center hidden sm:table-cell">
                        {member.role === 'technician' ? (
                          <Badge variant="secondary">{todayJobs}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center hidden lg:table-cell">
                        {member.role === 'technician' ? (
                          <Badge variant="secondary">{weekJobs}</Badge>
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
                            <DropdownMenuItem>View Profile</DropdownMenuItem>
                            <DropdownMenuItem>Edit</DropdownMenuItem>
                            <DropdownMenuItem>View Schedule</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive">
                              Deactivate
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
