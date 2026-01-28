import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
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
import { Plus, Search, Mail } from 'lucide-react';
import { 
  useEmailTemplates, 
  useUpdateEmailTemplate,
  useDeleteEmailTemplate 
} from '@/hooks/useEmailTemplates';
import { EmailTemplate, EmailTemplateCategory } from '@/types/database';
import {
  TemplateCard,
  EditTemplateModal,
  CreateTemplateModal,
  PreviewTemplateModal,
} from '@/components/email-templates';

type CategoryFilter = 'all' | EmailTemplateCategory;

export default function EmailTemplates() {
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [previewingTemplate, setPreviewingTemplate] = useState<EmailTemplate | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<EmailTemplate | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { data: templates = [], isLoading } = useEmailTemplates();
  const updateTemplate = useUpdateEmailTemplate();
  const deleteTemplate = useDeleteEmailTemplate();

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      // Category filter
      if (categoryFilter !== 'all' && t.category !== categoryFilter) {
        return false;
      }
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          t.name.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query) ||
          t.subject.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [templates, categoryFilter, searchQuery]);

  // Group templates by category
  const groupedTemplates = useMemo(() => {
    const groups: Record<string, EmailTemplate[]> = {
      customer: [],
      admin: [],
      technician: [],
      custom: [],
    };
    
    filteredTemplates.forEach((t) => {
      groups[t.category]?.push(t);
    });
    
    return groups;
  }, [filteredTemplates]);

  const handleToggleActive = async (template: EmailTemplate, isActive: boolean) => {
    await updateTemplate.mutateAsync({
      id: template.id,
      is_active: isActive,
    });
  };

  const handleDelete = async () => {
    if (!deletingTemplate) return;
    await deleteTemplate.mutateAsync(deletingTemplate.id);
    setDeletingTemplate(null);
  };

  const handleCreated = (templateId: string) => {
    // Find and open the new template for editing
    const newTemplate = templates.find(t => t.id === templateId);
    if (newTemplate) {
      setEditingTemplate(newTemplate);
    }
  };

  const categoryLabels: Record<string, string> = {
    customer: 'Customer Emails',
    admin: 'Admin/Team Emails',
    technician: 'Technician Emails',
    custom: 'Custom Templates',
  };

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="h-6 w-6" />
            Email Templates
          </h1>
          <p className="text-muted-foreground">
            Manage and customize all email notifications
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Tabs 
          value={categoryFilter} 
          onValueChange={(v) => setCategoryFilter(v as CategoryFilter)}
        >
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="customer">Customer</TabsTrigger>
            <TabsTrigger value="admin">Admin</TabsTrigger>
            <TabsTrigger value="technician">Technician</TabsTrigger>
            <TabsTrigger value="custom">Custom</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-[180px]" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">No templates found</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery 
              ? 'Try adjusting your search query'
              : 'Get started by creating your first email template'
            }
          </p>
          {!searchQuery && (
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          )}
        </div>
      )}

      {/* Template Groups */}
      {!isLoading && filteredTemplates.length > 0 && (
        <div className="space-y-8">
          {(categoryFilter === 'all' 
            ? ['customer', 'admin', 'technician', 'custom'] 
            : [categoryFilter]
          ).map((category) => {
            const categoryTemplates = groupedTemplates[category];
            if (!categoryTemplates || categoryTemplates.length === 0) return null;

            return (
              <div key={category}>
                <h2 className="text-lg font-semibold mb-4 text-muted-foreground uppercase tracking-wide">
                  {categoryLabels[category]}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {categoryTemplates.map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onEdit={setEditingTemplate}
                      onPreview={setPreviewingTemplate}
                      onDelete={template.is_default ? undefined : setDeletingTemplate}
                      onToggleActive={handleToggleActive}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <EditTemplateModal
        open={!!editingTemplate}
        onOpenChange={(open) => !open && setEditingTemplate(null)}
        template={editingTemplate}
      />

      <PreviewTemplateModal
        open={!!previewingTemplate}
        onOpenChange={(open) => !open && setPreviewingTemplate(null)}
        template={previewingTemplate}
      />

      <CreateTemplateModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onCreated={handleCreated}
      />

      {/* Delete Confirmation */}
      <AlertDialog 
        open={!!deletingTemplate} 
        onOpenChange={(open) => !open && setDeletingTemplate(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingTemplate?.name}"? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
