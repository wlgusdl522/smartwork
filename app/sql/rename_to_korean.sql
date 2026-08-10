-- 이미 schema.sql을 실행한 프로젝트의 테이블명을 한글로 변경합니다.
-- Supabase SQL Editor에서 한 번만 실행하세요.
-- (RLS 정책과 외래키는 테이블 내부 ID로 연결되어 있어 이름을 바꿔도 그대로 유지됩니다.)

alter table settings rename to "설정";
alter table notices rename to "공지사항";
alter table materials rename to "교육자료";
alter table practice_items rename to "실습자료";
alter table ai_tools rename to "AI도구";
alter table resources rename to "참고자료";
alter table questions rename to "질문";
alter table answers rename to "답변";
alter table feedback rename to "의견";
