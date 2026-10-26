import { api } from '../helpers';

describe('Health API', () => {
  it('returns running status', async () => {
    const response = await api.get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toMatch(/running/i);
    expect(response.body.timestamp).toBeDefined();
  });
});
