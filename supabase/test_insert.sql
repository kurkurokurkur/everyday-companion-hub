-- ============================================
-- RLS 정책 테스트 및 임시 비활성화 SQL
-- Supabase 대시보드 → SQL Editor에서 실행하세요
-- ============================================

-- 1. 현재 RLS 정책 확인
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'orders';

-- 2. RLS 활성화 상태 확인
SELECT 
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'orders';

-- 3. 테스트: 현재 로그인한 사용자로 insert 시도 (수동으로 실행)
-- 아래 쿼리는 실제로 실행하지 말고, 참고용입니다
-- INSERT INTO public.orders (user_id, order_id, payment_key, amount, order_name, status)
-- VALUES (auth.uid(), 'test_order_123', 'test_key', 9900, '테스트 주문', 'paid');

-- 4. RLS를 일시적으로 비활성화해서 테스트 (문제 해결 후 다시 활성화!)
-- ⚠️ 주의: 이건 테스트용입니다. 실제 운영에서는 다시 활성화해야 합니다!
-- ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;

-- 5. RLS 정책을 더 관대하게 수정 (테스트용)
-- DROP POLICY IF EXISTS "Users can insert own orders" ON public.orders;
-- CREATE POLICY "Users can insert own orders"
--   ON public.orders FOR INSERT
--   WITH CHECK (true);  -- 모든 인증된 사용자가 insert 가능 (테스트용)

-- 6. 정상적인 정책으로 복구
-- DROP POLICY IF EXISTS "Users can insert own orders" ON public.orders;
-- CREATE POLICY "Users can insert own orders"
--   ON public.orders FOR INSERT
--   WITH CHECK (auth.uid() = user_id);

