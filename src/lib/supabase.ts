import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Supabase 설정
export const SUPABASE_URL = "https://avzpunxcqqgmvqnkxdwc.supabase.co";

export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2enB1bnhjcXFnbXZxbmt4ZHdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5NjY2ODYsImV4cCI6MjA4NDU0MjY4Nn0.wD7_zRfvetLKere6ddXBQt4gXiWVp8rbSKWRBLtrB7Y";

// Supabase 클라이언트 초기화 함수
let supabaseInstance: SupabaseClient | null = null;

/**
 * Supabase 클라이언트를 초기화하고 반환합니다.
 * 이미 초기화된 경우 기존 인스턴스를 반환합니다.
 */
export function initSupabase(): SupabaseClient {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  // URL과 키 유효성 검사
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "Supabase URL 또는 ANON KEY가 설정되지 않았습니다. 환경 변수를 확인해주세요."
    );
  }

  // Supabase 클라이언트 생성
  supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  // 연결 상태 확인
  checkConnection();

  return supabaseInstance;
}

/**
 * 데이터베이스 연결 상태를 확인합니다.
 */
async function checkConnection(): Promise<void> {
  try {
    const { error } = await supabaseInstance!.from("profiles").select("count").limit(1);
    if (error && error.code !== "PGRST116") {
      // PGRST116은 빈 결과셋 에러이므로 정상
      console.warn("데이터베이스 연결 확인 중 경고:", error.message);
    } else {
      console.log("✅ Supabase 연결 성공");
    }
  } catch (error) {
    console.error("❌ 데이터베이스 연결 확인 실패:", error);
  }
}

/**
 * Supabase 클라이언트 인스턴스를 반환합니다.
 * 초기화되지 않은 경우 자동으로 초기화합니다.
 */
export const supabase = initSupabase();

/**
 * Supabase 클라이언트를 재초기화합니다.
 * 주로 테스트나 설정 변경 시 사용합니다.
 */
export function resetSupabase(): void {
  supabaseInstance = null;
  initSupabase();
}

