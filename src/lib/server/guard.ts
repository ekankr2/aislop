// 권한·유량 검사는 **서버에서만** 한다. 화면이 버튼을 감추는 건 UI일 뿐 방어가 아니다.

import { error } from "@sveltejs/kit";
import { env } from "$lib/core/db/client";
import { isAdmin, isEditor } from "$lib/core/taxonomy";
import type { AppUser } from "$lib/core/user";

export function requireUser(user: AppUser | null): AppUser {
  if (!user) error(401, "로그인 필요");
  // 차단된 계정은 읽기만 가능하다.
  if (user.blockedAt) error(403, "쓰기가 막힌 계정임");
  return user;
}

export function requireEditor(user: AppUser | null): AppUser {
  const u = requireUser(user);
  if (!isEditor(u.role)) error(403, "권한 없음");
  return u;
}

export function requireAdmin(user: AppUser | null): AppUser {
  const u = requireUser(user);
  if (!isAdmin(u.role)) error(403, "권한 없음");
  return u;
}

// 로그인 사용자의 쓰기 유량. IP 기준이라 계정 여러 개를 쓰는 스팸까지는 못 막는다 —
// 그건 계정 단위 quota의 일이고, 지금은 자동화 도구로 도배하는 것만 막는다.
// ⚠️ 로컬 dev엔 바인딩이 없다. 없으면 통과시킨다(막으면 개발이 안 된다).
export async function rateLimitWrite(ip: string): Promise<void> {
  const limiter = env().WRITE_LIMITER;
  if (!limiter) return;
  const { success } = await limiter.limit({ key: ip });
  if (!success) error(429, "요청이 잦음. 잠시 후 다시 시도");
}
