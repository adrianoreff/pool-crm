import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Monitor, Smartphone, Send, Loader2 } from 'lucide-react';
import { 
  replaceVariables, 
  SAMPLE_TEMPLATE_DATA, 
  useSendTestEmail 
} from '@/hooks/useEmailTemplates';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface TemplatePreviewProps {
  subject: string;
  bodyHtml: string;
  className?: string;
}

export function TemplatePreview({ subject, bodyHtml, className }: TemplatePreviewProps) {
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [testEmail, setTestEmail] = useState('');
  const [showTestForm, setShowTestForm] = useState(false);
  
  const { profile } = useAuth();
  const sendTestEmail = useSendTestEmail();

  // Replace variables with sample data
  const previewSubject = replaceVariables(subject, SAMPLE_TEMPLATE_DATA);
  const previewHtml = replaceVariables(bodyHtml, SAMPLE_TEMPLATE_DATA);

  const handleSendTest = async () => {
    if (!testEmail) return;
    
    await sendTestEmail.mutateAsync({
      to: testEmail,
      subject: previewSubject,
      html: previewHtml,
    });
    
    setShowTestForm(false);
    setTestEmail('');
  };

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Live Preview</CardTitle>
          <div className="flex items-center gap-2">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'desktop' | 'mobile')}>
              <TabsList className="h-8">
                <TabsTrigger value="desktop" className="h-6 px-2">
                  <Monitor className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger value="mobile" className="h-6 px-2">
                  <Smartphone className="h-4 w-4" />
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowTestForm(!showTestForm)}
            >
              <Send className="h-4 w-4 mr-1" />
              Test
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Variables are replaced with sample data
        </p>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3">
        {/* Test Email Form */}
        {showTestForm && (
          <div className="flex items-end gap-2 p-3 bg-muted rounded-lg">
            <div className="flex-1">
              <Label htmlFor="test-email" className="text-xs">Send test to:</Label>
              <Input
                id="test-email"
                type="email"
                placeholder="email@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="h-8 mt-1"
                defaultValue={profile?.email || ''}
              />
            </div>
            <Button 
              size="sm" 
              onClick={handleSendTest}
              disabled={!testEmail || sendTestEmail.isPending}
            >
              {sendTestEmail.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Send'
              )}
            </Button>
          </div>
        )}

        {/* Subject Preview */}
        <div className="p-2 bg-muted rounded border">
          <p className="text-xs text-muted-foreground mb-1">Subject:</p>
          <p className="text-sm font-medium">{previewSubject}</p>
        </div>

        {/* Email Body Preview */}
        <div 
          className={cn(
            'flex-1 border rounded-lg overflow-hidden bg-white',
            viewMode === 'mobile' ? 'max-w-[375px] mx-auto' : 'w-full'
          )}
        >
          <div className="h-full overflow-auto">
            <iframe
              srcDoc={`
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1">
                  <style>
                    body { margin: 0; padding: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
                  </style>
                </head>
                <body>${previewHtml}</body>
                </html>
              `}
              className="w-full h-full min-h-[400px] border-0"
              title="Email Preview"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Simple inline preview without card wrapper
export function InlinePreview({ 
  subject, 
  bodyHtml,
  className 
}: { 
  subject: string; 
  bodyHtml: string;
  className?: string;
}) {
  const previewSubject = replaceVariables(subject, SAMPLE_TEMPLATE_DATA);
  const previewHtml = replaceVariables(bodyHtml, SAMPLE_TEMPLATE_DATA);

  return (
    <div className={cn('border rounded-lg overflow-hidden bg-white', className)}>
      <div className="p-3 border-b bg-muted/50">
        <p className="text-xs text-muted-foreground">Subject:</p>
        <p className="text-sm font-medium">{previewSubject}</p>
      </div>
      <iframe
        srcDoc={`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { margin: 0; padding: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
            </style>
          </head>
          <body>${previewHtml}</body>
          </html>
        `}
        className="w-full min-h-[300px] border-0"
        title="Email Preview"
      />
    </div>
  );
}
