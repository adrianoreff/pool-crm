import { baseStyles } from './base-styles';

export interface AppointmentReminderData {
  customerName: string;
  serviceName: string;
  scheduledDate: string;
  timeWindow: string;
  address: string;
  referenceCode: string;
  businessName: string;
  businessPhone: string;
  hoursUntil: number;
}

export function appointmentReminderEmail(data: AppointmentReminderData) {
  const isOneHour = data.hoursUntil === 1;
  
  return {
    subject: `${isOneHour ? '⏰ ' : ''}Reminder: Appointment ${isOneHour ? 'in 1 hour' : 'tomorrow'} - ${data.businessName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          ${baseStyles}
          .reminder-box { 
            background: #FFF7ED; 
            border: 1px solid #FDBA74; 
            border-radius: 8px; 
            padding: 20px; 
            margin: 20px 0; 
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header ${isOneHour ? 'header-warning' : ''}">
            <h1 style="margin:0;">${isOneHour ? '⏰ Almost Time!' : '📅 Reminder: Tomorrow'}</h1>
          </div>
          <div class="content">
            <p>Hi ${data.customerName},</p>
            
            <p>${isOneHour 
              ? `Just a quick reminder - your appointment is coming up in about <strong>1 hour</strong>!` 
              : `This is a friendly reminder about your appointment <strong>tomorrow</strong>.`
            }</p>
            
            <div class="reminder-box">
              <div style="text-align: center;">
                <div style="font-size: 28px; font-weight: bold; color: #F97316;">${data.scheduledDate}</div>
                <div style="font-size: 20px; color: #666;">${data.timeWindow}</div>
              </div>
              <hr style="margin: 15px 0; border: none; border-top: 1px solid #FDBA74;">
              <p style="margin: 5px 0;"><strong>Service:</strong> ${data.serviceName}</p>
              <p style="margin: 5px 0;"><strong>Address:</strong> ${data.address}</p>
              <p style="margin: 5px 0;"><strong>Reference:</strong> ${data.referenceCode}</p>
            </div>
            
            ${isOneHour ? `
            <p>🔔 <strong>Our technician will call you about 30 minutes before arriving.</strong></p>
            ` : `
            <p><strong>Please remember:</strong></p>
            <ul>
              <li>Someone 18+ should be present</li>
              <li>Clear access to the work area if possible</li>
              <li>Have any relevant information ready</li>
            </ul>
            `}
            
            <p>Need to reschedule? Call us at <strong>${data.businessPhone}</strong></p>
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
