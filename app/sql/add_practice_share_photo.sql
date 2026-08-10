-- 실습공유에 사진 업로드 기능 추가
-- Supabase 대시보드 > SQL Editor에 붙여넣고 실행하세요.

alter table "실습공유" add column if not exists image_url text;

-- 사진을 저장할 스토리지 버킷 생성 (공개 버킷 - 누구나 열람 가능)
insert into storage.buckets (id, name, public)
values ('practice-share', 'practice-share', true)
on conflict (id) do nothing;

-- 누구나 사진을 열람할 수 있도록 허용
create policy "public read practice-share photos"
on storage.objects for select
using (bucket_id = 'practice-share');

-- 누구나(로그인 없이) 사진을 업로드할 수 있도록 허용 (질문/의견과 동일한 정책)
create policy "public upload practice-share photos"
on storage.objects for insert
with check (bucket_id = 'practice-share');
