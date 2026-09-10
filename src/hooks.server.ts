// 모든 요청이 지나는 단 하나의 관문.
//   1. D1·시크릿을 요청 스코프 컨텍스트(ALS)에 넣는다 → core가 `db()`로 꺼낸다
//   2. 세션을 판정해 `locals.user`에 박는다
//
// ⚠️ 세션 판정은 **여기서만** 한다. 페이지가 쿠키를 직접 까서 판단하면
//    무효화된 세션이 통과한다.

import type { Handle, HandleServerError } from "@sveltejs/kit";
import { readSession, SESSION_COOKIE } from "$lib/core/auth";
import type { AppEnv } from "$lib/core/db/client";
import { runWithEnv } from "$lib/core/db/client";
import { ensureName, getUser } from "$lib/core/user";

// CF는 이걸 대신 안 넣어준다.
const SECURITY_HEADERS: Record<string, string> = {
  "strict-transport-security": "max-age=15552000",
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "geolocation=(), camera=(), microphone=()",
  // ⚠️ 외부 스크립트/이미지/폰트 출처를 새로 붙일 땐 여기부터 고쳐라.
  //    안 고치면 조용히 차단돼 "왜 안 뜨지"로 시간을 태운다.
  "content-security-policy": [
    "default-src 'self'",
    // 'unsafe-inline' = SvelteKit 하이드레이션 스크립트가 인라인이다.
    // cloudflareinsights = Web Analytics 비콘. **CF가 응답에 자동으로 주입**하므로
    // 코드에 <script>가 없어도 여기서 허용하지 않으면 매 요청 콘솔 에러가 난다
    // (2026-09-08 PSI 실측: Best Practices 92점의 단독 원인). 안 쓸 거면
    // 여기서 지우지 말고 CF 대시보드에서 Web Analytics를 꺼라 — 주입이 원인이다.
    "script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    // 서비스 로고·근거 이미지. 외부 파비콘은 프록시하지 않고 쓰지 않는다.
    "img-src 'self' data: blob: https://cdn.aislop.kr",
    "connect-src 'self' https://cloudflareinsights.com",
    "object-src 'none'",
    "base-uri 'self'",
    // 소셜 OAuth를 걷어내면서 켰다 — 이제 폼이 외부로 나갈 일이 없다.
    "form-action 'self'",
    "frame-ancestors 'self'",
    "frame-src 'none'",
  ].join("; "),
};

export const handle: Handle = async ({ event, resolve }) => {
  const env = event.platform?.env as AppEnv | undefined;
  if (!env?.DB) throw new Error("D1 바인딩 없음 — wrangler 설정을 확인해라");

  // www → apex 301. ⚠️ 세션·DB를 건드리기 **전에** 끝낸다 — 리다이렉트 한 번에
  //    D1 왕복이 붙을 이유가 없다. 같은 내용이 두 주소로 열리면 중복 색인이 된다.
  const url = new URL(event.request.url);
  if (url.hostname === "www.aislop.kr") {
    url.hostname = "aislop.kr";
    return new Response(null, {
      status: 301,
      headers: { location: url.toString() },
    });
  }

  const send = async () => {
    const res = await resolve(event);
    for (const [k, v] of Object.entries(SECURITY_HEADERS))
      res.headers.set(k, v);
    return res;
  };

  return runWithEnv(env, async () => {
    // ⚠️ dev 전용 로그인 우회. `.dev.vars`에 DEV_USER_ID를 넣으면 로그인 없이
    //    그 회원으로 붙는다. `import.meta.env.DEV`는 빌드 시 false로 치환되므로
    //    이 블록은 프로덕션 번들에서 통째로 사라진다 → 절대 배포로 안 나간다.
    if (import.meta.env.DEV && env.DEV_USER_ID) {
      event.locals.user = await getUser(env.DEV_USER_ID);
      return send();
    }

    event.locals.user = null;
    // 쿠키가 아예 없으면 세션 조회(=D1 왕복)를 건너뛴다. 비로그인 읽기가 대부분이다.
    const token = event.cookies.get(SESSION_COOKIE);
    if (token) {
      const userId = await readSession(token);
      const u = userId ? await getUser(userId) : null;
      event.locals.user = u ? await ensureName(u) : null;
    }
    return send();
  });
};

// 처리 못 한 예외. ⚠️ 여기서 돌려주는 `message`가 그대로 화면(`+error.svelte`)에 뜬다 —
//    예외 메시지를 그대로 실어 보내지 마라. 스택·쿼리·바인딩 이름이 방문자에게 새고,
//    기본값인 "Internal Error"는 아무 정보도 아니면서 방치된 사이트처럼 보인다.
//    사유는 로그로만 남긴다(`observability`가 켜져 있어 대시보드에서 읽힌다).
export const handleError: HandleServerError = ({ error, event, status }) => {
  console.error(
    `[${status}] ${event.request.method} ${event.url.pathname}`,
    error,
  );
  return { message: "문제 발생" };
};
