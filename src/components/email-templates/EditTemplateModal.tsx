import { useState, useRef, useEffect } from 'react';
import { Editor } from '@tiptap/react';
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
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Save, X, Code, Type } from 'lucide-react';
import { EmailTemplate } from '@/types/database';
import { useUpdateEmailTemplate } from '@/hooks/useEmailTemplates';
import { TipTapEditor, insertAtCursor } from './TipTapEditor';
import { HtmlEditor, insertAtTextareaCursor } from './HtmlEditor';
import { VariablesPanel } from './VariablesPanel';
import { TemplatePreview } from './TemplatePreview';

interface EditTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: EmailTemplate | null;
}

export function EditTemplateModal({ open, onOpenChange, template }: EditTemplateModalProps) {
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [editorMode, setEditorMode] = useState<'simple' | 'html'>('simple');
  
  const editorRef = useRef<Editor | null>(null);
  const htmlTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  
  const updateTemplate = useUpdateEmailTemplate();

  // Initialize form when template changes
  useEffect(() => {
    if (template) {
      setSubject(template.subject);
      setBodyHtml(template.body_html);
      setIsActive(template.is_active);
    }
  }, [template]);

  const handleSave = async () => {
    if (!template) return;
    
    await updateTemplate.mutateAsync({
      id: template.id,
      subject,
      body_html: bodyHtml,
      is_active: isActive,
    });
    
    onOpenChange(false);
  };

  const handleInsertVariable = (variable: string) => {
    if (editorMode === 'simple') {
      insertAtCursor(editorRef.current, variable);
    } else {
      const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
      insertAtTextareaCursor(textarea, variable, setBodyHtml);
    }
  };

  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[1400px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Edit Template: {template.name}</span>
            <div className="flex items-center gap-3 mr-8">
              <Label htmlFor="active-toggle" className="text-sm font-normal">
                {isActive ? 'Active' : 'Inactive'}
              </Label>
              <Switch
                id="active-toggle"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden grid grid-cols-[1fr,400px] gap-4">
          {/* Editor Section */}
          <div className="flex flex-col gap-4 overflow-hidden">
            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="subject">Email Subject</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter email subject..."
                className="font-medium"
              />
              <p className="text-xs text-muted-foreground">
                You can use variables like {'{{customer_name}}'} in the subject
              </p>
            </div>

            {/* Editor Mode Tabs */}
            <Tabs 
              value={editorMode} 
              onValueChange={(v) => setEditorMode(v as 'simple' | 'html')}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <TabsList className="w-fit">
                <TabsTrigger value="simple" className="gap-2">
                  <Type className="h-4 w-4" />
                  Simple Editor
                </TabsTrigger>
                <TabsTrigger value="html" className="gap-2">
                  <Code className="h-4 w-4" />
                  HTML Editor
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="simple" className="flex-1 overflow-auto mt-2">
                <TipTapEditor
                  content={bodyHtml}
                  onChange={setBodyHtml}
                  editorRef={editorRef}
                  placeholder="Start writing your email content..."
                />
              </TabsContent>
              
              <TabsContent value="html" className="flex-1 overflow-auto mt-2">
                <HtmlEditor
                  content={bodyHtml}
                  onChange={setBodyHtml}
                />
              </TabsContent>
            </Tabs>

            {/* Variables Panel (Collapsed) */}
            <VariablesPanel onInsert={handleInsertVariable} />
          </div>

          {/* Preview Section */}
          <div className="overflow-hidden">
            <TemplatePreview
              subject={subject}
              bodyHtml={bodyHtml}
              className="h-full"
            />
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={updateTemplate.isPending}
          >
            {updateTemplate.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
