-- 설정 테이블에 강사 연락처(전화번호) 필드 추가
-- Supabase SQL Editor에서 한 번 실행하세요.

alter table "설정" add column if not exists instructor_contact text;
