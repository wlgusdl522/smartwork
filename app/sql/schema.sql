-- 스마트워크 강의자료 교육 플랫폼 - Supabase(Postgres) 스키마
-- Supabase 대시보드 > SQL Editor에 붙여넣고 실행하세요.
-- 기존 Google Sheet 구조(webapp/Code.gs 참고)를 그대로 옮긴 것입니다.
-- 테이블명은 기존 스프레드시트 시트명과 동일하게 한글로 지었습니다.

-- 참고: 관리자 인증은 스프레드시트 평문 비밀번호 대신 Supabase Auth를 사용합니다.
--       Auth > Users 에서 관리자 계정(이메일/비밀번호) 1개를 직접 만들어주세요.

-- ------------------------------------------------------------------
-- 설정 (싱글턴 - 항상 1행만 존재)
-- ------------------------------------------------------------------
create table "설정" (
  id int primary key default 1 check (id = 1),
  course_name text not null default '',
  instructor_name text not null default '',
  instructor_contact text,
  intro text not null default '',
  education_date date,
  admin_email text,
  period1_title text,
  period1_desc text,
  period2_title text,
  period2_desc text
);

insert into "설정" (id) values (1);

-- ------------------------------------------------------------------
-- 공지사항
-- ------------------------------------------------------------------
create table "공지사항" (
  id bigint generated always as identity primary key,
  title text not null,
  content text not null,
  is_visible boolean not null default true,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------------
-- 교육자료
-- ------------------------------------------------------------------
create table "교육자료" (
  id bigint generated always as identity primary key,
  title text not null,
  description text,
  link text,
  icon text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------------
-- 실습 주제 (예: "상담일지 입력 도구" - 그 안에 프롬프트/코드가 묶여서 표시됨)
-- ------------------------------------------------------------------
create table "실습주제" (
  id bigint generated always as identity primary key,
  title text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

insert into "실습주제" (title, sort_order) values ('기초 예제', 0);

-- ------------------------------------------------------------------
-- 실습자료 (분류 = 'HTML' | 'CSS' | 'JavaScript' | 'AppsScript' | '프롬프트' | '완성본' 등)
-- ------------------------------------------------------------------
create table "실습자료" (
  id bigint generated always as identity primary key,
  topic_id bigint references "실습주제"(id),
  category text not null,
  title text not null,
  description text,
  code text,
  link text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------------
-- AI 도구 모음
-- ------------------------------------------------------------------
create table "AI도구" (
  id bigint generated always as identity primary key,
  name text not null,
  description text,
  link text,
  icon text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------------
-- 참고자료
-- ------------------------------------------------------------------
create table "참고자료" (
  id bigint generated always as identity primary key,
  title text not null,
  description text,
  link text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------------
-- 질문 (공개 게시판)
-- ------------------------------------------------------------------
create extension if not exists pgcrypto;

create table "질문" (
  id bigint generated always as identity primary key,
  content text not null,
  wants_answer boolean not null default false,
  affiliation text,
  name text,
  contact text,
  email text,
  edit_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);

-- 글쓴이 본인 수정/삭제용 (로그인 없이, 브라우저에 저장된 토큰이 일치할 때만 허용)
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

-- ------------------------------------------------------------------
-- 답변 (질문 1개당 답변 1개)
-- ------------------------------------------------------------------
create table "답변" (
  id bigint generated always as identity primary key,
  question_id bigint not null references "질문"(id) on delete cascade unique,
  content text not null,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------------
-- 의견 · 제안
-- ------------------------------------------------------------------
create table "의견" (
  id bigint generated always as identity primary key,
  content text not null,
  affiliation text,
  name text,
  contact text,
  email text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------------
-- 실습 공유 (참여자들이 실습 결과를 자유롭게 공유하는 공간)
-- ------------------------------------------------------------------
create table "실습공유" (
  id bigint generated always as identity primary key,
  name text,
  content text not null,
  link text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------------
-- RLS(Row Level Security) 활성화
-- 공개 열람: 누구나 가능
-- 공개 작성: 질문/의견만 누구나 등록 가능
-- 관리(추가/수정/삭제): 로그인한 관리자만 가능
-- ------------------------------------------------------------------
alter table "설정" enable row level security;
alter table "공지사항" enable row level security;
alter table "교육자료" enable row level security;
alter table "실습주제" enable row level security;
alter table "실습자료" enable row level security;
alter table "AI도구" enable row level security;
alter table "참고자료" enable row level security;
alter table "질문" enable row level security;
alter table "답변" enable row level security;
alter table "의견" enable row level security;
alter table "실습공유" enable row level security;

-- 공개 열람 정책
create policy "public read 설정" on "설정" for select using (true);
create policy "public read 공지사항" on "공지사항" for select using (is_visible = true);
create policy "public read 교육자료" on "교육자료" for select using (true);
create policy "public read 실습주제" on "실습주제" for select using (true);
create policy "public read 실습자료" on "실습자료" for select using (true);
create policy "public read AI도구" on "AI도구" for select using (true);
create policy "public read 참고자료" on "참고자료" for select using (true);
create policy "public read 질문" on "질문" for select using (true);
create policy "public read 답변" on "답변" for select using (true);

-- 공개 작성 정책 (질문하기 / 의견 제안)
create policy "public insert 질문" on "질문" for insert with check (true);
create policy "public insert 의견" on "의견" for insert with check (true);

-- 관리자(로그인 필요) 전체 권한 정책
create policy "admin all 설정" on "설정" for all using (auth.role() = 'authenticated');
create policy "admin all 공지사항" on "공지사항" for all using (auth.role() = 'authenticated');
create policy "admin all 교육자료" on "교육자료" for all using (auth.role() = 'authenticated');
create policy "admin all 실습주제" on "실습주제" for all using (auth.role() = 'authenticated');
create policy "admin all 실습자료" on "실습자료" for all using (auth.role() = 'authenticated');
create policy "admin all AI도구" on "AI도구" for all using (auth.role() = 'authenticated');
create policy "admin all 참고자료" on "참고자료" for all using (auth.role() = 'authenticated');
create policy "admin all 질문" on "질문" for all using (auth.role() = 'authenticated');
create policy "admin all 답변" on "답변" for all using (auth.role() = 'authenticated');
create policy "admin read 의견" on "의견" for select using (auth.role() = 'authenticated');
create policy "admin all 의견" on "의견" for all using (auth.role() = 'authenticated');

create policy "public read 실습공유" on "실습공유" for select using (true);
create policy "public insert 실습공유" on "실습공유" for insert with check (true);
create policy "admin all 실습공유" on "실습공유" for all using (auth.role() = 'authenticated');
