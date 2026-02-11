-- ============================================
-- 채팅 메시지 테이블 생성 스크립트
-- Supabase 대시보드 → SQL Editor에서 실행하세요
-- ============================================

-- ============================================
-- 1. Chat Messages 테이블 생성
-- ============================================
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  sender text NOT NULL CHECK (sender IN ('user', 'bot')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS chat_messages_user_id_idx ON public.chat_messages(user_id);
CREATE INDEX IF NOT EXISTS chat_messages_created_at_idx ON public.chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS chat_messages_user_created_idx ON public.chat_messages(user_id, created_at DESC);

-- RLS 활성화
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 모든 사용자가 메시지를 읽을 수 있음 (공개 채팅)
DROP POLICY IF EXISTS "Anyone can view chat messages" ON public.chat_messages;
CREATE POLICY "Anyone can view chat messages"
  ON public.chat_messages FOR SELECT
  USING (true);

-- RLS 정책: 모든 사용자가 메시지를 추가할 수 있음
DROP POLICY IF EXISTS "Anyone can insert chat messages" ON public.chat_messages;
CREATE POLICY "Anyone can insert chat messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (true);

-- ============================================
-- 검증 쿼리
-- ============================================
SELECT 
  '채팅 메시지 테이블 생성 확인' as check_type,
  table_name,
  CASE 
    WHEN table_name = 'chat_messages' THEN '✅'
    ELSE '❌'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name = 'chat_messages';

-- RLS 정책 확인
SELECT 
  'RLS 정책 확인' as check_type,
  tablename,
  policyname,
  cmd,
  CASE 
    WHEN cmd IN ('SELECT', 'INSERT') THEN '✅'
    ELSE '❌'
  END as status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'chat_messages'
ORDER BY cmd;
