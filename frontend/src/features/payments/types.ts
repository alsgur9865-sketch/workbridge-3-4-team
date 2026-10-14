export type PaymentStatus =
  | 'READY'
  | 'PAID'
  | 'ESCROWED'
  | 'RELEASED'
  | 'FAILED'
  | 'REFUNDED';

export interface Payment {
  id: string;
  contractId: string;
  provider: string;
  orderId: string;
  orderName: string;
  amount: number;
  platformFee: number | null;
  settlementAmount: number | null;
  status: PaymentStatus;
  paidAt: string | null;
  escrowedAt: string | null;
  releasedAt: string | null;
  refundedAt: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConfirmPaymentInput {
  paymentKey: string;
  orderId: string;
  amount: number;
}
