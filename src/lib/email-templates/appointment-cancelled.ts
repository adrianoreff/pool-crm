import { baseStyles } from './base-styles';

export interface AppointmentCancelledData {
  customerName: string;
  serviceName: string;
  scheduledDate: string;
  timeWindow: string;
  referenceCode: string;
  businessName: string;
  businessPhone: string;
  cancelledBy: 'customer' | 'business';
  reason?: string;
}

export function appointmentCancelledEmail(data: AppointmentCancelledData) {
  return {
    subject: `Appointment Cancelled - ${data.referenceCode} - ${data.businessName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          ${baseStyles}
          .cancelled-box { 
            background: #F3F4F6; 
            padding: 20px; 
            border-radius: 8px; 
            margin: 20px 0; 
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header header-neutral">
            <h1 style="margin:0;">Appointment Cancelled</h1>
          </div>
          <div class="content">
            <p>Hi ${data.customerName},</p>
            
            <p>${data.cancelledBy === 'customer' 
              ? 'As requested, your appointment has been cancelled.'
              : 'Unfortunately, we had to cancel your appointment.'
            }</p>
            
            <div class="cancelled-box">
              <p style="margin: 5px 0; text-decoration: line-through; opacity: 0.7;">
                <strong>${data.scheduledDate}</strong> at ${data.timeWindow}
              </p>
              <p style="margin: 5px 0;"><strong>Service:</strong> ${data.serviceName}</p>
              <p style="margin: 5px 0;"><strong>Reference:</strong> ${data.referenceCode}</p>
              ${data.reason ? `<p style="margin: 10px 0 0 0;"><strong>Reason:</strong> ${data.reason}</p>` : ''}
            </div>
            
            <p>We'd love to help you in the future! When you're ready, give us a call or book online.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="tel:${data.businessPhone}" class="button">Call to Reschedule</a>
            </div>
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
