import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { TossPaymentApiError } from '@/lib/toss-payments';

const TEST_SECRET = vi.hoisted(() => {
  const secret = 'test-access-secret-that-is-at-least-32-characters';
  process.env.JWT_ACCESS_SECRET = secret;
  process.env.TOSS_SECRET_KEY = 'test_sk_workbridge';
  return secret;
});

vi.mock('@/repositories/payment.repository', () => ({
  findContractForPayment: vi.fn(),
  createPayment: vi.fn(),
  resetFailedPayment: vi.fn(),
  findPaymentByOrderId: vi.fn(),
  findPaymentDetail: vi.fn(),
  markPaymentFailed: vi.fn(),
  completePayment: vi.fn(),
}));

vi.mock('@/lib/toss-payments', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/toss-payments')>();
  return {
    ...actual,
    confirmTossPayment: vi.fn(),
  };
});

const { app } = await import('@/app');
const repository = vi.mocked(await import('@/repositories/payment.repository'));
const toss = vi.mocked(await import('@/lib/toss-payments'));

const clientId = randomUUID();
const freelancerId = randomUUID();
const otherClientId = randomUUID();
const projectId = randomUUID();
const applicationId = randomUUID();
const contractId = randomUUID();
const paymentId = randomUUID();
const orderId = 'WB-1234567890abcdef';
const paymentKey = 'payment-key-123';

function tokenFor(id: string, role: 'CLIENT' | 'FREELANCER') {
  return `Bearer ${jwt.sign({ sub: id, role }, TEST_SECRET, { expiresIn: '5m' })}`;
}

function paymentRecord(overrides: Record<string, unknown> = {}) {
  const now = new Date();
  return {
    id: paymentId,
    contractId,
    provider: 'TOSS',
    orderId,
    paymentKey: null,
    amount: '4500000',
    platformFee: null,
    settlementAmount: null,
    status: 'READY',
    paidAt: null,
    escrowedAt: null,
    releasedAt: null,
    refundedAt: null,
    failureCode: null,
    failureMessage: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  } as never;
}

function contractForPayment(overrides: Record<string, unknown> = {}) {
  return {
    id: contractId,
    projectId,
    applicationId,
    agreedAmount: '4500000',
    status: 'SIGNED',
    payment: null,
    project: {
      id: projectId,
      title: '워크브릿지 결제 테스트 프로젝트',
      clientId,
      transactionStatus: 'PAYMENT_PENDING',
      deletedAt: null,
    },
    application: { freelancerId },
    ...overrides,
  } as never;
}

function paymentDetail(overrides: Record<string, unknown> = {}) {
  return {
    ...paymentRecord(overrides),
    contract: {
      id: contractId,
      status: 'SIGNED',
      project: {
        id: projectId,
        title: '워크브릿지 결제 테스트 프로젝트',
        clientId,
        transactionStatus: 'PAYMENT_PENDING',
        deletedAt: null,
      },
      application: { freelancerId },
    },
  } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /contracts/:contractId/payment', () => {
  it('prepares a payment from the signed contract amount', async () => {
    repository.findContractForPayment.mockResolvedValue(contractForPayment());
    repository.createPayment.mockResolvedValue(paymentRecord());

    const response = await request(app)
      .post(`/api/v1/contracts/${contractId}/payment`)
      .set('Authorization', tokenFor(clientId, 'CLIENT'));

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      id: paymentId,
      amount: 4_500_000,
      status: 'READY',
      orderId,
    });
    expect(repository.createPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        contractId,
        amount: '4500000',
      }),
    );
  });

  it('returns an existing READY payment without creating another order', async () => {
    repository.findContractForPayment.mockResolvedValue(
      contractForPayment({ payment: paymentRecord() }),
    );

    const response = await request(app)
      .post(`/api/v1/contracts/${contractId}/payment`)
      .set('Authorization', tokenFor(clientId, 'CLIENT'));

    expect(response.status).toBe(200);
    expect(response.body.data.orderId).toBe(orderId);
    expect(repository.createPayment).not.toHaveBeenCalled();
  });

  it('blocks non-owners and unsigned contracts', async () => {
    repository.findContractForPayment.mockResolvedValue(contractForPayment());

    const otherClient = await request(app)
      .post(`/api/v1/contracts/${contractId}/payment`)
      .set('Authorization', tokenFor(otherClientId, 'CLIENT'));
    expect(otherClient.status).toBe(403);

    repository.findContractForPayment.mockResolvedValue(
      contractForPayment({ status: 'PARTIALLY_SIGNED' }),
    );
    const unsigned = await request(app)
      .post(`/api/v1/contracts/${contractId}/payment`)
      .set('Authorization', tokenFor(clientId, 'CLIENT'));
    expect(unsigned.status).toBe(409);
    expect(unsigned.body.error.code).toBe('CONTRACT_NOT_SIGNED');
  });

  it('blocks freelancers at the route', async () => {
    const response = await request(app)
      .post(`/api/v1/contracts/${contractId}/payment`)
      .set('Authorization', tokenFor(freelancerId, 'FREELANCER'));
    expect(response.status).toBe(403);
    expect(repository.findContractForPayment).not.toHaveBeenCalled();
  });
});

