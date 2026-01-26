import { useState } from 'react';
import { Phone, Play, FileText, Calendar, UserPlus, Clock, CheckCircle, XCircle, HelpCircle, PhoneOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useCallLogs, useCallLogStats } from '@/hooks/useCallLogs';
import { CallLogWithCustomer } from '@/types/database';

const formatDuration = (seconds: number | null) => {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

const outcomeConfig: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  booked: { icon: CheckCircle, color: 'text-success', bg: 'bg-success/10', label: 'Booked' },
  faq_answered: { icon: HelpCircle, color: 'text-info', bg: 'bg-info/10', label: 'FAQ' },
  cancelled: { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10', label: 'Cancelled' },
  rescheduled: { icon: Calendar, color: 'text-warning', bg: 'bg-warning/10', label: 'Rescheduled' },
  no_action: { icon: Phone, color: 'text-muted-foreground', bg: 'bg-muted', label: 'No Action' },
  voicemail: { icon: PhoneOff, color: 'text-muted-foreground', bg: 'bg-muted', label: 'Voicemail' },
  missed: { icon: PhoneOff, color: 'text-destructive', bg: 'bg-destructive/10', label: 'Missed' },
};

export default function CallLogs() {
  const [selectedCall, setSelectedCall] = useState<CallLogWithCustomer | null>(null);
  const { data: callLogs = [], isLoading } = useCallLogs();
  const { stats } = useCallLogStats();

  const statCards = [
    { label: 'Total Calls', value: stats.totalCalls, icon: Phone },
    { label: 'Avg Duration', value: formatDuration(stats.avgDuration), icon: Clock },
    { label: 'Booking Rate', value: `${stats.bookingRate}%`, icon: CheckCircle },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Call Logs</h1>
        <p className="text-muted-foreground">AI call activity from VAPI</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="shadow-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <stat.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{isLoading ? '-' : stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date/Time</TableHead>
                <TableHead>Caller</TableHead>
                <TableHead className="hidden sm:table-cell">Duration</TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead className="hidden md:table-cell">Recording</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-32" /></TableCell>
                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-8 w-8" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-16" /></TableCell>
                  </TableRow>
                ))
              ) : callLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <Phone className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                    <p className="text-muted-foreground">No call logs yet</p>
                  </TableCell>
                </TableRow>
              ) : (
                callLogs.map((call) => {
                  const outcome = outcomeConfig[call.outcome || 'no_action'] || outcomeConfig.no_action;
                  const OutcomeIcon = outcome.icon;
                  
                  return (
                    <TableRow key={call.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>{formatDate(call.started_at)}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{call.caller_phone}</p>
                          <p className="text-sm text-muted-foreground">
                            {call.customer ? `${call.customer.first_name} ${call.customer.last_name}` : 'New Caller'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{formatDuration(call.duration_seconds)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('gap-1', outcome.color, outcome.bg)}>
                          <OutcomeIcon className="h-3 w-3" />{outcome.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Button variant="ghost" size="sm" disabled={!call.recording_url}><Play className="h-4 w-4" /></Button>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedCall(call)}>
                          <FileText className="h-4 w-4 mr-1" />View
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedCall} onOpenChange={() => setSelectedCall(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader><DialogTitle>Call Transcript</DialogTitle></DialogHeader>
          {selectedCall && (
            <ScrollArea className="h-[400px] pr-4">
              <pre className="text-sm whitespace-pre-wrap font-sans">{selectedCall.transcript || 'No transcript available'}</pre>
            </ScrollArea>
          )}
          <div className="flex gap-2">
            <Button className="bg-primary hover:bg-primary-hover"><Calendar className="h-4 w-4 mr-2" />Create Appointment</Button>
            <Button variant="outline"><UserPlus className="h-4 w-4 mr-2" />Add as Customer</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
