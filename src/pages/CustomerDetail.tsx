import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  Edit,
  Clock,
  FileText,
  ArrowLeft,
  KeyRound,
  Dog,
  Droplets,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn, formatAppointmentDate } from '@/lib/utils';
import { useCustomer, useCustomerAppointments, useUpdateCustomer } from '@/hooks/useCustomers';
import {
  getCustomerDisplayStatus,
  CUSTOMER_STATUS_LABELS,
  CUSTOMER_STATUS_COLORS,
  applyCustomerStatus,
  type CustomerDisplayStatus,
} from '@/lib/customer-status';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCustomerEmailLogs } from '@/hooks/useEmailLogs';
import { EditCustomerModal, SendEmailModal } from '@/components/modals';
import { CustomerRouteCard } from '@/components/customers/CustomerRouteCard';
import { CustomerServiceHistory } from '@/components/customers/CustomerServiceHistory';
import { CustomerPoolInfoCard } from '@/components/customers/CustomerPoolInfoCard';
import { EmailStatusBadge } from '@/components/ui/email-status-badge';
import { Loader2, AlertCircle } from 'lucide-react';

const formatCurrency = (amount: number | null) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount || 0);
};

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return 'Never';
  const datePart = dateStr.includes('T') ? dateStr.split('T')[0]! : dateStr.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
  return formatAppointmentDate(datePart);
};

const getInitials = (firstName: string, lastName: string | null) => {
  return `${firstName[0]}${lastName?.[0] || ''}`.toUpperCase();
};

