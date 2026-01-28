# UPDATE 무한 로딩 문제 해결 가이드

## 문제 증상
- INSERT는 정상 작동
- UPDATE 쿼리만 무한 대기 상태
- 특정 테이블(profiles, todos, orders)에 대한 UPDATE가 실행되지 않음

## 원인 분석

### 1. Row-level Lock 미해제
특정 세션이 트랜잭션을 시작(BEGIN)한 후 COMMIT 또는 ROLLBACK을 하지 않아 `idle in transaction` 상태로 남아있음.

### 2. 가능한 원인
1. **DB 툴의 실수**: DBeaver, pgAdmin, Supabase SQL Editor에서 수동으로 데이터를 수정한 후 COMMIT을 누르지 않음
2. **비정상적 종료**: 애플리케이션에서 에러 발생 시 트랜잭션 롤백 처리가 누락됨
3. **데드락**: 두 개 이상의 프로세스가 서로 상대방의 락을 기다리는 상태

## 해결 방법

### 단계 1: 락 상태 확인
Supabase 대시보드 → SQL Editor에서 `supabase/check_and_kill_locks.sql` 파일의 쿼리를 실행:

```sql
-- 1. "idle in transaction" 상태인 세션 확인
SELECT 
  pid,
  usename,
  state,
  now() - state_change AS idle_duration,
  query
FROM pg_stat_activity
WHERE state = 'idle in transaction'
  AND datname = current_database();
```

### 단계 2: 문제가 되는 세션 종료
확인된 PID를 사용하여 세션 종료:

```sql
-- 특정 PID 종료 (예: PID가 12345인 경우)
SELECT pg_terminate_backend(12345);
```

또는 안전하게 5분 이상 idle 상태인 세션만 종료:

```sql
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle in transaction'
  AND datname = current_database()
  AND now() - state_change > interval '5 minutes'
  AND pid != pg_backend_pid();
```

### 단계 3: 코드 확인
현재 코드에서는 Supabase JS 클라이언트를 사용하므로 자동으로 트랜잭션을 관리합니다. 하지만 다음을 확인하세요:

1. **에러 처리**: try-catch에서 에러 발생 시에도 쿼리가 완료되는지 확인
2. **타임아웃 설정**: UPDATE 쿼리에 타임아웃을 추가하는 것을 고려

## 예방 방법

### 1. 코드 레벨
```typescript
// UPDATE 쿼리에 타임아웃 추가 (예시)
const updatePromise = supabase
  .from("profiles")
  .update({ plan: "pro" })
  .eq("id", user.id);

const timeoutPromise = new Promise((_, reject) =>
  setTimeout(() => reject(new Error("UPDATE 타임아웃")), 10000)
);

await Promise.race([updatePromise, timeoutPromise]);
```

### 2. DB 레벨
- Supabase에서는 직접 설정할 수 없지만, 애플리케이션에서 타임아웃을 설정
- 정기적으로 "idle in transaction" 세션을 모니터링

## 추가 확인 사항

### RLS 정책 확인
RLS 정책이 올바르게 설정되어 있는지 확인:

```sql
SELECT * FROM pg_policies 
WHERE tablename IN ('profiles', 'todos', 'orders');
```

### 트리거 확인
트리거가 무한 루프를 일으키지 않는지 확인:

```sql
SELECT * FROM pg_trigger 
WHERE tgname LIKE '%updated_at%';
```

## 참고
- Supabase는 관리형 서비스이므로 직접적인 트랜잭션 제어가 제한적입니다
- 문제가 지속되면 Supabase 지원팀에 문의하거나 프로젝트를 재시작하는 것을 고려하세요

