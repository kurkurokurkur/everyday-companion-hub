-- ============================================
-- Orders 테이블 RLS 정책 수정 SQL
-- Supabase 대시보드 → SQL Editor에서 실행하세요
-- ============================================

-- 1단계: 기존 정책 삭제
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can insert own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can update own orders" ON public.orders;

-- 3. RLS 활성화 확인 및 활성화
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 3단계: RLS 정책 재생성
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

-- 4단계: 정책 생성 확인 (실행 후 결과 확인)
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'orders';

-- 결과에 다음 3개 정책이 보여야 합니다:
-- 1. Users can view own orders (SELECT)
-- 2. Users can insert own orders (INSERT)  ← 이게 중요!
-- 3. Users can update own orders (UPDATE)
