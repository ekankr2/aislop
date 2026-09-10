import { eq } from "drizzle-orm";
import { db } from "./db/client";
import { user } from "./db/schema";
import { nowKst } from "./time";

export type AppUser = typeof user.$inferSelect;

export async function getUser(id: string): Promise<AppUser | null> {
  const [row] = await db().select().from(user).where(eq(user.id, id)).limit(1);
  return row ?? null;
}

export async function getUserByName(name: string): Promise<AppUser | null> {
  const [row] = await db()
    .select()
    .from(user)
    .where(eq(user.name, name))
    .limit(1);
  return row ?? null;
}

// 닉네임 발급. 최초 로그인 시 한 번만 돈다.
//
// ⚠️ 이메일 OTP로 바꾼 뒤로는 **이름이 아예 없다**(소셜 닉네임이 오던 자리다).
//    그렇다고 이메일 앞부분을 쓰면 안 된다 — 목록·댓글에 작성자가 그대로 노출되므로
//    `kim-minsu-1990` 같은 값이 공개되면 이메일 주소가 사실상 공개된다.
export async function ensureName(u: AppUser): Promise<AppUser> {
  if (u.name) return u;
  const rand = () => Math.random().toString(36).slice(2, 6);
  for (let i = 0; i < 20; i++) {
    const candidate = `slop-${rand()}`;
    if (await getUserByName(candidate)) continue;
    await db()
      .update(user)
      .set({ name: candidate, updatedAt: nowKst() })
      .where(eq(user.id, u.id));
    return { ...u, name: candidate };
  }
  throw new Error(`닉네임 발급 실패: ${u.id}`);
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

// 닉네임 변경. 이게 곧 프로필 주소라 **옛 주소는 죽는다**.
// ⚠️ 리다이렉트 표를 만들지 마라 — "예전에 이 사람이 뭐였나"가 영구 기록으로 남아
//    이름을 바꾼 이유(신상 노출 등)를 그대로 되돌린다.
export async function renameUser(id: string, raw: string): Promise<AppUser> {
  const name = raw.trim().replace(/\s+/g, " ");
  // ⚠️ 상한 8자다(2026-09-10 유저 지시, 20 → 10 → 8로 두 번 내렸다). 목록 byline이
  //    시각·이름·댓글·판정 네 칼럼이고 이름 칸 폭이 **이 상한에서 나온다** —
  //    한글 8자 = 96.8px. 20자였을 땐 242px로 390px 화면 byline 폭(342px)의 71%를
  //    혼자 먹어서 칼럼 자체가 불가능했다.
  //    ⚠️ 올리려면 `FeedList.svelte`의 이름 칸 `w-[97px]`을 같이 올려라. 안 그러면
  //       긴 이름이 말줄임으로 잘린다.
  if (name.length < 2 || name.length > 8) throw new Error("이름은 2~8자");
  // 주소가 되는 값이라 경로를 끊는 문자를 막는다.
  if (/[/?#\\]/.test(name)) throw new Error("/ ? # \\ 는 쓸 수 없음");

  const taken = await getUserByName(name);
  if (taken && taken.id !== id) throw new NameTakenError();

  await db()
    .update(user)
    .set({ name, updatedAt: nowKst() })
    .where(eq(user.id, id));
  const updated = await getUser(id);
  if (!updated) throw new Error(`회원 없음: ${id}`);
  return updated;
}
