import nodemailer from 'nodemailer';
import { env } from './env';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST || 'smtp.gmail.com',
  port: env.SMTP_PORT,
  secure: false,
  auth: env.SMTP_USER && env.SMTP_PASS
    ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
    : undefined,
});

export const verifyEmailConnection = async (): Promise<boolean> => {
  if (!env.SMTP_USER || !env.SMTP_PASS) {
    console.warn('SMTP credentials not configured — emails will be logged to console');
    return false;
  }
  try {
    await transporter.verify();
    console.log('Email service connected');
    return true;
  } catch (error) {
    console.warn('Email service unavailable:', error);
    return false;
  }
};

export { transporter };
