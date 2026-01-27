import { baseStyles } from './base-styles';

export interface AppointmentRequestReceivedData {
  customerName: string;
  serviceName: string;
  requestedDate: string;
  businessName: string;
  businessPhone: string;
}

export function appointmentRequestReceivedEmail(data: AppointmentRequestReceivedData) {
  return {
    subject: `We received your service request - ${data.businessName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>${baseStyles}</style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin:0;">Request Received! 📋</h1>
          </div>
          <div class="content">
            <p>Hi ${data.customerName},</p>
            
            <p>Thank you for contacting <strong>${data.businessName}</strong>! We've received your service request and our team is reviewing it now.</p>
            
            <div class="highlight">
              <strong>Service Requested:</strong> ${data.serviceName}<br>
              <strong>Preferred Date:</strong> ${data.requestedDate}
            </div>
            
            <p><strong>What happens next?</strong></p>
            <ol>
              <li>Our team will review your request</li>
              <li>We'll confirm availability for your preferred time</li>
              <li>You'll receive a confirmation email with all the details</li>
            </ol>
            
            <p>This usually takes just a few minutes during business hours.</p>
            
            <p>If you have any questions, feel free to call us at <strong>${data.businessPhone}</strong>.</p>
            
            <p>Thank you for choosing ${data.businessName}!</p>
          </div>
          <div class="footer">
            <p>${data.businessName}<br>
            ${data.businessPhone}</p>
          </div>
        </div>
      </body>
      </html>
    `
  };
}
