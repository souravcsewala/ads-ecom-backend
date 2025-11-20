const https = require('https');

async function sendMail({ to, subject, html, text }) {
  const from = process.env.MAIL_FROM || process.env.EMAIL_USER || process.env.SMTP_USER || 'no-reply@example.com';

  // Enforce HTTP provider (Resend) for all notifications
  const resendKey = process.env.RESEND_API_KEY;

  if (!resendKey) {
    throw new Error('RESEND_API_KEY not configured. Resend is required for all emails.');
  }

  const payload = JSON.stringify({ from, to, subject, html, text });

  const options = {
    method: 'POST',
    hostname: 'api.resend.com',
    path: '/emails',
    headers: {
      'Authorization': `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    },
    timeout: 8000,
  };

  const result = await new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => (data += chunk));

      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsed = JSON.parse(data || '{}');
            resolve({ provider: 'resend', id: parsed.id || null });
          } catch (_) {
            resolve({ provider: 'resend', id: null });
          }
        } else {
          reject(new Error(`Resend error ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('Resend request timeout')));
    req.write(payload);
    req.end();
  });

  return result;
}

// Helper to build links pointing to frontend domain
function buildFrontendUrl(path, req) {
  // Prefer explicit FRONTEND_BASE_URL. If absent, choose by environment:
  // - production: https://blog.souravengineerwala.com
  // - otherwise:  http://localhost:3000
  let base = process.env.FRONTEND_BASE_URL;

  if (!base) {
    const env = (process.env.NODE_ENV || '').toLowerCase();
    base = env === 'production' ? 'https://blog.souravengineerwala.com' : 'http://localhost:3000';
  }

  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}`;
}

// Send order confirmation email to customer
async function sendOrderConfirmationEmail(order) {
  try {
    const isCustomPlan = order.planType === 'custom';
    const isMeetingRequest = order.planName === 'Meeting Request' && order.planPrice === 0;
    const totalPrice = isCustomPlan 
      ? order.planPrice 
      : (order.planPrice * order.numberOfAds);

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .order-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
          .detail-label { font-weight: bold; color: #666; }
          .detail-value { color: #333; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${isMeetingRequest ? 'Meeting Request Confirmed' : 'Order Confirmation'}</h1>
            <p>${isMeetingRequest ? 'We\'ve received your meeting request!' : 'Thank you for your order!'}</p>
          </div>
          <div class="content">
            <p>Dear ${order.customerName},</p>
            <p>${isMeetingRequest ? 'Thank you for scheduling a meeting with us! We have received your meeting request and will contact you shortly to confirm the details.' : 'We have received your order and will process it shortly. Here are your order details:'}</p>
            
            ${!isMeetingRequest ? `
            <div class="order-details">
              <h2>Order Information</h2>
              <div class="detail-row">
                <span class="detail-label">Order ID:</span>
                <span class="detail-value">${order._id}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Plan Type:</span>
                <span class="detail-value">${isCustomPlan ? 'Custom Plan' : 'Standard Plan'}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Plan Name:</span>
                <span class="detail-value">${order.planName}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Ad Type:</span>
                <span class="detail-value">${order.adType === 'image' ? 'Image Ads' : 'Video Ads'}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Number of ${order.adType === 'image' ? 'Images' : 'Videos'}:</span>
                <span class="detail-value">${order.numberOfAds}</span>
              </div>
              ${isCustomPlan ? `
              <div class="detail-row">
                <span class="detail-label">Your Budget:</span>
                <span class="detail-value">₹${order.planPrice.toLocaleString('en-IN')}</span>
              </div>
              ` : `
              <div class="detail-row">
                <span class="detail-label">Price per ${order.adType}:</span>
                <span class="detail-value">₹${order.planPrice.toLocaleString('en-IN')}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Total Price:</span>
                <span class="detail-value"><strong>₹${totalPrice.toLocaleString('en-IN')}</strong></span>
              </div>
              `}
              <div class="detail-row">
                <span class="detail-label">Order Status:</span>
                <span class="detail-value">${order.status}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Order Date:</span>
                <span class="detail-value">${new Date(order.createdAt).toLocaleDateString('en-IN', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</span>
              </div>
            </div>
            ` : ''}

            ${order.meetingInterest === 'yes' && order.meetingDate ? `
            <div class="order-details">
              <h2>${isMeetingRequest ? 'Your Meeting Details' : 'Meeting Scheduled'}</h2>
              <div class="detail-row">
                <span class="detail-label">Meeting Date:</span>
                <span class="detail-value">${new Date(order.meetingDate).toLocaleDateString('en-IN', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  weekday: 'long'
                })}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Meeting Time:</span>
                <span class="detail-value">${order.meetingTime}</span>
              </div>
            </div>
            ` : ''}

            <p>${isMeetingRequest ? 'Our team will review your meeting request and contact you shortly to confirm the schedule. If you have any questions or need to reschedule, please don\'t hesitate to reach out to us.' : 'We will contact you soon regarding your order. If you have any questions, please don\'t hesitate to reach out to us.'}</p>
            
            <div class="footer">
              <p>Best regards,<br>The BuyEcomAds Team</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendMail({
      to: order.customerEmail,
      subject: isMeetingRequest ? `Meeting Request Confirmed - ${order.customerName}` : `Order Confirmation - ${order.planName}`,
      html: emailHtml,
    });

    return { success: true };
  } catch (error) {
    console.error("Error sending order confirmation email:", error);
    // Don't throw error - email failure shouldn't break order creation
    return { success: false, error: error.message };
  }
};

// Send order notification email to admin
async function sendOrderNotificationToAdmin(order) {
  try {
    const adminEmail = process.env.AdminMail || process.env.ADMIN_EMAIL;
    
    if (!adminEmail) {
      console.warn("Admin email not configured in environment variables");
      return { success: false, error: "Admin email not configured" };
    }

    const isCustomPlan = order.planType === 'custom';
    const isMeetingRequest = order.planName === 'Meeting Request' && order.planPrice === 0;
    const totalPrice = isCustomPlan 
      ? order.planPrice 
      : (order.planPrice * order.numberOfAds);

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .order-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
          .detail-label { font-weight: bold; color: #666; }
          .detail-value { color: #333; }
          .custom-badge { background: #764ba2; color: white; padding: 5px 10px; border-radius: 5px; font-size: 12px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${isMeetingRequest ? 'New Meeting Request' : 'New Order Received'}</h1>
            <p>${isMeetingRequest ? '<span class="custom-badge">MEETING REQUEST</span>' : (isCustomPlan ? '<span class="custom-badge">CUSTOM PLAN</span>' : 'Standard Plan Order')}</p>
          </div>
          <div class="content">
            <p><strong>${isMeetingRequest ? 'A new meeting request has been submitted!' : 'New order has been placed!'}</strong></p>
            
            ${!isMeetingRequest ? `
            <div class="order-details">
              <h2>Order Details</h2>
              <div class="detail-row">
                <span class="detail-label">Order ID:</span>
                <span class="detail-value">${order._id}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Plan Type:</span>
                <span class="detail-value">${isCustomPlan ? '<span class="custom-badge">Custom Plan</span>' : 'Standard Plan'}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Plan Name:</span>
                <span class="detail-value">${order.planName}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Ad Type:</span>
                <span class="detail-value">${order.adType === 'image' ? 'Image Ads' : 'Video Ads'}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Number of ${order.adType === 'image' ? 'Images' : 'Videos'}:</span>
                <span class="detail-value">${order.numberOfAds}</span>
              </div>
              ${isCustomPlan ? `
              <div class="detail-row">
                <span class="detail-label">Customer Budget:</span>
                <span class="detail-value"><strong>₹${order.planPrice.toLocaleString('en-IN')}</strong></span>
              </div>
              ` : `
              <div class="detail-row">
                <span class="detail-label">Price per ${order.adType}:</span>
                <span class="detail-value">₹${order.planPrice.toLocaleString('en-IN')}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Total Price:</span>
                <span class="detail-value"><strong>₹${totalPrice.toLocaleString('en-IN')}</strong></span>
              </div>
              `}
              <div class="detail-row">
                <span class="detail-label">Order Status:</span>
                <span class="detail-value">${order.status}</span>
              </div>
            </div>
            ` : ''}

            <div class="order-details">
              <h2>${isMeetingRequest ? 'Meeting Request Details' : 'Customer Information'}</h2>
              <div class="detail-row">
                <span class="detail-label">Name:</span>
                <span class="detail-value">${order.customerName}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Email:</span>
                <span class="detail-value">${order.customerEmail}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Contact:</span>
                <span class="detail-value">${order.customerContact}</span>
              </div>
              ${order.customerCompany ? `
              <div class="detail-row">
                <span class="detail-label">Company:</span>
                <span class="detail-value">${order.customerCompany}</span>
              </div>
              ` : ''}
            </div>

            ${order.meetingInterest === 'yes' && order.meetingDate ? `
            <div class="order-details">
              <h2>${isMeetingRequest ? 'Scheduled Meeting' : 'Meeting Request'}</h2>
              <div class="detail-row">
                <span class="detail-label">Meeting Date:</span>
                <span class="detail-value">${new Date(order.meetingDate).toLocaleDateString('en-IN', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  weekday: 'long'
                })}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Meeting Time:</span>
                <span class="detail-value">${order.meetingTime}</span>
              </div>
            </div>
            ` : ''}

            <p><strong>Action Required:</strong> ${isMeetingRequest ? 'Please review this meeting request and contact the customer to confirm the schedule.' : 'Please review this order in the admin panel and proceed accordingly.'}</p>
            
            <div class="footer">
              <p>This is an automated notification from BuyEcomAds Admin System</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendMail({
      to: adminEmail,
      subject: isMeetingRequest ? `New Meeting Request - ${order.customerName}` : `New Order Received - ${isCustomPlan ? 'Custom Plan' : order.planName}`,
      html: emailHtml,
    });

    return { success: true };
  } catch (error) {
    console.error("Error sending admin notification email:", error);
    // Don't throw error - email failure shouldn't break order creation
    return { success: false, error: error.message };
  }
}

// Send meeting request confirmation email to customer
async function sendMeetingRequestConfirmationEmail(meetingRequest) {
  try {
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .meeting-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
          .detail-label { font-weight: bold; color: #666; }
          .detail-value { color: #333; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Meeting Request Confirmed</h1>
            <p>We've received your meeting request!</p>
          </div>
          <div class="content">
            <p>Dear ${meetingRequest.customerName},</p>
            <p>Thank you for scheduling a meeting with us! We have received your meeting request and will contact you shortly to confirm the details.</p>
            
            <div class="meeting-details">
              <h2>Your Meeting Details</h2>
              <div class="detail-row">
                <span class="detail-label">Meeting Date:</span>
                <span class="detail-value">${new Date(meetingRequest.meetingDate).toLocaleDateString('en-IN', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  weekday: 'long'
                })}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Meeting Time:</span>
                <span class="detail-value">${meetingRequest.meetingTime}</span>
              </div>
              ${meetingRequest.customerCompany ? `
              <div class="detail-row">
                <span class="detail-label">Company:</span>
                <span class="detail-value">${meetingRequest.customerCompany}</span>
              </div>
              ` : ''}
              ${meetingRequest.message ? `
              <div class="detail-row">
                <span class="detail-label">Your Message:</span>
                <span class="detail-value">${meetingRequest.message}</span>
              </div>
              ` : ''}
            </div>

            <p>Our team will review your meeting request and contact you shortly to confirm the schedule. If you have any questions or need to reschedule, please don't hesitate to reach out to us.</p>
            
            <div class="footer">
              <p>Best regards,<br>The BuyEcomAds Team</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendMail({
      to: meetingRequest.customerEmail,
      subject: `Meeting Request Confirmed - ${meetingRequest.customerName}`,
      html: emailHtml,
    });

    return { success: true };
  } catch (error) {
    console.error("Error sending meeting request confirmation email:", error);
    return { success: false, error: error.message };
  }
}

// Send meeting request notification email to admin
async function sendMeetingRequestNotificationToAdmin(meetingRequest) {
  try {
    const adminEmail = process.env.AdminMail || process.env.ADMIN_EMAIL;
    
    if (!adminEmail) {
      console.warn("Admin email not configured in environment variables");
      return { success: false, error: "Admin email not configured" };
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .meeting-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
          .detail-label { font-weight: bold; color: #666; }
          .detail-value { color: #333; }
          .badge { background: #764ba2; color: white; padding: 5px 10px; border-radius: 5px; font-size: 12px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Meeting Request</h1>
            <p><span class="badge">MEETING REQUEST</span></p>
          </div>
          <div class="content">
            <p><strong>A new meeting request has been submitted!</strong></p>
            
            <div class="meeting-details">
              <h2>Customer Information</h2>
              <div class="detail-row">
                <span class="detail-label">Name:</span>
                <span class="detail-value">${meetingRequest.customerName}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Email:</span>
                <span class="detail-value">${meetingRequest.customerEmail}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Contact:</span>
                <span class="detail-value">${meetingRequest.customerContact}</span>
              </div>
              ${meetingRequest.customerCompany ? `
              <div class="detail-row">
                <span class="detail-label">Company:</span>
                <span class="detail-value">${meetingRequest.customerCompany}</span>
              </div>
              ` : ''}
            </div>

            <div class="meeting-details">
              <h2>Scheduled Meeting</h2>
              <div class="detail-row">
                <span class="detail-label">Meeting Date:</span>
                <span class="detail-value">${new Date(meetingRequest.meetingDate).toLocaleDateString('en-IN', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  weekday: 'long'
                })}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Meeting Time:</span>
                <span class="detail-value">${meetingRequest.meetingTime}</span>
              </div>
              ${meetingRequest.message ? `
              <div class="detail-row">
                <span class="detail-label">Message:</span>
                <span class="detail-value">${meetingRequest.message}</span>
              </div>
              ` : ''}
            </div>

            <p><strong>Action Required:</strong> Please review this meeting request and contact the customer to confirm the schedule.</p>
            
            <div class="footer">
              <p>This is an automated notification from BuyEcomAds Admin System</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendMail({
      to: adminEmail,
      subject: `New Meeting Request - ${meetingRequest.customerName}`,
      html: emailHtml,
    });

    return { success: true };
  } catch (error) {
    console.error("Error sending admin notification email:", error);
    return { success: false, error: error.message };
  }
}

// Export all functions
module.exports = {
  sendMail,
  buildFrontendUrl,
  sendOrderConfirmationEmail,
  sendOrderNotificationToAdmin,
  sendMeetingRequestConfirmationEmail,
  sendMeetingRequestNotificationToAdmin,
};

