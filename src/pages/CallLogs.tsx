import { useState } from 'react';
import { 
  Phone,
  Play,
  FileText,
  Calendar,
  UserPlus,
  Clock,
  CheckCircle,
  XCircle,
  HelpCircle,
  PhoneOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { mockCallLogs, CallLog } from '@/data/mockData';

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
  });
};

const outcomeConfig = {
  booked: { icon: CheckCircle, color: 'text-success', bg: 'bg-success/10', label: 'Booked' },
  faq: { icon: HelpCircle, color: 'text-info', bg: 'bg-info/10', label: 'FAQ' },
  cancelled: { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10', label: 'Cancelled' },
  rescheduled: { icon: Calendar, color: 'text-warning', bg: 'bg-warning/10', label: 'Rescheduled' },
  no_action: { icon: Phone, color: 'text-muted-foreground', bg: 'bg-muted', label: 'No Action' },
  voicemail: { icon: PhoneOff, color: 'text-muted-foreground', bg: 'bg-muted', label: 'Voicemail' },
};

export default function CallLogs() {
  const [selectedCall, setSelectedCall] = useState<CallLog | null>(null);
  
  const bookedCalls = mockCallLogs.filter(c => c.outcome === 'booked').length;
  const totalCalls = mockCallLogs.length;
  const avgDuration = Math.round(mockCallLogs.reduce((acc, c) => acc + c.duration, 0) / totalCalls);

  const stats = [
    { label: 'Total Calls', value: totalCalls, icon: Phone },
    { label: 'Avg Duration', value: formatDuration(avgDuration), icon: Clock },
    { label: 'Booking Rate', value: `${Math.round((bookedCalls / totalCalls) * 100)}%`, icon: CheckCircle },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Call Logs</h1>
        <p className="text-muted-foreground">AI call activity from VAPI</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="shadow-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <stat.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
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
              {mockCallLogs.map((call) => {
                const outcome = outcomeConfig[call.outcome];
                const OutcomeIcon = outcome.icon;
                
                return (
                  <TableRow key={call.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>{formatDate(call.createdAt)}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{call.phone}</p>
                        <p className="text-sm text-muted-foreground">
                          {call.customerName || 'New Caller'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {formatDuration(call.duration)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('gap-1', outcome.color, outcome.bg)}>
                        <OutcomeIcon className="h-3 w-3" />
                        {outcome.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Button variant="ghost" size="sm" disabled={!call.recordingUrl}>
                        <Play className="h-4 w-4" />
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedCall(call)}>
                        <FileText className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedCall} onOpenChange={() => setSelectedCall(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Call Transcript</DialogTitle>
          </DialogHeader>
          {selectedCall && (
            <ScrollArea className="h-[400px] pr-4">
              <pre className="text-sm whitespace-pre-wrap font-sans">
                {selectedCall.transcript}
              </pre>
            </ScrollArea>
          )}
          <div className="flex gap-2">
            <Button className="bg-primary hover:bg-primary-hover">
              <Calendar className="h-4 w-4 mr-2" />
              Create Appointment
            </Button>
            <Button variant="outline">
              <UserPlus className="h-4 w-4 mr-2" />
              Add as Customer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
