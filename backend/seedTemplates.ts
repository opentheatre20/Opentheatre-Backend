import mongoose from 'mongoose';
import dotenv from 'dotenv';
import EmailTemplate from './src/models/EmailTemplate';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || '';

const orderConfirmationHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
    .header { background: #12113d; padding: 30px; text-align: center; }
    .header img { max-width: 200px; }
    .content { padding: 40px; background: #fff; }
    .hero-text { font-size: 24px; font-weight: bold; color: #12113d; margin-bottom: 20px; }
    .order-details { background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 25px 0; }
    .detail-row { display: flex; justify-content: space-between; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 8px; }
    .detail-label { font-weight: bold; color: #666; }
    .detail-value { font-weight: bold; color: #12113d; }
    .button { display: inline-block; background: #ea580c; color: #ffffff !important; padding: 15px 35px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 25px; transition: background 0.3s; }
    .footer { background: #f4f4f4; padding: 20px; text-align: center; font-size: 12px; color: #999; }
    .social-links { margin-top: 15px; }
    .social-links a { margin: 0 10px; color: #ea580c; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://opentheatre.in/logo.png" alt="Open Theatre" style="max-height: 40px; margin-bottom: 15px;" />
      <h1 style="color: #fff; margin: 0;">Open Theatre</h1>
    </div>
    <div class="content">
      <div class="hero-text">Hi {{userName}}, Your Order is Confirmed! 🍿</div>
      <p>Thank you for your purchase. You can now enjoy watching <strong>{{movieTitle}}</strong> on Open Theatre.</p>
      
      <div class="order-details">
        <div class="detail-row">
          <span class="detail-label">Movie Title</span>
          <span class="detail-value">{{movieTitle}}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Order ID</span>
          <span class="detail-value">{{orderId}}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Amount Paid</span>
          <span class="detail-value">₹{{amount}}</span>
        </div>
      </div>

      <center>
        <a href="{{watchUrl}}" class="button">Start Watching Now</a>
      </center>

      <p style="margin-top: 30px;">Happy Watching!<br>Team Open Theatre</p>
    </div>
    <div class="footer">
      <p>&copy; 2026 Open Theatre. All rights reserved.</p>
      <p>If you have any questions, contact us at support@opentheatre.in</p>
    </div>
  </div>
</body>
</html>
`;

const forgotPasswordHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
    .header { background: #12113d; padding: 30px; text-align: center; }
    .content { padding: 40px; background: #fff; text-align: center; }
    .hero-text { font-size: 24px; font-weight: bold; color: #12113d; margin-bottom: 20px; }
    .button { display: inline-block; background: #ea580c; color: #ffffff !important; padding: 15px 35px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 25px; transition: background 0.3s; }
    .footer { background: #f4f4f4; padding: 20px; text-align: center; font-size: 12px; color: #999; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://opentheatre.in/logo.png" alt="Open Theatre" style="max-height: 40px; margin-bottom: 15px;" />
      <h1 style="color: #fff; margin: 0;">Open Theatre</h1>
    </div>
    <div class="content">
      <div class="hero-text">Reset Your Password</div>
      <p>Hi {{userName}},</p>
      <p>You recently requested to reset your password for your Open Theatre account. Click the button below to proceed.</p>
      <center>
        <a href="{{resetUrl}}" class="button">Reset Password</a>
      </center>
      <p style="margin-top: 30px; font-size: 14px; color: #666;">If you did not request a password reset, please ignore this email or reply to let us know. This password reset is only valid for the next hour.</p>
      <p style="margin-top: 30px;">Thanks,<br>Team Open Theatre</p>
    </div>
    <div class="footer">
      <p>&copy; 2026 Open Theatre. All rights reserved.</p>
      <p>If you have any questions, contact us at support@opentheatre.in</p>
    </div>
  </div>
</body>
</html>
`;

const seedTemplates = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Create Order Confirmation
    await EmailTemplate.findOneAndUpdate(
      { name: 'order-confirmation' },
      {
        name: 'order-confirmation',
        subject: 'Order Confirmed: {{movieTitle}} on Open Theatre',
        htmlContent: orderConfirmationHtml.trim(),
        variables: ['userName', 'movieTitle', 'amount', 'orderId', 'watchUrl'],
        description: 'Sent when a user successfully purchases a movie.'
      },
      { upsert: true, new: true }
    );
    console.log('Order confirmation template seeded.');

    // Create Forgot Password
    await EmailTemplate.findOneAndUpdate(
      { name: 'forgot-password' },
      {
        name: 'forgot-password',
        subject: 'Reset your Open Theatre password',
        htmlContent: forgotPasswordHtml.trim(),
        variables: ['userName', 'resetUrl'],
        description: 'Sent when a user requests a password reset.'
      },
      { upsert: true, new: true }
    );
    console.log('Forgot password template seeded.');

    console.log('Seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedTemplates();
