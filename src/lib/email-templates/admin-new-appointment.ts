import { baseStyles } from './base-styles';

export interface AdminNewAppointmentData {
  adminName: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  serviceName: string;
  scheduledDate: string;
  timeWindow: string;
  address: string;
  technicianName?: string;
  referenceCode: string;
  businessName: string;
  source: string;
}

export function adminNewAppointmentEmail(data: AdminNewAppointmentData) {
  const sourceLabel = {
    ai_call: '🤖 AI Phone Call',
    widget: '🌐 Online Booking',
    manual: '👤 Manual Entry',
    phone: '📞 Phone Call',
  }[data.source] || data.source;

  return {
    subject: `📋 New Appointment: ${data.customerName} - ${data.serviceName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          ${baseStyles}
          .appointment-card { 
            background: #FFF7ED; 
            border: 1px solid #FDBA74; 
            border-radius: 8px; 
            padding: 20px; 
            margin: 15px 0; 
          }
          .source-badge {
            display: inline-block;
            background: #F97316;
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            margin-bottom: 15px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin:0;">📋 New Appointment Booked</h2>
          </div>
          <div class="content">
            <p>Hi ${data.adminName},</p>
            
            <p>A new appointment has been scheduled:</p>
            
            <div class="appointment-card">
              <div class="source-badge">${sourceLabel}</div>
              
              <h3 style="margin-top: 0; color: #F97316;">${data.serviceName}</h3>
              
              <p><strong>📅 Date:</strong> ${data.scheduledDate}</p>
              <p><strong>🕐 Time:</strong> ${data.timeWindow}</p>
              <p><strong>📍 Address:</strong> ${data.address}</p>
              <p><strong>🏷️ Reference:</strong> ${data.referenceCode}</p>
              ${data.technicianName ? `<p><strong>👨‍🔧 Assigned To:</strong> ${data.technicianName}</p>` : '<p><strong>👨‍🔧 Assigned To:</strong> <span style="color: #DC2626;">Unassigned</span></p>'}
            </div>
            
            <div style="background: #F3F4F6; border-radius: 8px; padding: 15px; margin: 15px 0;">
              <h4 style="margin-top: 0;">Customer Info</h4>
              <p><strong>Name:</strong> ${data.customerName}</p>
              <p><strong>Phone:</strong> <a href="tel:${data.customerPhone}">${data.customerPhone}</a></p>
              ${data.customerEmail ? `<p><strong>Email:</strong> ${data.customerEmail}</p>` : ''}
            </div>
            
            <p style="color: #666; font-size: 14px;">
              Log in to the dashboard to view details, assign a technician, or make changes.
            </p>
          </div>
          <div class="footer">
            <p>${data.businessName}</p>
          </div>
        </div>
      </body>
      </html>
    `
  };
}
