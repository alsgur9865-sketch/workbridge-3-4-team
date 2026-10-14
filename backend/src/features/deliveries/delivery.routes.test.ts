import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { AppError } from '@/errors/AppError';
import { Prisma } from '@/generated/prisma/client';

const secret = vi.hoisted(() => {
  process.env.JWT_ACCESS_SECRET = 'delivery-tests-access-secret-at-least-32-characters';
  return process.env.JWT_ACCESS_SECRET;
});
const database = vi.hoisted(() => ({
  contract: { findUnique: vi.fn() },
  delivery: {
    create: vi.fn(),
    findUnique: vi.fn(),
    updateMany: vi.fn(),
    findUniqueOrThrow: vi.fn(),
  },
  project: { updateMany: vi.fn() },
  payment: { findUnique: vi.fn() },
  notification: { create: vi.fn(), createMany: vi.fn() },
  $queryRaw: vi.fn(),
  $transaction: vi.fn(),
}));
vi.mock('@/lib/prisma', () => ({ getPrisma: () => database }));
vi.mock('./delivery.storage', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./delivery.storage')>()),
  isStorageConfigured: () => false,
  createUpload: vi.fn(),
  verifyAttachments: vi.fn(),
  createDownload: vi.fn(),
}));
const { app } = await import('@/app');
const service = await import('./delivery.service');
const storage = vi.mocked(await import('./delivery.storage'));
const clientId = randomUUID();
const freelancerId = randomUUID();
const contractId = randomUUID();
const projectId = randomUUID();
const applicationId = randomUUID();
const deliveryId = randomUUID();
const attachmentPath = `${contractId}/${freelancerId}/${randomUUID()}/result.pdf`;
const baseUrl = `/api/v1/contracts/${contractId}/delivery`;
const input = {
  message: '완성한 프로젝트 결과물을 제출합니다.',
  resultUrl: 'https://example.com/result',
  attachmentUrls: [],
};
const client = { id: clientId, role: 'CLIENT' as const };
const freelancer = { id: freelancerId, role: 'FREELANCER' as const };

function authorization(user: { id: string; role: 'CLIENT' | 'FREELANCER' } = freelancer) {
  return `Bearer ${jwt.sign({ sub: user.id, role: user.role }, secret, { expiresIn: '5m' })}`;
}
function delivery(overrides = {}) {
  return {
    id: deliveryId,
    contractId,
    ...input,
    status: 'SUBMITTED',
    submittedAt: new Date(),
    approvedAt: null,
    ...overrides,
  };
}
function contract(overrides = {}, projectOverrides = {}) {
  return {
    id: contractId,
    projectId,
    applicationId,
    status: 'SIGNED',
    project: {
      id: projectId,
      title: '납품 테스트',
      clientId,
      deletedAt: null,
      transactionStatus: 'IN_PROGRESS',
      selectedApplicationId: applicationId,
      ...projectOverrides,
    },
    application: { freelancerId },
    payment: { status: 'ESCROWED' },
    delivery: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  database.contract.findUnique.mockResolvedValue(contract());
  database.delivery.create.mockResolvedValue(delivery());
  database.delivery.findUnique.mockResolvedValue(delivery());
  database.delivery.findUniqueOrThrow.mockResolvedValue(delivery({ status: 'APPROVED' }));
  database.delivery.updateMany.mockResolvedValue({ count: 1 });
  database.project.updateMany.mockResolvedValue({ count: 1 });
  database.payment.findUnique.mockResolvedValue({
    status: 'RELEASED',
    releasedAt: new Date(),
    platformFee: 100,
    settlementAmount: 900,
  });
  database.$transaction.mockImplementation((callback) => callback(database));
  storage.createUpload.mockResolvedValue({
    path: attachmentPath,
    signedUrl: 'https://storage.example/upload',
  });
  storage.createDownload.mockResolvedValue({
    signedUrl: 'https://storage.example/download',
    expiresIn: 60,
  });
});

