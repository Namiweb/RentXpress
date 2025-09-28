import nodemailer from 'nodemailer';

// Create email transporter
const createTransporter = () => {
    if (process.env.NODE_ENV === 'production') {
        return nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        });
    } else {
        return nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            auth: {
                user: process.env.EMAIL_USER || 'ethereal.user@ethereal.email',
                pass: process.env.EMAIL_PASSWORD || 'ethereal.pass'
            }
        });
    }
};

// Email templates
const emailTemplates = {
    emailVerification: {
        subject: 'Verify Your Email - RentXpress',
        html: (data) => `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #007bff; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px 20px; background: #f8f9fa; }
          .button { display: inline-block; padding: 12px 30px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to RentXpress!</h1>
          </div>
          <div class="content">
            <h2>Hi ${data.name},</h2>
            <p>Thank you for registering with RentXpress. To complete your registration, please verify your email address:</p>
            <center>
              <a href="${data.verificationUrl}" class="button">Verify Email Address</a>
            </center>
            <p>This verification link will expire in 24 hours.</p>
          </div>
          <div class="footer">
            <p>&copy; 2025 RentXpress. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
    },

    passwordReset: {
        subject: 'Password Reset Request - RentXpress',
        html: (data) => `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc3545; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px 20px; background: #f8f9fa; }
          .button { display: inline-block; padding: 12px 30px; background: #dc3545; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <h2>Hi ${data.name},</h2>
            <p>We received a request to reset your password for your RentXpress account.</p>
            <center>
              <a href="${data.resetUrl}" class="button">Reset Password</a>
            </center>
            <p>This link will expire in ${data.validFor}.</p>
          </div>
          <div class="footer">
            <p>&copy; 2025 RentXpress. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
    }
};

// Send email function
const sendEmail = async (options) => {
    try {
        const transporter = createTransporter();

        let { to, subject, template, data = {}, html } = options;

        if (template && emailTemplates[template]) {
            html = emailTemplates[template].html(data);
            subject = subject || emailTemplates[template].subject;
        }

        const mailOptions = {
            from: {
                name: 'RentXpress',
                address: process.env.EMAIL_FROM || 'noreply@rentxpress.com'
            },
            to,
            subject,
            html
        };

        const result = await transporter.sendMail(mailOptions);

        if (process.env.NODE_ENV !== 'production') {
            console.log('Preview URL: %s', nodemailer.getTestMessageUrl(result));
        }

        return {
            success: true,
            messageId: result.messageId
        };

    } catch (error) {
        console.error('Email sending failed:', error);
        throw new Error(`Failed to send email: ${error.message}`);
    }
};

export { sendEmail, emailTemplates };
