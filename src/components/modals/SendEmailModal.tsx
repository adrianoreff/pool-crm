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
import { formatAppointmentDate } from '@/lib/utils';
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
  | 'invoice_sent'
  | 'follow_up'
  | 'tech_new_assignment'
  | 'tech_assignment_changed'
  | 'tech_assignment_cancelled'
  | 'admin_new_appointment'
  | 'admin_appointment_cancelled'
  | 'custom';

interface EmailTemplate {
  id: EmailTemplateType;
  name: string;
  description: string;
  icon: React.ElementType;
  colorClassName: string;
  requiresAppointment: boolean;
  category: 'customer' | 'technician' | 'admin';
}

const EMAIL_TEMPLATES: EmailTemplate[] = [
  // Customer templates
  {
    id: 'appointment_request_received',
    name: 'Request Received',
    description: 'Confirm booking request was received',
    icon: FileText,
    colorClassName: 'text-muted-foreground bg-muted',
    requiresAppointment: false,
    category: 'customer',
  },
  {
    id: 'appointment_confirmed',
    name: 'Appointment Confirmation',
    description: 'Confirm appointment details with the customer',
    icon: CheckCircle2,
    colorClassName: 'text-primary bg-primary/10',
    requiresAppointment: true,
    category: 'customer',
  },
  {
    id: 'appointment_reminder_24h',
    name: 'Reminder (24 hours)',
    description: 'Remind customer about appointment tomorrow',
    icon: Clock,
    colorClassName: 'text-accent-foreground bg-accent/40',
    requiresAppointment: true,
    category: 'customer',
  },
  {
    id: 'appointment_reminder_1h',
    name: 'Reminder (1 hour)',
    description: 'Final reminder before appointment',
    icon: Bell,
    colorClassName: 'text-accent-foreground bg-accent/40',
    requiresAppointment: true,
    category: 'customer',
  },
  {
    id: 'appointment_rescheduled',
    name: 'Appointment Rescheduled',
    description: 'Notify about appointment date/time change',
    icon: Calendar,
    colorClassName: 'text-secondary-foreground bg-secondary',
    requiresAppointment: true,
    category: 'customer',
  },
  {
    id: 'appointment_cancelled',
    name: 'Appointment Cancelled',
    description: 'Confirm appointment cancellation',
    icon: XCircle,
    colorClassName: 'text-destructive bg-destructive/10',
    requiresAppointment: true,
    category: 'customer',
  },
  {
    id: 'technician_en_route',
    name: 'Technician En Route',
    description: 'Let customer know technician is on the way',
    icon: Truck,
    colorClassName: 'text-primary bg-primary/10',
    requiresAppointment: true,
    category: 'customer',
  },
  {
    id: 'appointment_completed',
    name: 'Service Completed',
    description: 'Thank customer after service completion',
    icon: Star,
    colorClassName: 'text-primary bg-primary/10',
    requiresAppointment: true,
    category: 'customer',
  },
  {
    id: 'invoice_sent',
    name: 'Invoice Sent',
    description: 'Send invoice to customer',
    icon: FileText,
    colorClassName: 'text-primary bg-primary/10',
    requiresAppointment: false,
    category: 'customer',
  },
  {
    id: 'follow_up',
    name: 'Follow-up',
    description: 'Check in after service (3-7 days later)',
    icon: Mail,
    colorClassName: 'text-muted-foreground bg-muted',
    requiresAppointment: true,
    category: 'customer',
  },
  // Technician templates
  {
    id: 'tech_new_assignment',
    name: 'New Assignment',
    description: 'Notify technician of new service assignment',
    icon: Bell,
    colorClassName: 'text-secondary-foreground bg-secondary',
    requiresAppointment: true,
    category: 'technician',
  },
  {
    id: 'tech_assignment_changed',
    name: 'Assignment Changed',
    description: 'Notify technician of schedule change',
    icon: Calendar,
    colorClassName: 'text-accent-foreground bg-accent/40',
    requiresAppointment: true,
    category: 'technician',
  },
  {
    id: 'tech_assignment_cancelled',
    name: 'Assignment Cancelled',
    description: 'Notify technician of cancelled service',
    icon: XCircle,
    colorClassName: 'text-destructive bg-destructive/10',
    requiresAppointment: true,
    category: 'technician',
  },
  // Admin templates
  {
    id: 'admin_new_appointment',
    name: 'Admin: New Appointment',
    description: 'Notify admin of new booking',
    icon: Bell,
    colorClassName: 'text-primary bg-primary/10',
    requiresAppointment: true,
    category: 'admin',
  },
  {
    id: 'admin_appointment_cancelled',
    name: 'Admin: Appointment Cancelled',
    description: 'Notify admin of cancellation',
    icon: XCircle,
    colorClassName: 'text-destructive bg-destructive/10',
    requiresAppointment: true,
    category: 'admin',
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
  const [leadServiceName, setLeadServiceName] = useState('');
  const [leadRequestedDate, setLeadRequestedDate] = useState('');

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
            technician:users!appointments_technician_id_fkey(*)
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

    // Some templates can be sent without an appointment (e.g. lead/customer initial contact)
    const templateMeta = EMAIL_TEMPLATES.find((t) => t.id === selectedTemplate);
    const requiresAppointment = templateMeta?.requiresAppointment ?? true;
    const canSendWithoutAppointment = selectedTemplate === 'appointment_request_received' || selectedTemplate === 'invoice_sent';

    if (!appointment && requiresAppointment && !canSendWithoutAppointment) {
      toast.error('This template requires an appointment.');
      return;
    }

    // Check technician/admin templates have correct recipient
    const isTechTemplate = templateMeta?.category === 'technician';
    const isAdminTemplate = templateMeta?.category === 'admin';

    if (isTechTemplate && !appointment?.technician?.email) {
      toast.error('This appointment has no technician assigned.');
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
        // Customer templates
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
          if (appointment) {
            result = await EmailService.sendAppointmentRequestReceived(appointment, businessData);
          } else {
            if (!leadServiceName.trim() || !leadRequestedDate.trim()) {
              toast.error('Please fill service and requested date');
              setIsSending(false);
              return;
            }
            result = await EmailService.sendAppointmentRequestReceivedLead({
              to: recipient.email,
              toName: recipient.name,
              customerId: recipient.id,
              serviceName: leadServiceName.trim(),
              requestedDate: leadRequestedDate.trim(),
              business: businessData,
            });
          }
          break;
        case 'invoice_sent':
          result = await EmailService.sendInvoiceSent({
            customerEmail: recipient.email,
            customerName: recipient.name,
            customerId: recipient.id,
            invoiceNumber: 'INV-PENDING',
            invoiceTotal: '$0.00',
            business: businessData,
            appointmentId: appointment?.id,
          });
          break;
        case 'follow_up':
          result = await EmailService.sendFollowUp(appointment, businessData);
          break;
        // Technician templates
        case 'tech_new_assignment':
          result = await EmailService.sendTechNewAssignment(appointment, businessData);
          break;
        case 'tech_assignment_changed':
          result = await EmailService.sendTechAssignmentChanged(
            appointment,
            businessData,
            appointment.scheduled_date,
            appointment.scheduled_start_time,
            appointment.scheduled_end_time
          );
          break;
        case 'tech_assignment_cancelled':
          result = await EmailService.sendTechAssignmentCancelled(appointment, businessData);
          break;
        // Admin templates
        case 'admin_new_appointment':
          result = await EmailService.sendAdminNewAppointment(
            appointment,
            businessData,
            business.email || recipient.email,
            'Admin'
          );
          break;
        case 'admin_appointment_cancelled':
          result = await EmailService.sendAdminAppointmentCancelled(
            appointment,
            businessData,
            business.email || recipient.email,
            'Admin'
          );
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
      setLeadServiceName('');
      setLeadRequestedDate('');
    }
  };

  const templates = EMAIL_TEMPLATES;

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
                  {formatAppointmentDate(appointment.scheduled_date)}
                </Badge>
              </div>
            </div>
          )}

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="templates">
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
              ) : (
                <div className="space-y-4">
                  {/* Customer Templates */}
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Customer Emails</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {templates.filter(t => t.category === 'customer').map((template) => {
                        const Icon = template.icon;
                        const isSelected = selectedTemplate === template.id;
                        const isEnabled = !template.requiresAppointment || !!appointment;

                        return (
                          <Card
                            key={template.id}
                            className={`transition-all hover:border-primary ${
                              isSelected ? 'border-primary ring-2 ring-primary/20' : ''
                            } ${isEnabled ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}
                            onClick={() => {
                              if (!isEnabled) return;
                              setSelectedTemplate(template.id);
                            }}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-start gap-2">
                                <div className={`p-1.5 rounded-lg ${template.colorClassName}`}>
                                  <Icon className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm">{template.name}</div>
                                  <div className="text-xs text-muted-foreground">{template.description}</div>
                                </div>
                                {isSelected && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>

                  {/* Technician Templates */}
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Technician Emails</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {templates.filter(t => t.category === 'technician').map((template) => {
                        const Icon = template.icon;
                        const isSelected = selectedTemplate === template.id;
                        const hasTechnician = !!appointment?.technician?.email;
                        const isEnabled = (!template.requiresAppointment || !!appointment) && hasTechnician;

                        return (
                          <Card
                            key={template.id}
                            className={`transition-all hover:border-primary ${
                              isSelected ? 'border-primary ring-2 ring-primary/20' : ''
                            } ${isEnabled ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}
                            onClick={() => {
                              if (!isEnabled) return;
                              setSelectedTemplate(template.id);
                            }}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-start gap-2">
                                <div className={`p-1.5 rounded-lg ${template.colorClassName}`}>
                                  <Icon className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm">{template.name}</div>
                                  <div className="text-xs text-muted-foreground">{template.description}</div>
                                </div>
                                {isSelected && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                    {!appointment?.technician?.email && (
                      <p className="text-xs text-muted-foreground mt-1">Technician templates require an assigned technician.</p>
                    )}
                  </div>

                  {/* Admin Templates */}
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Admin Emails</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {templates.filter(t => t.category === 'admin').map((template) => {
                        const Icon = template.icon;
                        const isSelected = selectedTemplate === template.id;
                        const isEnabled = !template.requiresAppointment || !!appointment;

                        return (
                          <Card
                            key={template.id}
                            className={`transition-all hover:border-primary ${
                              isSelected ? 'border-primary ring-2 ring-primary/20' : ''
                            } ${isEnabled ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}
                            onClick={() => {
                              if (!isEnabled) return;
                              setSelectedTemplate(template.id);
                            }}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-start gap-2">
                                <div className={`p-1.5 rounded-lg ${template.colorClassName}`}>
                                  <Icon className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm">{template.name}</div>
                                  <div className="text-xs text-muted-foreground">{template.description}</div>
                                </div>
                                {isSelected && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>

                  {/* Lead fields for Request Received when there is no appointment yet */}
                  {selectedTemplate === 'appointment_request_received' && !appointment && (
                    <div className="md:col-span-2 mt-2 p-4 border rounded-lg bg-muted/40">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="leadService">Service</Label>
                          <Input
                            id="leadService"
                            placeholder="e.g. Plumbing / Electrical"
                            value={leadServiceName}
                            onChange={(e) => setLeadServiceName(e.target.value)}
                            disabled={isSending}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="leadDate">Preferred date/time</Label>
                          <Input
                            id="leadDate"
                            placeholder="e.g. Tomorrow morning"
                            value={leadRequestedDate}
                            onChange={(e) => setLeadRequestedDate(e.target.value)}
                            disabled={isSending}
                          />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-3">
                        This template can be sent even without an appointment.
                      </p>
                    </div>
                  )}

                  {!appointment && (
                    <div className="md:col-span-2 text-xs text-muted-foreground">
                      Tip: Appointment-based templates are disabled because this customer has no appointment yet.
                      You can still send “Request Received” or use “Custom Email”.
                    </div>
                  )}
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
              disabled={
                isSending ||
                !selectedTemplate ||
                (EMAIL_TEMPLATES.find((t) => t.id === selectedTemplate)?.requiresAppointment && !appointment) ||
                (selectedTemplate === 'appointment_request_received' && !appointment && (!leadServiceName.trim() || !leadRequestedDate.trim()))
              }
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
