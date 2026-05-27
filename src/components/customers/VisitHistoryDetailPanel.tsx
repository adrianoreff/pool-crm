import { CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatAppointmentDate } from '@/lib/utils';
import type { CustomerServiceHistoryVisit } from '@/hooks/useVisitData';
import {
  DEFAULT_POOL_REPORT_HEADER,
  DEFAULT_POOL_REPORT_MESSAGE,
} from '@/lib/pool-service-report-template';

function formatTimeShort(time: string | null) {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

function formatFinishedOn(visit: CustomerServiceHistoryVisit) {
  const datePart = visit.scheduled_date;
  const dayName = new Date(datePart + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' });
  const dateLabel = formatAppointmentDate(datePart);

  let timeRange = '';
  if (visit.scheduled_start_time && visit.completed_at) {
    const end = new Date(visit.completed_at);
    const endStr = end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    timeRange = `${formatTimeShort(visit.scheduled_start_time)} - ${endStr}`;
  } else if (visit.scheduled_start_time && visit.scheduled_end_time) {
    timeRange = `${formatTimeShort(visit.scheduled_start_time)} - ${formatTimeShort(visit.scheduled_end_time)}`;
  }

  const duration =
    visit.time_spent_minutes != null ? ` (${visit.time_spent_minutes}m)` : '';

  return `${dateLabel} (${dayName})${timeRange ? ` ${timeRange}` : ''}${duration}`;
}

function getVisitReport(visit: CustomerServiceHistoryVisit) {
  const r = visit.visit_reports;
  if (!r) return null;
  return Array.isArray(r) ? r[0] ?? null : r;
}

interface VisitHistoryDetailPanelProps {
  visit: CustomerServiceHistoryVisit | null;
}

export function VisitHistoryDetailPanel({ visit }: VisitHistoryDetailPanelProps) {
  if (!visit) {
    return (
      <div className="flex items-center justify-center h-full min-h-[280px] text-muted-foreground text-sm">
        Select a visit date to view service details
      </div>
    );
  }

  const techName = visit.technician
    ? `${visit.technician.first_name || ''} ${visit.technician.last_name || ''}`.trim() || 'Technician'
    : '—';

  const report = getVisitReport(visit);
  const header = report?.email_subject || DEFAULT_POOL_REPORT_HEADER;
  const message = report?.email_message || DEFAULT_POOL_REPORT_MESSAGE;

  const readings = (visit.visit_readings ?? []).filter(
    (r) => r.value_text || r.value_numeric != null
  );
  const dosages = (visit.visit_dosages ?? []).filter((d) => d.amount_display);
  const checklistDone = (visit.appointment_checklist_items ?? []).filter((i) => i.completed);

  const topPhoto =
    visit.appointment_photos?.find((p) => p.photo_role === 'top_email') ??
    visit.appointment_photos?.find((p) => p.is_primary);
  const extraPhoto = visit.appointment_photos?.find((p) => p.photo_role === 'extra_email');

  return (
    <div className="space-y-5 text-sm">
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">tech</p>
        <p className="font-medium mt-0.5">{techName}</p>
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">finished on</p>
        <p className="mt-0.5">{formatFinishedOn(visit)}</p>
        {report?.email_sent_at && (
          <Badge variant="secondary" className="mt-2 text-xs">
            Report emailed
          </Badge>
        )}
      </div>

      {readings.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Pool: readings
          </p>
          <ul className="space-y-1">
            {readings.map((r, i) => {
              const label = r.definition?.label || 'Reading';
              const val = r.value_text ?? (r.value_numeric != null ? String(r.value_numeric) : '');
              const unit = r.definition?.unit ? ` ${r.definition.unit}` : '';
              return (
                <li key={i}>
                  <span className="text-muted-foreground">{label}: </span>
                  <span className="font-medium">
                    {val}
                    {unit}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {dosages.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Pool: dosages
          </p>
          <ul className="space-y-1">
            {dosages.map((d, i) => (
              <li key={i}>
                <span className="text-muted-foreground">{d.definition?.label || 'Chemical'}: </span>
                <span className="font-medium">{d.amount_display}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {checklistDone.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            completed checklist items
          </p>
          <ul className="space-y-2">
            {checklistDone.map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>{item.item_text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-2">
        <div>
          <p className="text-xs font-medium text-muted-foreground">header</p>
          <p className="font-semibold mt-0.5">{header}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">message</p>
          <p className="mt-0.5 whitespace-pre-wrap">{message}</p>
        </div>
      </div>

      {(topPhoto || extraPhoto) && (
        <div className="space-y-3">
          {topPhoto && (
            <img
              src={topPhoto.url}
              alt="Pool service"
              className="w-full rounded-lg border object-cover max-h-56"
            />
          )}
          {extraPhoto && extraPhoto.url !== topPhoto?.url && (
            <img
              src={extraPhoto.url}
              alt="Extra pool photo"
              className="w-full rounded-lg border object-cover max-h-40"
            />
          )}
        </div>
      )}
    </div>
  );
}
