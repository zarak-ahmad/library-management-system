import { api, authHeader, loginAsAdmin, registerStudent, createStudentAndLogin } from '../helpers';

describe('Auth API', () => {
  it('logs in admin with seeded credentials', async () => {
    const token = await loginAsAdmin();
    expect(token).toBeTruthy();

    const me = await api.get('/api/v1/auth/me').set(authHeader(token));
    expect(me.status).toBe(200);
    expect(me.body.data.email).toBe('admin@lms.edu');
    expect(me.body.data.role).toBe('admin');
  });

  it('registers a new student', async () => {
    const { response, payload } = await registerStudent('001');

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe(payload.email);
    expect(response.body.data.user.role).toBe('student');
    expect(response.body.message).toMatch(/registration successful/i);
  });

  it('rejects duplicate student registration', async () => {
    await registerStudent('dup');
    const { response } = await registerStudent('dup');

    expect(response.status).toBe(409);
    expect(response.body.success).toBe(false);
  });

  it('rejects invalid login credentials', async () => {
    const response = await api.post('/api/v1/auth/login').send({
      email: 'admin@lms.edu',
      password: 'wrong-password',
    });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('rejects protected routes without token', async () => {
    const response = await api.get('/api/v1/auth/me');
    expect(response.status).toBe(401);
  });
});

describe('RBAC', () => {
  it('blocks students from admin dashboard stats', async () => {
    const { token: studentToken } = await createStudentAndLogin('rbac');

    const response = await api
      .get('/api/v1/dashboard/admin')
      .set(authHeader(studentToken));

    expect(response.status).toBe(403);
  });

  it('allows admin to access dashboard stats', async () => {
    const token = await loginAsAdmin();
    const response = await api.get('/api/v1/dashboard/admin').set(authHeader(token));

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.totalBooks).toBeDefined();
  });
});
