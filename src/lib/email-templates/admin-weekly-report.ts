import { baseStyles } from './base-styles';

export interface AdminWeeklyReportData {
  adminName: string;
  weekRange: string;
  businessName: string;
  newAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  revenue?: string;
}

export function adminWeeklyReportEmail(data: AdminWeeklyReportData) {
  return {
    subject: `Weekly report - ${data.weekRange} - ${data.businessName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          ${baseStyles}
          .row { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px; margin: 12px 0; }
          .big { font-size: 24px; font-weight: 800; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header header-info">
            <h1 style="margin:0;">Weekly Report</h1>
          </div>
          <div class="content">
            <p>Hi ${data.adminName},</p>
            <p>Report for <strong>${data.weekRange}</strong>:</p>

            <div class="row"><strong>New appointments:</strong> <span class="big">${data.newAppointments}</span></div>
            <div class="row"><strong>Completed:</strong> <span class="big">${data.completedAppointments}</span></div>
            <div class="row"><strong>Cancelled:</strong> <span class="big">${data.cancelledAppointments}</span></div>
            <div class="row"><strong>Revenue:</strong> <span class="big">${data.revenue || '—'}</span></div>
          </div>
          <div class="footer">
            <p>${data.businessName}</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };
}
