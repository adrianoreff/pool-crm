import { useEffect, useRef, useState } from 'react';
import { Camera, Loader2, Pencil } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useEmailTemplateBySlug } from '@/hooks/useEmailTemplates';
import { useVisitReport, useSaveVisitData } from '@/hooks/useVisitData';
import { usePhotoUpload } from '@/hooks/usePhotoUpload';
import {
  useAppointmentEmailPhotos,
  getPhotoByRole,
  type EmailPhotoRole,
} from '@/hooks/useAppointmentEmailPhotos';
import {
  POOL_SERVICE_REPORT_SLUG,
  DEFAULT_POOL_REPORT_HEADER,
  DEFAULT_POOL_REPORT_MESSAGE,
} from '@/lib/pool-service-report-template';

interface PoolVisitEmailSectionProps {
  appointmentId: string;
  customerEmail?: string | null;
  readOnly?: boolean;
}

function EmailPhotoSlot({
  label,
  role,
  appointmentId,
  url,
  readOnly,
  onUploaded,
}: {
  label: string;
  role: EmailPhotoRole;
  appointmentId: string;
  url?: string;
  readOnly?: boolean;
  onUploaded: (url: string) => void;
}) {
  const { uploadPhoto, isUploading } = usePhotoUpload();

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await uploadPhoto(file, appointmentId, {
      photoRole: role,
      replaceExistingRole: true,
      setAsPrimary: role === 'top_email',
    });
    if (result) onUploaded(result.url);
    e.target.value = '';
  };

  if (url) {
    return (
      <div className="relative rounded-lg border overflow-hidden bg-muted/30">
        <img src={url} alt={label} className="w-full h-40 object-cover" />
        {!readOnly && (
          <label className="absolute bottom-2 right-2 bg-background/90 text-xs px-2 py-1 rounded cursor-pointer border">
            Replace
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleChange} />
          </label>
        )}
      </div>
    );
  }

  return (
    <label
      className={`flex flex-col items-center justify-center h-36 border-2 border-dashed rounded-lg ${
        readOnly ? 'opacity-60 pointer-events-none' : 'cursor-pointer hover:bg-sky-50/50'
      }`}
    >
      {isUploading ? (
        <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
      ) : (
        <>
          <Camera className="h-9 w-9 text-sky-600 mb-2" />
          <span className="text-sm font-medium text-sky-700">{label}</span>
        </>
      )}
      {!readOnly && (
        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleChange} />
      )}
    </label>
  );
}

export function PoolVisitEmailSection({
  appointmentId,
  customerEmail,
  readOnly = false,
}: PoolVisitEmailSectionProps) {
  const { profile } = useAuth();
  const isTechnician = profile?.role === 'technician';
  const { template, isLoading: templateLoading } = useEmailTemplateBySlug(POOL_SERVICE_REPORT_SLUG);
  const { data: visitReport } = useVisitReport(appointmentId);
  const { data: photos = [], refetch: refetchPhotos } = useAppointmentEmailPhotos(appointmentId);
  const saveVisit = useSaveVisitData();

  const [header, setHeader] = useState(DEFAULT_POOL_REPORT_HEADER);
  const [message, setMessage] = useState(DEFAULT_POOL_REPORT_MESSAGE);
  const [editing, setEditing] = useState(false);
  const initialized = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const topPhoto = getPhotoByRole(photos, 'top_email');
  const extraPhoto = getPhotoByRole(photos, 'extra_email');

  useEffect(() => {
    if (initialized.current) return;
    if (templateLoading) return;

    const defaultHeader = template?.subject?.replace(/\s*-\s*\{\{business_name\}\}/i, '').trim()
      || template?.subject?.replace(/\s*-\s*[^-]+$/, '').trim()
      || DEFAULT_POOL_REPORT_HEADER;
    const defaultMessage = template?.body_text?.trim() || DEFAULT_POOL_REPORT_MESSAGE;

    setHeader(visitReport?.email_subject || defaultHeader);
    setMessage(
      (visitReport as { email_message?: string } | null)?.email_message || defaultMessage
    );
    initialized.current = true;
  }, [template, templateLoading, visitReport]);

  const persistEmailDraft = (nextHeader: string, nextMessage: string) => {
    if (readOnly) return;
    saveVisit.mutate({
      appointmentId,
      readings: [],
      dosages: [],
      emailSubject: nextHeader,
      emailMessage: nextMessage,
    });
  };

  const scheduleSave = (nextHeader: string, nextMessage: string) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persistEmailDraft(nextHeader, nextMessage), 500);
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base font-semibold text-sky-700">Email</CardTitle>
          <div className="flex items-center gap-2 text-xs text-sky-600">
            <span>Email Templates (admin)</span>
            {!readOnly && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-sky-700"
                onClick={() => setEditing((e) => !e)}
              >
                <Pencil className="h-3.5 w-3.5 mr-1" />
                {editing ? 'Done' : 'Edit'}
              </Button>
            )}
          </div>
        </div>
        {customerEmail && (
          <p className="text-xs text-muted-foreground mt-1">To: {customerEmail}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4 px-4 pb-4">
        <div className="space-y-1">
          <label className="text-xs text-sky-600/80 font-medium">header</label>
          <Input
            value={header}
            onChange={(e) => {
              setHeader(e.target.value);
              scheduleSave(e.target.value, message);
            }}
            onBlur={() => persistEmailDraft(header, message)}
            readOnly={readOnly || !editing}
            className="font-semibold border-sky-100"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-sky-600/80 font-medium">message</label>
          <Textarea
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              scheduleSave(header, e.target.value);
            }}
            onBlur={() => persistEmailDraft(header, message)}
            readOnly={readOnly || !editing}
            rows={2}
            className="border-sky-100 resize-none"
          />
        </div>

        <p className="text-xs text-muted-foreground">
          {isTechnician
            ? 'Header and message are set by your office in Email Templates (Pool Service Report). Tap Edit to adjust for this visit.'
            : 'Edit the Pool Service Report template under Email Templates. Tap Edit here to override for this visit only.'}
        </p>

        <EmailPhotoSlot
          label="top email photo"
          role="top_email"
          appointmentId={appointmentId}
          url={topPhoto?.url}
          readOnly={readOnly}
          onUploaded={() => refetchPhotos()}
        />

        <EmailPhotoSlot
          label="extra email photo"
          role="extra_email"
          appointmentId={appointmentId}
          url={extraPhoto?.url}
          readOnly={readOnly}
          onUploaded={() => refetchPhotos()}
        />

        {saveVisit.isPending && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" /> Saving…
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/** Read email draft + photo URLs for finish flow */
export function usePoolVisitEmailState(appointmentId: string | undefined) {
  const { data: visitReport } = useVisitReport(appointmentId);
  const { data: photos = [] } = useAppointmentEmailPhotos(appointmentId);
  const top = getPhotoByRole(photos, 'top_email');
  const extra = getPhotoByRole(photos, 'extra_email');

  return {
    emailSubject: visitReport?.email_subject,
    emailMessage: (visitReport as { email_message?: string } | null)?.email_message,
    topPhotoUrl: top?.url,
    extraPhotoUrl: extra?.url,
    hasTopPhoto: !!top?.url,
  };
}
