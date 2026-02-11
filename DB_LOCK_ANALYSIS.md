# DB 락 발생 원인 분석

## 🔍 DB 락이 발생하는 주요 원인

### 1. **"idle in transaction" 상태 (가장 흔한 원인)**

**원인:**
- Supabase SQL Editor에서 수동으로 쿼리를 실행하고 COMMIT하지 않은 경우
- 이전에 실행된 쿼리가 타임아웃되면서 트랜잭션이 열린 채로 남아있는 경우
- 에러 발생 시 트랜잭션이 롤백되지 않고 남아있는 경우

**증상:**
- UPDATE 쿼리가 무한 대기
- SELECT 쿼리도 느려짐
- 특정 테이블(profiles, orders)에 대한 모든 쿼리가 대기

**확인 방법:**
```sql
-- Supabase SQL Editor에서 실행
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

**해결 방법:**
```sql
-- 1초 이상 idle 상태인 세션 종료
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle in transaction'
  AND state_change < now() - interval '1 second'
  AND pid != pg_backend_pid();
```

---

### 2. **동시 업데이트 시도**

**원인:**
- 여러 탭/브라우저에서 동시에 같은 행을 업데이트하려고 시도
- 페이지를 여러 번 새로고침하면서 동시에 쿼리 실행
- `useEffect`가 여러 번 실행되면서 동시에 UPDATE 시도

**현재 코드의 보호 장치:**
- ✅ `useRef`로 중복 실행 방지
- ✅ `sessionStorage`로 여러 탭 간 중복 실행 방지
- ✅ `isProcessingRef`로 처리 중 플래그 설정

**하지만 여전히 발생할 수 있는 경우:**
- `sessionStorage`가 비활성화된 경우
- 여러 브라우저/기기에서 동시 접속
- 네트워크 지연으로 인한 동시 요청

---

### 3. **AuthContext와 PaymentSuccess의 동시 실행**

**원인:**
- `AuthContext`가 `profiles`를 SELECT하는 동안
- `PaymentSuccess`가 `profiles`를 UPDATE하려고 시도
- 두 쿼리가 동시에 실행되면서 락 경합 발생

**해결 방법:**
- ✅ 이미 적용됨: `AuthContext`의 `plan` 값을 사용하여 SELECT 제거
- 하지만 `AuthContext`가 여전히 `profiles`를 조회하는 동안 UPDATE가 실행될 수 있음

---

### 4. **RLS (Row Level Security) 정책 문제**

**원인:**
- RLS 정책이 복잡하거나 느린 경우
- RLS 정책 실행 중 락이 발생할 수 있음

**확인 방법:**
```sql
-- RLS 정책 확인
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('profiles', 'orders');
```

---

### 5. **Supabase 연결 풀 고갈**

**원인:**
- 너무 많은 동시 연결
- 연결이 제대로 닫히지 않음
- Supabase 무료 플랜의 연결 제한 초과

**확인 방법:**
- Supabase 대시보드 → Database → Connection Pooling 확인
- 활성 연결 수 확인

---

## 🎯 현재 코드에서 락을 유발할 수 있는 부분

### 1. **useEffect 의존성 배열**

```typescript
useEffect(() => {
  // ...
}, [user, plan]); // user와 plan이 변경될 때마다 재실행
```

**문제점:**
- `user` 객체가 변경될 때마다 재실행
- `plan` 값이 변경될 때마다 재실행
- 하지만 `useRef`로 중복 실행을 방지하고 있음

**개선 방안:**
- `user.id`만 의존성으로 사용
- `plan`은 의존성에서 제거 (이미 조건문에서 사용)

### 2. **orderSaved 상태 관리**

```typescript
const [orderSaved, setOrderSaved] = useState(false);
```

**문제점:**
- 컴포넌트가 리렌더링되면 초기화됨
- URL이 변경되면 다시 `false`가 될 수 있음

**개선 방안:**
- `useRef`로 관리하거나
- `sessionStorage`에 저장하여 영구 보존

### 3. **순차적 쿼리 실행**

```typescript
// 1. orders INSERT
await orderInsertPromise;

// 2. profiles UPDATE
await updatePromise;
```

**문제점:**
- 두 쿼리가 순차적으로 실행되지만, 첫 번째 쿼리가 실패하면 두 번째 쿼리가 실행되지 않음
- 하지만 이건 정상적인 동작임

---

## 🔧 즉시 해결 방법

### 1단계: 락 확인 및 해제

Supabase SQL Editor에서 실행:

```sql
-- 1. "idle in transaction" 상태 확인
SELECT 
  pid,
  usename,
  state,
  now() - state_change AS idle_duration,
  query
FROM pg_stat_activity
WHERE state = 'idle in transaction'
  AND datname = current_database();

-- 2. 락 해제 (1초 이상 idle 상태인 세션)
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle in transaction'
  AND state_change < now() - interval '1 second'
  AND pid != pg_backend_pid();
```

### 2단계: 코드 개선

`orderSaved` 상태를 `useRef`로 관리하여 리렌더링 시에도 유지:

```typescript
const orderSavedRef = useRef(false);

// 사용 시
if (!orderSavedRef.current) {
  // orders INSERT
  orderSavedRef.current = true;
}
```

---

## 📊 락 발생 빈도 체크리스트

- [ ] Supabase SQL Editor에서 수동 쿼리 실행 후 COMMIT 했는지 확인
- [ ] 여러 탭에서 동시에 결제 페이지를 열지 않았는지 확인
- [ ] 이전에 타임아웃된 쿼리가 있는지 확인
- [ ] Supabase 프로젝트가 일시 중지되지 않았는지 확인
- [ ] 네트워크 연결이 안정적인지 확인

---

## 💡 예방 방법

1. **Supabase SQL Editor 사용 시 주의:**
   - 쿼리 실행 후 반드시 COMMIT 확인
   - 트랜잭션을 시작했다면 반드시 종료

2. **코드 개선:**
   - `orderSaved`를 `useRef`로 관리
   - `useEffect` 의존성 배열 최적화
   - 에러 발생 시 명시적으로 롤백 처리

3. **모니터링:**
   - Supabase 대시보드에서 활성 세션 확인
   - 주기적으로 "idle in transaction" 세션 정리

