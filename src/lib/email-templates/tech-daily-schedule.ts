import { baseStyles } from './base-styles';

export interface TechDailyScheduleItem {
  timeWindow: string;
  customerName: string;
  serviceName: string;
  address: string;
  referenceCode?: string;
}

export interface TechDailyScheduleData {
  technicianName: string;
  date: string;
  businessName: string;
  items: TechDailyScheduleItem[];
}

export function techDailyScheduleEmail(data: TechDailyScheduleData) {
  const rows = (data.items || [])
    .map(
      (i) => `
        <tr>
          <td style="padding:10px; border-bottom:1px solid #e5e5e5; white-space:nowrap;"><strong>${i.timeWindow}</strong></td>
          <td style="padding:10px; border-bottom:1px solid #e5e5e5;">${i.customerName}<br><span style="color:#666;">${i.serviceName}</span></td>
          <td style="padding:10px; border-bottom:1px solid #e5e5e5; color:#666;">${i.address}</td>
        </tr>
      `
    )
    .join('');

  return {
    subject: `Today's schedule - ${data.date} - ${data.businessName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          ${baseStyles}
          table { width: 100%; border-collapse: collapse; }
          th { text-align: left; padding: 10px; background: #F3F4F6; font-size: 12px; letter-spacing: .02em; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header header-info">
            <h1 style="margin:0;">Daily Schedule</h1>
          </div>
          <div class="content">
            <p>Hi ${data.technicianName},</p>
            <p>Here is your schedule for <strong>${data.date}</strong>:</p>

            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Customer</th>
                  <th>Address</th>
                </tr>
              </thead>
              <tbody>
                ${rows || `<tr><td colspan="3" style="padding:12px; color:#666;">No jobs scheduled.</td></tr>`}
              </tbody>
            </table>
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
