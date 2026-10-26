import { Role } from '../models/Role.model';
import { User } from '../models/User.model';
import { ROLE_PERMISSIONS } from '../types';
import { hashPassword } from '../utils/password';

export const seedRoles = async (): Promise<void> => {
  const roles = [
    { name: 'admin' as const, description: 'System Administrator', permissions: ROLE_PERMISSIONS.admin },
    { name: 'librarian' as const, description: 'Library Staff', permissions: ROLE_PERMISSIONS.librarian },
    { name: 'student' as const, description: 'Library Member', permissions: ROLE_PERMISSIONS.student },
  ];

  for (const role of roles) {
    await Role.findOneAndUpdate(
      { name: role.name },
      { $set: role },
      { upsert: true, new: true }
    );
  }

  console.log('Roles seeded');
};

export const seedAdmin = async (): Promise<void> => {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@lms.edu';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';

  const existing = await User.findOne({ email: adminEmail });
  if (existing) {
    console.log('Admin user already exists');
    return;
  }

  await User.create({
    email: adminEmail,
    password: await hashPassword(adminPassword),
    role: 'admin',
    fullName: 'System Administrator',
    status: 'active',
    firstLoginCompleted: true,
    isEmailVerified: true,
    adminProfile: { employeeId: 'ADM-001' },
  });

  console.log(`Admin user created: ${adminEmail}`);
};

export const seedLibrarian = async (): Promise<void> => {
  const email = process.env.LIBRARIAN_EMAIL || 'librarian@lms.edu';
  const password = process.env.LIBRARIAN_PASSWORD || 'Librarian@123456';

  const existing = await User.findOne({ email });
  if (existing) {
    console.log('Librarian user already exists');
    return;
  }

  await User.create({
    email,
    password: await hashPassword(password),
    role: 'librarian',
    fullName: 'Demo Librarian',
    status: 'active',
    firstLoginCompleted: true,
    isEmailVerified: true,
    librarianProfile: { employeeId: 'LIB-001', department: 'Library' },
  });

  console.log(`Librarian user created: ${email}`);
};

export const seedDemoStudent = async (): Promise<void> => {
  const email = process.env.STUDENT_EMAIL || 'student@lms.edu';
  const password = process.env.STUDENT_PASSWORD || 'Student@123456';

  const existing = await User.findOne({ email });
  if (existing) {
    console.log('Demo student already exists');
    return;
  }

  await User.create({
    email,
    password: await hashPassword(password),
    role: 'student',
    fullName: 'Demo Student',
    phone: process.env.STUDENT_PHONE || '+923001234567',
    status: 'active',
    firstLoginCompleted: true,
    isEmailVerified: true,
    studentProfile: {
      registrationNumber: 'REG-DEMO-001',
      department: 'Computer Science',
      address: 'Demo Campus',
    },
  });

  console.log(`Demo student created: ${email}`);
};
