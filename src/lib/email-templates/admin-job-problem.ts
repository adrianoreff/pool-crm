import { baseStyles } from './base-styles';

export interface AdminJobProblemData {
  referenceCode: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  serviceName: string;
  scheduledDate: string;
  timeWindow: string;
  address: string;
  technicianName?: string;
  problemSummary: string;
  businessName: string;
}

export function adminJobProblemEmail(data: AdminJobProblemData) {
  return {
    subject: `[Problem reported] ${data.referenceCode} – ${data.customerName} – ${data.serviceName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          ${baseStyles}
          .problem-card {
            background: #FEF2F2;
            border: 1px solid #FECACA;
            border-radius: 8px;
            padding: 20px;
            margin: 15px 0;
          }
          .problem-text {
            white-space: pre-wrap;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header header-warning">
            <h2 style="margin:0;">Job problem reported</h2>
          </div>
          <div class="content">
            <p>A technician has reported a problem on a job. Please review and decide next steps.</p>

            <div class="problem-card">
              <h3 style="margin-top: 0; color: #DC2626;">Problem details</h3>
              <div class="problem-text">${data.problemSummary || 'No details provided.'}</div>
            </div>

            <div class="details-box">
              <div class="detail-row"><strong>Reference:</strong> ${data.referenceCode}</div>
              <div class="detail-row"><strong>Service:</strong> ${data.serviceName}</div>
              <div class="detail-row"><strong>Date:</strong> ${data.scheduledDate}</div>
              <div class="detail-row"><strong>Time:</strong> ${data.timeWindow}</div>
              <div class="detail-row"><strong>Address:</strong> ${data.address}</div>
              ${data.technicianName ? `<div class="detail-row"><strong>Technician:</strong> ${data.technicianName}</div>` : ''}
            </div>

            <div style="background: #F3F4F6; border-radius: 8px; padding: 15px; margin: 15px 0;">
              <h4 style="margin-top: 0;">Customer</h4>
              <p><strong>Name:</strong> ${data.customerName}</p>
              ${data.customerPhone ? `<p><strong>Phone:</strong> <a href="tel:${data.customerPhone}">${data.customerPhone}</a></p>` : ''}
              ${data.customerEmail ? `<p><strong>Email:</strong> ${data.customerEmail}</p>` : ''}
            </div>

            <p style="color: #666; font-size: 14px;">
              Open the dashboard to view the appointment and take action (reschedule, cancel, or contact the technician).
            </p>
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
