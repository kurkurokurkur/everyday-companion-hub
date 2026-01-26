# 결제 시 DB 먹통 문제 - 실제 원인 분석

## 🔍 문제 원인

결제 성공 페이지(`PaymentSuccess.tsx`) 자체는 **DB를 사용하지 않습니다**. 하지만:

### 실제 원인: AuthContext의 자동 profiles 조회

결제 성공 페이지로 이동하면:
1. **AuthContext가 자동으로 초기화됨**
2. **`initAuth()` 함수 실행** → `profiles` 테이블 SELECT (52-56줄)
3. **`onAuthStateChange` 이벤트 발생** → `profiles` 테이블 SELECT (107-111줄)

만약 이전에 다른 곳에서 DB 락이 걸려있다면:
- AuthContext의 SELECT 쿼리가 무한 대기
- 결제 성공 페이지가 로딩 중 상태로 멈춤
- 전체 앱이 느려지거나 먹통이 됨

## ✅ 해결 방법

### 1. AuthContext에 타임아웃 추가 (완료)

**변경 사항:**
- `profiles` 조회에 3초 타임아웃 추가
- 타임아웃 발생 시 기본값(`free`) 사용
- 에러 발생 시에도 기본값 사용하여 앱이 멈추지 않도록 함

**효과:**
- DB 락이 걸려있어도 3초 후 타임아웃되어 앱이 멈추지 않음
- 사용자는 결제 성공 페이지를 정상적으로 볼 수 있음

### 2. 즉시 해결: 기존 락 해제

Supabase 대시보드 → SQL Editor에서 실행:

```sql
-- 모든 "idle in transaction" 세션 강제 종료
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle in transaction'
  AND datname = current_database()
  AND pid != pg_backend_pid();
```

또는 `supabase/emergency_unlock.sql` 파일 실행

## 📊 문제 흐름도

```
사용자가 결제 완료
    ↓
/payment/success 페이지로 이동
    ↓
AuthContext 자동 초기화
    ↓
initAuth() 실행 → profiles SELECT 쿼리
    ↓
[DB 락이 걸려있으면]
    ↓
SELECT 쿼리가 무한 대기
    ↓
결제 성공 페이지가 로딩 중 상태로 멈춤
    ↓
전체 앱이 느려지거나 먹통
```

## 🔧 개선된 흐름

```
사용자가 결제 완료
    ↓
/payment/success 페이지로 이동
    ↓
AuthContext 자동 초기화
    ↓
initAuth() 실행 → profiles SELECT 쿼리 (타임아웃: 3초)
    ↓
[DB 락이 걸려있으면]
    ↓
3초 후 타임아웃 → 기본값(free) 사용
    ↓
결제 성공 페이지 정상 표시 ✅
```

## 💡 추가 권장 사항

1. **주기적으로 락 확인**: Supabase 대시보드에서 "idle in transaction" 세션 정리
2. **에러 모니터링**: 콘솔에서 "프로필 조회 타임아웃" 경고 확인
3. **DB 최적화**: 필요시 인덱스 추가 및 쿼리 최적화

