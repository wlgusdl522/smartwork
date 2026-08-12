-- 질문/의견이 새로 등록되면 notify-admin Edge Function을 호출해 관리자에게 이메일을 보내는 트리거
-- 반드시 pg_net 확장을 먼저 활성화한 뒤(Database > Extensions) 실행하세요.
-- Supabase 대시보드 > SQL Editor에 붙여넣고 실행하세요.

create or replace function notify_admin_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform net.http_post(
    url := 'https://gaivwuzeafxeecgcidfr.supabase.co/functions/v1/notify-admin',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhaXZ3dXplYWZ4ZWVjZ2NpZGZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxMTMyNjMsImV4cCI6MjEwMDY4OTI2M30.Nu7pYV9tvqZjReppD7MAzgGaRs2XDmZ_xmEQ5zvnUJA'
    ),
    body := jsonb_build_object(
      'table', TG_TABLE_NAME,
      'record', row_to_json(NEW)
    )
  );
  return NEW;
end;
$$;

drop trigger if exists notify_question_insert on "질문";
create trigger notify_question_insert
after insert on "질문"
for each row execute function notify_admin_trigger();

drop trigger if exists notify_feedback_insert on "의견";
create trigger notify_feedback_insert
after insert on "의견"
for each row execute function notify_admin_trigger();
