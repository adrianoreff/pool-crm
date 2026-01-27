import { baseStyles } from './base-styles';

export interface TechnicianEnRouteData {
  customerName: string;
  technicianName: string;
  technicianPhone?: string;
  estimatedArrival: string;
  serviceName: string;
  businessName: string;
  businessPhone: string;
}

export function technicianEnRouteEmail(data: TechnicianEnRouteData) {
  return {
    subject: `🚗 Your technician is on the way! - ${data.businessName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          ${baseStyles}
          .eta-box { 
            background: #F0FDF4; 
            border: 2px solid #16A34A; 
            border-radius: 12px; 
            padding: 25px; 
            margin: 20px 0; 
            text-align: center; 
          }
          .eta-time { 
            font-size: 32px; 
            font-weight: bold; 
            color: #16A34A; 
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header header-success">
            <h1 style="margin:0;">🚗 On The Way!</h1>
          </div>
          <div class="content">
            <p>Hi ${data.customerName},</p>
            
            <p>Good news! <strong>${data.technicianName}</strong> is heading your way for your ${data.serviceName} appointment.</p>
            
            <div class="eta-box">
              <div style="font-size: 14px; color: #666;">ESTIMATED ARRIVAL</div>
              <div class="eta-time">${data.estimatedArrival}</div>
            </div>
            
            <p>Please make sure:</p>
            <ul>
              <li>Someone is available to let the technician in</li>
              <li>Pets are secured if needed</li>
              <li>The work area is accessible</li>
            </ul>
            
            ${data.technicianPhone ? `
            <p>Need to reach your technician? Call: <strong>${data.technicianPhone}</strong></p>
            ` : ''}
            
            <p>See you soon!</p>
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
