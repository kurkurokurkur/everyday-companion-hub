-- ============================================
-- 결제 시 DB 락 문제 해결 SQL
-- Supabase 대시보드 → SQL Editor에서 실행하세요
-- ============================================

-- 1. 현재 "idle in transaction" 상태인 세션 확인
SELECT 
  pid,
  usename,
  application_name,
  state,
  now() - state_change AS idle_duration,
  LEFT(query, 100) AS query_preview
FROM pg_stat_activity
WHERE state = 'idle in transaction'
  AND datname = current_database()
ORDER BY state_change;

-- 2. profiles 테이블에 락이 걸려있는지 확인
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
WHERE l.relation::regclass::text = 'public.profiles'
  AND l.granted = true
ORDER BY a.state_change;

-- 3. orders 테이블에 락이 걸려있는지 확인
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
WHERE l.relation::regclass::text = 'public.orders'
  AND l.granted = true
ORDER BY a.state_change;

-- 4. 문제가 되는 세션 강제 종료 (1초 이상 idle 상태)
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle in transaction'
  AND state_change < now() - interval '1 second'
  AND pid != pg_backend_pid()
  AND datname = current_database();

-- 5. 모든 활성 세션 확인
SELECT 
  pid,
  usename,
  application_name,
  state,
  wait_event_type,
  wait_event,
  now() - query_start AS query_duration,
  LEFT(query, 100) AS query_preview
FROM pg_stat_activity
WHERE datname = current_database()
  AND state != 'idle'
ORDER BY query_start;

-- ============================================
-- 완료 메시지
-- ============================================
SELECT 
  '✅ 락 확인 및 해제 완료!' as status,
  COUNT(*) as remaining_idle_sessions
FROM pg_stat_activity
WHERE state = 'idle in transaction'
  AND datname = current_database();

