import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Phone, Play, FileText, Calendar, UserPlus, Clock, CheckCircle, XCircle, HelpCircle, PhoneOff, Trash2, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useCallLogs, useCallLogStats, useDeleteCallLog, useClearAllCallLogs, useSyncVapiCalls } from '@/hooks/useCallLogs';
import { CallLogWithCustomer, CallLogFilters } from '@/types/database';
import { AudioPlayer } from '@/components/call-logs/AudioPlayer';
import { useAuth } from '@/contexts/AuthContext';

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

const dateRangeOptions = [
  { value: 'all', label: 'All time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
];

const outcomeFilterOptions = [
  { value: 'all', label: 'All outcomes' },
  { value: 'booked', label: 'Booked' },
  { value: 'faq_answered', label: 'FAQ' },
  { value: 'no_action', label: 'No Action' },
  { value: 'voicemail', label: 'Voicemail' },
  { value: 'missed', label: 'Missed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'rescheduled', label: 'Rescheduled' },
];

const durationFilterOptions = [
  { value: 'all', label: 'Any duration' },
  { value: 'short', label: 'Short (< 1 min)' },
  { value: 'medium', label: 'Medium (1–5 min)' },
  { value: 'long', label: 'Long (> 5 min)' },
];

function getDateRangeForPreset(preset: string): { dateFrom: string; dateTo: string } | undefined {
  const now = new Date();
  if (preset === 'today') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { dateFrom: start.toISOString(), dateTo: end.toISOString() };
  }
  if (preset === 'week') {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    end.setMilliseconds(-1);
    return { dateFrom: start.toISOString(), dateTo: end.toISOString() };
  }
  if (preset === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { dateFrom: start.toISOString(), dateTo: end.toISOString() };
  }
  return undefined;
}

export default function CallLogs() {
  const [searchParams] = useSearchParams();
  const [selectedCall, setSelectedCall] = useState<CallLogWithCustomer | null>(null);
  const [playingCallId, setPlayingCallId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRangePreset, setDateRangePreset] = useState('all');
  const [outcomeFilter, setOutcomeFilter] = useState('all');
  const [durationFilter, setDurationFilter] = useState('all');

  const dateParam = searchParams.get('date');
  useEffect(() => {
    if (dateParam === 'today') setDateRangePreset('today');
  }, [dateParam]);
  const callLogFilters = useMemo(() => {
    const preset = dateParam === 'today' ? 'today' : dateRangePreset;
    const range = getDateRangeForPreset(preset);
    const filters: CallLogFilters = {};
    if (range) {
      filters.dateFrom = range.dateFrom;
      filters.dateTo = range.dateTo;
    }
    if (outcomeFilter !== 'all') {
      filters.outcome = outcomeFilter as CallLogFilters['outcome'];
    }
    return Object.keys(filters).length > 0 ? filters : undefined;
  }, [dateParam, dateRangePreset, outcomeFilter]);

  const { data: callLogs = [], isLoading } = useCallLogs(callLogFilters);
  const { stats } = useCallLogStats();

  const filteredBySearchAndDuration = useMemo(() => {
    return callLogs.filter((call) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const phoneMatch = call.caller_phone?.toLowerCase().includes(q);
        const nameMatch = call.customer
          ? `${call.customer.first_name} ${call.customer.last_name || ''}`.toLowerCase().includes(q)
          : false;
        const dateStr = call.started_at ? new Date(call.started_at).toLocaleDateString() : '';
        const dateMatch = dateStr.toLowerCase().includes(q);
        if (!phoneMatch && !nameMatch && !dateMatch) return false;
      }
      if (durationFilter !== 'all') {
        const sec = call.duration_seconds ?? 0;
        if (durationFilter === 'short' && sec >= 60) return false;
        if (durationFilter === 'medium' && (sec < 60 || sec > 300)) return false;
        if (durationFilter === 'long' && sec <= 300) return false;
      }
      return true;
    });
  }, [callLogs, searchQuery, durationFilter]);
  const deleteCallLog = useDeleteCallLog();
  const clearAllCallLogs = useClearAllCallLogs();
  const syncVapiCalls = useSyncVapiCalls();
  const { profile } = useAuth();
  
  const isAdmin = profile?.role === 'owner' || profile?.role === 'admin';

  const statCards = [
    { label: 'Total Calls', value: stats.totalCalls, icon: Phone },
    { label: 'Avg Duration', value: formatDuration(stats.avgDuration), icon: Clock },
    { label: 'Booking Rate', value: `${stats.bookingRate}%`, icon: CheckCircle },
  ];

  const handleDeleteCall = (callId: string) => {
    deleteCallLog.mutate(callId);
    if (selectedCall?.id === callId) {
      setSelectedCall(null);
    }
  };

  const handleClearAll = () => {
    clearAllCallLogs.mutate();
    setSelectedCall(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Call Logs</h1>
          <p className="text-muted-foreground">AI call activity from VAPI</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => syncVapiCalls.mutate()}
            disabled={syncVapiCalls.isPending}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", syncVapiCalls.isPending && "animate-spin")} />
            Sync Calls
          </Button>
          {isAdmin && callLogs.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear all call history?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all {callLogs.length} call logs and their transcripts. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleClearAll}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {clearAllCallLogs.isPending ? 'Deleting...' : 'Delete All'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
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

      {/* Search and filters */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by phone, caller name, or date..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={dateRangePreset} onValueChange={setDateRangePreset}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                {dateRangeOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Outcome" />
              </SelectTrigger>
              <SelectContent>
                {outcomeFilterOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={durationFilter} onValueChange={setDurationFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Duration" />
              </SelectTrigger>
              <SelectContent>
                {durationFilterOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

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
              ) : filteredBySearchAndDuration.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <Phone className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                    <p className="text-muted-foreground">No call logs match your filters</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredBySearchAndDuration.map((call) => {
                  const outcome = outcomeConfig[call.outcome || 'no_action'] || outcomeConfig.no_action;
                  const OutcomeIcon = outcome.icon;
                  const isExpanded = playingCallId === call.id;
                  
                  return (
                    <>
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
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            disabled={!call.recording_url}
                            onClick={() => setPlayingCallId(isExpanded ? null : call.id)}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => setSelectedCall(call)}>
                              <FileText className="h-4 w-4 mr-1" />View
                            </Button>
                            {isAdmin && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete call log?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently delete this call log from {call.caller_phone}. This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => handleDeleteCall(call.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      {isExpanded && call.recording_url && (
                        <TableRow key={`${call.id}-player`}>
                          <TableCell colSpan={6} className="py-2 bg-muted/30">
                            <AudioPlayer src={call.recording_url} />
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedCall} onOpenChange={() => setSelectedCall(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Call Details</DialogTitle>
            <DialogDescription>
              {selectedCall && `Call from ${selectedCall.caller_phone} on ${formatDate(selectedCall.started_at)}`}
            </DialogDescription>
          </DialogHeader>
          {selectedCall && (
            <div className="space-y-4">
              {selectedCall.recording_url && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Recording</h4>
                  <AudioPlayer src={selectedCall.recording_url} />
                </div>
              )}
              
              {selectedCall.summary && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Summary</h4>
                  <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                    {selectedCall.summary}
                  </p>
                </div>
              )}

              <div>
                <h4 className="text-sm font-medium mb-2">Transcript</h4>
                <ScrollArea className="h-[250px] bg-muted/50 rounded-lg p-3">
                  <pre className="text-sm whitespace-pre-wrap font-sans">
                    {selectedCall.transcript || 'No transcript available'}
                  </pre>
                </ScrollArea>
              </div>
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <Button className="bg-primary hover:bg-primary-hover">
              <Calendar className="h-4 w-4 mr-2" />Create Appointment
            </Button>
            <Button variant="outline">
              <UserPlus className="h-4 w-4 mr-2" />Add as Customer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}