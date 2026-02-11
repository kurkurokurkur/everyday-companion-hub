import { useEffect, useState, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Mail, Crown, Calendar, Sparkles, ArrowLeft, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

const MyPage = () => {
  const { user, loading: authLoading, plan } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // user 정보가 있으면 즉시 표시 가능한 데이터 준비
  const userEmail = useMemo(() => user?.email || "", [user?.email]);
  const userCreatedAt = useMemo(() => user?.created_at || "", [user?.created_at]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
    if (!user) {
      return;
    }

    // display_name만 가져오기 (최소한의 데이터만)
    setLoading(true);
    void (async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", user.id)
          .single();
        
        if (!error && data) {
          setDisplayName(data.display_name);
        }
      } catch (err) {
        console.error("프로필 조회 실패:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user, authLoading, navigate]);

  // 로딩 중이지만 user가 있으면 기본 정보는 표시
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">로딩 중...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const isPro = plan === "pro";
  const profileCreatedAt = userCreatedAt || new Date().toISOString();

  return (
    <>
      <Helmet>
        <title>마이페이지 | 유틸리티 허브</title>
      </Helmet>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 glass border-b">
          <div className="container py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl gradient-primary">
                  <Sparkles className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="font-bold text-xl text-foreground">유틸리티 허브</h1>
                  <p className="text-xs text-muted-foreground hidden sm:block">
                    Universal Utility Hub
                  </p>
                </div>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link to="/">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  홈으로
                </Link>
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container py-8 sm:py-12">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* 회원정보 카드 */}
            <Card className="shadow-soft animate-in-up">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-primary/10">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl">회원정보</CardTitle>
                      <CardDescription>내 계정 정보를 확인하세요</CardDescription>
                    </div>
                  </div>
                  <Badge
                    variant={isPro ? "default" : "secondary"}
                    className={`text-sm px-4 py-1.5 ${
                      isPro
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isPro ? (
                      <>
                        <Crown className="h-3.5 w-3.5 mr-1.5" />
                        Pro
                      </>
                    ) : (
                      "Free"
                    )}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-start gap-3 p-4 rounded-lg border bg-card">
                    <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-muted-foreground mb-1">이메일</div>
                      <div className="text-sm font-medium text-foreground truncate">
                        {userEmail || "-"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 rounded-lg border bg-card">
                    <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-muted-foreground mb-1">표시 이름</div>
                      <div className="text-sm font-medium text-foreground">
                        {loading ? (
                          <span className="text-muted-foreground">로딩 중...</span>
                        ) : (
                          displayName || "설정되지 않음"
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 rounded-lg border bg-card">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-muted-foreground mb-1">가입일</div>
                      <div className="text-sm font-medium text-foreground">
                        {new Date(profileCreatedAt).toLocaleDateString("ko-KR", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 rounded-lg border bg-card">
                    <Crown className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-muted-foreground mb-1">플랜</div>
                      <div className="text-sm font-medium text-foreground">
                        {isPro ? "Pro 플랜" : "Free 플랜"}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 플랜 상태 카드 */}
            <Card className="shadow-soft animate-in-up">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Crown className="h-6 w-6 text-primary" />
                  플랜 상태
                </CardTitle>
                <CardDescription>현재 구독 플랜과 기능을 확인하세요</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  className={`p-6 rounded-lg border-2 ${
                    isPro
                      ? "border-primary bg-primary/5"
                      : "border-border bg-muted/30"
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-xl font-bold text-foreground">
                          {isPro ? "Pro 플랜" : "Free 플랜"}
                        </h3>
                        {isPro && (
                          <Badge className="bg-primary text-primary-foreground">
                            <Crown className="h-3 w-3 mr-1" />
                            활성화됨
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {isPro
                          ? "모든 프리미엄 기능을 사용할 수 있습니다"
                          : "기본 기능을 무료로 사용할 수 있습니다"}
                      </p>
                    </div>
                  </div>

                  <Separator className="my-4" />

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2
                        className={`h-4 w-4 ${
                          true ? "text-success" : "text-muted-foreground"
                        }`}
                      />
                      <span className={true ? "text-foreground" : "text-muted-foreground"}>
                        계산기 사용
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2
                        className={`h-4 w-4 ${
                          true ? "text-success" : "text-muted-foreground"
                        }`}
                      />
                      <span className={true ? "text-foreground" : "text-muted-foreground"}>
                        단위 변환기 사용
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2
                        className={`h-4 w-4 ${
                          isPro ? "text-success" : "text-muted-foreground"
                        }`}
                      />
                      <span className={isPro ? "text-foreground" : "text-muted-foreground"}>
                        할 일 관리 (3개월 이상)
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2
                        className={`h-4 w-4 ${
                          isPro ? "text-success" : "text-muted-foreground"
                        }`}
                      />
                      <span className={isPro ? "text-foreground" : "text-muted-foreground"}>
                        무제한 할 일 추가
                      </span>
                    </div>
                  </div>

                  {!isPro && (
                    <div className="mt-6">
                      <Button asChild className="w-full sm:w-auto">
                        <Link to="/pricing">
                          <Crown className="h-4 w-4 mr-2" />
                          Pro로 업그레이드
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t py-6 mt-12">
          <div className="container text-center text-sm text-muted-foreground">
            <p>© 2025 유틸리티 허브. 모든 권리 보유.</p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default MyPage;

