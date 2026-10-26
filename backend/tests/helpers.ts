import request from 'supertest';
import app from '../src/app';
import { User } from '../src/models/User.model';
import { hashPassword } from '../src/utils/password';

export const api = request(app);

export const loginAsAdmin = async (): Promise<string> => {
  const response = await api.post('/api/v1/auth/login').send({
    email: 'admin@lms.edu',
    password: 'Admin@123456',
  });

  expect(response.status).toBe(200);
  expect(response.body.success).toBe(true);
  return response.body.data.accessToken as string;
};

export const authHeader = (token: string) => ({
  Authorization: `Bearer ${token}`,
});

export const registerStudent = async (suffix: string) => {
  const payload = {
    registrationNumber: `REG-${suffix}`,
    fullName: `Test Student ${suffix}`,
    email: `student.${suffix}@test.edu`,
    phone: '03001234567',
    department: 'Computer Science',
    address: 'Test Campus',
  };

  const response = await api.post('/api/v1/auth/register').send(payload);
  return { response, payload };
};

export const createStudentAndLogin = async (suffix: string) => {
  const email = `student.${suffix}@test.edu`;
  const password = 'Student@123456';

  await User.deleteOne({ email });
  await User.create({
    email,
    password: await hashPassword(password),
    role: 'student',
    fullName: `Test Student ${suffix}`,
    status: 'active',
    firstLoginCompleted: true,
    isEmailVerified: true,
    studentProfile: {
      registrationNumber: `REG-${suffix}`,
      department: 'Computer Science',
      address: 'Test Campus',
    },
  });

  const loginResponse = await api.post('/api/v1/auth/login').send({ email, password });
  expect(loginResponse.status).toBe(200);

  return {
    email,
    password,
    token: loginResponse.body.data.accessToken as string,
  };
};
