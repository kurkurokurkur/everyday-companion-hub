import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";

const Pricing = () => {
  const { user, loading, plan } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

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
        <title>유료 버전 소개</title>
      </Helmet>
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="w-full max-w-lg shadow-soft">
          <CardHeader>
            <CardTitle className="text-2xl">유료 버전 안내</CardTitle>
            <CardDescription>무료/유료 차이를 확인하세요.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div className="space-y-2">
              <p>무료 버전</p>
              <ul className="list-disc list-inside">
                <li>1개월 일정 관리</li>
                <li>기본 할 일 관리</li>
              </ul>
            </div>
            <div className="space-y-2">
              <p>유료 버전</p>
              <ul className="list-disc list-inside">
                <li>3개월 일정 관리</li>
                <li>확장 캘린더 기능</li>
              </ul>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline" className="flex-1">
                <Link to="/">홈으로</Link>
              </Button>
              {plan !== "pro" && (
                <Button asChild className="flex-1">
                  <Link to="/subscribe">구독하기</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default Pricing;

