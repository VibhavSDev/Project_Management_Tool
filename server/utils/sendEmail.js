import nodemailer from 'nodemailer';

export const sendEmail = async ({ to, subject, html }) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail', // Consider using SendGrid, Mailgun, or SES in production
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    const mailOptions = {
      from: `"TaskBoard" <${process.env.SMTP_EMAIL}>`,
      to,
      subject,
      html, // HTML formatted email body
    };

    const info = await transporter.sendMail(mailOptions);

    console.log(`📨 Email sent: ${info.response}`);
    return info;
  } catch (error) {
    console.error('❌ Failed to send email:', error.message);
    throw new Error('Email sending failed');
  }
};
