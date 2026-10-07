import request from 'supertest';
import { app } from '@/app';

describe('health routes', () => {
  it('returns API health information', async () => {
    const response = await request(app).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      service: 'workbridge-api',
      version: '0.1.0',
    });
  });
});
