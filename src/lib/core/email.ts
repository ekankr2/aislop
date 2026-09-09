// 메일 발송. 지금 보내는 메일은 **로그인 코드 하나뿐**이다.
//
// Cloudflare Email Service(`send_email` 바인딩)를 쓴다 — 외부 ESP 계정도 API 키도 없다.
// ⚠️ Email **Routing**과 헷갈리지 마라. Routing은 수신 전용이고, 임의 주소로 보내려면
//    Email Service + Workers 유료 플랜이어야 한다(무료 플랜은 인증된 내 주소로만 나간다).
// ⚠️ 마케팅·알림 메일을 여기에 붙이지 마라. 로그인 메일이 막히면 아무도 못 들어오는데,
//    같은 도메인으로 알림을 뿌리다 스팸 신고를 맞으면 로그인까지 같이 죽는다.

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
