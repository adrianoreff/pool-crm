import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Mail, Send, Eye, MousePointer, AlertTriangle, CheckCircle, Clock, Search, Filter, Trash2, MessageSquare, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { cn } from '@/lib/utils';
import { useEmailLogs, useEmailStats, useDeleteEmailLog, useClearAllEmailLogs, EmailLogWithRelations } from '@/hooks/useMessages';
import { useUnreadJobChats, type JobChatItem } from '@/hooks/useUnreadJobChats';
import { useJobMessages } from '@/hooks/useJobMessages';
import { formatAppointmentDate } from '@/lib/utils';

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    hour: 'numeric', 
    minute: '2-digit' 
  });
};

const statusConfig: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  queued: { icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted', label: 'Queued' },
  sent: { icon: Send, color: 'text-info', bg: 'bg-info/10', label: 'Sent' },
  delivered: { icon: CheckCircle, color: 'text-success', bg: 'bg-success/10', label: 'Delivered' },
  opened: { icon: Eye, color: 'text-primary', bg: 'bg-primary/10', label: 'Opened' },
  clicked: { icon: MousePointer, color: 'text-secondary', bg: 'bg-secondary/10', label: 'Clicked' },
  bounced: { icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10', label: 'Bounced' },
  failed: { icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10', label: 'Failed' },
};

const getEmailStatus = (email: EmailLogWithRelations): string => {
  if (email.clicked_at) return 'clicked';
  if (email.opened_at) return 'opened';
  if (email.bounced_at || email.status === 'bounced') return 'bounced';
  if (email.failed_at || email.status === 'failed') return 'failed';
  if (email.delivered_at || email.status === 'delivered') return 'delivered';
  if (email.sent_at || email.status === 'sent') return 'sent';
  return 'queued';
};

const emailTypeLabels: Record<string, string> = {
  appointment_request_received: 'Booking Received',
  appointment_confirmed: 'Confirmed',
  appointment_reminder: 'Reminder',
  appointment_cancelled: 'Cancelled',
  appointment_rescheduled: 'Rescheduled',
  appointment_completed: 'Completed',
  technician_en_route: 'Tech En Route',
  tech_new_assignment: 'Tech Assigned',
  tech_daily_schedule: 'Daily Schedule',
  admin_new_appointment: 'Admin: New Booking',
  admin_job_problem: 'Admin: Job Problem Reported',
  admin_appointment_cancelled: 'Admin: Cancelled',
  follow_up: 'Follow Up',
  invoice_sent: 'Invoice',
  custom: 'Custom',
};

function LiveChatPanel({
  items,
  isLoading,
  selectedId,
  onSelect,
}: {
  items: JobChatItem[];
  isLoading: boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <Card>
      <CardContent className="p-0 flex flex-col md:flex-row min-h-[400px]">
        <div className="w-full md:w-80 border-b md:border-b-0 md:border-r shrink-0">
          <div className="p-2 border-b">
            <p className="text-sm font-medium">Job conversations</p>
            <p className="text-xs text-muted-foreground">Technicians can message you from their app</p>
          </div>
          <ScrollArea className="h-[300px] md:h-[380px]">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : items.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8 px-4">
                No job chats yet. When a technician sends a message from a job, it will appear here.
              </p>
            ) : (
              <div className="p-2 space-y-1">
                {items.map((item) => {
                  const name = item.appointment.customer
                    ? `${item.appointment.customer.first_name || ''} ${item.appointment.customer.last_name || ''}`.trim()
                    : 'Customer';
                  const isSelected = selectedId === item.appointmentId;
                  return (
                    <button
                      key={item.appointmentId}
                      type="button"
                      className={cn(
                        'w-full text-left rounded-lg p-3 border transition-colors',
                        isSelected ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50',
                        item.unreadCount > 0 && 'border-l-4 border-l-destructive'
                      )}
                      onClick={() => onSelect(item.appointmentId)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium truncate text-sm">
                          {item.appointment.ref_code || item.appointmentId.slice(0, 8)} – {name}
                        </span>
                        {item.unreadCount > 0 && (
                          <Badge variant="destructive" className="shrink-0 text-xs">
                            {item.unreadCount}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {formatAppointmentDate(item.appointment.scheduled_date)}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
        <div className="flex-1 flex flex-col min-h-0">
          {selectedId ? (
            <LiveChatThread appointmentId={selectedId} onBack={() => onSelect(null)} />
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm p-4">
              Select a conversation
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function LiveChatThread({ appointmentId, onBack }: { appointmentId: string; onBack: () => void }) {
  const [draft, setDraft] = useState('');
  const { messages, sendMessage, isSending, markAsRead } = useJobMessages(appointmentId);

  useEffect(() => {
    markAsRead();
  }, [appointmentId, markAsRead]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || isSending) return;
    await sendMessage(draft);
    setDraft('');
  };

  return (
    <div className="flex flex-col h-full min-h-[300px]">
      <div className="p-2 border-b flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="md:hidden">
          Back
        </Button>
        <span className="text-sm font-medium">Conversation</span>
      </div>
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No messages yet.</p>
          ) : (
            messages.map((m) => {
              const name = m.sender
                ? `${m.sender.first_name || ''} ${m.sender.last_name || ''}`.trim() || m.sender_role
                : m.sender_role;
              return (
                <div key={m.id} className="text-sm">
                  <span className="font-medium text-muted-foreground">{name}:</span>{' '}
                  <span className="whitespace-pre-wrap">{m.body}</span>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
      <form className="flex gap-2 p-3 border-t shrink-0" onSubmit={handleSend}>
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message..."
          className="flex-1"
          disabled={isSending}
        />
        <Button type="submit" size="icon" disabled={!draft.trim() || isSending}>
          {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
}

export default function Messages() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'email';
  const selectedChatId = searchParams.get('id') || null;

  const { data: emails = [], isLoading } = useEmailLogs();
  const { stats } = useEmailStats();
  const deleteEmailLog = useDeleteEmailLog();
  const clearAllEmailLogs = useClearAllEmailLogs();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);
  const [emailToDelete, setEmailToDelete] = useState<string | null>(null);

  const { items: jobChatItems, totalUnread: jobChatUnread, isLoading: loadingChats } = useUnreadJobChats();
  const activeChatId = selectedChatId || (jobChatItems.length > 0 ? jobChatItems[0].appointmentId : null);


  const filteredEmails = useMemo(() => {
    return emails.filter(email => {
      const matchesSearch = !searchQuery || 
        email.recipient_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        email.recipient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        email.customer?.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        email.customer?.last_name?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const emailStatus = getEmailStatus(email);
      const matchesStatus = statusFilter === 'all' || emailStatus === statusFilter;
      const matchesType = typeFilter === 'all' || email.email_type === typeFilter;
      
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [emails, searchQuery, statusFilter, typeFilter]);

  const uniqueTypes = useMemo(() => {
    return [...new Set(emails.map(e => e.email_type))];
  }, [emails]);

  const statCards = [
    { label: 'Total Sent', value: stats.totalSent, icon: Mail, color: 'text-primary' },
    { label: 'Delivered', value: `${stats.deliveryRate}%`, icon: CheckCircle, color: 'text-success' },
    { label: 'Opened', value: `${stats.openRate}%`, icon: Eye, color: 'text-info' },
    { label: 'Clicked', value: stats.clicked, icon: MousePointer, color: 'text-secondary' },
  ];

  const handleClearAll = () => {
    clearAllEmailLogs.mutate(undefined, { onSuccess: () => setClearAllDialogOpen(false) });
  };

  const isLiveChat = tab === 'live-chat';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
          <p className="text-muted-foreground">Email history and live chat with technicians</p>
        </div>
        {!isLiveChat && emails.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => setClearAllDialogOpen(true)}
            disabled={clearAllEmailLogs.isPending}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All History
          </Button>
        )}
      </div>

      <Tabs
        value={isLiveChat ? 'live-chat' : 'email'}
        onValueChange={(v) => setSearchParams(v === 'live-chat' ? { tab: 'live-chat' } : {})}
      >
        <TabsList className="grid w-full max-w-[280px] grid-cols-2">
          <TabsTrigger value="email" className="gap-2">
            <Mail className="h-4 w-4" />
            Email history
          </TabsTrigger>
          <TabsTrigger value="live-chat" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Live chat
            {jobChatUnread > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">
                {jobChatUnread}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="email" className="space-y-6 mt-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="shadow-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn('rounded-lg p-2', stat.color.replace('text-', 'bg-') + '/10')}>
                <stat.icon className={cn('h-5 w-5', stat.color)} />
              </div>
              <div>
                <p className="text-2xl font-bold">{isLoading ? '-' : stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email, name, or subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(statusConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <config.icon className={cn('h-3 w-3', config.color)} />
                      {config.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Email Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {uniqueTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {emailTypeLabels[type] || type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Email History Table */}
      <Card className="shadow-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead className="hidden md:table-cell">Subject</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Interactions</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-40" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : filteredEmails.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <Mail className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      {emails.length === 0 ? 'No emails sent yet' : 'No emails match your filters'}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredEmails.map((email) => {
                  const status = getEmailStatus(email);
                  const statusInfo = statusConfig[status] || statusConfig.queued;
                  const StatusIcon = statusInfo.icon;
                  
                  return (
                    <TableRow key={email.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(email.created_at)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {email.customer 
                              ? `${email.customer.first_name} ${email.customer.last_name || ''}`
                              : email.recipient_name || 'Unknown'}
                          </p>
                          <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {email.recipient_email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <p className="truncate max-w-[300px]">{email.subject}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {emailTypeLabels[email.email_type] || email.email_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={cn('gap-1', statusInfo.color, statusInfo.bg)}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          {email.opened_at && (
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {formatDate(email.opened_at)}
                            </span>
                          )}
                          {email.clicked_at && (
                            <span className="flex items-center gap-1">
                              <MousePointer className="h-3 w-3" />
                              {formatDate(email.clicked_at)}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setEmailToDelete(email.id)}
                          disabled={deleteEmailLog.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
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
        </TabsContent>

        <TabsContent value="live-chat" className="mt-6">
          <LiveChatPanel
            items={jobChatItems}
            isLoading={loadingChats}
            selectedId={activeChatId}
            onSelect={(id) => setSearchParams(id ? { tab: 'live-chat', id } : { tab: 'live-chat' })}
          />
        </TabsContent>
      </Tabs>

      {/* Delete single message confirmation */}
      <AlertDialog open={!!emailToDelete} onOpenChange={(open) => !open && setEmailToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete message?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this email from the log. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                if (emailToDelete) {
                  deleteEmailLog.mutate(emailToDelete, { onSuccess: () => setEmailToDelete(null) });
                }
              }}
              disabled={deleteEmailLog.isPending}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear all history confirmation */}
      <AlertDialog open={clearAllDialogOpen} onOpenChange={setClearAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all message history?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all email log entries for your business ({emails.length} total). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleClearAll}
              disabled={clearAllEmailLogs.isPending}
            >
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
