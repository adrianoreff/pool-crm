import { baseStyles } from './base-styles';

export interface TechAssignmentChangedData {
  technicianName: string;
  customerName: string;
  serviceName: string;
  scheduledDate: string;
  timeWindow: string;
  address: string;
  referenceCode: string;
  businessName: string;
}

export function techAssignmentChangedEmail(data: TechAssignmentChangedData) {
  return {
    subject: `Schedule updated - ${data.referenceCode} - ${data.businessName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          ${baseStyles}
          .details { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; margin: 18px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header header-info">
            <h1 style="margin:0;">🗓️ Assignment Changed</h1>
          </div>
          <div class="content">
            <p>Hi ${data.technicianName},</p>
            <p>Your assigned job has been updated.</p>

            <div class="details">
              <div><strong>Ref:</strong> ${data.referenceCode}</div>
              <div><strong>Customer:</strong> ${data.customerName}</div>
              <div><strong>Service:</strong> ${data.serviceName}</div>
              <div><strong>Date:</strong> ${data.scheduledDate}</div>
              <div><strong>Time:</strong> ${data.timeWindow}</div>
              <div><strong>Address:</strong> ${data.address}</div>
            </div>

            <p>Please review your schedule in the app.</p>
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
