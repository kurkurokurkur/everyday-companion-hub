-- ============================================
-- 데이터베이스 초기화 스크립트
-- Supabase 대시보드 → SQL Editor에서 실행하세요
-- ============================================
-- 
-- 이 스크립트는 다음을 수행합니다:
-- 1. 필요한 확장 프로그램 설치
-- 2. 모든 테이블 생성 (todos, profiles, orders)
-- 3. 인덱스 생성
-- 4. RLS (Row Level Security) 활성화 및 정책 설정
-- 5. 트리거 함수 생성
--
-- 주의: 기존 데이터가 있다면 백업 후 실행하세요!
-- ============================================

-- ============================================
-- 1. 확장 프로그램 설치
-- ============================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 2. 기존 테이블 및 정책 정리 (선택사항)
-- ============================================
-- 주의: 이 부분은 기존 데이터를 삭제합니다!
-- 기존 데이터를 보존하려면 이 섹션을 주석 처리하세요.

-- DROP TABLE IF EXISTS public.orders CASCADE;
-- DROP TABLE IF EXISTS public.todos CASCADE;
-- DROP TABLE IF EXISTS public.profiles CASCADE;
-- DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- ============================================
-- 3. Profiles 테이블 (사용자 프로필)
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  display_name text,
  plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS profiles_plan_idx ON public.profiles(plan);

-- RLS 활성화
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 사용자는 자신의 프로필만 조회 가능
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- RLS 정책: 사용자는 자신의 프로필만 수정 가능
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 4. Todos 테이블 (할 일 목록)
-- ============================================
CREATE TABLE IF NOT EXISTS public.todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task text NOT NULL,
  is_completed boolean NOT NULL DEFAULT false,
  due_date date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS todos_user_id_idx ON public.todos(user_id);
CREATE INDEX IF NOT EXISTS todos_due_date_idx ON public.todos(due_date);
CREATE INDEX IF NOT EXISTS todos_user_due_date_idx ON public.todos(user_id, due_date);
CREATE INDEX IF NOT EXISTS todos_is_completed_idx ON public.todos(is_completed) WHERE is_completed = false;

-- RLS 활성화
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 사용자는 자신의 할 일만 조회 가능
DROP POLICY IF EXISTS "Users can view own todos" ON public.todos;
CREATE POLICY "Users can view own todos"
  ON public.todos FOR SELECT
  USING (auth.uid() = user_id);

-- RLS 정책: 사용자는 자신의 할 일만 추가 가능
DROP POLICY IF EXISTS "Users can insert own todos" ON public.todos;
CREATE POLICY "Users can insert own todos"
  ON public.todos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS 정책: 사용자는 자신의 할 일만 수정 가능
DROP POLICY IF EXISTS "Users can update own todos" ON public.todos;
CREATE POLICY "Users can update own todos"
  ON public.todos FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS 정책: 사용자는 자신의 할 일만 삭제 가능
DROP POLICY IF EXISTS "Users can delete own todos" ON public.todos;
CREATE POLICY "Users can delete own todos"
  ON public.todos FOR DELETE
  USING (auth.uid() = user_id);

-- updated_at 자동 업데이트 트리거
DROP TRIGGER IF EXISTS update_todos_updated_at ON public.todos;
CREATE TRIGGER update_todos_updated_at
  BEFORE UPDATE ON public.todos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 5. Orders 테이블 (결제 내역)
-- ============================================
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

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS orders_user_id_idx ON public.orders(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS orders_order_id_idx ON public.orders(order_id);
CREATE INDEX IF NOT EXISTS orders_payment_key_idx ON public.orders(payment_key);
CREATE INDEX IF NOT EXISTS orders_status_idx ON public.orders(status);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON public.orders(created_at DESC);

-- RLS 활성화
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 사용자는 자신의 주문만 조회 가능
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
CREATE POLICY "Users can view own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id);

-- RLS 정책: 사용자는 자신의 주문만 추가 가능
DROP POLICY IF EXISTS "Users can insert own orders" ON public.orders;
CREATE POLICY "Users can insert own orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS 정책: 사용자는 자신의 주문만 수정 가능
DROP POLICY IF EXISTS "Users can update own orders" ON public.orders;
CREATE POLICY "Users can update own orders"
  ON public.orders FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- updated_at 자동 업데이트 트리거
DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 6. 회원가입 시 자동 프로필 생성 트리거
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, plan)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    'free'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 7. 검증 쿼리
-- ============================================
-- 모든 테이블이 제대로 생성되었는지 확인
SELECT 
  '테이블 생성 확인' as check_type,
  table_name,
  CASE 
    WHEN table_name IN ('profiles', 'todos', 'orders') THEN '✅'
    ELSE '❌'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name IN ('profiles', 'todos', 'orders')
ORDER BY table_name;

-- RLS 정책 확인
SELECT 
  'RLS 정책 확인' as check_type,
  tablename,
  policyname,
  cmd,
  CASE 
    WHEN cmd IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE') THEN '✅'
    ELSE '❌'
  END as status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'todos', 'orders')
ORDER BY tablename, cmd;

-- 인덱스 확인
SELECT 
  '인덱스 확인' as check_type,
  tablename,
  indexname,
  CASE 
    WHEN indexname IS NOT NULL THEN '✅'
    ELSE '❌'
  END as status
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'todos', 'orders')
ORDER BY tablename, indexname;

-- ============================================
-- 초기화 완료!
-- ============================================
-- 다음 단계:
-- 1. 위의 검증 쿼리 결과를 확인하세요
-- 2. 테스트 사용자로 로그인하여 기능을 테스트하세요
-- 3. 필요시 추가 테이블이나 정책을 설정하세요
-- ============================================

