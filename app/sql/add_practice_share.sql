-- 실습 공유 게시판 추가 (참여자들이 실습 결과를 자유롭게 공유하는 공간)
-- Supabase SQL Editor에서 한 번 실행하세요.

create table "실습공유" (
  id bigint generated always as identity primary key,
  name text,
  content text not null,
  link text,
  created_at timestamptz not null default now()
);

alter table "실습공유" enable row level security;

create policy "public read 실습공유" on "실습공유" for select using (true);
create policy "public insert 실습공유" on "실습공유" for insert with check (true);
create policy "admin all 실습공유" on "실습공유" for all using (auth.role() = 'authenticated');
