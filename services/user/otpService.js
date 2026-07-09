import generateOTP from '../../utils/generateOtp.js';
import sendOTPEmail from '../../config/nodemailer.js';

const otpStore = new Map();
const processingEmails = new Set();
const abuseTracker = new Map(); // email -> { count, windowStart }

const sendOTP = async (email) => {
  // 1. Concurrency Lock
  if (processingEmails.has(email)) {
    throw new Error('OTP request is already processing. Please wait.');
  }
  
  const now = Date.now();

  // 2. Cooldown Enforcement (60 seconds)
  const existingRecord = otpStore.get(email);
  if (existingRecord && existingRecord.lastSentAt) {
    const elapsed = now - existingRecord.lastSentAt;
    if (elapsed < 60 * 1000) {
      throw new Error(`Please wait ${Math.ceil((60000 - elapsed) / 1000)} seconds before requesting another OTP.`);
    }
  }

  // 3. Abuse Rate Limiting (5 per hour)
  const abuseRecord = abuseTracker.get(email) || { count: 0, windowStart: now };
  if (now - abuseRecord.windowStart > 60 * 60 * 1000) {
    // Reset window after 1 hour
    abuseRecord.count = 0;
    abuseRecord.windowStart = now;
  }
  
  if (abuseRecord.count >= 5) {
    throw new Error('Too many OTP requests. Please try again later.');
  }

  processingEmails.add(email);

  try {
    const otp = generateOTP();
    const expiresAt = now + 10 * 60 * 1000; // 10 minutes

    otpStore.set(email, { otp, expiresAt, lastSentAt: now });
    
    // Increment abuse count
    abuseRecord.count += 1;
    abuseTracker.set(email, abuseRecord);

    await sendOTPEmail(email, otp);

    processingEmails.delete(email);
    return otp;
  } catch (error) {
    processingEmails.delete(email);
    throw error;
  }
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