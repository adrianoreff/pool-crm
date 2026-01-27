import { baseStyles } from './base-styles';

export interface TechNewAssignmentData {
  technicianName: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  serviceName: string;
  scheduledDate: string;
  timeWindow: string;
  address: string;
  notes?: string;
  referenceCode: string;
  businessName: string;
}

export function techNewAssignmentEmail(data: TechNewAssignmentData) {
  return {
    subject: `🔧 New Job Assigned: ${data.serviceName} on ${data.scheduledDate}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          ${baseStyles}
          .job-card { 
            background: #EFF6FF; 
            border: 1px solid #BFDBFE; 
            border-radius: 8px; 
            padding: 20px; 
            margin: 15px 0; 
          }
          .customer-card { 
            background: #F3F4F6; 
            border-radius: 8px; 
            padding: 15px; 
            margin: 15px 0; 
          }
          .action-button { 
            display: inline-block; 
            background: #16A34A; 
            color: white; 
            padding: 10px 20px; 
            text-decoration: none; 
            border-radius: 6px; 
            margin-right: 10px; 
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header header-info">
            <h2 style="margin:0;">🔧 New Job Assigned</h2>
          </div>
          <div class="content">
            <p>Hey ${data.technicianName},</p>
            
            <p>You've been assigned a new job:</p>
            
            <div class="job-card">
              <h3 style="margin-top: 0; color: #2563EB;">${data.serviceName}</h3>
              <p><strong>📅 Date:</strong> ${data.scheduledDate}</p>
              <p><strong>🕐 Time:</strong> ${data.timeWindow}</p>
              <p><strong>📍 Address:</strong> ${data.address}</p>
              <p><strong>🏷️ Reference:</strong> ${data.referenceCode}</p>
              ${data.notes ? `<p><strong>📝 Notes:</strong> ${data.notes}</p>` : ''}
            </div>
            
            <div class="customer-card">
              <h4 style="margin-top: 0;">Customer Info</h4>
              <p><strong>Name:</strong> ${data.customerName}</p>
              <p><strong>Phone:</strong> <a href="tel:${data.customerPhone}">${data.customerPhone}</a></p>
              ${data.customerEmail ? `<p><strong>Email:</strong> ${data.customerEmail}</p>` : ''}
            </div>
            
            <div style="margin-top: 20px;">
              <a href="tel:${data.customerPhone}" class="action-button">📞 Call Customer</a>
              <a href="https://maps.google.com/?q=${encodeURIComponent(data.address)}" class="action-button" style="background: #F97316;">🗺️ Get Directions</a>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  };
}
