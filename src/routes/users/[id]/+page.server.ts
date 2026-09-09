import { error, fail, redirect } from "@sveltejs/kit";
import { and, count, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "$lib/core/db/client";
import { comment, post } from "$lib/core/db/schema";
import { PUBLIC_POST_STATUSES } from "$lib/core/taxonomy";
import { canWrite, getUser, renameUser } from "$lib/core/user";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params, locals }) => {
  // ⚠️ 프로필 주소는 **id**다(2026-09-09 유저 결정). 닉네임을 주소로 쓰면 이름을
  //    바꿀 때마다 링크가 죽고, 그렇다고 리다이렉트 표를 만들면 "예전 이름"이 영구
  //    기록으로 남아 이름을 바꾼 이유를 되돌린다. 닉네임은 화면에만 쓴다.
  const u = await getUser(params.id);
  if (!u) error(404, "없는 사용자");

  // 본인(또는 운영자)만 검토 대기·반려 제보까지 본다.
  const isSelf = locals.user?.id === u.id;
  const canSeeAll =
    isSelf || locals.user?.role === "editor" || locals.user?.role === "admin";

  // 평판 = 계산값이다. 별도 테이블을 두지 않는다 —
  // 캐시하면 진실원이 갈리고, 이 숫자는 자주 읽히지도 않는다.
  const [stats] = await db()
    .select({
      submitted: count(),
      published: sql<number>`sum(case when status in ('published','corrected') then 1 else 0 end)`,
      corrected: sql<number>`sum(case when status = 'corrected' then 1 else 0 end)`,
    })
    .from(post)
    .where(and(eq(post.authorId, u.id), isNull(post.deletedAt)));

  const [commentStats] = await db()
    .select({ n: count() })
    .from(comment)
    .where(and(eq(comment.userId, u.id), isNull(comment.deletedAt)));

  return {
    profile: {
      name: u.name,
      badges: (u.badges ?? "").split(",").filter(Boolean),
      joinedAt: u.createdAt.slice(0, 10),
    },
    isSelf,
    stats: {
      submitted: stats?.submitted ?? 0,
      published: Number(stats?.published ?? 0),
      corrected: Number(stats?.corrected ?? 0),
      comments: commentStats?.n ?? 0,
    },
    posts: await db()
      .select({
        slug: post.slug,
        title: post.title,
        status: post.status,
        voteSlopCount: post.voteSlopCount,
        voteOkCount: post.voteOkCount,
        reviewNote: post.reviewNote,
        publishedAt: post.publishedAt,
        createdAt: post.createdAt,
      })
      .from(post)
      .where(
        and(
          eq(post.authorId, u.id),
          isNull(post.deletedAt),
          canSeeAll ? undefined : inArray(post.status, PUBLIC_POST_STATUSES),
        ),
      )
      .orderBy(desc(post.createdAt))
      .limit(50),
  };
};

export const actions: Actions = {
  // 닉네임 변경. ⚠️ 대상은 항상 **로그인한 본인**이다 — URL의 id를 쓰지 마라.
  //    남의 프로필 주소로 POST하면 그대로 남의 이름이 바뀐다.
  rename: async ({ request, locals }) => {
    if (!canWrite(locals.user)) redirect(303, "/login");
    const name = String((await request.formData()).get("name") ?? "");

    try {
      await renameUser(locals.user.id, name);
    } catch (e) {
      return fail(400, { message: (e as Error).message });
    }
    // 주소는 id라 안 바뀐다. 이름만 갈아 끼우고 같은 페이지를 다시 그린다.
    return { ok: true };
  },
};
