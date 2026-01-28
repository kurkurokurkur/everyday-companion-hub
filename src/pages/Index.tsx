import { Helmet } from "react-helmet-async";
import { Calculator as CalculatorIcon, ArrowRightLeft, ListTodo, Sparkles, LogIn, LogOut, Crown, User } from "lucide-react";
import { UnitConverter } from "@/components/UnitConverter";
import { Calculator } from "@/components/Calculator";
import { TodoList } from "@/components/TodoList";
import { ToolCard } from "@/components/ToolCard";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const { user, signOut, plan, loading } = useAuth();

  return (
    <>
      <Helmet>
        <title>유틸리티 허브 | 계산기, 단위변환, 할일관리</title>
        <meta
          name="description"
          content="계산기, 단위 변환기, 할 일 관리를 한곳에서. 일상에 필요한 모든 도구를 무료로 사용하세요."
        />
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
              <nav className="flex items-center gap-2">
                <a
                  href="#converter"
                  className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
                >
                  단위변환
                </a>
                <a
                  href="#calculator"
                  className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
                >
                  계산기
                </a>
                <a
                  href="#todo"
                  className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
                >
                  할 일
                </a>
                {loading ? (
                  <div className="text-sm text-muted-foreground">로딩 중...</div>
                ) : user ? (
                  <div className="flex items-center gap-2">
                    <span className="hidden sm:inline text-sm text-muted-foreground">
                      {user.email}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={signOut}
                    >
                      <LogOut className="h-4 w-4" />
                      로그아웃
                    </Button>
                  </div>
                ) : (
                  <Button asChild variant="outline" size="sm" className="gap-2">
                    <Link to="/auth">
                      <LogIn className="h-4 w-4" />
                      로그인
                    </Link>
                  </Button>
                )}
                <Button asChild variant="ghost" size="sm" className="gap-2">
                  <Link to="/mypage">
                    <User className="h-4 w-4" />
                    마이페이지
                  </Link>
                </Button>
                {user && plan === "free" ? (
                  <Button asChild size="sm" className="gap-2">
                    <Link to="/pricing">
                      <Crown className="h-4 w-4" />
                      업그레이드
                    </Link>
                  </Button>
                ) : (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Crown className="h-4 w-4 text-primary" />
                    Pro
                  </div>
                )}
              </nav>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="py-12 sm:py-16 border-b">
          <div className="container text-center">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4 tracking-tight">
              일상의 모든 도구,{" "}
              <span className="text-primary">한 곳에서</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              계산기, 단위 변환기, 할 일 관리까지.
              <br className="hidden sm:block" />
              필요한 도구를 빠르고 간편하게 사용하세요.
            </p>
          </div>
        </section>

        {/* Tools Grid */}
        <main className="container py-8 sm:py-12">
          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {/* Unit Converter */}
            <div id="converter" className="scroll-mt-24">
              <ToolCard
                title="단위 변환기"
                description="길이, 무게, 온도를 실시간 변환"
                icon={ArrowRightLeft}
              >
                <UnitConverter />
              </ToolCard>
            </div>

            {/* Calculator */}
            <div id="calculator" className="scroll-mt-24">
              <ToolCard
                title="스마트 계산기"
                description="키보드로도 사용 가능한 계산기"
                icon={CalculatorIcon}
              >
                <Calculator />
              </ToolCard>
            </div>

            {/* Todo List */}
            <div id="todo" className="scroll-mt-24 lg:col-span-2 xl:col-span-1">
              <ToolCard
                title="할 일 관리"
                description="오늘 해야 할 일을 체크하세요"
                icon={ListTodo}
              >
                <TodoList />
              </ToolCard>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t py-6">
          <div className="container text-center text-sm text-muted-foreground">
            <p>© 2025 유틸리티 허브. 모든 권리 보유.</p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Index;
