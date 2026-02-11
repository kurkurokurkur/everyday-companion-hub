# 결제 시 DB 먹통 문제 해결 가이드

## 🔍 문제 원인

결제 성공 후 DB가 먹통이 되는 주요 원인:

### 1. **useEffect 의존성 배열 문제** (가장 큰 원인)
- `plan`과 `hasUpdated`가 의존성 배열에 포함되어 있음
- `plan`이 업데이트되면 useEffect가 다시 실행됨
- 무한 루프 발생 가능: UPDATE → plan 변경 → useEffect 재실행 → UPDATE → ...

### 2. **AuthContext와 PaymentSuccess의 동시 실행**
- AuthContext가 `profiles`를 SELECT하는 동안
- PaymentSuccess가 `profiles`를 UPDATE하려고 시도
- 두 쿼리가 동시에 실행되면서 락 경합 발생

### 3. **Promise.race의 한계**
- 타임아웃이 발생해도 실제 쿼리는 계속 실행됨
- 타임아웃이 발생해도 DB 락이 계속 유지될 수 있음

## ✅ 해결 방법

### 1. 코드 수정 (이미 적용됨)

**PaymentSuccess.tsx**:
- useEffect 의존성 배열에서 `plan`과 `hasUpdated` 제거
- UPDATE 실행 전에 300ms 딜레이 추가 (AuthContext의 SELECT 완료 대기)
- 중복 실행 방지 로직 강화

### 2. 즉시 해결: DB 락 해제

Supabase 대시보드 → SQL Editor에서 실행:

```sql
-- 1. "idle in transaction" 상태인 세션 확인
SELECT 
  pid,
  usename,
  state,
  now() - state_change AS idle_duration,
  LEFT(query, 100) AS query_preview
FROM pg_stat_activity
WHERE state = 'idle in transaction'
  AND datname = current_database();

-- 2. 문제가 되는 세션 강제 종료
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle in transaction'
  AND state_change < now() - interval '1 second'
  AND pid != pg_backend_pid()
  AND datname = current_database();
```

또는 `supabase/fix_payment_db_lock.sql` 파일을 실행하세요.

## 🔧 예방 방법

### 1. 코드 레벨
- ✅ useEffect 의존성 배열 최소화
- ✅ 중복 실행 방지 로직 강화
- ✅ 쿼리 실행 전 딜레이 추가

### 2. DB 레벨
- Supabase SQL Editor 사용 시 주의:
  - 쿼리 실행 후 반드시 COMMIT 확인
  - 트랜잭션을 시작했다면 반드시 종료
- 주기적으로 "idle in transaction" 세션 정리

### 3. 모니터링
- Supabase 대시보드에서 활성 세션 확인
- 결제 후 DB 상태 모니터링

## 📊 확인 체크리스트

- [ ] Supabase SQL Editor에서 수동 쿼리 실행 후 COMMIT 했는지 확인
- [ ] 여러 탭에서 동시에 결제 페이지를 열지 않았는지 확인
- [ ] 이전에 타임아웃된 쿼리가 있는지 확인
- [ ] Supabase 프로젝트가 일시 중지되지 않았는지 확인
- [ ] 네트워크 연결이 안정적인지 확인

## 🚨 긴급 조치

DB가 완전히 먹통인 경우:

### 방법 1: 긴급 락 해제 (가장 빠름)

1. **Supabase 대시보드 → SQL Editor**
2. `supabase/emergency_unlock.sql` 파일 내용 복사하여 실행
3. 모든 락이 해제될 때까지 대기
4. 페이지 새로고침 후 재시도

### 방법 2: 일반 락 해제

1. **Supabase 대시보드 → SQL Editor**
2. `supabase/fix_payment_db_lock.sql` 실행
3. 모든 "idle in transaction" 세션 종료
4. 페이지 새로고침 후 재시도

## 🔄 개선된 코드 기능

### 재시도 로직 추가
- 주문 정보 저장: 최대 3회 재시도 (exponential backoff)
- 플랜 업데이트: 최대 3회 재시도 (exponential backoff)
- 타임아웃: 5초 → 8초로 증가

### 딜레이 조정
- AuthContext SELECT 완료 대기: 300ms → 1000ms로 증가
- 재시도 간 딜레이: 1초, 2초, 3초 (exponential backoff)