const formatEmailDate = (dateStr: string | null) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const getEmailTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    'appointment_confirmation': 'Confirmation',
    'appointment_reminder': 'Reminder',
    'appointment_rescheduled': 'Rescheduled',
    'appointment_cancelled': 'Cancelled',
    'appointment_completed': 'Completed',
    'technician_en_route': 'Tech En Route',
    'custom_email': 'Manual Email',
    'pool_service_report': 'Pool service report',
  };
  return labels[type] || type.replace(/_/g, ' ');
};

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: customer, isLoading, error } = useCustomer(id || '');
  const { data: appointments = [], isLoading: appointmentsLoading } = useCustomerAppointments(id || '');
  const { data: emailLogs = [], isLoading: emailsLoading } = useCustomerEmailLogs(id || '');
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const updateCustomer = useUpdateCustomer();

  const handleStatusChange = (status: CustomerDisplayStatus) => {
    if (!customer) return;
    const fields = applyCustomerStatus(status);
    updateCustomer.mutate({
      id: customer.id,
      customer_status: fields.customer_status,
      is_active: fields.is_active,
    });
  };

  const handleCall = () => {
    if (customer?.phone) {
      window.open(`tel:${customer.phone}`);
    }
  };

  const handleSendEmail = () => {
    if (!customer?.email) return;
    setIsEmailModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <div className="text-center">
          <h2 className="text-xl font-semibold">Customer not found</h2>
          <p className="text-muted-foreground mt-2">
            The customer you're looking for doesn't exist or you don't have access to it.
          </p>
          <Button onClick={() => navigate('/customers')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Customers
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/customers')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-primary/10 text-primary text-xl font-medium">
              {getInitials(customer.first_name, customer.last_name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold">
                {customer.first_name} {customer.last_name}
              </h1>
              <Badge
                variant="outline"
                className={cn('text-xs', CUSTOMER_STATUS_COLORS[getCustomerDisplayStatus(customer)])}
              >
                {CUSTOMER_STATUS_LABELS[getCustomerDisplayStatus(customer)]}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Customer since {formatDate(customer.created_at)}
            </p>
            {customer.tags && customer.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {customer.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={getCustomerDisplayStatus(customer)}
            onValueChange={(v) => handleStatusChange(v as CustomerDisplayStatus)}
            disabled={updateCustomer.isPending}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(CUSTOMER_STATUS_LABELS) as CustomerDisplayStatus[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {CUSTOMER_STATUS_LABELS[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setIsEditModalOpen(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="gap-2">
            <FileText className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="pool" className="gap-2">
            <Droplets className="h-4 w-4" />
            Service History
          </TabsTrigger>
          <TabsTrigger value="emails" className="gap-2">
            <Mail className="h-4 w-4" />
            Email History
            {emailLogs.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">
                {emailLogs.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="shadow-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Calendar className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{customer.total_appointments || 0}</p>
                    <p className="text-xs text-muted-foreground">Appointments</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-success/10 p-2">
                    <DollarSign className="h-4 w-4 text-success" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{formatCurrency(customer.total_spent)}</p>
                    <p className="text-xs text-muted-foreground">Total Spent</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <CustomerRouteCard
            customerId={customer.id}
            customerName={`${customer.first_name} ${customer.last_name || ''}`.trim()}
          />

          <CustomerPoolInfoCard customerId={customer.id} />

          {/* Contact Info */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Contact Information</h3>
            <Card className="shadow-card">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{customer.phone}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleCall}>Call</Button>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{customer.email || 'No email'}</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    disabled={!customer.email} 
                    onClick={handleSendEmail}
                  >
                    Email
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Primary address + gate / dog */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Primary Address</h3>
            <Card className="shadow-card">
              <CardContent className="p-4 space-y-4">
                {(customer.address || customer.city || customer.state || customer.zip_code) ? (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      {customer.address && <p className="font-medium">{customer.address}</p>}
                      <p className="text-sm text-muted-foreground">
                        {[customer.city, customer.state, customer.zip_code].filter(Boolean).join(', ')}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No street address on file</p>
                )}

                {(customer.gate_code || customer.dog_name) && <Separator />}

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex items-start gap-3">
                    <KeyRound className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Gate code
                      </p>
                      <p className="text-sm font-medium mt-0.5">
                        {customer.gate_code || (
                          <span className="text-muted-foreground font-normal">Not set</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Dog className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Dog&apos;s name
                      </p>
                      <p className="text-sm font-medium mt-0.5">
                        {customer.dog_name || (
                          <span className="text-muted-foreground font-normal">Not set</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {!customer.gate_code && !customer.dog_name && (
                  <p className="text-xs text-muted-foreground">
                    Use Edit to add gate code or dog information for technicians.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Additional Addresses - From customer_addresses table */}
          {customer.customer_addresses && customer.customer_addresses.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3">Service Addresses</h3>
              <div className="space-y-2">
                {customer.customer_addresses.map((address) => (
                  <Card key={address.id} className="shadow-card">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="font-medium">{address.address}</p>
                            <p className="text-sm text-muted-foreground">
                              {address.city}, {address.state} {address.zip_code}
                            </p>
                          </div>
                        </div>
                        {address.is_primary && (
                          <Badge variant="secondary" className="text-xs">Primary</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {customer.notes && (
            <div>
              <h3 className="text-sm font-semibold mb-3">Notes</h3>
              <Card className="shadow-card">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{customer.notes}</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Appointment History */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Appointment History</h3>
            <div className="space-y-2">
              {appointmentsLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="shadow-card">
                    <CardContent className="p-4">
                      <Skeleton className="h-4 w-32 mb-2" />
                      <Skeleton className="h-3 w-24" />
                    </CardContent>
                  </Card>
                ))
              ) : appointments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No appointments yet</p>
              ) : (
                appointments.slice(0, 10).map((apt) => (
                  <Card 
                    key={apt.id} 
                    className="shadow-card hover:shadow-elevated cursor-pointer transition-shadow"
                    onClick={() => navigate(`/appointments?appointmentId=${apt.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{apt.service?.name || 'Service'}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(apt.scheduled_date)}
                          </p>
                        </div>
                        <Badge variant="outline" className={cn(
                          apt.status === 'completed' && 'bg-success/10 text-success',
                          apt.status === 'cancelled' && 'bg-destructive/10 text-destructive',
                          apt.status === 'scheduled' && 'bg-info/10 text-info',
                        )}>
                          {apt.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="pool" className="space-y-4">
          <CustomerServiceHistory customerId={customer.id} />
        </TabsContent>

        <TabsContent value="emails" className="space-y-3">
          {emailsLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="shadow-card">
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-48 mb-2" />
                  <Skeleton className="h-3 w-32 mb-2" />
                  <Skeleton className="h-5 w-20" />
                </CardContent>
              </Card>
            ))
          ) : emailLogs.length === 0 ? (
            <div className="text-center py-8">
              <Mail className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No emails sent to this customer yet</p>
            </div>
          ) : (
            emailLogs.map((email) => (
              <Card key={email.id} className="shadow-card">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{email.subject}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs capitalize">
                          {getEmailTypeLabel(email.email_type)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{formatEmailDate(email.sent_at || email.created_at)}</span>
                      </div>
                    </div>
                    <EmailStatusBadge status={email.status as 'queued' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed'} />
                  </div>
                  {email.error_message && (
                    <div className="mt-2 p-2 bg-destructive/10 rounded text-xs text-destructive">
                      {email.error_message}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <EditCustomerModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        customer={customer}
      />

      {customer.email && (
        <SendEmailModal
          isOpen={isEmailModalOpen}
          onClose={() => setIsEmailModalOpen(false)}
          recipient={{
            id: customer.id,
            name: `${customer.first_name} ${customer.last_name || ''}`.trim(),
            email: customer.email,
          }}
        />
      )}
    </div>
  );
}
