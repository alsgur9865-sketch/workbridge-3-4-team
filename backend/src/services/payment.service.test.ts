import * as paymentRepository from '@/repositories/payment.repository';

vi.mock('@/repositories/payment.repository', () => ({
  findContractForPayment: vi.fn(),
  createPayment: vi.fn(),
  resetFailedPayment: vi.fn(),
  findPaymentByOrderId: vi.fn(),
  findPaymentDetail: vi.fn(),
  markPaymentFailed: vi.fn(),
  completePayment: vi.fn(),
  findPaymentForSettlement: vi.fn(),
  releaseEscrowedPayment: vi.fn(),
}));

const repository = vi.mocked(paymentRepository);
const { releasePaymentForContract } = await import('@/services/payment.service');

const contractId = '11111111-1111-4111-8111-111111111111';
const paymentId = '22222222-2222-4222-8222-222222222222';

function paymentRecord(overrides: Record<string, unknown> = {}) {
  const now = new Date('2026-10-14T00:00:00.000Z');

  return {
    id: paymentId,
    contractId,
    provider: 'TOSS',
    orderId: 'WB-settlement-test',
    paymentKey: 'payment-key-settlement',
    amount: '1000000',
    platformFee: '100000',
    settlementAmount: '900000',
    status: 'ESCROWED',
    paidAt: now,
    escrowedAt: now,
    releasedAt: null,
    refundedAt: null,
    failureCode: null,
    failureMessage: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  } as never;
}

function settlementContext(
  overrides: {
    payment?: Record<string, unknown>;
    project?: Record<string, unknown>;
    delivery?: Record<string, unknown> | null;
  } = {},
) {
  return {
    ...(paymentRecord(overrides.payment) as unknown as Record<string, unknown>),
    contract: {
      project: {
        id: '33333333-3333-4333-8333-333333333333',
        title: '정산 테스트 프로젝트',
        transactionStatus: 'COMPLETED',
        deletedAt: null,
        ...overrides.project,
      },
      delivery:
        overrides.delivery === null
          ? null
          : {
              status: 'APPROVED',
              approvedAt: new Date('2026-10-14T01:00:00.000Z'),
              ...overrides.delivery,
            },
    },
  } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('releasePaymentForContract', () => {
  it('releases an escrowed payment after delivery approval and project completion', async () => {
    repository.findPaymentForSettlement.mockResolvedValue(settlementContext());
    repository.releaseEscrowedPayment.mockResolvedValue(
      paymentRecord({
        status: 'RELEASED',
        releasedAt: new Date('2026-10-14T02:00:00.000Z'),
      }),
    );

    const result = await releasePaymentForContract(contractId);

    expect(repository.releaseEscrowedPayment).toHaveBeenCalledWith({
      paymentId,
      contractId,
    });
    expect(result).toMatchObject({
      id: paymentId,
      status: 'RELEASED',
      amount: 1_000_000,
      platformFee: 100_000,
      settlementAmount: 900_000,
    });
  });

  it('uses the delivery approval transaction for settlement reads and writes', async () => {
    const transaction = { payment: {} } as never;
    repository.findPaymentForSettlement.mockResolvedValue(settlementContext());
    repository.releaseEscrowedPayment.mockResolvedValue(
      paymentRecord({
        status: 'RELEASED',
        releasedAt: new Date('2026-10-14T02:00:00.000Z'),
      }),
    );

    await releasePaymentForContract(contractId, transaction);

    expect(repository.findPaymentForSettlement).toHaveBeenCalledWith(contractId, transaction);
    expect(repository.releaseEscrowedPayment).toHaveBeenCalledWith(
      { paymentId, contractId },
      transaction,
    );
  });

  it('is idempotent when settlement is already released', async () => {
    repository.findPaymentForSettlement.mockResolvedValue(
      settlementContext({
        payment: {
          status: 'RELEASED',
          releasedAt: new Date('2026-10-14T02:00:00.000Z'),
        },
      }),
    );

    const result = await releasePaymentForContract(contractId);

    expect(result.status).toBe('RELEASED');
    expect(repository.releaseEscrowedPayment).not.toHaveBeenCalled();
  });

  it('requires an escrowed payment', async () => {
    repository.findPaymentForSettlement.mockResolvedValue(
      settlementContext({ payment: { status: 'READY' } }),
    );

    await expect(releasePaymentForContract(contractId)).rejects.toMatchObject({
      statusCode: 409,
      code: 'PAYMENT_NOT_ESCROWED',
    });
    expect(repository.releaseEscrowedPayment).not.toHaveBeenCalled();
  });

  it('requires an approved delivery', async () => {
    repository.findPaymentForSettlement.mockResolvedValue(
      settlementContext({ delivery: { status: 'SUBMITTED', approvedAt: null } }),
    );

    await expect(releasePaymentForContract(contractId)).rejects.toMatchObject({
      statusCode: 409,
      code: 'DELIVERY_NOT_APPROVED',
    });
    expect(repository.releaseEscrowedPayment).not.toHaveBeenCalled();
  });

  it('requires the project to be completed', async () => {
    repository.findPaymentForSettlement.mockResolvedValue(
      settlementContext({ project: { transactionStatus: 'IN_PROGRESS' } }),
    );

    await expect(releasePaymentForContract(contractId)).rejects.toMatchObject({
      statusCode: 409,
      code: 'PROJECT_NOT_COMPLETED',
    });
    expect(repository.releaseEscrowedPayment).not.toHaveBeenCalled();
  });

  it('returns not found when the payment does not exist', async () => {
    repository.findPaymentForSettlement.mockResolvedValue(null);

    await expect(releasePaymentForContract(contractId)).rejects.toMatchObject({
      statusCode: 404,
      code: 'PAYMENT_NOT_FOUND',
    });
  });
});
