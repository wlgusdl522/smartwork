-- 질문 게시판에 "글쓴이 본인 수정/삭제" 기능을 추가합니다.
-- 로그인 시스템이 없는 익명 게시판이라, 등록 시 브라우저에만 저장되는 비밀 토큰을 발급하고
-- 그 토큰이 정확히 일치할 때만 수정/삭제가 되도록 서버에서 검증합니다.
-- Supabase SQL Editor에서 한 번 실행하세요.

create extension if not exists pgcrypto;

alter table "질문" add column if not exists edit_token uuid not null default gen_random_uuid();

-- 본인 삭제: 토큰이 일치하는 경우에만 삭제됨 (관리자 권한 없이도 안전하게 동작)
create or replace function delete_own_question(q_id bigint, token uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from "질문" where id = q_id and edit_token = token;
  return found;
end;
$$;

-- 본인 수정: 토큰이 일치하는 경우에만 질문 내용 수정됨
create or replace function update_own_question(q_id bigint, token uuid, new_content text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update "질문" set content = new_content where id = q_id and edit_token = token;
  return found;
end;
$$;

grant execute on function delete_own_question(bigint, uuid) to anon, authenticated;
grant execute on function update_own_question(bigint, uuid, text) to anon, authenticated;
