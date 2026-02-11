-- ============================================
-- Orders 테이블 생성 SQL
-- Supabase 대시보드 → SQL Editor에서 실행하세요
-- ============================================

-- 1. 기존 테이블 삭제 (이미 삭제했다면 무시)
DROP TABLE IF EXISTS public.orders CASCADE;

-- 2. Orders 테이블 생성
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id text NOT NULL UNIQUE,
  payment_key text NOT NULL,
  amount numeric NOT NULL,
  order_name text NOT NULL,
  status text NOT NULL DEFAULT 'paid',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. 인덱스 생성
CREATE INDEX orders_user_id_idx ON public.orders(user_id);
CREATE UNIQUE INDEX orders_order_id_idx ON public.orders(order_id);

-- 4. RLS 활성화
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 5. RLS 정책 생성
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

-- 6. 확인 쿼리
SELECT 
  '테이블 생성 완료' as status,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename = 'orders';

-- 결과에 3개의 정책이 보여야 합니다:
-- 1. Users can view own orders
-- 2. Users can insert own orders  ← 중요!
-- 3. Users can update own orders

