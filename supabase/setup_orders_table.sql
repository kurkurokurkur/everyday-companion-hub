-- ============================================
-- Orders 테이블 생성 및 설정 SQL
-- 결제 성공 시 주문 정보를 저장하는 테이블
-- Supabase 대시보드 → SQL Editor에서 실행하세요
-- ============================================

-- 1. Orders 테이블 생성 (이미 존재하면 무시)
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id text NOT NULL UNIQUE,
  payment_key text NOT NULL,
  amount numeric(12, 2) NOT NULL CHECK (amount > 0),
  order_name text NOT NULL,
  status text NOT NULL DEFAULT 'paid' CHECK (status IN ('pending', 'paid', 'failed', 'cancelled', 'refunded')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. updated_at 컬럼 추가 (이미 존재하면 무시)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 3. 인덱스 생성 (이미 존재하면 무시)
CREATE INDEX IF NOT EXISTS orders_user_id_idx ON public.orders(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS orders_order_id_idx ON public.orders(order_id);
CREATE INDEX IF NOT EXISTS orders_payment_key_idx ON public.orders(payment_key);
CREATE INDEX IF NOT EXISTS orders_status_idx ON public.orders(status);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON public.orders(created_at DESC);

-- 4. RLS 활성화
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 5. 기존 정책 삭제 (재생성을 위해)
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can insert own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can update own orders" ON public.orders;

-- 6. RLS 정책 생성
-- 사용자는 자신의 주문만 조회 가능
CREATE POLICY "Users can view own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id);

-- 사용자는 자신의 주문만 추가 가능 (결제 성공 시 자동 저장)
CREATE POLICY "Users can insert own orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 사용자는 자신의 주문만 수정 가능
CREATE POLICY "Users can update own orders"
  ON public.orders FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 7. updated_at 자동 업데이트 함수 (이미 존재하면 교체)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. updated_at 자동 업데이트 트리거
DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 9. 테이블 구조 확인
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'orders'
ORDER BY ordinal_position;

-- 10. RLS 정책 확인
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'orders'
ORDER BY policyname;

-- ============================================
-- 완료 메시지
-- ============================================
SELECT 
  '✅ Orders 테이블 설정 완료!' as status,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename = 'orders';

-- 결과에 3개의 정책이 보여야 합니다:
-- 1. Users can view own orders
-- 2. Users can insert own orders  ← 결제 성공 시 자동 저장에 필요!
-- 3. Users can update own orders