describe('delivery authentication and lifecycle', () => {
  it('requires real JWT authentication on every endpoint', async () => {
    const responses = await Promise.all([
      request(app).get(baseUrl),
      request(app).post(baseUrl).send(input),
      request(app).post(`${baseUrl}/upload-url`).send({}),
      request(app).post(`${baseUrl}/download-url`).send({}),
      request(app).patch(`/api/v1/deliveries/${deliveryId}/approve`),
    ]);
    expect(responses.map((response) => response.status)).toEqual([401, 401, 401, 401, 401]);
  });
  it('returns capabilities and no delivery before submission', async () => {
    const response = await request(app).get(baseUrl).set('Authorization', authorization());
    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body.data).toMatchObject({
      canSubmit: true,
      canApprove: false,
      settlementAvailable: true,
      storageConfigured: false,
      delivery: null,
    });
  });
  it('blocks a nonparty from reading', async () => {
    const response = await request(app)
      .get(baseUrl)
      .set('Authorization', authorization({ ...freelancer, id: randomUUID() }));
    expect(response.status).toBe(403);
  });
  it('hides deleted contracts', async () => {
    database.contract.findUnique.mockResolvedValue(contract({}, { deletedAt: new Date() }));
    expect((await request(app).get(baseUrl).set('Authorization', authorization())).status).toBe(
      404,
    );
  });
  it('submits text and URL without a configured storage service and notifies the client', async () => {
    const response = await request(app)
      .post(baseUrl)
      .set('Authorization', authorization())
      .send(input);
    expect(response.status).toBe(201);
    expect(database.delivery.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ contractId, ...input }),
    });
    expect(database.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: clientId,
        type: 'DELIVERY_SUBMITTED',
        targetUrl: `/contracts/${contractId}/delivery`,
      }),
    });
    expect(database.$queryRaw).toHaveBeenCalled();
  });
  it('blocks CLIENT submissions', async () => {
    const response = await request(app)
      .post(baseUrl)
      .set('Authorization', authorization(client))
      .send(input);
    expect(response.status).toBe(403);
    expect(database.delivery.create).not.toHaveBeenCalled();
  });
  it('blocks another freelancer', async () => {
    const response = await request(app)
      .post(baseUrl)
      .set('Authorization', authorization({ ...freelancer, id: randomUUID() }))
      .send(input);
    expect(response.status).toBe(403);
  });
  it.each(['PAYMENT_PENDING', 'COMPLETED', 'CANCELLED', 'CONTRACT_PENDING'])(
    'blocks the %s stage',
    async (transactionStatus) => {
      database.contract.findUnique.mockResolvedValue(contract({}, { transactionStatus }));
      expect(
        (await request(app).post(baseUrl).set('Authorization', authorization()).send(input)).status,
      ).toBe(409);
    },
  );
  it.each([{ status: 'DRAFT' }, { payment: null }, { payment: { status: 'READY' } }])(
    'blocks unsigned or unpaid contracts %j',
    async (override) => {
      database.contract.findUnique.mockResolvedValue(contract(override));
      expect(
        (await request(app).post(baseUrl).set('Authorization', authorization()).send(input)).status,
      ).toBe(409);
    },
  );
  it('blocks a nonselected application', async () => {
    database.contract.findUnique.mockResolvedValue(
      contract({}, { selectedApplicationId: randomUUID() }),
    );
    expect(
      (await request(app).post(baseUrl).set('Authorization', authorization()).send(input)).status,
    ).toBe(409);
  });
  it('prevents duplicate final submissions', async () => {
    database.contract.findUnique.mockResolvedValue(contract({ delivery: delivery() }));
    expect(
      (await request(app).post(baseUrl).set('Authorization', authorization()).send(input)).body
        .error.code,
    ).toBe('ALREADY_DELIVERED');
  });
  it('rechecks state inside the locked transaction', async () => {
    database.contract.findUnique
      .mockResolvedValueOnce(contract())
      .mockResolvedValueOnce(contract({}, { transactionStatus: 'CANCELLED' }));
    expect(
      (await request(app).post(baseUrl).set('Authorization', authorization()).send(input)).status,
    ).toBe(409);
    expect(database.delivery.create).not.toHaveBeenCalled();
  });
  it('maps DB duplicate races to a conflict', async () => {
    database.delivery.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicate', { code: 'P2002', clientVersion: '7' }),
    );
    expect(
      (await request(app).post(baseUrl).set('Authorization', authorization()).send(input)).body
        .error.code,
    ).toBe('ALREADY_DELIVERED');
  });
  it.each([
    { message: 'short' },
    { resultUrl: 'javascript:alert(1)' },
    { attachmentUrls: Array(6).fill(attachmentPath) },
    { attachmentUrls: [attachmentPath, attachmentPath] },
  ])('rejects malformed input %j', async (override) => {
    expect(
      (
        await request(app)
          .post(baseUrl)
          .set('Authorization', authorization())
          .send({ ...input, ...override })
      ).status,
    ).toBe(400);
  });
});

