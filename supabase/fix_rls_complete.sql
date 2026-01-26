-- ============================================
-- Orders 테이블 RLS 정책 완전 재설정 SQL
-- Supabase 대시보드 → SQL Editor에서 실행하세요
-- ============================================

-- 1. 모든 기존 정책 삭제
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can insert own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can update own orders" ON public.orders;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.orders;
DROP POLICY IF EXISTS "Enable select for users based on user_id" ON public.orders;

-- 2. RLS 활성화 확인
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 3. RLS 정책 재생성 (명확하게)
CREATE POLICY "Users can view own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own orders"
  ON public.orders FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. 정책 확인
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'SELECT' THEN '조회'
    WHEN cmd = 'INSERT' THEN '추가'
    WHEN cmd = 'UPDATE' THEN '수정'
    ELSE cmd
  END as 설명,
  qual as 조건,
  with_check as 체크조건
FROM pg_policies 
WHERE tablename = 'orders'
ORDER BY cmd;

-- 5. RLS 활성화 상태 확인
SELECT 
  tablename,
  rowsecurity as "RLS 활성화",
  CASE WHEN rowsecurity THEN '✅ 활성화됨' ELSE '❌ 비활성화됨' END as 상태
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'orders';

-- 결과:
-- 1. 정책이 3개 보여야 함 (SELECT, INSERT, UPDATE)
-- 2. RLS 활성화가 true여야 함

