import { transporter } from '../config/email';
import { env } from '../config/env';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export const sendEmail = async (options: SendEmailOptions): Promise<void> => {
  const mailOptions = {
    from: env.EMAIL_FROM,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  };

  if (!env.SMTP_USER || !env.SMTP_PASS) {
    console.log('--- EMAIL (dev mode) ---');
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log(options.text || options.html.replace(/<[^>]*>/g, ''));
    console.log('--- END EMAIL ---');
    return;
  }

  await transporter.sendMail(mailOptions);
};

export const sendWelcomeEmail = async (
  email: string,
  fullName: string,
  registrationNumber: string,
  temporaryPassword: string
): Promise<void> => {
  const loginUrl = `${env.CLIENT_URL}/login`;

  await sendEmail({
    to: email,
    subject: 'Welcome to Library Management System',
    html: `
      <h2>Welcome, ${fullName}!</h2>
      <p>Your student account has been created successfully.</p>
      <p><strong>Registration Number:</strong> ${registrationNumber}</p>
      <p><strong>Temporary Password:</strong> ${temporaryPassword}</p>
      <p>Please <a href="${loginUrl}">login here</a> and change your password on first login.</p>
      <p>Do not share your credentials with anyone.</p>
    `,
    text: `Welcome ${fullName}! Registration: ${registrationNumber}, Temp Password: ${temporaryPassword}. Login at ${loginUrl}`,
  });
};

export const sendForgotPasswordEmail = async (
  email: string,
  fullName: string,
  temporaryPassword: string
): Promise<void> => {
  const loginUrl = `${env.CLIENT_URL}/login`;

  await sendEmail({
    to: email,
    subject: 'Your New Temporary Password',
    html: `
      <h2>Password Reset</h2>
      <p>Hello ${fullName},</p>
      <p>A new temporary password has been generated for your account.</p>
      <p><strong>Temporary Password:</strong> ${temporaryPassword}</p>
      <p>Please <a href="${loginUrl}">login here</a> and change your password after signing in.</p>
      <p>If you did not request this, contact the library administrator immediately.</p>
    `,
    text: `Hello ${fullName}, your new temporary password is: ${temporaryPassword}. Login at ${loginUrl} and change your password.`,
  });
};

export const sendPasswordResetEmail = async (
  email: string,
  fullName: string,
  resetToken: string
): Promise<void> => {
  const resetUrl = `${env.CLIENT_URL}/reset-password/${resetToken}`;

  await sendEmail({
    to: email,
    subject: 'Password Reset Request',
    html: `
      <h2>Password Reset</h2>
      <p>Hello ${fullName},</p>
      <p>You requested a password reset. Click the link below to reset your password:</p>
      <p><a href="${resetUrl}">Reset Password</a></p>
      <p>This link expires in 1 hour. If you did not request this, ignore this email.</p>
    `,
    text: `Reset your password at ${resetUrl}. Link expires in 1 hour.`,
  });
};

export const sendLibrarianWelcomeEmail = async (
  email: string,
  fullName: string,
  employeeId: string,
  temporaryPassword: string
): Promise<void> => {
  const loginUrl = `${env.CLIENT_URL}/login`;

  await sendEmail({
    to: email,
    subject: 'Your Librarian Account - Library Management System',
    html: `
      <h2>Welcome, ${fullName}!</h2>
      <p>Your librarian account has been created.</p>
      <p><strong>Employee ID:</strong> ${employeeId}</p>
      <p><strong>Temporary Password:</strong> ${temporaryPassword}</p>
      <p>Please <a href="${loginUrl}">login here</a> and change your password on first login.</p>
    `,
    text: `Welcome ${fullName}! Employee ID: ${employeeId}, Temp Password: ${temporaryPassword}. Login at ${loginUrl}`,
  });
};

export const sendAccountStatusEmail = async (
  email: string,
  fullName: string,
  status: string,
  reason: string
): Promise<void> => {
  const subject =
    status === 'active'
      ? 'Your Account Has Been Reactivated'
      : `Your Account Has Been ${status.charAt(0).toUpperCase() + status.slice(1)}`;

  await sendEmail({
    to: email,
    subject,
    html: `
      <h2>Account Status Update</h2>
      <p>Hello ${fullName},</p>
      <p>Your account status has been changed to: <strong>${status}</strong></p>
      <p><strong>Reason:</strong> ${reason}</p>
      ${status !== 'active' ? '<p>Some library services may be restricted. Contact the library for assistance.</p>' : ''}
    `,
    text: `Account status: ${status}. Reason: ${reason}`,
  });
};

