# Supabase 대시보드에서 락 상태 확인 가이드

## 📍 접근 방법

### 1단계: Supabase 대시보드 접속
1. [Supabase 대시보드](https://supabase.com/dashboard)에 로그인
2. 프로젝트 선택 (현재: `jzawdjxtrzgnspqnjmzj`)

### 2단계: SQL Editor 열기
1. 왼쪽 사이드바에서 **"SQL Editor"** 클릭
2. 또는 상단 메뉴에서 **"SQL Editor"** 선택

### 3단계: 락 확인 쿼리 실행

## 🔍 락 확인 쿼리 (순서대로 실행)

### 쿼리 1: "idle in transaction" 상태 확인
```sql
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
  AND pid != pg_backend_pid()
ORDER BY state_change;
```

**결과 해석:**
- **결과가 비어있음**: 락 문제가 아님 (다른 원인 확인 필요)
- **결과가 있음**: 해당 PID가 문제! → 쿼리 3으로 이동

---

### 쿼리 2: 락을 기다리는 세션 확인
```sql
SELECT 
  blocked_locks.pid AS blocked_pid,
  blocked_activity.usename AS blocked_user,
  blocking_locks.pid AS blocking_pid,
  blocking_activity.usename AS blocking_user,
  LEFT(blocked_activity.query, 100) AS blocked_statement,
  LEFT(blocking_activity.query, 100) AS blocking_statement
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks 
  ON blocking_locks.locktype = blocked_locks.locktype
  AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
  AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
```

**결과 해석:**
- **blocking_pid**: 락을 유발하는 프로세스 ID
- **blocked_pid**: 락을 기다리는 프로세스 ID

---

### 쿼리 3: profiles 테이블에 대한 락 확인
```sql
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
```

**결과 해석:**
- **granted = false**: 락을 기다리는 중
- **granted = true**: 락을 보유 중

---

### 쿼리 4: 문제 세션 종료 (⚠️ 주의!)

**방법 1: 특정 PID 종료**
```sql
-- 예시: PID가 12345인 경우
SELECT pg_terminate_backend(12345);
```

**방법 2: 5분 이상 idle 상태인 세션만 종료 (안전)**
```sql
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
```

**방법 3: 모든 활성 세션 종료 (긴급 시)**
```sql
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state != 'idle' 
  AND datname = current_database()
  AND pid != pg_backend_pid();
```

---

## 📊 단계별 체크리스트

### ✅ Step 1: 락 확인
- [ ] 쿼리 1 실행 → "idle in transaction" 상태 확인
- [ ] 쿼리 2 실행 → 락을 기다리는 세션 확인
- [ ] 쿼리 3 실행 → profiles 테이블 락 확인

### ✅ Step 2: 문제 해결
- [ ] 문제가 되는 PID 확인
- [ ] 쿼리 4 실행 → 문제 세션 종료
- [ ] 결과 확인: `terminated = true` 확인

### ✅ Step 3: 재시도
- [ ] 결제 완료 페이지에서 UPDATE 재시도
- [ ] 정상 작동 확인

---

## 🎯 빠른 해결 (한 번에 실행)

모든 확인과 해결을 한 번에:

```sql
-- 1. 문제 확인
SELECT 
  'idle_in_transaction' AS check_type,
  COUNT(*) AS count
FROM pg_stat_activity
WHERE state = 'idle in transaction'
  AND datname = current_database()
  AND pid != pg_backend_pid();

-- 2. 문제 해결 (5분 이상 idle 상태인 세션 종료)
SELECT 
  pid,
  pg_terminate_backend(pid) AS terminated
FROM pg_stat_activity
WHERE state = 'idle in transaction'
  AND datname = current_database()
  AND now() - state_change > interval '5 minutes'
  AND pid != pg_backend_pid();
```

---

## ⚠️ 주의사항

1. **운영 환경에서는 신중하게**: 세션을 종료하면 해당 사용자의 작업이 중단될 수 있습니다.
2. **백업 권장**: 중요한 데이터가 있다면 먼저 백업하세요.
3. **현재 세션 제외**: `pid != pg_backend_pid()` 조건은 반드시 포함하세요.

---

## 🔗 관련 파일

- `supabase/quick_fix_locks.sql` - 빠른 락 확인 및 해제
- `supabase/check_and_kill_locks.sql` - 상세한 락 확인
- `supabase/kill_all_idle_transactions.sql` - 모든 idle 세션 종료

---

## 💡 문제가 계속되면?

1. **Supabase 지원팀 문의**: 대시보드에서 "Support" 메뉴 사용
2. **프로젝트 재시작**: Supabase 대시보드 → Settings → Restart
3. **코드 확인**: `src/pages/PaymentSuccess.tsx`의 타임아웃 설정 확인

