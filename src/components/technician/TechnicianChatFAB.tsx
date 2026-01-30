import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Send, Loader2, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useUnreadJobChats } from '@/hooks/useUnreadJobChats';
import { useJobMessages } from '@/hooks/useJobMessages';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { formatAppointmentDate } from '@/lib/utils';

export function TechnicianChatFAB() {
  const [open, setOpen] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { items, totalUnread, isLoading } = useUnreadJobChats();
  const prevUnreadRef = useRef<number>(-1);

  useEffect(() => {
    if (totalUnread > prevUnreadRef.current && prevUnreadRef.current >= 0) {
      toast({
        title: 'New message',
        description: 'You have a new message from the office.',
      });
    }
    prevUnreadRef.current = totalUnread;
  }, [totalUnread, toast]);

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
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="p-4 border-b shrink-0">
          <SheetTitle className="flex items-center gap-2">
            {selectedAppointmentId ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 -ml-2"
                onClick={() => setSelectedAppointmentId(null)}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            ) : null}
            Messages with office
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 flex flex-col min-h-0">
          {selectedAppointmentId ? (
            <ChatThread
              appointmentId={selectedAppointmentId}
              onClose={() => setSelectedAppointmentId(null)}
              onOpenJob={() => {
                setOpen(false);
                navigate(`/technician/jobs/${selectedAppointmentId}`);
              }}
            />
          ) : (
            <ScrollArea className="flex-1">
              <div className="p-2">
                {isLoading ? (
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
                            item.unreadCount > 0
                              ? 'bg-primary/5 border-primary/20'
                              : 'hover:bg-muted/50'
                          )}
                          onClick={() => setSelectedAppointmentId(item.appointmentId)}
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
          )}
        </div>
      </SheetContent>
    </Sheet>
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
    <div className="flex flex-col flex-1 min-h-0">
      <div className="p-2 border-b">
        <Button variant="outline" size="sm" onClick={onOpenJob}>
          Open job details
        </Button>
      </div>
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
