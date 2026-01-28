import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface HtmlEditorProps {
  content: string;
  onChange: (html: string) => void;
  className?: string;
}

export function HtmlEditor({ content, onChange, className }: HtmlEditorProps) {
  return (
    <div className={cn('border rounded-lg overflow-hidden bg-background', className)}>
      <div className="border-b p-2 bg-muted/50">
        <span className="text-xs font-medium text-muted-foreground">HTML Editor</span>
      </div>
      <Textarea
        value={content}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[400px] font-mono text-sm border-0 rounded-none resize-none focus-visible:ring-0"
        placeholder="<div>Your HTML content here...</div>"
      />
    </div>
  );
}

// Function to insert text at cursor position in textarea
export function insertAtTextareaCursor(
  textarea: HTMLTextAreaElement | null, 
  text: string,
  onChange: (value: string) => void
) {
  if (!textarea) return;
  
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;
  
  const newValue = value.substring(0, start) + text + value.substring(end);
  onChange(newValue);
  
  // Set cursor position after inserted text
  setTimeout(() => {
    textarea.selectionStart = textarea.selectionEnd = start + text.length;
    textarea.focus();
  }, 0);
}
