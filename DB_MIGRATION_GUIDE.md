# DB 변경 후 설정 가이드

## 🔧 새로운 DB 정보 입력 방법

### 방법 1: 코드에 직접 입력 (빠른 방법)

`src/lib/supabase.ts` 파일을 열고 다음 정보를 업데이트하세요:

```typescript
export const SUPABASE_URL = "새로운_Supabase_URL";
export const SUPABASE_ANON_KEY = "새로운_ANON_KEY";
```

### 방법 2: 환경 변수 사용 (권장)

1. 프로젝트 루트에 `.env` 파일 생성:
```env
VITE_SUPABASE_URL=새로운_Supabase_URL
VITE_SUPABASE_ANON_KEY=새로운_ANON_KEY
```

2. `src/lib/supabase.ts` 수정:
```typescript
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
```

## 📋 새로운 DB에 필요한 설정

### 1. 테이블 생성

Supabase 대시보드 → SQL Editor에서 `supabase/init_database.sql` 파일 내용을 실행하세요.

이 스크립트는 다음을 생성합니다:
- ✅ `profiles` 테이블
- ✅ `todos` 테이블  
- ✅ `orders` 테이블
- ✅ RLS 정책
- ✅ 트리거 함수

### 2. 확인 사항

새로운 DB에서 다음을 확인하세요:

1. **테이블 존재 확인:**
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('profiles', 'todos', 'orders');
```

2. **RLS 정책 확인:**
```sql
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('profiles', 'todos', 'orders');
```

3. **인덱스 확인:**
```sql
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'todos', 'orders');
```

## ⚠️ 주의사항

1. **기존 세션 초기화:**
   - 브라우저의 로컬 스토리지/세션 스토리지 클리어
   - 또는 `resetSupabase()` 함수 호출

2. **인증 정보:**
   - 새로운 DB에서는 기존 사용자 정보가 없을 수 있음
   - 새로 회원가입이 필요할 수 있음

3. **데이터 마이그레이션:**
   - 기존 데이터가 있다면 백업 후 마이그레이션 필요

