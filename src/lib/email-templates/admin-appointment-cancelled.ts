import { baseStyles } from './base-styles';

export interface AdminAppointmentCancelledData {
  adminName: string;
  customerName: string;
  serviceName: string;
  scheduledDate: string;
  timeWindow: string;
  referenceCode: string;
  businessName: string;
  reason?: string;
}

export function adminAppointmentCancelledEmail(data: AdminAppointmentCancelledData) {
  return {
    subject: `Cancellation - ${data.referenceCode} - ${data.businessName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          ${baseStyles}
          .box { background: #F3F4F6; border: 1px solid #E5E7EB; border-radius: 12px; padding: 18px; margin: 18px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header header-neutral">
            <h1 style="margin:0;">Appointment Cancelled</h1>
          </div>
          <div class="content">
            <p>Hi ${data.adminName},</p>
            <p>A customer cancelled an appointment.</p>
            <div class="box">
              <div><strong>Ref:</strong> ${data.referenceCode}</div>
              <div><strong>Customer:</strong> ${data.customerName}</div>
              <div><strong>Service:</strong> ${data.serviceName}</div>
              <div><strong>When:</strong> ${data.scheduledDate} (${data.timeWindow})</div>
              ${data.reason ? `<div><strong>Reason:</strong> ${data.reason}</div>` : ''}
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
