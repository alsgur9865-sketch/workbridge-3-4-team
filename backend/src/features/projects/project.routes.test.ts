import request from 'supertest';
import { app } from '@/app';

describe('project routes', () => {
  it('rejects an invalid project id before querying the database', async () => {
    const response = await request(app).get('/api/v1/projects/not-a-project-id');

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      success: false,
      error: { code: 'VALIDATION_ERROR' },
    });
  });
});
