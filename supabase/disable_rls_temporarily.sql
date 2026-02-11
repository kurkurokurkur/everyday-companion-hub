-- ============================================
-- RLS 일시적으로 비활성화 (테스트용)
-- ⚠️ 주의: 테스트 후 반드시 다시 활성화하세요!
-- ============================================

-- 1. RLS 비활성화 (테스트용)
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;

-- 2. 확인
SELECT 
  tablename,
  rowsecurity as "RLS 활성화",
  CASE WHEN rowsecurity THEN '✅ 활성화됨' ELSE '❌ 비활성화됨' END as 상태
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'orders';

-- ⚠️ 테스트 후 반드시 아래 SQL로 다시 활성화하세요!
-- ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
-- 
-- 그리고 정책도 다시 생성:
-- CREATE POLICY "Users can insert own orders"
--   ON public.orders FOR INSERT
--   WITH CHECK (auth.uid() = user_id);



