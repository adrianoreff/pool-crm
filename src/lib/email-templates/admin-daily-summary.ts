import { baseStyles } from './base-styles';

export interface AdminDailySummaryData {
  adminName: string;
  date: string;
  businessName: string;
  newAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  revenue?: string;
}

export function adminDailySummaryEmail(data: AdminDailySummaryData) {
  return {
    subject: `Daily summary - ${data.date} - ${data.businessName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          ${baseStyles}
          .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
          .kpi { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 14px; }
          .kpi-label { font-size: 12px; color: #666; letter-spacing: .02em; }
          .kpi-value { font-size: 22px; font-weight: 700; margin-top: 6px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header header-info">
            <h1 style="margin:0;">Daily Summary</h1>
          </div>
          <div class="content">
            <p>Hi ${data.adminName},</p>
            <p>Here is your summary for <strong>${data.date}</strong>.</p>

            <div class="grid">
              <div class="kpi"><div class="kpi-label">NEW APPOINTMENTS</div><div class="kpi-value">${data.newAppointments}</div></div>
              <div class="kpi"><div class="kpi-label">COMPLETED</div><div class="kpi-value">${data.completedAppointments}</div></div>
              <div class="kpi"><div class="kpi-label">CANCELLED</div><div class="kpi-value">${data.cancelledAppointments}</div></div>
              ${data.revenue ? `<div class="kpi"><div class="kpi-label">REVENUE</div><div class="kpi-value">${data.revenue}</div></div>` : `<div class="kpi"><div class="kpi-label">REVENUE</div><div class="kpi-value">—</div></div>`}
            </div>
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
