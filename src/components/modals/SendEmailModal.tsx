import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { EmailService } from '@/lib/services/email-service';
import { useBusiness } from '@/hooks/useBusiness';
import { supabase } from '@/integrations/supabase/client';
import { 
  Mail, 
  Send, 
  Loader2, 
  CheckCircle2,
  Clock,
  Calendar,
  XCircle,
  Truck,
  Star,
  Bell,
  PenLine,
  FileText,
  AlertCircle
} from 'lucide-react';

interface SendEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipient: {
    id: string;
    name: string;
    email: string;
  };
  appointmentId?: string;
}

type EmailTemplateType = 
  | 'appointment_request_received'
  | 'appointment_confirmed'
  | 'appointment_reminder_24h'
  | 'appointment_reminder_1h'
  | 'appointment_rescheduled'
  | 'appointment_cancelled'
  | 'technician_en_route'
  | 'appointment_completed'
  | 'custom';

interface EmailTemplate {
  id: EmailTemplateType;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  requiresAppointment: boolean;
}

const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'appointment_confirmed',
    name: 'Appointment Confirmation',
    description: 'Confirm appointment details with the customer',
    icon: CheckCircle2,
    color: 'text-green-600 bg-green-50',
    requiresAppointment: true,
  },
  {
    id: 'appointment_reminder_24h',
    name: 'Reminder (24 hours)',
    description: 'Remind customer about appointment tomorrow',
    icon: Clock,
    color: 'text-blue-600 bg-blue-50',
    requiresAppointment: true,
  },
  {
    id: 'appointment_reminder_1h',
    name: 'Reminder (1 hour)',
    description: 'Final reminder before appointment',
    icon: Bell,
    color: 'text-blue-600 bg-blue-50',
    requiresAppointment: true,
  },
  {
    id: 'appointment_rescheduled',
    name: 'Appointment Rescheduled',
    description: 'Notify about appointment date/time change',
    icon: Calendar,
    color: 'text-orange-600 bg-orange-50',
    requiresAppointment: true,
  },
  {
    id: 'appointment_cancelled',
    name: 'Appointment Cancelled',
    description: 'Confirm appointment cancellation',
    icon: XCircle,
    color: 'text-red-600 bg-red-50',
    requiresAppointment: true,
  },
  {
    id: 'technician_en_route',
    name: 'Technician En Route',
    description: 'Let customer know technician is on the way',
    icon: Truck,
    color: 'text-green-600 bg-green-50',
    requiresAppointment: true,
  },
  {
    id: 'appointment_completed',
    name: 'Service Completed',
    description: 'Thank customer after service completion',
    icon: Star,
    color: 'text-yellow-600 bg-yellow-50',
    requiresAppointment: true,
  },
  {
    id: 'appointment_request_received',
    name: 'Request Received',
    description: 'Confirm booking request was received',
    icon: FileText,
    color: 'text-purple-600 bg-purple-50',
    requiresAppointment: true,
  },
];

