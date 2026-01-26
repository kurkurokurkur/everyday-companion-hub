# 데이터베이스 설정 가이드

이 가이드는 Supabase 데이터베이스를 초기화하고 구성하는 방법을 설명합니다.

## 📋 목차

1. [초기 설정](#초기-설정)
2. [데이터베이스 초기화](#데이터베이스-초기화)
3. [데이터베이스 재구성](#데이터베이스-재구성)
4. [테이블 구조](#테이블-구조)
5. [문제 해결](#문제-해결)

## 🚀 초기 설정

### 1. Supabase 프로젝트 생성

1. [Supabase](https://supabase.com)에 로그인
2. 새 프로젝트 생성
3. 프로젝트 URL과 API 키 확인

### 2. 환경 변수 설정

프로젝트 루트에 `.env` 파일 생성:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## 🗄️ 데이터베이스 초기화

### 방법 1: 새로 시작 (권장)

처음 설정하거나 완전히 새로 시작하는 경우:

1. Supabase 대시보드 → SQL Editor 열기
2. `init_database.sql` 파일 내용 복사
3. SQL Editor에 붙여넣기
4. 실행 버튼 클릭

이 스크립트는 다음을 수행합니다:
- ✅ 필요한 확장 프로그램 설치
- ✅ 모든 테이블 생성 (profiles, todos, orders)
- ✅ 인덱스 생성
- ✅ RLS 정책 설정
- ✅ 트리거 함수 생성

### 방법 2: 기존 데이터 유지

기존 데이터를 보존하면서 스키마만 업데이트:

1. `init_database.sql` 파일 열기
2. "기존 테이블 및 정책 정리" 섹션 주석 처리
3. SQL Editor에서 실행

## 🔄 데이터베이스 재구성

모든 데이터를 삭제하고 처음부터 다시 시작:

1. **⚠️ 중요: 데이터 백업**
   ```sql
   -- 각 테이블 데이터 백업 (선택사항)
   SELECT * FROM public.profiles;
   SELECT * FROM public.todos;
   SELECT * FROM public.orders;
   ```

2. `reset_database.sql` 파일 내용 실행
3. `init_database.sql` 파일 내용 실행

## 📊 테이블 구조

### 1. Profiles (사용자 프로필)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | 사용자 ID (auth.users 참조) |
| email | text | 이메일 |
| display_name | text | 표시 이름 |
| plan | text | 플랜 ('free' 또는 'pro') |
| created_at | timestamptz | 생성일시 |
| updated_at | timestamptz | 수정일시 |

**RLS 정책:**
- 사용자는 자신의 프로필만 조회/수정 가능

### 2. Todos (할 일 목록)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | 할 일 ID |
| user_id | uuid | 사용자 ID |
| task | text | 할 일 내용 |
| is_completed | boolean | 완료 여부 |
| due_date | date | 마감일 |
| created_at | timestamptz | 생성일시 |
| updated_at | timestamptz | 수정일시 |

**RLS 정책:**
- 사용자는 자신의 할 일만 조회/추가/수정/삭제 가능

**인덱스:**
- user_id
- due_date
- user_id + due_date (복합)
- is_completed (부분 인덱스)

### 3. Orders (결제 내역)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | 주문 ID |
| user_id | uuid | 사용자 ID |
| order_id | text | 주문 번호 (고유) |
| payment_key | text | 결제 키 |
| amount | numeric(12,2) | 결제 금액 |
| order_name | text | 주문명 |
| status | text | 상태 ('pending', 'paid', 'failed', 'cancelled', 'refunded') |
| created_at | timestamptz | 생성일시 |
| updated_at | timestamptz | 수정일시 |

**RLS 정책:**
- 사용자는 자신의 주문만 조회/추가/수정 가능

**인덱스:**
- user_id
- order_id (고유)
- payment_key
- status
- created_at (내림차순)

## 🔧 문제 해결

### RLS 정책이 작동하지 않음

1. RLS가 활성화되어 있는지 확인:
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public';
   ```

2. 정책이 올바르게 생성되었는지 확인:
   ```sql
   SELECT * FROM pg_policies 
   WHERE schemaname = 'public';
   ```

3. 사용자가 인증되었는지 확인:
   ```sql
   SELECT auth.uid();
   ```

### 테이블이 생성되지 않음

1. 권한 확인:
   - Supabase 대시보드에서 올바른 프로젝트에 로그인했는지 확인
   - SQL Editor에서 실행 권한이 있는지 확인

2. 에러 메시지 확인:
   - SQL Editor 하단의 에러 메시지 확인
   - 구문 오류나 제약 조건 위반 확인

### 트리거가 작동하지 않음

1. 트리거 존재 확인:
   ```sql
   SELECT * FROM pg_trigger 
   WHERE tgname LIKE '%user%' OR tgname LIKE '%updated%';
   ```

2. 함수 존재 확인:
   ```sql
   SELECT * FROM pg_proc 
   WHERE proname IN ('handle_new_user', 'update_updated_at_column');
   ```

### 데이터가 보이지 않음

1. RLS 정책 확인:
   - 사용자가 인증되었는지 확인
   - 정책이 올바르게 설정되었는지 확인

2. 쿼리 확인:
   - user_id가 올바른지 확인
   - 필터 조건이 올바른지 확인

## 📝 추가 참고사항

### 성능 최적화

- 인덱스는 자주 조회되는 컬럼에 생성되어 있습니다
- 복합 인덱스는 자주 함께 사용되는 컬럼에 생성되어 있습니다
- 부분 인덱스는 특정 조건의 데이터만 인덱싱합니다

### 보안

- 모든 테이블에 RLS가 활성화되어 있습니다
- 사용자는 자신의 데이터만 접근할 수 있습니다
- 관리자 권한이 필요한 작업은 Supabase 대시보드에서 수행하세요

### 백업

정기적으로 데이터를 백업하세요:

```sql
-- 백업 예시 (Supabase 대시보드에서 실행)
COPY public.profiles TO '/tmp/profiles_backup.csv' CSV HEADER;
COPY public.todos TO '/tmp/todos_backup.csv' CSV HEADER;
COPY public.orders TO '/tmp/orders_backup.csv' CSV HEADER;
```

## 🆘 도움이 필요하신가요?

문제가 지속되면:
1. Supabase 문서 확인: https://supabase.com/docs
2. SQL Editor의 에러 메시지 확인
3. 프로젝트 이슈 트래커에 문제 보고

