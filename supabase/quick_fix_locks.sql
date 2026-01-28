-- ============================================
-- 빠른 락 확인 및 해제 (즉시 실행용)
-- Supabase 대시보드 → SQL Editor에서 실행하세요
-- ============================================

-- ============================================
-- 1단계: "idle in transaction" 상태인 세션 확인
-- ============================================
-- 이 상태가 문제의 원인입니다!
SELECT 
  pid,
  usename,
  application_name,
  client_addr,
  state,
  state_change,
  now() - state_change AS idle_duration,
  LEFT(query, 100) AS query_preview
FROM pg_stat_activity
WHERE state = 'idle in transaction'
  AND datname = current_database()
  AND pid != pg_backend_pid()  -- 현재 세션은 제외
ORDER BY state_change;

-- ============================================
-- 2단계: 락을 기다리는 세션 확인
-- ============================================
SELECT 
  blocked_locks.pid AS blocked_pid,
  blocked_activity.usename AS blocked_user,
  blocking_locks.pid AS blocking_pid,
  blocking_activity.usename AS blocking_user,
  blocked_activity.query AS blocked_statement,
  blocking_activity.query AS blocking_statement
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks 
  ON blocking_locks.locktype = blocked_locks.locktype
  AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
  AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
  AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;

-- ============================================
-- 3단계: 문제가 되는 세션 종료 (주의!)
-- ============================================
-- ⚠️ 위의 쿼리 결과에서 확인된 PID를 사용하세요!

-- 예시: PID가 12345인 경우
-- SELECT pg_terminate_backend(12345);

-- 또는 안전하게 5분 이상 idle 상태인 세션만 종료:
SELECT 
  pid,
  usename,
  state_change,
  now() - state_change AS idle_duration,
  pg_terminate_backend(pid) AS terminated
FROM pg_stat_activity
WHERE state = 'idle in transaction'
  AND datname = current_database()
  AND now() - state_change > interval '5 minutes'
  AND pid != pg_backend_pid();

-- ============================================
-- 4단계: profiles 테이블에 대한 락 확인
-- ============================================
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
WHERE l.relation = 'profiles'::regclass::oid
ORDER BY l.granted, a.query_start;

