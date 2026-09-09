// 투표(여론). 목록·상세 어디서든 같은 폼이 여기로 POST한다 —
// 피드 라우트 다섯 개에 같은 form action을 복붙하지 않으려고 엔드포인트로 뒀다.
//
// ⚠️ 이 표는 `post.verdict`에 흘러들지 않는다. 여론과 운영자 판정은 다른 줄이고,
//    어긋날 수 있어야 한다 — 여기서 verdict를 건드리는 코드를 넣지 마라.
// ⚠️ JS 없이 동작한다(평범한 폼 POST → 303으로 돌아감). enhance를 붙이지 마라.
// CSRF는 SvelteKit이 폼 POST의 Origin을 검사해 막는다.
// 로그인 강제(`requireUser`)가 1인 1표의 유일한 방어선이다 — 표가 여론이 되는 순간
// 판정당할 쪽이 직접 몰려온다. 비로그인 투표를 열지 마라.

import { error, redirect } from "@sveltejs/kit";
import { and, eq } from "drizzle-orm";
import { db } from "$lib/core/db/client";
import { vote } from "$lib/core/db/schema";
import { getPostBySlug, refreshCounts } from "$lib/core/post";
import { VOTE_CHOICES, type VoteChoice } from "$lib/core/taxonomy";
import { nowKst } from "$lib/core/time";
import { rateLimitWrite, requireUser } from "$lib/server/guard";
import type { RequestHandler } from "./$types";

// ⚠️ 외부 URL을 넣으면 오픈 리다이렉트가 된다. searchParams는 디코딩된 값을 주므로
//    한글 slug를 다시 인코딩해야 Location 헤더에 실린다.
const safeNext = (raw: string): string =>
  raw.startsWith("/") && !raw.startsWith("//") ? encodeURI(raw) : "/";

export const POST: RequestHandler = async ({
  request,
  locals,
  getClientAddress,
}) => {
  const user = requireUser(locals.user);
  await rateLimitWrite(getClientAddress());

  const form = await request.formData();
  const slug = String(form.get("slug") ?? "");
  const next = safeNext(String(form.get("next") ?? "/"));
  const choice = String(form.get("choice") ?? "");
  if (!VOTE_CHOICES.includes(choice as VoteChoice)) error(400, "없는 선택");

  const p = await getPostBySlug(slug);
  if (!p) error(404, "없는 사례");

  const where = and(eq(vote.postId, p.id), eq(vote.userId, user.id));
  const [existing] = await db().select().from(vote).where(where).limit(1);

  if (!existing) {
    await db().insert(vote).values({
      postId: p.id,
      userId: user.id,
      choice,
      createdAt: nowKst(),
    });
  } else if (existing.choice === choice) {
    // 같은 쪽을 다시 누르면 취소다. 취소를 막으면 오조작이 영구 기록으로 남는다.
    await db().delete(vote).where(where);
  } else {
    // 반대쪽을 누르면 갈아탄다. 한 사람이 두 줄을 갖지 않는다(PK가 이미 막지만
    // insert로 처리하면 제약 위반으로 500이 난다).
    await db().update(vote).set({ choice }).where(where);
  }

  await refreshCounts(p.id);
  redirect(303, next);
};
