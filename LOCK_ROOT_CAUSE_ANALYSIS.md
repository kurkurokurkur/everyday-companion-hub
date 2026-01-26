# DB 락 근본 원인 분석 - 3가지 시나리오 점검

## 🔍 시나리오 1: 무한 루프 확인

### 현재 코드 분석

```typescript
useEffect(() => {
  // ...
  if (plan !== "pro") {
    // UPDATE 실행
    setHasUpdated(true); // ← 이게 문제!
  }
}, [user, plan]); // ← plan이 의존성에 있음!
```

### ⚠️ 발견된 문제점

**무한 루프 가능성: 높음**

1. **의존성 배열 문제:**
   - `useEffect`가 `[user, plan]`에 의존
   - `plan`은 `AuthContext`에서 가져온 값
   - `profiles` 테이블을 UPDATE하면 `plan`이 변경될 수 있음

2. **실행 흐름:**
   ```
   PaymentSuccess: plan = "free"
   → UPDATE 실행 (plan을 "pro"로 변경)
   → setHasUpdated(true)
   → AuthContext가 profiles를 다시 조회
   → AuthContext: plan = "pro"로 변경
   → PaymentSuccess의 useEffect가 다시 실행됨 (plan이 변경되었으므로)
   → 하지만 updateExecutedRef.current가 true이므로 실행 안 됨
   ```

3. **하지만 잠재적 문제:**
   - `AuthContext`가 `profiles`를 조회하는 동안
   - `PaymentSuccess`가 `profiles`를 UPDATE하려고 시도
   - 두 쿼리가 동시에 실행되면서 락 경합 발생 가능

### 해결 방법

```typescript
// 의존성 배열에서 plan 제거
useEffect(() => {
  // ...
}, [user?.id]); // user.id만 의존성으로 사용
```

---

## 🔍 시나리오 2: API 응답 지연 확인

### 현재 코드 분석

```typescript
// Toss Payments는 클라이언트 사이드에서 처리
await requestTossPayment({ ... });

// 결제 완료 후 PaymentSuccess 페이지로 리다이렉트
// URL 파라미터에서 결제 정보 추출
const orderId = searchParams.get("orderId");
const paymentKey = searchParams.get("paymentKey");
```

### ✅ 확인 결과

**API 응답 지연 문제: 없음**

1. **Toss Payments 처리 방식:**
   - 클라이언트 사이드에서 직접 처리
   - 결제 완료 후 리다이렉트로 정보 전달
   - 서버 사이드 트랜잭션 없음

2. **DB 트랜잭션:**
   - Supabase JS 클라이언트가 각 쿼리를 자동으로 트랜잭션 처리
   - 각 쿼리마다 자동으로 COMMIT
   - 트랜잭션이 열린 채로 남아있을 가능성 낮음

3. **하지만 잠재적 문제:**
   - `Promise.race`로 타임아웃 처리하지만
   - 타임아웃이 발생해도 원래 Promise는 계속 실행 중일 수 있음
   - 이 경우 DB 연결이 계속 열려있을 수 있음

### 해결 방법

```typescript
// 타임아웃 발생 시 원래 Promise 취소 (AbortController 사용)
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 5000);

try {
  const result = await Promise.race([
    supabase.from("profiles").update(...),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error("TIMEOUT")), 5000)
    )
  ]);
} catch (err) {
  // 타임아웃 처리
}
```

---

## 🔍 시나리오 3: Supabase RLS 정책 확인

### 현재 RLS 정책 분석

**profiles 테이블:**
```sql
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
```

**orders 테이블:**
```sql
CREATE POLICY "Users can view own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### ✅ 확인 결과

**RLS 정책 복잡도: 낮음 (문제 없음)**

1. **정책 단순성:**
   - `auth.uid() = id` 또는 `auth.uid() = user_id`만 사용
   - 복잡한 JOIN이나 서브쿼리 없음
   - 인덱스된 컬럼과 직접 비교

2. **성능 영향:**
   - `auth.uid()`는 Supabase가 내부적으로 최적화
   - 인덱스가 있는 컬럼(id, user_id)과 비교하므로 빠름
   - RLS 정책 자체가 락을 유발하지 않음

3. **하지만 잠재적 문제:**
   - RLS 정책이 실행될 때마다 `auth.uid()` 호출
   - 여러 쿼리가 동시에 실행되면 `auth.uid()` 호출이 중복될 수 있음
   - 하지만 이것만으로는 락을 유발하지 않음

### 개선 방안 (선택사항)

```sql
-- 더 명확한 정책 (이미 최적화됨)
-- 추가 개선 불필요
```

---

## 🎯 종합 분석 결과

### 가장 가능성 높은 원인: 시나리오 1 (무한 루프 가능성)

**문제점:**
1. `useEffect`의 의존성 배열에 `plan`이 포함됨
2. `profiles` UPDATE 후 `AuthContext`가 `plan`을 다시 조회
3. `plan`이 변경되면 `useEffect`가 다시 실행될 수 있음
4. 하지만 `updateExecutedRef`로 중복 실행을 방지하고 있음

**하지만:**
- `AuthContext`가 `profiles`를 조회하는 동안
- `PaymentSuccess`가 `profiles`를 UPDATE하려고 시도
- 두 쿼리가 동시에 실행되면서 락 경합 발생 가능

### 해결 방법

1. **의존성 배열 최적화:**
   ```typescript
   useEffect(() => {
     // ...
   }, [user?.id]); // plan 제거
   ```

2. **AuthContext와의 동기화 개선:**
   ```typescript
   // AuthContext가 plan을 업데이트한 후에만 실행
   useEffect(() => {
     // AuthContext의 plan 업데이트 대기
   }, [user?.id, plan]);
   ```

3. **타임아웃 처리 개선:**
   ```typescript
   // AbortController로 타임아웃 시 원래 Promise 취소
   ```

---

## 📊 우선순위별 해결 방안

### 1순위: useEffect 의존성 배열 수정
- `plan`을 의존성에서 제거
- `user.id`만 의존성으로 사용

### 2순위: AuthContext와의 동기화
- `AuthContext`가 `profiles`를 조회하는 동안 대기
- 또는 `AuthContext`의 `plan` 업데이트 완료 후 실행

### 3순위: 타임아웃 처리 개선
- `AbortController`로 타임아웃 시 원래 Promise 취소
- 불필요한 DB 연결 방지

