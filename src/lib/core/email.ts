// 메일 발송.
//
// Cloudflare Email Service(`send_email` 바인딩)를 쓴다 — 외부 ESP 계정도 API 키도 없다.
// ⚠️ Email **Routing**과 헷갈리지 마라. Routing은 수신 전용이고, 임의 주소로 보내려면
//    Email Service + Workers 유료 플랜이어야 한다(무료 플랜은 인증된 내 주소로만 나간다).
// ⚠️ **마케팅·구독 메일을 붙이지 마라.** 로그인 메일이 막히면 아무도 못 들어오는데,
//    같은 도메인으로 광고를 뿌리다 스팸 신고를 맞으면 로그인까지 같이 죽는다.
//    나가는 건 셋뿐이다 — 로그인 코드 · 창구 접수 알림(운영자에게) · 처리 결과(보낸 사람에게).
//    셋 다 **상대가 먼저 행동해서 생기는 1:1 메일**이라 스팸 신고가 붙지 않는다.
//    수신자 목록을 만들거나 같은 메일을 여러 명에게 보내는 순간 이 선을 넘는 것이다.

import { env } from "./db/client";

interface Mail {
  to: string;
  subject: string;
  text: string;
}

// ⚠️ 실패를 삼키지 않는다. 코드가 안 갔는데 화면이 "보냈습니다"를 띄우면
//    사용자는 오지 않는 메일을 하염없이 기다린다.
export async function sendMail(m: Mail): Promise<void> {
  const e = env();

  // 로컬엔 바인딩이 없다. 콘솔에 찍어서 개발 중에도 로그인이 되게 한다.
  // 프로덕션 번들에서 통째로 사라진다(hooks.server.ts의 dev 우회와 같은 장치).
  if (import.meta.env.DEV && !e.EMAIL) {
    console.log(`\n[메일 → ${m.to}] ${m.subject}\n${m.text}\n`);
    return;
  }
  if (!e.EMAIL) throw new Error("EMAIL 바인딩 없음 — 메일을 보낼 수 없다");

  await e.EMAIL.send({
    to: m.to,
    from: e.MAIL_FROM ?? "AI 슬롭 <login@aislop.kr>",
    subject: m.subject,
    text: m.text,
  });
}

// 창구 알림. ⚠️ `sendMail`과 달리 **실패를 삼킨다.** 정정 요청은 이미 DB에 들어간
// 뒤라, 알림이 안 갔다고 500을 던지면 보낸 사람은 접수된 걸 접수 안 된 줄 안다.
// 로그인 코드는 반대다 — 메일이 곧 결과물이라 실패를 그대로 던져야 한다.
export async function notify(m: Mail): Promise<void> {
  try {
    await sendMail(m);
  } catch (e) {
    console.error("[알림 메일 실패]", m.to, m.subject, e);
  }
}

// 운영자 수신함. 없으면 알림을 조용히 건너뛴다 — 접수 자체는 이미 끝났다.
export function adminEmail(): string | null {
  return env().ADMIN_EMAIL ?? null;
}
