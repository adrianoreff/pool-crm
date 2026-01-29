import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, FileText, Copy, Code } from 'lucide-react';
import { 
  EmailTemplateCategory, 
  EmailTemplateRecipientType 
} from '@/types/database';
import { useEmailTemplates, useCreateEmailTemplate } from '@/hooks/useEmailTemplates';

interface CreateTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (templateId: string) => void;
}

type StartFrom = 'blank' | 'copy' | 'html';

export function CreateTemplateModal({ open, onOpenChange, onCreated }: CreateTemplateModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [startFrom, setStartFrom] = useState<StartFrom>('blank');
  const [copyFromId, setCopyFromId] = useState<string>('');
  const [pastedHtml, setPastedHtml] = useState('');
  
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<EmailTemplateCategory>('custom');
  const [recipientType, setRecipientType] = useState<EmailTemplateRecipientType>('customer');
  
  const { data: templates = [] } = useEmailTemplates();
  const createTemplate = useCreateEmailTemplate();

  const resetForm = () => {
    setStep(1);
    setStartFrom('blank');
    setCopyFromId('');
    setPastedHtml('');
    setName('');
    setSlug('');
    setDescription('');
    setSubject('');
    setCategory('custom');
    setRecipientType('customer');
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slug || slug === generateSlug(name)) {
      setSlug(generateSlug(value));
    }
  };

  const handleCreate = async () => {
    let initialHtml = '<p>Start writing your email content here...</p>';
    let initialSubject = subject || 'New Email Template';

    if (startFrom === 'copy' && copyFromId) {
      const sourceTemplate = templates.find(t => t.id === copyFromId);
      if (sourceTemplate) {
        initialHtml = sourceTemplate.body_html;
        if (!subject) {
          initialSubject = `Copy of ${sourceTemplate.subject}`;
        }
      }
    } else if (startFrom === 'html' && pastedHtml) {
      initialHtml = pastedHtml;
    }

    const result = await createTemplate.mutateAsync({
      name,
      slug,
      description,
      category,
      recipient_type: recipientType,
      trigger_event: null,
      subject: initialSubject,
      body_html: initialHtml,
      body_text: null,
      is_active: true,
      is_default: false,
    });

    handleClose();
    if (onCreated && result?.id) {
      onCreated(result.id);
    }
  };

  const canProceedStep1 = () => {
    if (startFrom === 'copy' && !copyFromId) return false;
    if (startFrom === 'html' && !pastedHtml.trim()) return false;
    return true;
  };

  const canCreate = () => {
    return name.trim() && slug.trim() && subject.trim();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step === 1 ? 'Create New Template' : 'Template Details'}
          </DialogTitle>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-6">
            <div className="space-y-3">
              <Label>Start From</Label>
              <RadioGroup 
                value={startFrom} 
                onValueChange={(v) => setStartFrom(v as StartFrom)}
                className="grid grid-cols-3 gap-3"
              >
                <Label
                  htmlFor="blank"
                  className="flex flex-col items-center gap-2 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/5"
                >
                  <RadioGroupItem value="blank" id="blank" className="sr-only" />
                  <FileText className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm font-medium">Blank</span>
                  <span className="text-xs text-muted-foreground text-center">
                    Start from scratch
                  </span>
                </Label>
                
                <Label
                  htmlFor="copy"
                  className="flex flex-col items-center gap-2 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/5"
                >
                  <RadioGroupItem value="copy" id="copy" className="sr-only" />
                  <Copy className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm font-medium">Copy Existing</span>
                  <span className="text-xs text-muted-foreground text-center">
                    Duplicate a template
                  </span>
                </Label>
                
                <Label
                  htmlFor="html"
                  className="flex flex-col items-center gap-2 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/5"
                >
                  <RadioGroupItem value="html" id="html" className="sr-only" />
                  <Code className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm font-medium">From HTML</span>
                  <span className="text-xs text-muted-foreground text-center">
                    Paste your own code
                  </span>
                </Label>
              </RadioGroup>
            </div>

            {startFrom === 'copy' && (
              <div className="space-y-2">
                <Label>Select Template to Copy</Label>
                <Select value={copyFromId} onValueChange={setCopyFromId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {startFrom === 'html' && (
              <div className="space-y-2">
                <Label>Paste HTML Code</Label>
                <Textarea
                  value={pastedHtml}
                  onChange={(e) => setPastedHtml(e.target.value)}
                  placeholder="<div>Your HTML content here...</div>"
                  className="font-mono text-sm min-h-[150px]"
                />
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g., Follow-up Thank You Email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug (unique identifier) *</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="e.g., follow_up_thank_you"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Used to identify this template in the system
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Email Subject *</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g., Thank you for your order - {{business_name}}"
              />
              <p className="text-xs text-muted-foreground">
                You can use variables like {'{{customer_name}}'} in the subject
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of when this email is sent..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select 
                  value={category} 
                  onValueChange={(v) => setCategory(v as EmailTemplateCategory)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="technician">Technician</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Recipient Type</Label>
                <Select 
                  value={recipientType} 
                  onValueChange={(v) => setRecipientType(v as EmailTemplateRecipientType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="technician">Technician</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 1 ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                onClick={() => setStep(2)}
                disabled={!canProceedStep1()}
              >
                Next
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button 
                onClick={handleCreate}
                disabled={!canCreate() || createTemplate.isPending}
              >
                {createTemplate.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Create Template
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
