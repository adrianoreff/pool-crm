import { baseStyles } from './base-styles';

export interface AppointmentCompletedData {
  customerName: string;
  serviceName: string;
  technicianName: string;
  completedDate: string;
  referenceCode: string;
  businessName: string;
  businessPhone: string;
  reviewUrl?: string;
  invoiceAmount?: string;
}

export function appointmentCompletedEmail(data: AppointmentCompletedData) {
  return {
    subject: `Service Completed ✓ Thank you! - ${data.businessName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          ${baseStyles}
          .stars { font-size: 36px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header header-success">
            <h1 style="margin:0;">✓ Service Complete!</h1>
          </div>
          <div class="content">
            <p>Hi ${data.customerName},</p>
            
            <p>Thank you for choosing ${data.businessName}! We hope ${data.technicianName} took great care of your ${data.serviceName} today.</p>
            
            <div style="background: #F3F4F6; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Service:</strong> ${data.serviceName}</p>
              <p style="margin: 5px 0;"><strong>Technician:</strong> ${data.technicianName}</p>
              <p style="margin: 5px 0;"><strong>Date:</strong> ${data.completedDate}</p>
              <p style="margin: 5px 0;"><strong>Reference:</strong> ${data.referenceCode}</p>
              ${data.invoiceAmount ? `<p style="margin: 5px 0;"><strong>Amount:</strong> ${data.invoiceAmount}</p>` : ''}
            </div>
            
            ${data.reviewUrl ? `
            <div style="text-align: center; margin: 30px 0;">
              <p><strong>How did we do?</strong></p>
              <div class="stars">⭐⭐⭐⭐⭐</div>
              <p>Your feedback helps us improve and helps others find great service.</p>
              <a href="${data.reviewUrl}" class="button">Leave a Review</a>
            </div>
            ` : ''}
            
            <p>If you have any questions about your service or need follow-up work, don't hesitate to call us!</p>
            
            <p>Thank you for your business! 🙏</p>
          </div>
          <div class="footer">
            <p>${data.businessName} | ${data.businessPhone}</p>
          </div>
        </div>
      </body>
      </html>
    `
  };
}
