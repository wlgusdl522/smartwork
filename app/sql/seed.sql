-- 예시 데이터 (schema.sql 실행 후, 선택적으로 실행하세요)
-- 실제 강의 내용에 맞게 admin.html에서 수정/삭제하면 됩니다.

update "설정" set
  course_name = '스마트워크, 마음을 얻다 - AI 바이브코딩 실습 (예시, 수정하세요)',
  instructor_name = '권지현',
  intro = '사회복지사 보수교육 - 조직 구성원의 마음을 여는 스마트워크 강의와 AI 바이브코딩 실습을 함께 진행합니다.',
  education_date = '2026-08-01',
  admin_email = 'kwonzihyun@sdmsenior.or.kr',
  period1_title = '1교시. 마음 얻기',
  period1_desc = '스마트워크가 와닿지 않는 조직구성원들의 마음 얻기',
  period2_title = '2교시. 바이브코딩 실습',
  period2_desc = 'AI와 함께 코드를 만들어보는 바이브코딩 입문 실습'
where id = 1;

insert into "공지사항" (title, content, is_visible) values
  ('환영합니다', '이 페이지에서 강의자료, 실습자료, 질문 게시판을 모두 확인할 수 있습니다.', true),
  ('실습 준비물 안내', '2교시 실습을 위해 노트북과 구글 계정을 준비해주세요.', true);

insert into "교육자료" (title, description, link, icon, sort_order) values
  ('1교시 강의자료 (PPT)', '스마트워크가 와닿지 않는 조직구성원의 마음 얻기 - 예시 링크, 실제 파일로 교체하세요', 'https://example.com/lecture1.pptx', '📊', 1),
  ('2교시 강의자료 (구글 슬라이드)', 'AI 바이브코딩 실습 슬라이드 - 예시 링크', 'https://docs.google.com/presentation/', '📽️', 2),
  ('강의 참고 유튜브', '바이브코딩이란 무엇인가 - 예시 링크', 'https://www.youtube.com/', '▶️', 3),
  ('PDF 요약자료', '핵심 요약 PDF - 예시 링크', 'https://example.com/summary.pdf', '📄', 4);

insert into "실습자료" (category, title, description, code, sort_order) values
  ('HTML', '버튼 만들기', '클릭하면 알림이 뜨는 버튼 예제', '<button onclick="alert(''안녕하세요!'')">눌러보세요</button>', 1),
  ('CSS', '카드 스타일', '깔끔한 카드 UI 스타일 예제', '.card {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,.08);
  padding: 16px;
}', 2),
  ('JavaScript', '클립보드 복사', '텍스트를 클립보드로 복사하는 예제', 'function copyText(text) {
  navigator.clipboard.writeText(text);
  alert("복사되었습니다!");
}', 3),
  ('프롬프트', '사업계획서 작성', 'AI에게 사업계획서 초안을 요청하는 프롬프트', '너는 사회복지기관의 사업계획서 작성을 돕는 전문가야. 아래 사업 개요를 바탕으로 목적, 필요성, 추진내용, 기대효과가 포함된 사업계획서 초안을 작성해줘.
[사업 개요: ]', 4),
  ('프롬프트', '상담일지 작성', 'AI에게 상담일지 요약을 요청하는 프롬프트', '아래 상담 내용을 바탕으로 사회복지 상담일지 형식(상담목적, 상담내용 요약, 개입계획)으로 정리해줘.
[상담 내용: ]', 5),
  ('완성본', '오늘 실습 완성본 안내', '2교시 실습이 끝난 뒤 완성된 예제 코드는 이 항목에 채워집니다 (강의 후 업데이트 예정)', '// 실습 종료 후 이곳에 완성 코드를 추가하세요', 6);

insert into "AI도구" (name, description, link, icon, sort_order) values
  ('ChatGPT', '대화형 AI로 글쓰기, 코드 작성, 아이디어 정리에 활용', 'https://chatgpt.com', '💬', 1),
  ('Gemini', '구글의 생성형 AI, 구글 문서/워크스페이스 연동에 강점', 'https://gemini.google.com', '✨', 2),
  ('Claude', '안전하고 정교한 답변에 강점을 가진 AI, 이 웹앱 개발에도 활용', 'https://claude.ai', '🧠', 3),
  ('NotebookLM', '자료를 업로드하면 요약/정리/오디오 요약까지 지원', 'https://notebooklm.google', '📓', 4),
  ('Google AI Studio', '구글 AI 모델을 실험하고 프롬프트를 테스트하는 도구', 'https://aistudio.google.com', '🧪', 5),
  ('Gamma', '프롬프트만으로 발표자료(PPT)를 자동 생성', 'https://gamma.app', '🎯', 6),
  ('Perplexity', 'AI 기반 검색으로 출처와 함께 답변 제공', 'https://www.perplexity.ai', '🔎', 7);

insert into "참고자료" (title, description, link, sort_order) values
  ('GitHub', '코드를 저장하고 협업하는 대표적인 개발 플랫폼', 'https://github.com', 1),
  ('Supabase 공식 문서', 'Postgres 기반 백엔드 서비스(DB/인증/Edge Functions) 레퍼런스', 'https://supabase.com/docs', 2),
  ('MDN - HTML/CSS/JS', '웹 표준 기술의 공식 문서 (모질라)', 'https://developer.mozilla.org', 3),
  ('Vercel 공식 문서', '정적 사이트 배포 플랫폼 사용법', 'https://vercel.com/docs', 4),
  ('Model Context Protocol (MCP)', 'AI가 외부 도구/데이터와 연결되는 개방형 표준', 'https://modelcontextprotocol.io', 5),
  ('OpenAI API 문서', 'OpenAI 모델을 API로 활용하는 방법', 'https://platform.openai.com/docs', 6);
