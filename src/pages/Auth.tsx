import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

type Mode = "login" | "signup";

const Auth = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const modeLabel = useMemo(() => (mode === "login" ? "로그인" : "회원가입"), [mode]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      toast({ title: "이메일과 비밀번호를 입력하세요." });
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email: trimmedEmail, password });
      setIsSubmitting(false);

      if (error) {
        const message = error.message || "알 수 없는 오류가 발생했습니다.";
        setErrorMessage(message);
        toast({ title: "로그인 실패", description: message, variant: "destructive" });
        return;
      }

      toast({ title: "로그인 완료", description: "환영합니다!" });
      navigate("/");
    } else {
      // 회원가입 - 이메일 인증 없이 바로 로그인
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          emailRedirectTo: undefined,
        },
      });
      setIsSubmitting(false);

      if (error) {
        const message = error.message || "알 수 없는 오류가 발생했습니다.";
        setErrorMessage(message);
        toast({ title: "회원가입 실패", description: message, variant: "destructive" });
        return;
      }

      // 회원가입 성공 시 바로 로그인 처리
      if (data.user) {
        toast({ title: "회원가입 완료", description: "환영합니다!" });
        navigate("/");
      } else {
        toast({ title: "회원가입 완료", description: "로그인해주세요." });
        setMode("login");
      }
    }
  };


  return (
    <>
      <Helmet>
        <title>로그인 / 회원가입</title>
      </Helmet>
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="w-full max-w-md shadow-soft">
          <CardHeader>
            <CardTitle className="text-2xl">{modeLabel}</CardTitle>
            <CardDescription>Supabase 계정으로 계속합니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">이메일</label>
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">비밀번호</label>
                <Input
                  type="password"
                  placeholder="비밀번호"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button className="w-full" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "처리 중..." : modeLabel}
              </Button>
            </form>
            {errorMessage && (
              <div className="mt-3 text-sm text-destructive">
                {errorMessage}
              </div>
            )}
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>{mode === "login" ? "계정이 없으신가요?" : "이미 계정이 있으신가요?"}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMode(mode === "login" ? "signup" : "login")}
              >
                {mode === "login" ? "회원가입" : "로그인"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default Auth;

