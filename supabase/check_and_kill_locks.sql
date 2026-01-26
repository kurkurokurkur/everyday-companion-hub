-- ============================================
-- PostgreSQL 락(Lock) 확인 및 해제 SQL
-- Supabase 대시보드 → SQL Editor에서 실행하세요
-- ============================================
-- 
-- 증상: UPDATE 쿼리가 무한 대기 상태
-- 원인: 특정 세션이 Row-level Lock을 획득한 후 트랜잭션을 종료하지 않음
-- ============================================

-- ============================================
-- 1. 현재 활성 세션 및 락 상태 확인
-- ============================================
SELECT 
  pid,
  usename,
  application_name,
  client_addr,
  state,
  state_change,
  wait_event_type,
  wait_event,
  query_start,
  state_change,
  now() - query_start AS query_duration,
  query
FROM pg_stat_activity
WHERE state != 'idle'
  AND datname = current_database()
ORDER BY query_start;

-- ============================================
-- 2. "idle in transaction" 상태인 세션 확인
-- ============================================
-- 이 상태는 트랜잭션이 시작되었지만 COMMIT/ROLLBACK이 되지 않은 상태입니다.
SELECT 
  pid,
  usename,
  application_name,
  client_addr,
  state,
  state_change,
  now() - state_change AS idle_duration,
  query
FROM pg_stat_activity
WHERE state = 'idle in transaction'
  AND datname = current_database()
ORDER BY state_change;

-- ============================================
-- 3. 특정 테이블(profiles, todos, orders)에 대한 락 확인
-- ============================================
SELECT 
  l.locktype,
  l.database,
  l.relation::regclass AS table_name,
  l.page,
  l.tuple,
  l.virtualxid,
  l.transactionid,
  l.mode,
  l.granted,
  a.usename,
  a.query,
  a.query_start,
  age(now(), a.query_start) AS age,
  a.pid
FROM pg_locks l
LEFT JOIN pg_stat_activity a ON l.pid = a.pid
WHERE l.relation IN (
  'profiles'::regclass::oid,
  'todos'::regclass::oid,
  'orders'::regclass::oid
)
  AND NOT l.granted
ORDER BY a.query_start;

-- ============================================
-- 4. 모든 대기 중인 락 확인
-- ============================================
SELECT 
  blocked_locks.pid AS blocked_pid,
  blocked_activity.usename AS blocked_user,
  blocking_locks.pid AS blocking_pid,
  blocking_activity.usename AS blocking_user,
  blocked_activity.query AS blocked_statement,
  blocking_activity.query AS blocking_statement,
  blocked_activity.application_name AS blocked_application,
  blocking_activity.application_name AS blocking_application
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks 
  ON blocking_locks.locktype = blocked_locks.locktype
  AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
  AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
  AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
  AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
  AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
  AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
  AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
  AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
  AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
  AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;

-- ============================================
-- 5. 락을 유발하는 프로세스 강제 종료 (주의!)
-- ============================================
-- ⚠️ 주의: 아래 쿼리를 실행하기 전에 위의 쿼리로 어떤 프로세스가 문제인지 확인하세요!

-- 특정 PID를 강제 종료하는 방법:
-- SELECT pg_terminate_backend(PID번호);

-- 예시: PID가 12345인 프로세스 종료
-- SELECT pg_terminate_backend(12345);

-- "idle in transaction" 상태인 모든 세션 종료 (주의: 운영 환경에서는 신중하게!)
-- SELECT pg_terminate_backend(pid)
-- FROM pg_stat_activity
-- WHERE state = 'idle in transaction'
--   AND datname = current_database()
--   AND pid != pg_backend_pid();  -- 현재 세션은 제외

-- ============================================
-- 6. 안전한 종료 방법 (권장)
-- ============================================
-- 먼저 특정 시간 이상 "idle in transaction" 상태인 세션만 종료
SELECT 
  pid,
  usename,
  state_change,
  now() - state_change AS idle_duration,
  pg_terminate_backend(pid) AS terminated
FROM pg_stat_activity
WHERE state = 'idle in transaction'
  AND datname = current_database()
  AND now() - state_change > interval '5 minutes'  -- 5분 이상 idle 상태
  AND pid != pg_backend_pid();  -- 현재 세션은 제외

-- ============================================
-- 7. 트랜잭션 타임아웃 설정 확인 (Supabase에서는 제한적)
-- ============================================
-- Supabase는 관리형 서비스이므로 직접 설정할 수 없지만,
-- 애플리케이션 레벨에서 타임아웃을 설정할 수 있습니다.

-- ============================================
-- 사용 방법:
-- ============================================
-- 1. 먼저 쿼리 1, 2, 3을 실행하여 문제가 되는 세션(PID)을 확인하세요.
-- 2. 쿼리 4로 어떤 쿼리가 어떤 쿼리를 블로킹하는지 확인하세요.
-- 3. 문제가 되는 PID를 확인한 후, 쿼리 5 또는 6을 사용하여 종료하세요.
-- 4. 쿼리 6(안전한 종료)을 사용하는 것을 권장합니다.
-- ============================================

