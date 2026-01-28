import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  plan: "free" | "pro";
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<"free" | "pro">("free");

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!isMounted) return;
        
        if (error) {
          console.error("세션 확인 실패:", error);
          // Invalid Refresh Token 에러인 경우 세션 클리어
          if (error.message?.includes("Refresh Token") || error.message?.includes("Invalid")) {
            console.log("유효하지 않은 세션 토큰 감지. 세션을 초기화합니다.");
            await supabase.auth.signOut();
            // 로컬 스토리지 클리어
            try {
              // Supabase 세션 관련 로컬 스토리지 키 패턴: sb-{project-ref}-auth-token
              const keys = Object.keys(localStorage);
              keys.forEach(key => {
                if (key.includes('supabase') || key.includes('auth-token')) {
                  localStorage.removeItem(key);
                }
              });
            } catch {}
          }
          setLoading(false);
          return;
        }

        const nextUser = data.session?.user ?? null;
        setUser(nextUser);
        if (nextUser) {
          try {
            // 타임아웃 추가 (3초) - DB 락 방지
            const profilePromise = supabase
              .from("profiles")
              .select("plan")
              .eq("id", nextUser.id)
              .maybeSingle();
            
            const timeoutPromise = new Promise<{ data: null; error: { message: string } }>((resolve) =>
              setTimeout(() => {
                resolve({
                  data: null,
                  error: { message: "프로필 조회 타임아웃" },
                });
              }, 3000)
            );

            const profileResult = await Promise.race([profilePromise, timeoutPromise]);
            
            if (profileResult.error && profileResult.error.message === "프로필 조회 타임아웃") {
              console.warn("프로필 조회 타임아웃 - 기본값 사용");
              if (isMounted) {
                setPlan("free");
              }
            } else if (profileResult.data && isMounted) {
              const profile = profileResult.data as { plan?: string } | null;
              if (profile?.plan) {
                setPlan(profile.plan === "pro" ? "pro" : "free");
              } else {
                setPlan("free");
              }
            } else if (isMounted) {
              setPlan("free");
            }
          } catch (err) {
            console.error("프로필 조회 실패:", err);
            if (isMounted) {
              setPlan("free");
            }
          }
        } else {
          setPlan("free");
        }
      } catch (err) {
        console.error("인증 초기화 실패:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      
      // TOKEN_REFRESHED 이벤트에서 에러 처리 (토큰 갱신 실패 시)
      if (event === "TOKEN_REFRESHED" && !session) {
        console.log("토큰 갱신 실패. 세션을 초기화합니다.");
        await supabase.auth.signOut();
        setUser(null);
        setPlan("free");
        if (isMounted) {
          setLoading(false);
        }
        return;
      }
      
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      
      // 로그인/회원가입 시 즉시 로딩 해제
      if (event === "SIGNED_IN" || event === "SIGNED_UP" || event === "TOKEN_REFRESHED") {
        if (isMounted) {
          setLoading(false);
        }
      }
      
      if (nextUser) {
        try {
          // 타임아웃 추가 (3초) - DB 락 방지
          const profilePromise = supabase
            .from("profiles")
            .select("plan")
            .eq("id", nextUser.id)
            .maybeSingle();
          
          const timeoutPromise = new Promise<{ data: null; error: { message: string } }>((resolve) =>
            setTimeout(() => {
              resolve({
                data: null,
                error: { message: "프로필 조회 타임아웃" },
              });
            }, 3000)
          );

          const profileResult = await Promise.race([profilePromise, timeoutPromise]);
          
          if (profileResult.error && profileResult.error.message === "프로필 조회 타임아웃") {
            console.warn("프로필 조회 타임아웃 - 기본값 사용");
            if (isMounted) {
              setPlan("free");
              setLoading(false);
            }
          } else if (profileResult.data && isMounted) {
            const profile = profileResult.data as { plan?: string } | null;
            if (profile?.plan) {
              setPlan(profile.plan === "pro" ? "pro" : "free");
            } else {
              setPlan("free");
            }
            setLoading(false);
          } else if (isMounted) {
            setPlan("free");
            setLoading(false);
          }
        } catch (err) {
          console.error("프로필 조회 실패:", err);
          if (isMounted) {
            setPlan("free");
            setLoading(false);
          }
        }
      } else {
        setPlan("free");
        if (isMounted) {
          setLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    console.log("로그아웃 시도");
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("로그아웃 실패:", error);
      return;
    }
    console.log("로그아웃 성공, 상태 초기화");
    setUser(null);
    setPlan("free");
    window.location.href = "/";
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      plan,
      signOut,
    }),
    [user, loading, plan],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth는 AuthProvider 내부에서만 사용할 수 있습니다.");
  }
  return context;
}
