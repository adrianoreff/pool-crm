import { baseStyles } from './base-styles';

export interface AppointmentConfirmedData {
  customerName: string;
  serviceName: string;
  scheduledDate: string;
  timeWindow: string;
  address: string;
  technicianName?: string;
  referenceCode: string;
  businessName: string;
  businessPhone: string;
  notes?: string;
  cancelUrl?: string;
  rescheduleUrl?: string;
}

export function appointmentConfirmedEmail(data: AppointmentConfirmedData) {
  return {
    subject: `Appointment Confirmed ✓ ${data.scheduledDate} - ${data.businessName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          ${baseStyles}
          .details-box { background: #F0FDF4; border: 1px solid #BBF7D0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header header-success">
            <h1 style="margin:0;">Appointment Confirmed! ✓</h1>
          </div>
          <div class="content">
            <p>Hi ${data.customerName},</p>
            
            <p>Great news! Your appointment has been confirmed. Here are your details:</p>
            
            <div class="details-box">
              <div style="text-align: center; margin-bottom: 15px;">
                <div style="font-size: 12px; color: #666;">REFERENCE CODE</div>
                <div class="reference">${data.referenceCode}</div>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">📅 Date:</span>
                <strong>${data.scheduledDate}</strong>
              </div>
              <div class="detail-row">
                <span class="detail-label">🕐 Time Window:</span>
                <strong>${data.timeWindow}</strong>
              </div>
              <div class="detail-row">
                <span class="detail-label">🔧 Service:</span>
                ${data.serviceName}
              </div>
              <div class="detail-row">
                <span class="detail-label">📍 Address:</span>
                ${data.address}
              </div>
              ${data.technicianName ? `
              <div class="detail-row">
                <span class="detail-label">👨‍🔧 Technician:</span>
                ${data.technicianName}
              </div>
              ` : ''}
              ${data.notes ? `
              <div class="detail-row" style="border-bottom: none;">
                <span class="detail-label">📝 Notes:</span>
                ${data.notes}
              </div>
              ` : ''}
            </div>
            
            <p><strong>What to expect:</strong></p>
            <ul>
              <li>Our technician will call you ~30 minutes before arrival</li>
              <li>You'll receive a reminder 24 hours before your appointment</li>
              <li>Please ensure someone 18+ is present at the property</li>
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
              <p style="color: #666; margin-bottom: 15px;">Need to make changes?</p>
              ${data.rescheduleUrl ? `<a href="${data.rescheduleUrl}" class="button button-secondary">Reschedule</a>` : ''}
              ${data.cancelUrl ? `<a href="${data.cancelUrl}" class="button button-secondary">Cancel</a>` : ''}
            </div>
            
            <p>Questions? Call us at <strong>${data.businessPhone}</strong></p>
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
