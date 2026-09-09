import { fail, redirect } from "@sveltejs/kit";
import { z } from "zod";
import {
  createSession,
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
  sendLoginCode,
  verifyLoginCode,
} from "$lib/core/auth";
import { rateLimitWrite } from "$lib/server/guard";
import type { Actions, PageServerLoad } from "./$types";

// 로그인 후 돌아갈 경로.
// ⚠️ 외부 URL을 넣으면 오픈 리다이렉트가 된다 — `/`로 시작하고 `//`가 아닌 값만 통과시킨다.
// ⚠️ `next`를 URL이 아니라 **폼 필드**로 나른다. 액션 주소가 `?/send`라
//    `/login?next=...`의 쿼리가 통째로 날아간다 — URL에서 읽으면 로그인 후 항상 홈으로 간다.
// ⚠️ 한글 slug라 Location 헤더에 실으려면 인코딩이 필요한데, 이 값은 단계를 거치며
//    **이미 인코딩된 채로** 다시 들어온다(load → 히든 필드 → send → verify).
//    encodeURI를 다시 걸면 `%EB`가 `%25EB`가 되어 없는 주소로 보낸다(2026-09-09).
//    URL로 한 번 통과시키면 인코딩 여부와 무관하게 같은 결과가 나온다.
const safeNext = (raw: string | null): string => {
  if (!raw?.startsWith("/") || raw.startsWith("//")) return "/";
  const u = new URL(raw, "http://x");
  return u.pathname + u.search;
};

const Email = z.string().trim().toLowerCase().email().max(254);
const Otp = z
  .string()
  .trim()
  .regex(/^\d{6}$/);

export const load: PageServerLoad = ({ locals, url }) => {
  if (locals.user) redirect(303, safeNext(url.searchParams.get("next")));
  return { next: safeNext(url.searchParams.get("next")) };
};

export const actions: Actions = {
  // 1단계. 코드를 메일로 보낸다.
  // ⚠️ IP 유량 제한을 빼지 마라. `sendLoginCode`의 쿨다운은 **주소당**이라 주소만
  //    갈아 끼우면 통째로 우회된다 — 한 곳에서 남의 주소로 메일을 뿌리는 걸 막는 건
  //    이쪽이다. 둘은 다른 구멍을 막으므로 하나로 합치려 하지 마라.
  send: async ({ request, getClientAddress }) => {
    await rateLimitWrite(getClientAddress());
    const form = await request.formData();
    const parsed = Email.safeParse(form.get("email"));
    if (!parsed.success)
      return fail(400, {
        step: "email",
        message: "이메일 주소를 확인",
      });

    // ⚠️ "가입된 주소가 아닙니다" 같은 응답을 만들지 마라 — 회원 목록이 그대로 새어 나간다.
    //    OTP는 가입/로그인이 같은 절차라 애초에 구분할 이유도 없다.
    await sendLoginCode(parsed.data);
    return {
      step: "otp",
      email: parsed.data,
      next: safeNext(String(form.get("next") ?? "/")),
    };
  },

  // 2단계. 코드를 확인하고 세션을 만든다.
  verify: async ({ request, cookies }) => {
    const form = await request.formData();
    const next = safeNext(String(form.get("next") ?? "/"));
    const email = Email.safeParse(form.get("email"));
    const otp = Otp.safeParse(form.get("otp"));
    if (!email.success) redirect(303, "/login");
    if (!otp.success)
      return fail(400, {
        step: "otp",
        email: email.data,
        next,
        message: "여섯 자리 숫자를 입력",
      });

    const userId = await verifyLoginCode(email.data, otp.data);
    if (!userId)
      // 틀린 코드·만료·시도 초과를 구분해서 알려주지 않는다 — 구분해 주면 대입에 쓰인다.
      return fail(400, {
        step: "otp",
        email: email.data,
        next,
        message: "코드가 맞지 않거나 만료됨.",
      });

    cookies.set(
      SESSION_COOKIE,
      await createSession(userId),
      SESSION_COOKIE_OPTIONS,
    );
    redirect(303, next);
  },
};
