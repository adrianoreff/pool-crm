import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Send, Loader2, ChevronLeft, Briefcase, User, MoreVertical, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useNotification } from '@/contexts/NotificationContext';
import { useJobMessages } from '@/hooks/useJobMessages';
import { useMyDirectThread } from '@/hooks/useDirectMessages';
import { cn } from '@/lib/utils';
import { formatAppointmentDate } from '@/lib/utils';

type ChatView = 'list' | 'job' | 'direct';

export function TechnicianChatFAB() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<ChatView>('list');
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { jobChatItems: items, totalChatUnread: totalUnread, jobChatsLoading: jobLoading } = useNotification();
  const { unreadCount: directUnread } = useMyDirectThread();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          size="icon"
          className={cn(
            'fixed bottom-20 right-4 z-40 h-14 w-14 rounded-full shadow-lg bg-[#F97316] hover:bg-[#EA580C]',
            totalUnread > 0 && 'animate-pulse ring-2 ring-[#F97316]/50 ring-offset-2'
          )}
          aria-label="Open chat"
        >
          <MessageSquare className="h-6 w-6" />
          {totalUnread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {totalUnread > 9 ? '9+' : totalUnread}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0" aria-describedby={undefined}>
        <SheetHeader className="p-4 border-b shrink-0">
          <SheetTitle className="flex items-center gap-2">
            {(view === 'job' || view === 'direct') ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 -ml-2"
                onClick={() => {
                  setView('list');
                  setSelectedAppointmentId(null);
                }}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            ) : null}
            {view === 'direct' ? 'Messages to you' : view === 'job' ? 'Job chat' : 'Messages with office'}
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 flex flex-col min-h-0">
          {view === 'job' && selectedAppointmentId ? (
            <ChatThread
              appointmentId={selectedAppointmentId}
              onClose={() => setView('list')}
              onOpenJob={() => {
                setOpen(false);
                navigate(`/technician/jobs/${selectedAppointmentId}`);
              }}
            />
          ) : view === 'direct' ? (
            <DirectFromOfficeThread />
          ) : (
            <Tabs defaultValue="job-chats" className="flex-1 flex flex-col min-h-0">
              <TabsList className="w-full grid grid-cols-2 rounded-none border-b h-auto p-0">
                <TabsTrigger value="job-chats" className="gap-1.5 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none text-xs">
                  <Briefcase className="h-4 w-4 shrink-0" />
                  Job Chats
                  {items.some((i) => i.unreadCount > 0) && (
                    <span className="rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-medium text-destructive-foreground">
                      {items.reduce((s, i) => s + i.unreadCount, 0)}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="direct" className="gap-1.5 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none text-xs">
                  <User className="h-4 w-4 shrink-0" />
                  To you
                  {directUnread > 0 && (
                    <span className="rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-medium text-destructive-foreground">
                      {directUnread}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="job-chats" className="flex-1 m-0 min-h-0">
                <ScrollArea className="flex-1 h-full">
                  <div className="p-2">
                    {jobLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : items.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No job chats yet. Start a job and use the chat on the job details page.
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {items.map((item) => {
                          const name = item.appointment.customer
                            ? `${item.appointment.customer.first_name || ''} ${item.appointment.customer.last_name || ''}`.trim()
                            : 'Customer';
                          return (
                            <button
                              key={item.appointmentId}
                              type="button"
                              className={cn(
                                'w-full text-left rounded-lg p-3 border transition-colors',
                                item.unreadCount > 0 ? 'bg-primary/5 border-primary/20' : 'hover:bg-muted/50'
                              )}
                              onClick={() => {
                                setSelectedAppointmentId(item.appointmentId);
                                setView('job');
                              }}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-medium truncate">
                                  {item.appointment.ref_code || item.appointmentId.slice(0, 8)} – {name}
                                </span>
                                {item.unreadCount > 0 && (
                                  <span className="shrink-0 rounded-full bg-destructive px-2 py-0.5 text-xs font-medium text-destructive-foreground">
                                    {item.unreadCount}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                {formatAppointmentDate(item.appointment.scheduled_date)} · {item.lastMessagePreview}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
              <TabsContent value="direct" className="flex-1 m-0 min-h-0">
                <div className="p-2">
                  <p className="text-sm text-muted-foreground mb-2">Private messages sent to you by the office.</p>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setView('direct')}
                  >
                    <User className="h-4 w-4 mr-2" />
                    Messages to you
                    {directUnread > 0 && (
                      <span className="ml-auto rounded-full bg-destructive px-2 py-0.5 text-xs text-destructive-foreground">
                        {directUnread}
                      </span>
                    )}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DirectFromOfficeThread() {
  const [draft, setDraft] = useState('');
  const [clearOpen, setClearOpen] = useState(false);
  const { messages, sendMessage, isSending, markAsRead, lastAdminId, clearChat, isClearing } = useMyDirectThread();

  useEffect(() => {
    markAsRead();
  }, [markAsRead]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || isSending) return;
    await sendMessage(draft);
    setDraft('');
  };

  const handleClearChat = async () => {
    await clearChat();
    setClearOpen(false);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="p-2 border-b flex items-center justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setClearOpen(true)} className="text-destructive focus:text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Clear chat / Limpar todo o chat
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear chat?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove all messages in this conversation? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClearing}>Cancel</AlertDialogCancel>
            <Button onClick={handleClearChat} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={isClearing}>
              {isClearing ? 'Clearing…' : 'Clear chat'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-2">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No private messages yet. When the office sends you a message here, it will appear below.
            </p>
          ) : (
            messages.map((m) => {
              const name = m.sender
                ? `${m.sender.first_name || ''} ${m.sender.last_name || ''}`.trim() || 'Office'
                : 'Office';
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
          placeholder={lastAdminId ? 'Type a message...' : 'Reply after the office messages you here'}
          className="flex-1"
          disabled={isSending || !lastAdminId}
        />
        <Button type="submit" size="icon" disabled={!draft.trim() || isSending || !lastAdminId}>
          {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
}

function ChatThread({
  appointmentId,
  onClose,
  onOpenJob,
}: {
  appointmentId: string;
  onClose: () => void;
  onOpenJob: () => void;
}) {
  const [draft, setDraft] = useState('');
  const [clearOpen, setClearOpen] = useState(false);
  const { messages, sendMessage, isSending, markAsRead, clearChat, isClearing } = useJobMessages(appointmentId);

  useEffect(() => {
    markAsRead();
  }, [appointmentId, markAsRead]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || isSending) return;
    await sendMessage(draft);
    setDraft('');
  };

  const handleClearChat = async () => {
    await clearChat();
    setClearOpen(false);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="p-2 border-b flex items-center justify-between gap-2">
        <Button variant="outline" size="sm" onClick={onOpenJob}>
          Open job details
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setClearOpen(true)} className="text-destructive focus:text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Clear chat / Limpar todo o chat
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear chat?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove all messages in this job chat? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClearing}>Cancel</AlertDialogCancel>
            <Button onClick={handleClearChat} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={isClearing}>
              {isClearing ? 'Clearing…' : 'Clear chat'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-2">
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
