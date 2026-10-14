export interface TossPaymentConfirmation {
  paymentKey: string;
  orderId: string;
  totalAmount: number;
  status: string;
}

export class TossPaymentApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'TossPaymentApiError';
  }
}

export async function confirmTossPayment(params: {
  secretKey: string;
  paymentKey: string;
  orderId: string;
  amount: number;
  idempotencyKey: string;
}): Promise<TossPaymentConfirmation> {
  const { secretKey, paymentKey, orderId, amount, idempotencyKey } = params;
  const authorization = Buffer.from(`${secretKey}:`).toString('base64');

  let response: Response;
  try {
    response = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${authorization}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({ paymentKey, orderId, amount }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    throw new TossPaymentApiError(
      503,
      'TOSS_UNAVAILABLE',
      error instanceof Error ? error.message : 'Toss Payments is unavailable.',
    );
  }

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    throw new TossPaymentApiError(
      response.status,
      typeof payload.code === 'string' ? payload.code : 'TOSS_PAYMENT_FAILED',
      typeof payload.message === 'string' ? payload.message : 'Toss payment confirmation failed.',
    );
  }

  return {
    paymentKey: String(payload.paymentKey ?? ''),
    orderId: String(payload.orderId ?? ''),
    totalAmount: Number(payload.totalAmount),
    status: String(payload.status ?? ''),
  };
}
