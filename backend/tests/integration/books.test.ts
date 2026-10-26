import { api, authHeader, loginAsAdmin } from '../helpers';

describe('Books API', () => {
  it('lists books for authenticated admin', async () => {
    const token = await loginAsAdmin();
    const response = await api.get('/api/v1/books').set(authHeader(token));

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it('lists genres publicly for authenticated users', async () => {
    const token = await loginAsAdmin();
    const response = await api.get('/api/v1/genres').set(authHeader(token));

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.length).toBeGreaterThan(0);
  });
});

describe('Reports API', () => {
  it('generates inventory report for admin', async () => {
    const token = await loginAsAdmin();
    const response = await api
      .get('/api/v1/reports/inventory')
      .set(authHeader(token));

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.title).toBe('Inventory Report');
    expect(Array.isArray(response.body.data.headers)).toBe(true);
  });
});
