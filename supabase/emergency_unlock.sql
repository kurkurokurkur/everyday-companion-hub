-- ============================================
-- 긴급 DB 락 해제 SQL
-- 결제 시 DB가 먹통일 때 즉시 실행하세요
-- Supabase 대시보드 → SQL Editor에서 실행
-- ============================================

-- 1. 모든 "idle in transaction" 세션 강제 종료
SELECT pg_terminate_backend(pid) as terminated_pid
FROM pg_stat_activity
WHERE state = 'idle in transaction'
  AND datname = current_database()
  AND pid != pg_backend_pid();

-- 2. profiles 테이블에 락이 걸려있는 세션 종료
SELECT pg_terminate_backend(l.pid) as terminated_pid
FROM pg_locks l
JOIN pg_stat_activity a ON l.pid = a.pid
WHERE l.relation::regclass::text = 'public.profiles'
  AND a.state != 'idle'
  AND a.pid != pg_backend_pid();

-- 3. orders 테이블에 락이 걸려있는 세션 종료
SELECT pg_terminate_backend(l.pid) as terminated_pid
FROM pg_locks l
JOIN pg_stat_activity a ON l.pid = a.pid
WHERE l.relation::regclass::text = 'public.orders'
  AND a.state != 'idle'
  AND a.pid != pg_backend_pid();

-- 4. 5초 이상 실행 중인 모든 쿼리 종료 (주의: 활성 작업도 종료됨)
SELECT pg_terminate_backend(pid) as terminated_pid
FROM pg_stat_activity
WHERE datname = current_database()
  AND state != 'idle'
  AND now() - query_start > interval '5 seconds'
  AND pid != pg_backend_pid()
  AND application_name NOT LIKE '%dashboard%'; -- 대시보드 쿼리는 제외

-- 5. 최종 확인: 남아있는 락 확인
SELECT 
  l.locktype,
  l.relation::regclass AS table_name,
  l.mode,
  l.granted,
  a.usename,
  a.state,
  a.pid,
  LEFT(a.query, 100) AS query_preview
FROM pg_locks l
LEFT JOIN pg_stat_activity a ON l.pid = a.pid
WHERE l.relation::regclass::text IN ('public.profiles', 'public.orders')
  AND a.pid != pg_backend_pid()
ORDER BY a.state_change;

-- ============================================
-- 완료 메시지
-- ============================================
SELECT 
  '✅ 긴급 락 해제 완료!' as status,
  COUNT(*) as remaining_locks
FROM pg_locks l
JOIN pg_stat_activity a ON l.pid = a.pid
WHERE l.relation::regclass::text IN ('public.profiles', 'public.orders')
  AND a.pid != pg_backend_pid();

