import { baseStyles } from './base-styles';

export interface FollowUpData {
  customerName: string;
  serviceName: string;
  completedDate: string;
  businessName: string;
  businessPhone: string;
  reviewUrl?: string;
}

export function followUpEmail(data: FollowUpData) {
  return {
    subject: `How did we do? - ${data.businessName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          ${baseStyles}
          .card { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; margin: 18px 0; }
          .cta { display: inline-block; background: #F97316; color: #fff; text-decoration: none; padding: 12px 16px; border-radius: 10px; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin:0;">Quick Follow‑Up</h1>
          </div>
          <div class="content">
            <p>Hi ${data.customerName},</p>
            <p>We wanted to check in after your <strong>${data.serviceName}</strong> service on <strong>${data.completedDate}</strong>.</p>

            <div class="card">
              <p style="margin:0;"><strong>Is everything working as expected?</strong></p>
              <p style="margin:8px 0 0;">If you need anything, just reply to this email or call <strong>${data.businessPhone}</strong>.</p>
            </div>

            ${data.reviewUrl ? `<p><a class="cta" href="${data.reviewUrl}">Leave a review</a></p>` : ''}
            <p>Thanks again for choosing ${data.businessName}.</p>
          </div>
          <div class="footer">
            <p>${data.businessName} | ${data.businessPhone}</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };
}
