# SELECT 타임아웃 문제 분석 결과

## 🔍 코드 분석 결과

### 1. PaymentSuccess.tsx에서 실행되는 쿼리

**SELECT 쿼리 (73-77줄):**
```typescript
const selectPromise = supabase
  .from("profiles")
  .select("plan")
  .eq("id", user.id)
  .single();
```

**UPDATE 쿼리 (139-142줄):**
```typescript
const updatePromise = supabase
  .from("profiles")
  .update({ plan: "pro" })
  .eq("id", user.id);
```

### 2. 결제 처리 API 확인 결과

✅ **결제 처리 API 없음**: 
- Toss Payments SDK를 클라이언트에서 직접 사용
- 결제 완료 후 PaymentSuccess 페이지로 리다이렉트
- 서버 사이드 트랜잭션 누수 가능성 **없음**

### 3. profiles 테이블을 사용하는 모든 위치

1. **PaymentSuccess.tsx**: SELECT + UPDATE
2. **AuthContext.tsx**: SELECT (2곳 - initAuth, onAuthStateChange)
3. **MyPage.tsx**: SELECT (display_name만)
4. **supabase.ts**: SELECT (연결 확인용)

### 4. 명시적 트랜잭션 사용 여부

✅ **명시적 트랜잭션 없음**:
- `BEGIN`, `COMMIT`, `ROLLBACK` 사용 없음
- `supabase.rpc()` 사용 없음
- Supabase JS 클라이언트가 각 쿼리를 자동 트랜잭션 처리

### 5. 동시 실행 가능성

⚠️ **잠재적 문제점**:
- **AuthContext**와 **PaymentSuccess**가 동시에 SELECT 실행 가능
- 하지만 SELECT는 락을 걸지 않으므로 이것만으로는 문제가 되지 않음

## 🎯 SELECT 타임아웃의 근본 원인

### 가능한 원인 1: DB 락 문제 (가장 가능성 높음)

**증상**: SELECT가 5초 이상 대기
**원인**: 다른 세션이 `profiles` 테이블의 해당 행에 락을 걸고 있음

**확인 방법**:
```sql
-- Supabase SQL Editor에서 실행
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
  AND NOT l.granted  -- 락을 기다리는 중인 쿼리
ORDER BY a.query_start;
```

### 가능한 원인 2: RLS 정책 복잡도

**확인 사항**:
- RLS 정책이 복잡하면 SELECT가 느려질 수 있음
- 하지만 현재 RLS 정책은 단순함 (`auth.uid() = user_id`)

### 가능한 원인 3: 인덱스 문제

**확인 사항**:
- `profiles` 테이블의 `id`는 PRIMARY KEY이므로 인덱스 자동 생성됨
- 인덱스 문제 가능성 **낮음**

### 가능한 원인 4: Supabase 서버 문제

**확인 사항**:
- Supabase 프로젝트가 일시 중지되었는지 확인
- Supabase 상태 페이지 확인

## 🔧 해결 방안

### 즉시 조치 (DB 락 해제)

```sql
-- 1초 이상 'idle in transaction' 상태인 모든 세션 강제 종료
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle in transaction'
  AND state_change < now() - interval '1 second'
  AND pid != pg_backend_pid();
```

### 코드 개선 방안

#### 1. SELECT 쿼리 최적화

현재 코드는 이미 최적화되어 있음:
- `.eq("id", user.id)` - PRIMARY KEY 사용
- `.single()` - 단일 행만 조회

#### 2. 에러 처리 개선

현재 코드는 이미 타임아웃과 에러 처리가 잘 되어 있음.

#### 3. 재시도 로직 추가 (선택사항)

타임아웃 발생 시 자동 재시도 로직을 추가할 수 있음:

```typescript
const MAX_RETRIES = 3;
let retryCount = 0;

while (retryCount < MAX_RETRIES) {
  try {
    const result = await Promise.race([selectPromise, selectTimeout]);
    if (!result.error) break;
    retryCount++;
    await new Promise(resolve => setTimeout(resolve, 1000)); // 1초 대기 후 재시도
  } catch (err) {
    retryCount++;
  }
}
```

## 📊 결론

1. **코드 레벨에서는 문제 없음**: 명시적 트랜잭션 누수 없음
2. **DB 락 문제 가능성 높음**: Supabase 서버 측에서 "idle in transaction" 세션이 존재할 가능성
3. **즉시 조치**: SQL Editor에서 락 해제 쿼리 실행
4. **장기 해결**: Supabase 대시보드에서 주기적으로 락 확인 및 정리

## 🔍 추가 확인 사항

1. **Supabase 대시보드**:
   - 프로젝트 상태 확인
   - Database → Connection Pooling 설정 확인

2. **네트워크**:
   - 브라우저 개발자 도구 → Network 탭에서 요청 상태 확인
   - 요청이 실제로 전송되는지, 타임아웃되는지 확인

3. **로그 확인**:
   - Supabase 대시보드 → Logs에서 에러 로그 확인

