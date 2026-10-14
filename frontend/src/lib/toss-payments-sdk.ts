interface TossPaymentWindow {
  on(eventName: 'paymentRequest', callback: (paymentMethod: { code: string; methodId?: string }) => void): void;
  on(eventName: 'cancel', callback: () => void): void;
}

interface TossWidgets {
  setAmount(amount: { value: number; currency: 'KRW' }): Promise<void>;
  renderPaymentWindow(params?: { orderName?: string }): Promise<TossPaymentWindow>;
  requestPayment(params: {
    orderId: string;
    orderName: string;
    successUrl: string;
    failUrl: string;
    customerEmail?: string;
    customerName?: string;
  }): Promise<void> | void;
}

interface TossPaymentsInstance {
  widgets(params: { customerKey: string }): TossWidgets;
}

declare global {
  interface Window {
    TossPayments?: (clientKey: string) => TossPaymentsInstance;
  }
}

let sdkPromise: Promise<(clientKey: string) => TossPaymentsInstance> | null = null;

function loadTossPaymentsSdk() {
  if (window.TossPayments) {
    return Promise.resolve(window.TossPayments);
  }

  if (sdkPromise) {
    return sdkPromise;
  }

  sdkPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-workbridge-toss-sdk]');
    const script = existing ?? document.createElement('script');

    const handleLoad = () => {
      if (!window.TossPayments) {
        sdkPromise = null;
        reject(new Error('토스페이먼츠 SDK를 불러오지 못했습니다.'));
        return;
      }
      resolve(window.TossPayments);
    };

    const handleError = () => {
      sdkPromise = null;
      reject(new Error('토스페이먼츠 SDK에 연결할 수 없습니다.'));
    };

    script.addEventListener('load', handleLoad, { once: true });
    script.addEventListener('error', handleError, { once: true });

    if (!existing) {
      script.src = 'https://js.tosspayments.com/v2/standard';
      script.async = true;
      script.dataset.workbridgeTossSdk = 'true';
      document.head.appendChild(script);
    }
  });

  return sdkPromise;
}

export async function openTossPaymentWindow(params: {
  clientKey: string;
  customerKey: string;
  orderId: string;
  orderName: string;
  amount: number;
  contractId: string;
  customerEmail?: string;
  customerName?: string | null;
}) {
  const {
    clientKey,
    customerKey,
    orderId,
    orderName,
    amount,
    contractId,
    customerEmail,
    customerName,
  } = params;

  const TossPayments = await loadTossPaymentsSdk();
  const tossPayments = TossPayments(clientKey);
  const widgets = tossPayments.widgets({ customerKey });

  await widgets.setAmount({ value: amount, currency: 'KRW' });

  const paymentWindow = await widgets.renderPaymentWindow({ orderName });
  const successUrl = new URL('/payments/success', window.location.origin);
  const failUrl = new URL('/payments/fail', window.location.origin);
  successUrl.searchParams.set('contractId', contractId);
  failUrl.searchParams.set('contractId', contractId);

  await new Promise<void>((resolve, reject) => {
    paymentWindow.on('cancel', () => resolve());
    paymentWindow.on('paymentRequest', () => {
      Promise.resolve(
        widgets.requestPayment({
          orderId,
          orderName,
          successUrl: successUrl.toString(),
          failUrl: failUrl.toString(),
          customerEmail,
          customerName: customerName ?? undefined,
        }),
      )
        .then(() => resolve())
        .catch(reject);
    });
  });
}