export const sendEmailVerificationEmail = async (
  email: string,
  fullName: string,
  verificationToken: string
): Promise<void> => {
  const verifyUrl = `${env.CLIENT_URL}/verify-email/${verificationToken}`;

  await sendEmail({
    to: email,
    subject: 'Verify Your Email Address',
    html: `
      <h2>Email Verification</h2>
      <p>Hello ${fullName},</p>
      <p>Please verify your email address by clicking the link below:</p>
      <p><a href="${verifyUrl}">Verify Email</a></p>
      <p>This link expires in 24 hours.</p>
    `,
    text: `Verify your email at ${verifyUrl}`,
  });
};

export const sendBookApprovedEmail = async (
  email: string,
  fullName: string,
  bookTitle: string,
  dueDate: Date
): Promise<void> => {
  await sendEmail({
    to: email,
    subject: 'Book Request Approved',
    html: `
      <h2>Book Issued</h2>
      <p>Hello ${fullName},</p>
      <p>Your request for <strong>${bookTitle}</strong> has been approved and the book has been issued.</p>
      <p><strong>Due Date:</strong> ${dueDate.toLocaleDateString()}</p>
    `,
    text: `Book "${bookTitle}" issued. Due: ${dueDate.toLocaleDateString()}`,
  });
};

export const sendBookRejectedEmail = async (
  email: string,
  fullName: string,
  bookTitle: string,
  remarks?: string
): Promise<void> => {
  await sendEmail({
    to: email,
    subject: 'Book Request Rejected',
    html: `
      <h2>Request Rejected</h2>
      <p>Hello ${fullName},</p>
      <p>Your request for <strong>${bookTitle}</strong> was rejected.</p>
      ${remarks ? `<p><strong>Remarks:</strong> ${remarks}</p>` : ''}
    `,
    text: `Book request for "${bookTitle}" rejected.${remarks ? ` Reason: ${remarks}` : ''}`,
  });
};

export const sendReservationConfirmationEmail = async (
  email: string,
  fullName: string,
  bookTitle: string,
  expiryDate: Date
): Promise<void> => {
  await sendEmail({
    to: email,
    subject: 'Book Reservation Confirmed',
    html: `
      <h2>Reservation Confirmed</h2>
      <p>Hello ${fullName},</p>
      <p>You have reserved <strong>${bookTitle}</strong>.</p>
      <p><strong>Expires:</strong> ${expiryDate.toLocaleDateString()}</p>
    `,
    text: `Reserved "${bookTitle}". Expires: ${expiryDate.toLocaleDateString()}`,
  });
};

export const sendDueDateReminderEmail = async (
  email: string,
  fullName: string,
  bookTitle: string,
  dueDate: Date
): Promise<void> => {
  await sendEmail({
    to: email,
    subject: 'Book Due Date Reminder',
    html: `
      <h2>Due Date Reminder</h2>
      <p>Hello ${fullName},</p>
      <p>Your borrowed book <strong>${bookTitle}</strong> is due on ${dueDate.toLocaleDateString()}.</p>
    `,
    text: `"${bookTitle}" due on ${dueDate.toLocaleDateString()}`,
  });
};

export const sendOverdueNoticeEmail = async (
  email: string,
  fullName: string,
  bookTitle: string,
  overdueDays: number
): Promise<void> => {
  await sendEmail({
    to: email,
    subject: 'Overdue Book Notice',
    html: `
      <h2>Overdue Notice</h2>
      <p>Hello ${fullName},</p>
      <p>Your book <strong>${bookTitle}</strong> is ${overdueDays} day(s) overdue. Please return it promptly.</p>
    `,
    text: `"${bookTitle}" is ${overdueDays} days overdue.`,
  });
};

export const sendFinePaidEmail = async (
  email: string,
  fullName: string,
  fineId: string,
  amount: number,
  bookTitle: string
): Promise<void> => {
  await sendEmail({
    to: email,
    subject: 'Fine Payment Confirmation',
    html: `
      <h2>Payment Received</h2>
      <p>Hello ${fullName},</p>
      <p>We have received your fine payment of <strong>Rs. ${amount}</strong> for fine <strong>${fineId}</strong> (${bookTitle}).</p>
      <p>Thank you for settling your account.</p>
    `,
    text: `Payment of Rs. ${amount} received for fine ${fineId}.`,
  });
};

export const sendSupportUpdateEmail = async (
  email: string,
  fullName: string,
  requestId: string,
  subject: string,
  statusLabel: string,
  notes?: string
): Promise<void> => {
  await sendEmail({
    to: email,
    subject: `Support Ticket Update — ${requestId}`,
    html: `
      <h2>Support Ticket Update</h2>
      <p>Hello ${fullName},</p>
      <p>Your support ticket <strong>${requestId}</strong> (${subject}) has been updated.</p>
      <p><strong>Status:</strong> ${statusLabel}</p>
      ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
      <p>Please log in to the LMS portal to view details and respond if needed.</p>
    `,
    text: `Ticket ${requestId} updated to ${statusLabel}.`,
  });
};
