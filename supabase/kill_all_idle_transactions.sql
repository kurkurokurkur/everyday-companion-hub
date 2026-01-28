-- ============================================
-- 모든 "idle in transaction" 세션 강제 종료
-- ⚠️ 주의: 실행 전에 백업을 권장합니다
-- ============================================

-- 실행 중이거나 유휴 상태인 모든 트랜잭션 강제 종료
SELECT 
  pid,
  usename,
  application_name,
  state,
  now() - state_change AS idle_duration,
  pg_terminate_backend(pid) AS terminated
FROM pg_stat_activity
WHERE state != 'idle' 
  AND datname = current_database()
  AND pid != pg_backend_pid()
ORDER BY state_change;

-- 또는 "idle in transaction" 상태만 종료 (더 안전)
SELECT 
  pid,
  usename,
  state,
  now() - state_change AS idle_duration,
  pg_terminate_backend(pid) AS terminated
FROM pg_stat_activity
WHERE state = 'idle in transaction'
  AND datname = current_database()
  AND pid != pg_backend_pid()
ORDER BY state_change;

