import { loadTossPayments, TossPaymentsInstance } from "@tosspayments/payment-sdk";

// 토스페이먼츠 클라이언트 키
const CLIENT_KEY = "test_ck_KNbdOvk5rkWX19R4L5Knrn07xlzm";

let tossPaymentsInstance: TossPaymentsInstance | null = null;

/**
 * 토스페이먼츠 인스턴스를 초기화하고 반환합니다.
 */
export async function initTossPayments(): Promise<TossPaymentsInstance> {
  if (tossPaymentsInstance) {
    return tossPaymentsInstance;
  }

  try {
    tossPaymentsInstance = await loadTossPayments(CLIENT_KEY);
    return tossPaymentsInstance;
  } catch (error) {
    console.error("토스페이먼츠 초기화 실패:", error);
    throw error;
  }
}

/**
 * 결제 요청 함수
 * @param amount 결제 금액
 * @param orderId 주문 ID
 * @param orderName 주문명
 * @param customerName 고객명
 * @param customerEmail 고객 이메일
 */
export async function requestPayment({
  amount,
  orderId,
  orderName,
  customerName,
  customerEmail,
}: {
  amount: number;
  orderId: string;
  orderName: string;
  customerName: string;
  customerEmail: string;
}) {
  const tossPayments = await initTossPayments();

  // 결제 성공/실패 URL
  const successUrl = `${window.location.origin}/payment/success`;
  const failUrl = `${window.location.origin}/payment/fail`;

  // 결제창 열기
  await tossPayments.requestPayment("카드", {
    amount,
    orderId,
    orderName,
    customerName,
    customerEmail,
    successUrl,
    failUrl,
  });
}

