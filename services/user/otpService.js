import generateOTP from '../../utils/generateOtp.js';
import sendOTPEmail from '../../config/nodemailer.js';

const otpStore = new Map();

const sendOTP = async (email) => {
  const otp = generateOTP();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  otpStore.set(email, { otp, expiresAt });

  await sendOTPEmail(email, otp);

  return otp;
};

const verifyOTP = (email, enteredOtp) => {
  const record = otpStore.get(email);

  if (!record) return { success: false, message: 'OTP not found' };
  if (Date.now() > record.expiresAt) {
    otpStore.delete(email);
    return { success: false, message: 'OTP expired' };
  }
  if (record.otp !== enteredOtp) return { success: false, message: 'Invalid OTP' };

  otpStore.delete(email);
  return { success: true };
};

export { sendOTP, verifyOTP };