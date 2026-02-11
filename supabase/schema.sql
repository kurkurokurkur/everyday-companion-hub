    -- 필요한 확장
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    -- ============================================
    -- Todos 테이블
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

    -- 기존 테이블에 컬럼 추가 (마이그레이션 호환성)
    ALTER TABLE public.todos
      ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

    -- 인덱스 생성
    CREATE INDEX IF NOT EXISTS todos_user_id_idx ON public.todos(user_id);
    CREATE INDEX IF NOT EXISTS todos_due_date_idx ON public.todos(due_date);
    CREATE INDEX IF NOT EXISTS todos_user_due_date_idx ON public.todos(user_id, due_date);
    CREATE INDEX IF NOT EXISTS todos_is_completed_idx ON public.todos(is_completed) WHERE is_completed = false;

    ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

    -- RLS 정책 (중복 실행 안전)
    DROP POLICY IF EXISTS "Users can view own todos" ON public.todos;
    DROP POLICY IF EXISTS "Users can insert own todos" ON public.todos;
    DROP POLICY IF EXISTS "Users can update own todos" ON public.todos;
    DROP POLICY IF EXISTS "Users can delete own todos" ON public.todos;

    CREATE POLICY "Users can view own todos"
      ON public.todos FOR SELECT
      USING (auth.uid() = user_id);

    CREATE POLICY "Users can insert own todos"
      ON public.todos FOR INSERT
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update own todos"
      ON public.todos FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can delete own todos"
      ON public.todos FOR DELETE
      USING (auth.uid() = user_id);

    -- ============================================
    -- Profiles 테이블 (회원정보)
    -- ============================================
    CREATE TABLE IF NOT EXISTS public.profiles (
      id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      email text,
      display_name text,
      plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    -- 기존 테이블에 제약 조건 추가 (마이그레이션 호환성)
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'profiles_plan_check'
      ) THEN
        ALTER TABLE public.profiles
          ADD CONSTRAINT profiles_plan_check CHECK (plan IN ('free', 'pro'));
      END IF;
    END $$;

    -- 인덱스 생성
    CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles(email) WHERE email IS NOT NULL;
    CREATE INDEX IF NOT EXISTS profiles_plan_idx ON public.profiles(plan);

    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

    CREATE POLICY "Users can view own profile"
      ON public.profiles FOR SELECT
      USING (auth.uid() = id);

    CREATE POLICY "Users can update own profile"
      ON public.profiles FOR UPDATE
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);

    -- ============================================
    -- Orders 테이블 (결제 내역)
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

    -- 기존 테이블에 컬럼 추가 (마이그레이션 호환성)
    ALTER TABLE public.orders
      ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

    -- 인덱스 생성
    CREATE INDEX IF NOT EXISTS orders_user_id_idx ON public.orders(user_id);
    CREATE UNIQUE INDEX IF NOT EXISTS orders_order_id_idx ON public.orders(order_id);
    CREATE INDEX IF NOT EXISTS orders_payment_key_idx ON public.orders(payment_key);
    CREATE INDEX IF NOT EXISTS orders_status_idx ON public.orders(status);
    CREATE INDEX IF NOT EXISTS orders_created_at_idx ON public.orders(created_at DESC);

    ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

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

    -- ============================================
    -- updated_at 자동 업데이트 함수
    -- ============================================
    CREATE OR REPLACE FUNCTION public.update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    -- updated_at 트리거 생성
    DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
    CREATE TRIGGER update_profiles_updated_at
      BEFORE UPDATE ON public.profiles
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();

    DROP TRIGGER IF EXISTS update_todos_updated_at ON public.todos;
    CREATE TRIGGER update_todos_updated_at
      BEFORE UPDATE ON public.todos
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();

    DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
    CREATE TRIGGER update_orders_updated_at
      BEFORE UPDATE ON public.orders
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();

    -- ============================================
    -- 회원가입 시 자동으로 프로필 생성
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

