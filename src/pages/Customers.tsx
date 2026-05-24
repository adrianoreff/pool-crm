import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Plus,
  Upload,
  MoreHorizontal,
  Phone,
  Mail,
  MapPin,
  Edit,
  Trash,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
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
import { formatAppointmentDate } from '@/lib/utils';
import {
  matchesCustomerStatusFilter,
  getCustomerDisplayStatus,
  CUSTOMER_STATUS_LABELS,
  type CustomerStatusFilter,
} from '@/lib/customer-status';
import { cn } from '@/lib/utils';
import { useCustomers, useDeleteCustomer } from '@/hooks/useCustomers';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCustomersLatestEmailStatus } from '@/hooks/useLatestEmailStatus';
import { CustomerWithAddresses } from '@/types/database';
import { AddCustomerModal, EditCustomerModal, SendEmailModal, ImportCustomersModal } from '@/components/modals';
import { EmailStatusBadge } from '@/components/ui/email-status-badge';

const formatCurrency = (amount: number | null) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount || 0);
};

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return 'Never';
  return formatAppointmentDate(dateStr);
};

const getInitials = (firstName: string, lastName: string | null) => {
  return `${firstName[0]}${lastName?.[0] || ''}`.toUpperCase();
};

export default function Customers() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<CustomerStatusFilter>('all');
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isEditCustomerOpen, setIsEditCustomerOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<CustomerWithAddresses | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<string | null>(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState<{ id: string; name: string; email: string } | null>(null);

  const { data: allCustomers = [], isLoading } = useCustomers({
    search: searchQuery,
  });
  const deleteCustomer = useDeleteCustomer();

  const customers = useMemo(
    () => allCustomers.filter((c) => matchesCustomerStatusFilter(c, statusFilter)),
    [allCustomers, statusFilter]
  );

  // Get customer IDs for email status lookup
  const customerIds = customers.map(c => c.id);
  const { data: emailStatusMap = {} } = useCustomersLatestEmailStatus(customerIds);

  const handleEditCustomer = (customer: CustomerWithAddresses) => {
    setCustomerToEdit(customer);
    setIsEditCustomerOpen(true);
  };

  const handleDeleteClick = (customerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCustomerToDelete(customerId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (customerToDelete) {
      deleteCustomer.mutate(customerToDelete);
    }
    setDeleteDialogOpen(false);
    setCustomerToDelete(null);
  };

  const handleSendEmail = (customer: CustomerWithAddresses, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!customer.email) return;
    setEmailRecipient({
      id: customer.id,
      name: `${customer.first_name} ${customer.last_name || ''}`.trim(),
      email: customer.email,
    });
    setIsEmailModalOpen(true);
  };

  const handleCall = (customer: CustomerWithAddresses, e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`tel:${customer.phone}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground">{customers.length} customers in your database</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setIsImportOpen(true)}>
            <Upload className="h-4 w-4" />
            Import CSV
          </Button>
          <Button className="gap-2 bg-primary hover:bg-primary-hover" onClick={() => setIsAddCustomerOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Search & Filter */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[250px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name, phone, email, or address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full sm:w-56">
              <Label htmlFor="customer-status-filter" className="sr-only">
                Status
              </Label>
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as CustomerStatusFilter)}
              >
                <SelectTrigger id="customer-status-filter" className="w-full">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active Customers</SelectItem>
                  <SelectItem value="inactive">Inactive Customers</SelectItem>
                  <SelectItem value="lead">Lead Customers</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="shadow-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="hidden md:table-cell">Address</TableHead>
                <TableHead className="hidden sm:table-cell">Status</TableHead>
                <TableHead className="hidden lg:table-cell">Last Service</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead className="text-right hidden sm:table-cell">Total Spent</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-full" /><div><Skeleton className="h-4 w-24 mb-1" /><Skeleton className="h-3 w-20" /></div></div></TableCell>
                    <TableCell><Skeleton className="h-8 w-32" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell className="text-center hidden sm:table-cell"><Skeleton className="h-6 w-8 mx-auto" /></TableCell>
                    <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="text-right hidden sm:table-cell"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center">
                      <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground">No customers found</p>
                      <Button className="mt-4" onClick={() => setIsAddCustomerOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Your First Customer
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((customer) => {
                  return (
                    <TableRow 
                      key={customer.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/customers/${customer.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary/10 text-primary font-medium">
                              {getInitials(customer.first_name, customer.last_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {customer.first_name} {customer.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Customer since {formatDate(customer.created_at)}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="text-sm flex items-center gap-1.5">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            {customer.phone}
                          </p>
                          <p className="text-sm flex items-center gap-1.5 text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            <span className="truncate max-w-[150px]">{customer.email || 'No email'}</span>
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {(customer.address || customer.city) ? (
                          <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            <span className="truncate max-w-[200px]">
                              {[customer.address, customer.city, customer.state].filter(Boolean).join(', ')}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {(() => {
                          const status = getCustomerDisplayStatus(customer);
                          return (
                            <span
                              className={cn(
                                'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
                                status === 'active' && 'bg-emerald-100 text-emerald-800',
                                status === 'inactive' && 'bg-slate-100 text-slate-600',
                                status === 'lead' && 'bg-amber-100 text-amber-800'
                              )}
                            >
                              {CUSTOMER_STATUS_LABELS[status]}
                            </span>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-sm text-muted-foreground">
                          {formatDate(customer.last_appointment_at)}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {emailStatusMap[customer.id] ? (
                          <EmailStatusBadge status={emailStatusMap[customer.id].status as any} />
                        ) : (
                          <span className="text-xs text-muted-foreground">No emails</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right hidden sm:table-cell">
                        <span className="font-medium">{formatCurrency(customer.total_spent)}</span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => handleCall(customer, e)}>
                              <Phone className="mr-2 h-4 w-4" />
                              Call
                            </DropdownMenuItem>
                            {customer.email && (
                              <DropdownMenuItem onClick={(e) => handleSendEmail(customer, e)}>
                                <Mail className="mr-2 h-4 w-4" />
                                Email
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/customers/${customer.id}`); }}>
                              <ChevronRight className="mr-2 h-4 w-4" />
                              View Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditCustomer(customer); }}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={(e) => handleDeleteClick(customer.id, e)}
                            >
                              <Trash className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modals */}
      <AddCustomerModal 
        open={isAddCustomerOpen} 
        onOpenChange={setIsAddCustomerOpen} 
      />
      <ImportCustomersModal open={isImportOpen} onOpenChange={setIsImportOpen} />
      <EditCustomerModal
        open={isEditCustomerOpen}
        onOpenChange={setIsEditCustomerOpen}
        customer={customerToEdit}
      />

      {/* Email Modal */}
      {emailRecipient && (
        <SendEmailModal
          isOpen={isEmailModalOpen}
          onClose={() => {
            setIsEmailModalOpen(false);
            setEmailRecipient(null);
          }}
          recipient={emailRecipient}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this customer? This action cannot be undone and will remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              Delete Customer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
