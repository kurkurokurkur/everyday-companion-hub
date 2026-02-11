import { useEffect, useState, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { requestPayment } from "@/lib/tossPayments";

const ProductDetail = () => {
  const { user, loading, plan } = useAuth();
  const navigate = useNavigate();
  const [isUpgrading, setIsUpgrading] = useState(false);
  const isProcessingRef = useRef(false); // DB 락 방지: 중복 실행 방지

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  const handleSubscribe = async () => {
    // 1. 중복 실행 방지
    if (isProcessingRef.current) {
      console.log("이미 처리 중입니다.");
      return;
    }

    if (!user) {
      navigate("/auth");
      return;
    }

    // 2. 이미 Pro 플랜인 경우
    if (plan === "pro") {
      alert("이미 Pro 플랜을 사용 중입니다.");
      return;
    }

    // 3. 결제 처리 시작
    isProcessingRef.current = true;
    setIsUpgrading(true);

    try {
      // 주문 ID 생성 (타임스탬프 기반)
      const orderId = `order_${Date.now()}`;
      const amount = 9900; // 월 구독료
      const orderName = "유틸리티 허브 Pro (월간)";

      // 토스페이먼츠 결제창 열기
      await requestPayment({
        amount,
        orderId,
        orderName,
        customerName: user.email?.split("@")[0] || "고객",
        customerEmail: user.email || "",
      });

      // 결제창이 열리면 상태는 유지 (결제 완료 후 PaymentSuccess에서 처리)
    } catch (err: any) {
      console.error("결제 요청 중 오류:", err);
      
      // 사용자가 결제창을 닫은 경우
      if (err?.code === "USER_CANCEL") {
        // 상태만 초기화
      } else {
        alert("결제 요청 중 오류가 발생했습니다. 다시 시도해주세요.");
      }
      
      isProcessingRef.current = false;
      setIsUpgrading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">로딩 중...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>상품 상세</title>
      </Helmet>
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="w-full max-w-lg shadow-soft">
          <CardHeader>
            <CardTitle className="text-2xl">유틸리티 허브 Pro</CardTitle>
            <CardDescription>3개월 일정 관리와 확장 기능을 제공합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <ul className="list-disc list-inside space-y-1">
              <li>3개월 일정 관리</li>
              <li>확장 캘린더 기능</li>
              <li>추가 편의 기능</li>
            </ul>
            <Button
              className="w-full"
              onClick={handleSubscribe}
              disabled={isUpgrading || plan === "pro"}
            >
              {isUpgrading ? "결제창 열리는 중..." : plan === "pro" ? "이미 Pro 플랜입니다" : "결제하기"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default ProductDetail;
