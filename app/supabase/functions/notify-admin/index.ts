// 질문 또는 의견이 새로 등록되면 관리자(kwonzihyun@sdmsenior.or.kr)에게 이메일로 알림을 보내는 Supabase Edge Function.
// Resend(https://resend.com) API로 메일을 보냅니다 - JSON으로 보내면 인코딩은 Resend가 알아서 처리해줍니다.
//
// 설치 방법
// 1) Supabase 대시보드 > Edge Functions > notify-admin 함수 코드를 이 파일 내용으로 교체하고 Deploy 합니다.
// 2) 같은 화면(또는 Project Settings > Edge Functions > Secrets)에서 아래 비밀값을 등록합니다.
//      RESEND_API_KEY = (resend.com에서 발급받은 API 키, re_ 로 시작)
// 3) Database > Extensions 에서 pg_net을 활성화하고, app/sql/add_notify_triggers.sql 을 SQL Editor에서 실행합니다.
//    (질문/의견 테이블에 insert가 생기면 pg_net이 이 함수를 직접 호출하는 트리거가 만들어집니다.)

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const NOTIFY_TO = Deno.env.get("NOTIFY_TO") || "kwonzihyun@sdmsenior.or.kr";
const FROM_ADDRESS = "SmartWork 알림 <onboarding@resend.dev>";

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

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [NOTIFY_TO],
        subject,
        text,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Resend error:", errText);
      return new Response(`resend error: ${errText}`, { status: 500 });
    }

    return new Response("sent", { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(`error: ${err instanceof Error ? err.message : String(err)}`, { status: 500 });
  }
});
