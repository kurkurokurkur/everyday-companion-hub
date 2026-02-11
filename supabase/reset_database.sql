-- ============================================
-- 데이터베이스 완전 초기화 스크립트
-- ⚠️ 주의: 모든 데이터가 삭제됩니다!
-- ============================================
-- 
-- 이 스크립트는 다음을 수행합니다:
-- 1. 모든 테이블 삭제
-- 2. 모든 함수 및 트리거 삭제
-- 3. 모든 정책 삭제
--
-- 백업 후 실행하세요!
-- ============================================

-- ============================================
-- 1. 트리거 삭제
-- ============================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_todos_updated_at ON public.todos;
DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;

-- ============================================
-- 2. 함수 삭제
-- ============================================
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

-- ============================================
-- 3. 테이블 삭제 (CASCADE로 관련 객체도 함께 삭제)
-- ============================================
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.todos CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- ============================================
-- 4. 확인
-- ============================================
-- 다음 쿼리로 테이블이 삭제되었는지 확인하세요
SELECT 
  '삭제 확인' as check_type,
  table_name,
  CASE 
    WHEN table_name IS NULL THEN '✅ 삭제 완료'
    ELSE '❌ 아직 존재함'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name IN ('profiles', 'todos', 'orders');

-- ============================================
-- 삭제 완료!
-- ============================================
-- 이제 init_database.sql을 실행하여 새로 구성하세요.
-- ============================================

