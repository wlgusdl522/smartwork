-- 실습자료에 링크 필드 추가 (스프레드시트 "사본 만들기" 링크 등)
-- Supabase SQL Editor에서 한 번 실행하세요.

alter table "실습자료" add column if not exists link text;
