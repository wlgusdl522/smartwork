-- 실습자료에 "실습 주제" 개념을 별도 테이블로 추가합니다.
-- (텍스트로 직접 입력하는 대신, 주제를 목록으로 관리하고 드롭다운으로 선택하는 방식)
-- Supabase SQL Editor에서 한 번 실행하세요.

create table "실습주제" (
  id bigint generated always as identity primary key,
  title text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table "실습주제" enable row level security;

create policy "public read 실습주제" on "실습주제" for select using (true);
create policy "admin all 실습주제" on "실습주제" for all using (auth.role() = 'authenticated');

-- 기존 실습자료 항목들을 담을 기본 주제
insert into "실습주제" (title, sort_order) values ('기초 예제', 0);

-- 실습자료에 주제 연결 컬럼 추가 (기존 항목은 전부 "기초 예제"로 연결)
alter table "실습자료" add column if not exists topic_id bigint references "실습주제"(id);
update "실습자료" set topic_id = (select id from "실습주제" where title = '기초 예제' limit 1) where topic_id is null;
