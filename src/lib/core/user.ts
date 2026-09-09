import { eq } from "drizzle-orm";
import { db } from "./db/client";
import { user } from "./db/schema";
import { slugify } from "./slug";
import { nowKst } from "./time";

export type AppUser = typeof user.$inferSelect;

export async function getUser(id: string): Promise<AppUser | null> {
  const [row] = await db().select().from(user).where(eq(user.id, id)).limit(1);
  return row ?? null;
}

export async function getUserByUsername(
  username: string,
): Promise<AppUser | null> {
  const [row] = await db()
    .select()
    .from(user)
    .where(eq(user.username, username))
    .limit(1);
  return row ?? null;
}

// 프로필 URL(`/users/[username]`)용. 최초 로그인 시 한 번 발급한다.
// 바꾸는 건 `renameUser` 하나뿐이다.
//
// ⚠️ 이메일 OTP로 바꾼 뒤로는 **이름이 아예 없다**(소셜 닉네임이 오던 자리다).
//    그렇다고 이메일 앞부분을 쓰면 안 된다 — 목록·댓글에 작성자가 그대로 노출되므로
//    `kim-minsu-1990` 같은 값이 공개되면 이메일 주소가 사실상 공개된다.
//    그래서 익명 이름(`slop-xxxx`)을 발급하고 표시 이름도 같이 채운다.
export async function ensureUsername(u: AppUser): Promise<AppUser> {
  if (u.username) return u;
  const rand = () => Math.random().toString(36).slice(2, 6);
  const base = slugify(u.name) || `slop-${rand()}`;
  for (let i = 0; i < 20; i++) {
    const candidate = i === 0 ? base : `${base}-${rand()}`;
    const taken = await getUserByUsername(candidate);
    if (taken) continue;
    // 표시 이름이 비어 있으면 같이 채운다. 빈 이름이면 목록 byline이 통째로 비어 보인다.
    const name = u.name || candidate;
    await db()
      .update(user)
      .set({ username: candidate, name, updatedAt: nowKst() })
      .where(eq(user.id, u.id));
    return { ...u, username: candidate, name };
  }
  throw new Error(`username 발급 실패: ${u.id}`);
}

// 차단된 회원은 읽기만 가능하다. 쓰기 경로는 전부 이걸 먼저 통과해야 한다.
export const canWrite = (u: AppUser | null): u is AppUser =>
  !!u && !u.blockedAt;

export async function blockUser(id: string, reason: string): Promise<void> {
  await db()
    .update(user)
    .set({ blockedAt: nowKst(), blockedReason: reason, updatedAt: nowKst() })
    .where(eq(user.id, id));
}

export async function unblockUser(id: string): Promise<void> {
  await db()
    .update(user)
    .set({ blockedAt: null, blockedReason: null, updatedAt: nowKst() })
    .where(eq(user.id, id));
}

/* ── 닉네임 변경 ─────────────────────────────────────────────── */

export class NameTakenError extends Error {
  constructor() {
    super("이미 쓰는 이름임");
  }
}

// 표시 이름과 프로필 URL을 **같이** 바꾼다. 둘을 따로 두면 `slop-sy3l`이라는
// 주소에 다른 이름이 붙어, 목록에서 본 사람과 프로필의 사람이 달라 보인다.
// ⚠️ 옛 주소는 안 남긴다. 리다이렉트 표를 만들면 "예전에 이 사람이 뭐였나"가
//    영구 기록으로 남아, 이름을 바꾼 이유(신상 노출 등)를 되돌린다.
export async function renameUser(id: string, raw: string): Promise<AppUser> {
  const name = raw.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 20) throw new Error("이름은 2~20자");

  const username = slugify(name);
  // 슬러그가 비면 URL을 만들 수 없다(기호만 넣은 경우).
  if (!username) throw new Error("글자나 숫자가 있어야 함");

  const taken = await getUserByUsername(username);
  if (taken && taken.id !== id) throw new NameTakenError();

  await db()
    .update(user)
    .set({ name, username, updatedAt: nowKst() })
    .where(eq(user.id, id));
  const updated = await getUser(id);
  if (!updated) throw new Error(`회원 없음: ${id}`);
  return updated;
}
