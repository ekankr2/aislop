import { redirect } from "@sveltejs/kit";
import { destroySession, SESSION_COOKIE } from "$lib/core/auth";
import type { Actions } from "./$types";

export const actions: Actions = {
  default: async ({ cookies }) => {
    const token = cookies.get(SESSION_COOKIE);
    // ⚠️ 쿠키만 지우면 세션 행이 DB에 남는다. 토큰이 유출됐다면 그대로 살아있는 셈이다.
    if (token) await destroySession(token);
    cookies.delete(SESSION_COOKIE, { path: "/" });
    redirect(303, "/");
  },
};
