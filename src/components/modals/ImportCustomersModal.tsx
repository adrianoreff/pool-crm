import { useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Upload, Download, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  parseCustomerCsv,
  CUSTOMER_CSV_TEMPLATE,
  type ParsedCsvImport,
} from '@/lib/csv/customer-import';
import { useImportCustomers } from '@/hooks/useImportCustomers';

interface ImportCustomersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportCustomersModal({ open, onOpenChange }: ImportCustomersModalProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedCsvImport | null>(null);
  const importCustomers = useImportCustomers();

  const reset = () => {
    setFileName(null);
    setParsed(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleFile = async (file: File) => {
    const text = await file.text();
    const result = parseCustomerCsv(text);
    setFileName(file.name);
    setParsed(result);
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([CUSTOMER_CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pool-crm-customers-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (!parsed?.rows.length) return;
    try {
      const count = await importCustomers.mutateAsync(parsed.rows);
      toast({
        title: 'Import complete',
        description: `${count} customer${count === 1 ? '' : 's'} imported successfully.`,
      });
      handleClose(false);
    } catch (e) {
      toast({
        title: 'Import failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const preview = parsed?.rows.slice(0, 5) ?? [];
  const canImport = (parsed?.rows.length ?? 0) > 0 && !importCustomers.isPending;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Import customers from CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden">
          <p className="text-sm text-muted-foreground">
            Expected columns: FirstName, LastName, Email, Address Line 1, Postal Code, City, State,
            Country, Phone, Status, List (or Lists). Empty phone cells are imported with a temporary
            number — update them later in the customer profile.
          </p>

          <div className="flex flex-wrap gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
              }}
            />
            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              Choose CSV file
            </Button>
            <Button type="button" variant="ghost" onClick={handleDownloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Download template
            </Button>
          </div>

          {fileName && (
            <p className="text-sm">
              File: <span className="font-medium">{fileName}</span>
            </p>
          )}

          {parsed && (
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {parsed.rows.length} ready to import
              </Badge>
              {parsed.errors.length > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {parsed.errors.length} row errors
                </Badge>
              )}
              {parsed.skipped > 0 && (
                <Badge variant="outline">{parsed.skipped} empty rows skipped</Badge>
              )}
              {parsed.rows.some((r) => r.notes?.includes('Phone missing')) && (
                <Badge variant="outline" className="text-amber-700 border-amber-300">
                  Some rows imported without phone — update in customer profile
                </Badge>
              )}
            </div>
          )}

          {parsed && parsed.errors.length > 0 && (
            <ScrollArea className="h-24 rounded border p-2 bg-destructive/5">
              <ul className="text-xs text-destructive space-y-1">
                {parsed.errors.slice(0, 20).map((e, i) => (
                  <li key={i}>{e.message}</li>
                ))}
                {parsed.errors.length > 20 && (
                  <li>…and {parsed.errors.length - 20} more</li>
                )}
              </ul>
            </ScrollArea>
          )}

          {preview.length > 0 && (
            <ScrollArea className="h-[220px] rounded border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>List</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs">
                        {r.first_name} {r.last_name}
                      </TableCell>
                      <TableCell className="text-xs">{r.phone}</TableCell>
                      <TableCell className="text-xs">{r.city}</TableCell>
                      <TableCell className="text-xs">{r.tags?.[0] ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {parsed && parsed.rows.length > 5 && (
                <p className="text-xs text-muted-foreground p-2 border-t">
                  Previewing 5 of {parsed.rows.length} rows
                </p>
              )}
            </ScrollArea>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={importCustomers.isPending}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!canImport}>
            {importCustomers.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Import {parsed?.rows.length ?? 0} customers
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
