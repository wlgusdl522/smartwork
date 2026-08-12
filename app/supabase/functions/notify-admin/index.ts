// 질문 또는 의견이 새로 등록되면 관리자(kwonzihyun@sdmsenior.or.kr)에게 이메일로 알림을 보내는 Supabase Edge Function.
//
// 설치 방법
// 1) Supabase 대시보드 > Edge Functions > Create a new function, 이름은 notify-admin 으로 만들고 이 파일 내용을 붙여넣어 Deploy 합니다.
// 2) 같은 화면(또는 Project Settings > Edge Functions > Secrets)에서 아래 비밀값을 등록합니다.
//      GMAIL_USER = kwonzihyun@sdmsenior.or.kr
//      GMAIL_APP_PASSWORD = (구글 계정 2단계 인증 후 myaccount.google.com/apppasswords 에서 발급받은 16자리 앱 비밀번호, 공백 없이)
// 3) Database > Extensions 에서 pg_net을 활성화하고, app/sql/add_notify_triggers.sql 을 SQL Editor에서 실행합니다.
//    (질문/의견 테이블에 insert가 생기면 pg_net이 이 함수를 직접 호출하는 트리거가 만들어집니다.)

import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const GMAIL_USER = Deno.env.get("GMAIL_USER")!;
const GMAIL_APP_PASSWORD = Deno.env.get("GMAIL_APP_PASSWORD")!;
const NOTIFY_TO = Deno.env.get("NOTIFY_TO") || GMAIL_USER;

// 메일 제목에 한글 등 non-ASCII가 있으면 RFC 2047 형식으로 인코딩해야 깨지지 않습니다.
function encodeSubject(subject: string): string {
  const bytes = new TextEncoder().encode(subject);
  const base64 = btoa(String.fromCharCode(...bytes));
  return `=?UTF-8?B?${base64}?=`;
}

function buildEmail(table: string, record: Record<string, unknown>) {
  if (table === "질문") {
    const wantsAnswer = record.wants_answer ? "예" : "아니오";
    const contact = record.wants_answer
      ? `\n소속: ${record.affiliation ?? ""}\n이름: ${record.name ?? ""}\n연락처: ${record.contact ?? ""}\n이메일: ${record.email ?? ""}`
      : "";
    return {
      subject: "[스마트워크 강의] 새 질문이 등록되었습니다",
      text: `질문 내용:\n${record.content}\n\n개별 답변 요청: ${wantsAnswer}${contact}`,
    };
  }
  return {
    subject: "[스마트워크 강의] 새 의견이 등록되었습니다",
    text: `의견 내용:\n${record.content}\n\n소속: ${record.affiliation ?? ""}\n이름: ${record.name ?? ""}\n연락처: ${record.contact ?? ""}\n이메일: ${record.email ?? ""}`,
  };
}

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const table = payload.table;
    const record = payload.record;
    if (!record || (table !== "질문" && table !== "의견")) {
      return new Response("ignored", { status: 200 });
    }

    const { subject, text } = buildEmail(table, record);

    const client = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 465,
        tls: true,
        auth: { username: GMAIL_USER, password: GMAIL_APP_PASSWORD },
      },
    });

    await client.send({
      from: GMAIL_USER,
      to: NOTIFY_TO,
      subject: encodeSubject(subject),
      content: text,
    });
    await client.close();

    return new Response("sent", { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(`error: ${err instanceof Error ? err.message : String(err)}`, { status: 500 });
  }
});
