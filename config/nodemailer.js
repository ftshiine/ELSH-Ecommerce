import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendOTPEmail = async (toEmail, otp) => {
  const mailOptions = {
    from: `"ELSH Skincare" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Your ELSH Verification Code',
    html: `
      <div style="font-family: 'Georgia', serif; max-width: 480px; margin: 0 auto; padding: 40px; background: #f5f5ee;">
        <h2 style="color: #2c2c2c; font-weight: normal;">ELSH</h2>
        <h3 style="color: #4a5240; font-weight: normal;">Verification Code</h3>
        <p style="color: #888; font-size: 14px;">Use the code below to verify your email address.</p>
        <div style="background: #ffffff; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
          <h1 style="color: #2c2c2c; letter-spacing: 16px; font-size: 36px;">${otp}</h1>
        </div>
        <p style="color: #aaa; font-size: 12px;">This code expires in 10 minutes. Do not share it with anyone.</p>
        <p style="color: #aaa; font-size: 12px;">© 2024 ELSH Essential Luxury</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

export default sendOTPEmail;