export function SendEmailModal({ isOpen, onClose, recipient, appointmentId }: SendEmailModalProps) {
  const { data: business } = useBusiness();
  const [activeTab, setActiveTab] = useState<'templates' | 'custom'>('templates');
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplateType | null>(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [appointment, setAppointment] = useState<any>(null);
  const [loadingAppointment, setLoadingAppointment] = useState(false);

  // Load appointment data - if appointmentId is provided, use it; otherwise fetch latest for customer
  useEffect(() => {
    async function loadAppointment() {
      setLoadingAppointment(true);
      try {
        let query = supabase
          .from('appointments')
          .select(`
            *,
            customer:customers(*),
            service:services(*),
            technician:users(*)
          `);

        if (appointmentId) {
          // Fetch specific appointment
          query = query.eq('id', appointmentId);
        } else {
          // Fetch latest appointment for this customer
          query = query
            .eq('customer_id', recipient.id)
            .order('scheduled_date', { ascending: false })
            .limit(1);
        }

        const { data, error } = await query.maybeSingle();

        if (!error && data) {
          setAppointment(data);
        } else {
          setAppointment(null);
        }
      } catch (err) {
        console.error('Error loading appointment:', err);
        setAppointment(null);
      } finally {
        setLoadingAppointment(false);
      }
    }

    if (isOpen && recipient?.id) {
      loadAppointment();
    }
  }, [appointmentId, recipient?.id, isOpen]);

  const handleSendTemplate = async () => {
    if (!selectedTemplate) {
      toast.error('Please select a template');
      return;
    }
    
    if (!business) {
      toast.error('Business information not available');
      return;
    }

    if (!appointment) {
      toast.error('Appointment data not loaded. Please try again.');
      return;
    }

    setIsSending(true);
    try {
      let result;
      const businessData = {
        id: business.id,
        name: business.name,
        phone: business.phone || '',
        email: business.email || '',
      };

      switch (selectedTemplate) {
        case 'appointment_confirmed':
          result = await EmailService.sendAppointmentConfirmed(appointment, businessData);
          break;
        case 'appointment_reminder_24h':
          result = await EmailService.sendAppointmentReminder(appointment, businessData, 24);
          break;
        case 'appointment_reminder_1h':
          result = await EmailService.sendAppointmentReminder(appointment, businessData, 1);
          break;
        case 'appointment_rescheduled':
          // For resend, use current date as both old and new (user just wants to resend notification)
          result = await EmailService.sendAppointmentRescheduled(
            appointment, 
            appointment.scheduled_date,
            appointment.scheduled_start_time,
            appointment.scheduled_end_time,
            businessData
          );
          break;
        case 'appointment_cancelled':
          result = await EmailService.sendAppointmentCancelled(appointment, businessData, 'business');
          break;
        case 'technician_en_route':
          result = await EmailService.sendTechnicianEnRoute(appointment, businessData, 30);
          break;
        case 'appointment_completed':
          result = await EmailService.sendAppointmentCompleted(appointment, businessData);
          break;
        case 'appointment_request_received':
          result = await EmailService.sendAppointmentRequestReceived(appointment, businessData);
          break;
        default:
          throw new Error('Unknown template');
      }

      if (result.success) {
        toast.success('Email sent successfully!');
        handleClose();
      } else {
        throw new Error(result.error as string || 'Failed to send');
      }
    } catch (error) {
      console.error('Email send error:', error);
      toast.error('Failed to send email');
    } finally {
      setIsSending(false);
    }
  };

  const handleSendCustom = async () => {
    if (!subject.trim() || !message.trim()) {
      toast.error('Please fill in subject and message');
      return;
    }

    if (!business) {
      toast.error('Business information not available');
      return;
    }

    setIsSending(true);
    try {
      const result = await EmailService.sendManualEmail({
        to: recipient.email,
        toName: recipient.name,
        subject,
        message,
        businessId: business.id,
        customerId: recipient.id,
        appointmentId,
        businessName: business.name,
        businessPhone: business.phone || '',
      });

      if (result.success) {
        toast.success('Email sent successfully!');
        handleClose();
      } else {
        throw new Error('Failed to send');
      }
    } catch (error) {
      console.error('Email send error:', error);
      toast.error('Failed to send email');
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    if (!isSending) {
      onClose();
      setSelectedTemplate(null);
      setSubject('');
      setMessage('');
      setActiveTab('templates');
    }
  };

  // Filter templates based on whether we have appointment data
  const availableTemplates = EMAIL_TEMPLATES.filter(template => {
    if (template.requiresAppointment && !appointment) {
      return false;
    }
    return true;
  });

  // Templates are available if we have an appointment (either passed or fetched for customer)
  const hasAppointmentTemplates = !!appointment && availableTemplates.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Email
          </DialogTitle>
          <DialogDescription>
            Send an email to {recipient.name} ({recipient.email})
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Appointment Context */}
          {appointment && (
            <div className="mb-4 p-3 bg-muted/50 rounded-lg border">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {appointment.ref_code} - {appointment.service?.name || 'Service'}
                </span>
                <Badge variant="outline" className="ml-auto">
                  {new Date(appointment.scheduled_date).toLocaleDateString()}
                </Badge>
              </div>
            </div>
          )}

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="templates" disabled={!hasAppointmentTemplates}>
                <FileText className="h-4 w-4 mr-2" />
                Email Templates
              </TabsTrigger>
              <TabsTrigger value="custom">
                <PenLine className="h-4 w-4 mr-2" />
                Custom Email
              </TabsTrigger>
            </TabsList>

            <TabsContent value="templates" className="mt-4">
              {loadingAppointment ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : hasAppointmentTemplates ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {availableTemplates.map((template) => {
                    const Icon = template.icon;
                    const isSelected = selectedTemplate === template.id;
                    
                    return (
                      <Card
                        key={template.id}
                        className={`cursor-pointer transition-all hover:border-primary ${
                          isSelected ? 'border-primary ring-2 ring-primary/20' : ''
                        }`}
                        onClick={() => setSelectedTemplate(template.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg ${template.color}`}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm">{template.name}</div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {template.description}
                              </div>
                            </div>
                            {isSelected && (
                              <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">
                    {loadingAppointment 
                      ? 'Loading appointment data...' 
                      : 'No appointments found for this customer.'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Templates require an appointment. You can write a custom email instead.
                  </p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setActiveTab('custom')}
                  >
                    Write Custom Email
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="custom" className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  placeholder="Email subject..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={isSending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Type your message..."
                  rows={8}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={isSending}
                />
                <p className="text-xs text-muted-foreground">
                  Your email will be formatted with your business branding automatically.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSending}>
            Cancel
          </Button>
          {activeTab === 'templates' ? (
            <Button 
              onClick={handleSendTemplate} 
              disabled={isSending || !selectedTemplate}
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Template Email
                </>
              )}
            </Button>
          ) : (
            <Button 
              onClick={handleSendCustom} 
              disabled={isSending || !subject.trim() || !message.trim()}
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Email
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
