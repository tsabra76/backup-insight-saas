// Email confirmation service for subscription confirmations
const nodemailer = require('nodemailer');

// Create reusable transporter using environment variables
let transporter;
if (process.env.EMAIL_API_KEY && process.env.EMAIL_SERVICE) {
  transporter = nodemailer.createTransporter({
    service: process.env.EMAIL_SERVICE,
    auth: {
      apiKey: process.env.EMAIL_API_KEY
    }
  });
} else if (process.env.SMTP_HOST) {
  // Fallback to SMTP configuration
  transporter = nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
}

// Send subscription confirmation email
async function sendSubscriptionConfirmation({ email, name, customerId, subscriptionId }) {
  if (!transporter) {
    console.warn('Email service not configured - skipping confirmation email');
    return;
  }
  
  try {
    const mailOptions = {
      from: 'notifications@musicpro.ai', // Your sender address
      to: email,
      subject: 'Welcome to MusicPro AI!',
      html: `
        <h2>Welcome, ${name}!</h2>
        <p>Your subscription has been successfully processed.</p>
        <ul>
          <li>Customer ID: ${customerId}</li>
          <li>Subscription ID: ${subscriptionId}</li>
          <li>Plan: MusicPro Premium ($9.99/month)</li>
          <li>Trial Period: 14 days</li>
        </ul>
        <h3>What's included in your subscription:</h3>
        <ul>
          <li>Advanced music backup analysis</li>
          <li>Unlimited file scanning</li>
          <li>Deep insights & recommendations</li>
          <li>Cloud storage optimization</li>
          <li>Priority support access</li>
        </ul>
        <p>You can now access your music backup analytics dashboard with personalized insights.</p>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 10px; margin-top: 20px;">
          <h3>Your MusicPro AI Dashboard</h3>
          <p>Log in to your dashboard to see your backup analysis, track file changes, and optimize your music storage.</p>
        </div>
        <p>If you have any questions, please don't hesitate to contact our support team at support@musicpro.ai</p>
        <hr style="border: none; border-top: 1px solid #dddddd; margin: 20px 0;">
        <p style="font-size: 14px; color: #666666;">Thank you for choosing MusicPro AI - Premium Music Backup Analysis & Protection</p>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Confirmation email sent to:', email);
  } catch (error) {
    console.error('Failed to send confirmation email:', error);
    throw new Error(`Email delivery failed: ${error.message}`);
  }
}

module.exports = { sendSubscriptionConfirmation };
