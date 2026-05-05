import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import EmailTemplate from '../models/EmailTemplate';

const sesClient = new SESClient({
  region: process.env.AWS_REGION || "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

export const sendDynamicEmail = async (
  toEmail: string,
  templateName: string,
  templateData: Record<string, string | number>
) => {
  try {
    const template = await EmailTemplate.findOne({ name: templateName });
    if (!template) {
      throw new Error(`EmailTemplate not found: ${templateName}`);
    }

    let subject = template.subject;
    let htmlContent = template.htmlContent;

    // Replace variables
    Object.keys(templateData).forEach((key) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      subject = subject.replace(regex, String(templateData[key]));
      htmlContent = htmlContent.replace(regex, String(templateData[key]));
    });

    const fromEmail = process.env.AWS_SES_FROM_EMAIL || "noreply@opentheatre.in";

    const params = {
      Source: fromEmail,
      Destination: {
        ToAddresses: [toEmail],
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: "UTF-8",
        },
        Body: {
          Html: {
            Data: htmlContent,
            Charset: "UTF-8",
          },
        },
      },
    };

    const command = new SendEmailCommand(params);
    const result = await sesClient.send(command);
    console.log(`[EmailService] Dynamic email '${templateName}' sent to ${toEmail}. MessageId: ${result.MessageId}`);
    return result;
  } catch (error) {
    console.error(`[EmailService] Error sending dynamic email '${templateName}':`, error);
    throw error;
  }
};

export const sendOrderConfirmationEmail = async (
  userEmail: string,
  userName: string,
  movieTitle: string,
  amount: number,
  orderId: string,
  watchUrl: string
) => {
  try {
    // Try to send using dynamic template first
    try {
      return await sendDynamicEmail(userEmail, 'order-confirmation', {
        userName,
        movieTitle,
        amount,
        orderId,
        watchUrl
      });
    } catch (dynamicError: any) {
      if (dynamicError.message && dynamicError.message.includes('EmailTemplate not found')) {
        console.log(`[EmailService] Dynamic template 'order-confirmation' not found, falling back to hardcoded template.`);
      } else {
        throw dynamicError;
      }
    }

    const fromEmail = process.env.AWS_SES_FROM_EMAIL || "noreply@opentheatre.in";

    const htmlContent = `
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
            <h1 style="color: #fff; margin: 0;">Open Theatre</h1>
          </div>
          <div class="content">
            <div class="hero-text">Hi ${userName}, Your Order is Confirmed! 🍿</div>
            <p>Thank you for your purchase. You can now enjoy watching <strong>${movieTitle}</strong> on Open Theatre.</p>
            
            <div class="order-details">
              <div class="detail-row">
                <span class="detail-label">Movie Title</span>
                <span class="detail-value">${movieTitle}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Order ID</span>
                <span class="detail-value">${orderId}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Amount Paid</span>
                <span class="detail-value">₹${amount}</span>
              </div>
            </div>

            <center>
              <a href="${watchUrl}" class="button">Start Watching Now</a>
            </center>

            <p style="margin-top: 30px;">Happy Watching!<br>Team Open Theatre</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Open Theatre. All rights reserved.</p>
            <p>If you have any questions, contact us at support@opentheatre.in</p>
            <div class="social-links">
              <a href="#">Instagram</a> | <a href="#">Facebook</a> | <a href="#">Twitter</a>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const params = {
      Source: fromEmail,
      ReplyToAddresses: ['opentheatre20@gmail.com'],
      Destination: {
        ToAddresses: [userEmail],
      },
      Message: {
        Subject: {
          Data: `Order Confirmed: ${movieTitle} on Open Theatre`,
          Charset: "UTF-8",
        },
        Body: {
          Html: {
            Data: htmlContent,
            Charset: "UTF-8",
          },
        },
      },
    };

    const command = new SendEmailCommand(params);
    const result = await sesClient.send(command);
    console.log(`[EmailService] Order confirmation sent to ${userEmail}. MessageId: ${result.MessageId}`);
    return result;
  } catch (error) {
    console.error("[EmailService] Error sending email:", error);
    throw error;
  }
};
