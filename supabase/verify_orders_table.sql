-- ============================================
-- Orders 테이블 구조 확인 및 수정 SQL
-- Supabase 대시보드 → SQL Editor에서 실행하세요
-- ============================================

-- 1. 테이블이 존재하는지 확인
SELECT 
  table_name,
  table_schema
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'orders';

-- 2. 테이블 구조 확인
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'orders'
ORDER BY ordinal_position;

-- 3. 테이블이 없거나 구조가 다르면 재생성
DROP TABLE IF EXISTS public.orders CASCADE;

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

-- 4. 인덱스 생성
CREATE INDEX IF NOT EXISTS orders_user_id_idx ON public.orders(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS orders_order_id_idx ON public.orders(order_id);

-- 5. RLS 활성화
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 6. RLS 정책 생성
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can insert own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can update own orders" ON public.orders;

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

-- 7. 최종 확인
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'orders';

