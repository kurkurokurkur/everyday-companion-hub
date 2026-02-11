-- ============================================
-- 상품 테이블 생성 스크립트
-- Supabase 대시보드 → SQL Editor에서 실행하세요
-- ============================================

-- ============================================
-- 0. updated_at 자동 업데이트 함수 생성
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 1. Products 테이블 생성
-- ============================================
CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  plan_type text NOT NULL CHECK (plan_type IN ('free', 'monthly', 'yearly')),
  price numeric(12, 2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  description text,
  features jsonb,
  duration_months integer NOT NULL DEFAULT 1 CHECK (duration_months > 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS products_plan_type_idx ON public.products(plan_type);
CREATE INDEX IF NOT EXISTS products_is_active_idx ON public.products(is_active);
CREATE INDEX IF NOT EXISTS products_plan_active_idx ON public.products(plan_type, is_active);

-- RLS 활성화
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 모든 사용자가 활성화된 상품을 조회할 수 있음
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;
CREATE POLICY "Anyone can view active products"
  ON public.products FOR SELECT
  USING (is_active = true);

-- RLS 정책: 모든 사용자가 모든 상품을 조회할 수 있음 (관리자용)
DROP POLICY IF EXISTS "Anyone can view all products" ON public.products;
CREATE POLICY "Anyone can view all products"
  ON public.products FOR SELECT
  USING (true);

-- updated_at 자동 업데이트 트리거
DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 2. 기본 상품 데이터 추가
-- ============================================

-- 무료 버전
INSERT INTO public.products (name, plan_type, price, description, features, duration_months, is_active)
VALUES (
  '무료 버전',
  'free',
  0,
  '기본 기능을 무료로 이용할 수 있는 플랜입니다.',
  '["1개월 일정 관리", "기본 할 일 관리", "기본 계산기", "기본 단위 변환기"]'::jsonb,
  1,
  true
)
ON CONFLICT DO NOTHING;

-- 유료 버전 (월간)
INSERT INTO public.products (name, plan_type, price, description, features, duration_months, is_active)
VALUES (
  '유료 버전 (월간)',
  'monthly',
  9900,
  '월간 구독으로 Pro 기능을 이용할 수 있는 플랜입니다.',
  '["3개월 일정 관리", "확장 캘린더 기능", "추가 편의 기능", "우선 고객 지원", "광고 없음"]'::jsonb,
  1,
  true
)
ON CONFLICT DO NOTHING;

-- 유료 버전 (연간)
INSERT INTO public.products (name, plan_type, price, description, features, duration_months, is_active)
VALUES (
  '유료 버전 (연간)',
  'yearly',
  99000,
  '연간 구독으로 Pro 기능을 이용할 수 있는 플랜입니다. (월간 대비 약 17% 할인)',
  '["3개월 일정 관리", "확장 캘린더 기능", "추가 편의 기능", "우선 고객 지원", "광고 없음", "연간 구독 특별 혜택"]'::jsonb,
  12,
  true
)
ON CONFLICT DO NOTHING;

-- ============================================
-- 3. Orders 테이블에 product_id 컬럼 추가 (선택사항)
-- ============================================
-- Orders 테이블에 상품 정보를 연결하려면 아래 주석을 해제하세요

-- ALTER TABLE public.orders 
-- ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products(id);

-- CREATE INDEX IF NOT EXISTS orders_product_id_idx ON public.orders(product_id);

-- ============================================
-- 검증 쿼리
-- ============================================
-- 상품 테이블 생성 확인
SELECT 
  '상품 테이블 생성 확인' as check_type,
  table_name,
  CASE 
    WHEN table_name = 'products' THEN '✅'
    ELSE '❌'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name = 'products';

-- 상품 데이터 확인
SELECT 
  '상품 데이터 확인' as check_type,
  name,
  plan_type,
  price,
  duration_months,
  is_active,
  CASE 
    WHEN name IS NOT NULL THEN '✅'
    ELSE '❌'
  END as status
FROM public.products
ORDER BY 
  CASE plan_type
    WHEN 'free' THEN 1
    WHEN 'monthly' THEN 2
    WHEN 'yearly' THEN 3
  END;

-- RLS 정책 확인
SELECT 
  'RLS 정책 확인' as check_type,
  tablename,
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'SELECT' THEN '✅'
    ELSE '❌'
  END as status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'products'
ORDER BY cmd;
