import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

const PaymentSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);

  // URL 정리 (한 번만 실행)
  useEffect(() => {
    if (location.search) {
      window.history.replaceState({}, "", "/payment/success");
    }
  }, [location.search]);

  const handleGoHome = async () => {
    if (!user?.id) {
      navigate("/");
      return;
    }

    setIsUpdating(true);

    try {
      // profiles 테이블의 plan을 'pro'로 업데이트
      const updatePromise = supabase
        .from("profiles")
        .update({ plan: "pro" })
        .eq("id", user.id)
        .neq("plan", "pro"); // 이미 'pro'인 경우 UPDATE하지 않음

      // 타임아웃 추가 (5초)
      const updateTimeout = new Promise<{ data: null; error: { message: string; code: string } }>((resolve) =>
        setTimeout(() => {
          resolve({
            data: null,
            error: {
              message: "플랜 업데이트 타임아웃",
              code: "TIMEOUT",
            },
          });
        }, 5000)
      );

      const updateResult = await Promise.race([updatePromise, updateTimeout]);

      if (updateResult.error) {
        if (updateResult.error.code === "TIMEOUT") {
          console.error("⚠️ 플랜 업데이트 타임아웃");
          // 타임아웃이어도 홈으로 이동 (사용자 경험 우선)
        } else {
          console.error("플랜 업데이트 실패:", updateResult.error);
          // 에러가 있어도 홈으로 이동 (사용자 경험 우선)
        }
      } else {
        console.log("✅ 플랜이 Pro로 업데이트되었습니다.");
      }

      // 홈으로 이동
      navigate("/");
    } catch (err) {
      console.error("플랜 업데이트 중 오류:", err);
      // 에러가 있어도 홈으로 이동
      navigate("/");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>결제 성공</title>
      </Helmet>
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="w-full max-w-lg shadow-soft">
          <CardHeader>
            <CardTitle className="text-2xl">결제 성공</CardTitle>
            <CardDescription>결제가 정상적으로 완료되었습니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div className="text-center py-4">
              <div className="text-green-600 font-medium mb-2 text-lg">✅ 결제가 완료되었습니다.</div>
              <div className="text-xs text-muted-foreground mt-2">
                결제가 정상적으로 처리되었습니다.
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Button 
                className="w-full" 
                onClick={handleGoHome}
                disabled={isUpdating}
              >
                {isUpdating ? "업데이트 중..." : "홈으로 가기"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default PaymentSuccess;
