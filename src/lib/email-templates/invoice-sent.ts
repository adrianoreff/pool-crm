import { baseStyles } from './base-styles';

export interface InvoiceSentData {
  customerName: string;
  invoiceNumber: string;
  invoiceTotal: string;
  dueDate?: string;
  invoiceUrl?: string;
  businessName: string;
  businessPhone: string;
}

export function invoiceSentEmail(data: InvoiceSentData) {
  return {
    subject: `Invoice ${data.invoiceNumber} - ${data.businessName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          ${baseStyles}
          .invoice-box { background: #FFF7ED; border: 1px solid #FDBA74; border-radius: 12px; padding: 20px; margin: 20px 0; }
          .amount { font-size: 28px; font-weight: 700; color: #F97316; }
          .cta { display: inline-block; background: #F97316; color: #fff; text-decoration: none; padding: 12px 16px; border-radius: 10px; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin:0;">Invoice Ready</h1>
          </div>
          <div class="content">
            <p>Hi ${data.customerName},</p>
            <p>Your invoice is ready.</p>

            <div class="invoice-box">
              <div><strong>Invoice:</strong> ${data.invoiceNumber}</div>
              <div style="margin-top:10px;"><strong>Total Due:</strong></div>
              <div class="amount">${data.invoiceTotal}</div>
              ${data.dueDate ? `<div style="margin-top:10px;"><strong>Due:</strong> ${data.dueDate}</div>` : ''}
            </div>

            ${data.invoiceUrl ? `<p><a class="cta" href="${data.invoiceUrl}">View / Pay Invoice</a></p>` : ''}

            <p>Questions? Call us at <strong>${data.businessPhone}</strong>.</p>
          </div>
          <div class="footer">
            <p>${data.businessName}<br>${data.businessPhone}</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };
}
