import { useState, useMemo } from 'react';
import { Receipt, DollarSign, Clock, AlertTriangle, CheckCircle, FileText, Send, Search, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useInvoices, useInvoiceStats, useUpdateInvoiceStatus } from '@/hooks/useInvoices';
import { InvoiceStatus } from '@/types/database';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric',
  });
};

const statusConfig: Record<InvoiceStatus, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  draft: { icon: FileText, color: 'text-muted-foreground', bg: 'bg-muted', label: 'Draft' },
  sent: { icon: Send, color: 'text-info', bg: 'bg-info/10', label: 'Sent' },
  paid: { icon: CheckCircle, color: 'text-success', bg: 'bg-success/10', label: 'Paid' },
  overdue: { icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10', label: 'Overdue' },
  cancelled: { icon: AlertTriangle, color: 'text-muted-foreground', bg: 'bg-muted', label: 'Cancelled' },
};

export default function Invoices() {
  const { data: invoices = [], isLoading } = useInvoices();
  const { stats } = useInvoiceStats();
  const updateStatus = useUpdateInvoiceStatus();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice: any) => {
      const matchesSearch = !searchQuery || 
        invoice.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.customer?.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.customer?.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.customer?.email?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchQuery, statusFilter]);

  const handleMarkAsPaid = (id: string) => {
    updateStatus.mutate({ id, status: 'paid', paidAt: new Date().toISOString() });
  };

  const handleSendInvoice = (id: string) => {
    updateStatus.mutate({ id, status: 'sent' });
  };

  const statCards = [
    { label: 'Total Revenue', value: formatCurrency(stats.totalRevenue), icon: DollarSign, color: 'text-success' },
    { label: 'Pending', value: formatCurrency(stats.pendingAmount), icon: Clock, color: 'text-info' },
    { label: 'Overdue', value: formatCurrency(stats.overdueAmount), icon: AlertTriangle, color: 'text-destructive' },
    { label: 'Paid This Month', value: formatCurrency(stats.paidThisMonth), icon: CheckCircle, color: 'text-primary' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground">Manage billing and payments</p>
        </div>
        <Button className="bg-primary hover:bg-primary-hover">
          <Plus className="h-4 w-4 mr-2" />
          New Invoice
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="shadow-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn('rounded-lg p-2', stat.color.replace('text-', 'bg-') + '/10')}>
                <stat.icon className={cn('h-5 w-5', stat.color)} />
              </div>
              <div>
                <p className="text-lg font-bold">{isLoading ? '-' : stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Status Counts */}
      <div className="flex gap-2">
        {Object.entries(statusConfig).map(([status, config]) => {
          const count = status === 'draft' ? stats.draftCount :
                        status === 'sent' ? stats.sentCount :
                        status === 'paid' ? stats.paidCount :
                        status === 'overdue' ? stats.overdueCount : 0;
          return (
            <Button
              key={status}
              variant={statusFilter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
              className="gap-1"
            >
              <config.icon className="h-3 w-3" />
              {config.label}
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {count}
              </Badge>
            </Button>
          );
        })}
      </div>

      {/* Filters */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by invoice #, customer name, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card className="shadow-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="hidden md:table-cell">Issue Date</TableHead>
                <TableHead className="hidden md:table-cell">Due Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-40" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                  </TableRow>
                ))
              ) : filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <Receipt className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      {invoices.length === 0 ? 'No invoices yet' : 'No invoices match your filters'}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices.map((invoice: any) => {
                  const statusInfo = statusConfig[invoice.status as InvoiceStatus] || statusConfig.draft;
                  const StatusIcon = statusInfo.icon;
                  
                  return (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-mono font-medium">
                        {invoice.invoice_number || '-'}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {invoice.customer 
                              ? `${invoice.customer.first_name} ${invoice.customer.last_name || ''}`
                              : 'Unknown'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {invoice.customer?.email || '-'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {formatDate(invoice.issue_date)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {formatDate(invoice.due_date)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(Number(invoice.total) || 0)}
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
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              Actions
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <FileText className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {invoice.status === 'draft' && (
                              <DropdownMenuItem onClick={() => handleSendInvoice(invoice.id)}>
                                <Send className="h-4 w-4 mr-2" />
                                Send to Customer
                              </DropdownMenuItem>
                            )}
                            {(invoice.status === 'sent' || invoice.status === 'overdue') && (
                              <DropdownMenuItem onClick={() => handleMarkAsPaid(invoice.id)}>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Mark as Paid
                              </DropdownMenuItem>
                            )}
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
    </div>
  );
}
