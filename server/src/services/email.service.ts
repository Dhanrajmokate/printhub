import nodemailer from 'nodemailer';
import { config } from '../config/index.js';
import { prisma } from '../prisma.js';

let transporter: nodemailer.Transporter | null = null;

if (config.smtp.user && config.smtp.pass) {
  const isGmail = config.smtp.host.includes('gmail') || config.smtp.user.includes('@gmail.com');
  const sanitizedPass = (config.smtp.pass || '').replace(/\s+/g, '');
  transporter = nodemailer.createTransport(
    isGmail
      ? {
          service: 'gmail',
          auth: {
            user: config.smtp.user,
            pass: sanitizedPass
          },
          connectionTimeout: 4000,
          greetingTimeout: 3000,
          socketTimeout: 5000
        }
      : {
          host: config.smtp.host,
          port: config.smtp.port,
          secure: config.smtp.port === 465,
          auth: {
            user: config.smtp.user,
            pass: sanitizedPass
          },
          connectionTimeout: 4000,
          greetingTimeout: 3000,
          socketTimeout: 5000
        }
  );
}

// In-memory cache for recent OTPs for instant dev fallback lookup
const recentOtps = new Map<string, { otp: string; expiresAt: Date }>();

export async function generateAndSendOtp(email: string, type: 'REGISTRATION' | 'LOGIN' = 'REGISTRATION'): Promise<{ otp: string; emailSent: boolean }> {
  // Generate 6-digit random OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

  // Store in database
  await prisma.otpVerification.create({
    data: {
      email: email.toLowerCase().trim(),
      otp,
      type,
      expiresAt
    }
  });

  recentOtps.set(email.toLowerCase().trim(), { otp, expiresAt });

  let emailSent = false;

  if (transporter && config.smtp.user) {
    try {
      const sendPromise = transporter.sendMail({
        from: config.smtp.from,
        to: email,
        subject: `Your PrintHub Verification Code: ${otp}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #4f46e5; margin-bottom: 8px;">PrintHub Verification</h2>
            <p style="color: #475569; font-size: 15px;">Use the verification code below to complete your registration or login on PrintHub.</p>
            <div style="background-color: #f1f5f9; padding: 16px; text-align: center; border-radius: 6px; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #1e293b;">${otp}</span>
            </div>
            <p style="color: #64748b; font-size: 13px;">This code is valid for 10 minutes. If you did not request this, please ignore this email.</p>
          </div>
        `
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('SMTP timeout (4s exceeded)')), 4000)
      );

      await Promise.race([sendPromise, timeoutPromise]);
      emailSent = true;
      console.log(`[Email] OTP sent successfully to ${email}`);
    } catch (err: any) {
      console.warn(`[Email] SMTP delivery notice (${err.message}). Instant on-screen code enabled.`);
    }
  } else {
    console.log(`\n========================================`);
    console.log(`[DEV OTP FALLBACK] OTP for ${email}: ${otp}`);
    console.log(`========================================\n`);
  }

  return { otp, emailSent };
}

export async function verifyOtp(email: string, enteredOtp: string, type: 'REGISTRATION' | 'LOGIN' = 'REGISTRATION'): Promise<boolean> {
  const normalizedEmail = email.toLowerCase().trim();
  const trimmedOtp = enteredOtp.trim();

  // Find valid OTP in DB
  const record = await prisma.otpVerification.findFirst({
    where: {
      email: normalizedEmail,
      otp: trimmedOtp,
      type,
      expiresAt: {
        gt: new Date()
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  if (record) {
    // Delete used OTP
    await prisma.otpVerification.delete({
      where: { id: record.id }
    });
    recentOtps.delete(normalizedEmail);
    return true;
  }

  return false;
}