describe('POST /payments/confirm', () => {
  it('rejects a modified amount before calling Toss Payments', async () => {
    repository.findPaymentByOrderId.mockResolvedValue(paymentDetail());

    const response = await request(app)
      .post('/api/v1/payments/confirm')
      .set('Authorization', tokenFor(clientId, 'CLIENT'))
      .send({ paymentKey, orderId, amount: 1 });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('PAYMENT_AMOUNT_MISMATCH');
    expect(toss.confirmTossPayment).not.toHaveBeenCalled();
  });

  it('confirms Toss payment, records escrow, fee, and settlement', async () => {
    repository.findPaymentByOrderId.mockResolvedValue(paymentDetail());
    toss.confirmTossPayment.mockResolvedValue({
      paymentKey,
      orderId,
      totalAmount: 4_500_000,
      status: 'DONE',
    });
    repository.completePayment.mockResolvedValue(
      paymentRecord({
        paymentKey,
        platformFee: '450000',
        settlementAmount: '4050000',
        status: 'ESCROWED',
        paidAt: new Date(),
        escrowedAt: new Date(),
      }),
    );

    const response = await request(app)
      .post('/api/v1/payments/confirm')
      .set('Authorization', tokenFor(clientId, 'CLIENT'))
      .send({ paymentKey, orderId, amount: 4_500_000 });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      status: 'ESCROWED',
      platformFee: 450_000,
      settlementAmount: 4_050_000,
    });
    expect(toss.confirmTossPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentKey,
        orderId,
        amount: 4_500_000,
        idempotencyKey: paymentId,
      }),
    );
    expect(repository.completePayment).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId,
        freelancerId,
        platformFee: 450_000,
        settlementAmount: 4_050_000,
      }),
    );
  });

  it('is idempotent after the payment is already escrowed', async () => {
    repository.findPaymentByOrderId.mockResolvedValue(
      paymentDetail({ status: 'ESCROWED', paymentKey }),
    );

    const response = await request(app)
      .post('/api/v1/payments/confirm')
      .set('Authorization', tokenFor(clientId, 'CLIENT'))
      .send({ paymentKey, orderId, amount: 4_500_000 });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('ESCROWED');
    expect(toss.confirmTossPayment).not.toHaveBeenCalled();
  });

  it('records an explicit Toss rejection as FAILED', async () => {
    repository.findPaymentByOrderId.mockResolvedValue(paymentDetail());
    toss.confirmTossPayment.mockRejectedValue(
      new TossPaymentApiError(400, 'REJECT_CARD_PAYMENT', 'Payment rejected.'),
    );
    repository.markPaymentFailed.mockResolvedValue(
      paymentRecord({
        status: 'FAILED',
        failureCode: 'REJECT_CARD_PAYMENT',
        failureMessage: 'Payment rejected.',
      }),
    );

    const response = await request(app)
      .post('/api/v1/payments/confirm')
      .set('Authorization', tokenFor(clientId, 'CLIENT'))
      .send({ paymentKey, orderId, amount: 4_500_000 });

    expect(response.status).toBe(502);
    expect(response.body.error.code).toBe('TOSS_PAYMENT_REJECTED');
    expect(repository.markPaymentFailed).toHaveBeenCalledWith({
      paymentId,
      failureCode: 'REJECT_CARD_PAYMENT',
      failureMessage: 'Payment rejected.',
    });
  });
});

describe('GET /payments/:paymentId', () => {
  it.each([
    ['client', clientId, 'CLIENT'],
    ['freelancer', freelancerId, 'FREELANCER'],
  ] as const)('is visible to the %s', async (_label, userId, role) => {
    repository.findPaymentDetail.mockResolvedValue(paymentDetail());

    const response = await request(app)
      .get(`/api/v1/payments/${paymentId}`)
      .set('Authorization', tokenFor(userId, role));

    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(paymentId);
  });

  it('is hidden from outsiders', async () => {
    repository.findPaymentDetail.mockResolvedValue(paymentDetail());

    const response = await request(app)
      .get(`/api/v1/payments/${paymentId}`)
      .set('Authorization', tokenFor(otherClientId, 'CLIENT'));

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('NOT_CONTRACT_PARTY');
  });
});
