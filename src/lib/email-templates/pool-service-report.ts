import { baseStyles } from './base-styles';

export interface PoolServiceReportData {
  customerName: string;
  businessName: string;
  businessPhone: string;
  photoUrl?: string;
  extraPhotoUrl?: string;
  readings: { label: string; value: string; unit?: string | null }[];
  dosages: { label: string; amount: string }[];
  subject?: string;
  bodyMessage?: string;
  emailHeader?: string;
}

export function poolServiceReportEmail(data: PoolServiceReportData) {
  const header =
    data.emailHeader || data.subject?.replace(/\s*-\s*[^-]+$/, '').trim() || 'Your Pool Is Now Sparkling Clean!';
  const subject =
    data.subject || `${header} - ${data.businessName}`;

  const readingsRows = data.readings
    .filter((r) => r.value)
    .map(
      (r) =>
        `<tr><td style="padding:8px;border-bottom:1px solid #E2E8F0;">${r.label}</td><td style="padding:8px;border-bottom:1px solid #E2E8F0;text-align:right;"><strong>${r.value}</strong>${r.unit ? ` ${r.unit}` : ''}</td></tr>`
    )
    .join('');

  const dosageRows = data.dosages
    .filter((d) => d.amount)
    .map(
      (d) =>
        `<tr><td style="padding:8px;border-bottom:1px solid #E2E8F0;">${d.label}</td><td style="padding:8px;border-bottom:1px solid #E2E8F0;text-align:right;"><strong>${d.amount}</strong></td></tr>`
    )
    .join('');

  const photoBlocks = [data.photoUrl, data.extraPhotoUrl]
    .filter(Boolean)
    .map(
      (url, i) =>
        `<div style="margin:16px 0;text-align:center;"><img src="${url}" alt="Pool photo ${i + 1}" style="max-width:100%;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.1);" /></div>`
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head><style>${baseStyles}</style></head>
    <body>
      <div class="container">
        <div class="header" style="background:#0EA5E9;">
          <h1 style="margin:0;">${header}</h1>
        </div>
        <div class="content">
          <p>Hi ${data.customerName},</p>
          <p>${data.bodyMessage || 'Thanks for choosing us to keep your pool looking great!'}</p>
          ${photoBlocks}
          ${readingsRows ? `<h3 style="margin-top:24px;">Water readings</h3><table style="width:100%;border-collapse:collapse;">${readingsRows}</table>` : ''}
          ${dosageRows ? `<h3 style="margin-top:24px;">Chemicals applied</h3><table style="width:100%;border-collapse:collapse;">${dosageRows}</table>` : ''}
          <p style="margin-top:24px;">If you have any questions, call us at ${data.businessPhone}.</p>
        </div>
        <div class="footer">
          <p>${data.businessName} | ${data.businessPhone}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}
