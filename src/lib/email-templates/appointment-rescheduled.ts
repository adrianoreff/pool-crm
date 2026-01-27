import { baseStyles } from './base-styles';

export interface AppointmentRescheduledData {
  customerName: string;
  serviceName: string;
  oldDate: string;
  oldTime: string;
  newDate: string;
  newTime: string;
  address: string;
  referenceCode: string;
  businessName: string;
  businessPhone: string;
}

export function appointmentRescheduledEmail(data: AppointmentRescheduledData) {
  return {
    subject: `Appointment Rescheduled - New Date: ${data.newDate} - ${data.businessName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          ${baseStyles}
          .comparison { margin: 20px 0; }
          .old-date { 
            background: #FEE2E2; 
            padding: 15px; 
            border-radius: 8px; 
            text-decoration: line-through; 
            opacity: 0.7; 
            margin-bottom: 10px;
          }
          .new-date { 
            background: #DCFCE7; 
            padding: 15px; 
            border-radius: 8px; 
            border: 2px solid #16A34A; 
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header header-info">
            <h1 style="margin:0;">📅 Appointment Rescheduled</h1>
          </div>
          <div class="content">
            <p>Hi ${data.customerName},</p>
            
            <p>Your appointment has been rescheduled. Here are the updated details:</p>
            
            <div class="comparison">
              <div class="old-date">
                <div style="font-size: 12px; color: #666;">PREVIOUS</div>
                <div style="font-weight: bold;">${data.oldDate}</div>
                <div>${data.oldTime}</div>
              </div>
              <div class="new-date">
                <div style="font-size: 12px; color: #16A34A;">✓ NEW DATE</div>
                <div style="font-weight: bold;">${data.newDate}</div>
                <div>${data.newTime}</div>
              </div>
            </div>
            
            <p><strong>Service:</strong> ${data.serviceName}<br>
            <strong>Address:</strong> ${data.address}<br>
            <strong>Reference:</strong> ${data.referenceCode}</p>
            
            <p>If this doesn't work for you, please call us at <strong>${data.businessPhone}</strong> to find another time.</p>
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
