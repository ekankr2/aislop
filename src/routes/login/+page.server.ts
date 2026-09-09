import { fail, redirect } from "@sveltejs/kit";
import { z } from "zod";
import {
  createSession,
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
  sendLoginCode,
  verifyLoginCode,
} from "$lib/core/auth";
import type { Actions, PageServerLoad } from "./$types";

// 로그인 후 돌아갈 경로.
// ⚠️ 외부 URL을 넣으면 오픈 리다이렉트가 된다 — `/`로 시작하고 `//`가 아닌 값만 통과시킨다.
// ⚠️ searchParams는 디코딩된 값을 준다. slug에 한글이 들어가므로 Location 헤더에
//    싣기 전에 encodeURI로 되돌린다(경로 구분자 `/?&=`는 보존된다).
// ⚠️ `next`를 URL이 아니라 **폼 필드**로 나른다. 액션 주소가 `?/send`라
//    `/login?next=...`의 쿼리가 통째로 날아간다 — URL에서 읽으면 로그인 후 항상 홈으로 간다.
const safeNext = (raw: string | null): string =>
  raw?.startsWith("/") && !raw.startsWith("//") ? encodeURI(raw) : "/";

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
  send: async ({ request }) => {
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
        message: "코드가 맞지 않거나 만료됨. 다시 받으면 됨.",
      });

    cookies.set(
      SESSION_COOKIE,
      await createSession(userId),
      SESSION_COOKIE_OPTIONS,
    );
    redirect(303, next);
  },
};