describe('delivery attachments', () => {
  it('issues upload URLs for the contracted freelancer', async () => {
    const response = await request(app)
      .post(`${baseUrl}/upload-url`)
      .set('Authorization', authorization())
      .send({ filename: 'result.pdf', contentType: 'application/pdf', size: 1024 });
    expect(response.status).toBe(200);
    expect(storage.createUpload).toHaveBeenCalledWith(contractId, freelancerId, 'result.pdf');
  });
  it.each([
    { filename: '../secret.pdf' },
    { size: 0 },
    { size: 10 * 1024 * 1024 + 1 },
    { contentType: 'text/html' },
    { filename: 'malware.exe' },
  ])('rejects invalid uploads %j', async (override) => {
    const response = await request(app)
      .post(`${baseUrl}/upload-url`)
      .set('Authorization', authorization())
      .send({ filename: 'result.pdf', contentType: 'application/pdf', size: 100, ...override });
    expect(response.status).toBe(400);
    expect(storage.createUpload).not.toHaveBeenCalled();
  });
  it('does not issue upload URLs after final submission', async () => {
    database.contract.findUnique.mockResolvedValue(contract({ delivery: delivery() }));
    expect(
      (
        await request(app)
          .post(`${baseUrl}/upload-url`)
          .set('Authorization', authorization())
          .send({ filename: 'result.pdf', contentType: 'application/pdf', size: 100 })
      ).status,
    ).toBe(409);
  });
  it('does not save delivery if storage rejects an unuploaded object', async () => {
    storage.verifyAttachments.mockRejectedValue(
      new AppError(400, 'ATTACHMENT_NOT_UPLOADED', 'missing'),
    );
    expect(
      (
        await request(app)
          .post(baseUrl)
          .set('Authorization', authorization())
          .send({ ...input, attachmentUrls: [attachmentPath] })
      ).status,
    ).toBe(400);
    expect(database.delivery.create).not.toHaveBeenCalled();
  });
  it('downloads only submitted attachments for a party', async () => {
    database.contract.findUnique.mockResolvedValue(
      contract({ delivery: delivery({ attachmentUrls: [attachmentPath] }) }),
    );
    const response = await request(app)
      .post(`${baseUrl}/download-url`)
      .set('Authorization', authorization(client))
      .send({ path: attachmentPath });
    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(storage.createDownload).toHaveBeenCalledWith(attachmentPath);
  });
  it('rejects an unsubmitted object', async () => {
    expect(
      (
        await request(app)
          .post(`${baseUrl}/download-url`)
          .set('Authorization', authorization())
          .send({ path: attachmentPath })
      ).status,
    ).toBe(404);
    expect(storage.createDownload).not.toHaveBeenCalled();
  });
  it('rejects cross-contract paths', async () => {
    const response = await request(app)
      .post(`${baseUrl}/download-url`)
      .set('Authorization', authorization())
      .send({ path: `${randomUUID()}/${freelancerId}/${randomUUID()}/result.pdf` });
    expect(response.status).toBe(400);
  });
});

describe('approval integration boundary', () => {
  it('fails closed without a settlement adapter and makes no changes', async () => {
    await expect(service.approveDelivery(client, deliveryId)).rejects.toMatchObject({
      statusCode: 503,
      code: 'SETTLEMENT_NOT_READY',
    });
    expect(database.$transaction).not.toHaveBeenCalled();
  });
  it('rejects freelancer approval', async () => {
    expect(
      (
        await request(app)
          .patch(`/api/v1/deliveries/${deliveryId}/approve`)
          .set('Authorization', authorization())
      ).status,
    ).toBe(403);
  });
  it('rejects another client', async () => {
    await expect(
      service.approveDelivery({ ...client, id: randomUUID() }, deliveryId),
    ).rejects.toMatchObject({ statusCode: 403 });
  });
  it('passes the same transaction to settlement and creates both notifications for both parties', async () => {
    const release = vi.fn().mockResolvedValue(undefined);
    await service.approveDelivery(client, deliveryId, release);
    expect(release).toHaveBeenCalledWith(contractId, database);
    expect(database.project.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { transactionStatus: 'COMPLETED' } }),
    );
    expect(database.notification.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          userId: clientId,
          type: 'REVIEW_REQUEST',
          targetUrl: `/contracts/${contractId}/review`,
        }),
        expect.objectContaining({
          userId: freelancerId,
          type: 'REVIEW_REQUEST',
          targetUrl: `/contracts/${contractId}/review`,
        }),
      ]),
    });
    expect(database.notification.createMany.mock.calls[0][0].data).toHaveLength(4);
  });
  it('propagates settlement failure to the transaction before notifications', async () => {
    const release = vi.fn().mockRejectedValue(new Error('settlement unavailable'));
    await expect(service.approveDelivery(client, deliveryId, release)).rejects.toThrow(
      'settlement unavailable',
    );
    expect(database.notification.createMany).not.toHaveBeenCalled();
  });
  it('rejects a no-op settlement adapter', async () => {
    database.payment.findUnique.mockResolvedValue({ status: 'ESCROWED' });
    await expect(service.approveDelivery(client, deliveryId, vi.fn())).rejects.toMatchObject({
      code: 'SETTLEMENT_NOT_READY',
    });
    expect(database.notification.createMany).not.toHaveBeenCalled();
  });
  it('rejects repeated approval without calling settlement again', async () => {
    database.delivery.updateMany.mockResolvedValue({ count: 0 });
    const release = vi.fn();
    await expect(service.approveDelivery(client, deliveryId, release)).rejects.toMatchObject({
      code: 'ALREADY_APPROVED',
    });
    expect(release).not.toHaveBeenCalled();
  });
});
