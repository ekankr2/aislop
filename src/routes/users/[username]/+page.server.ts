import { error, fail, redirect } from "@sveltejs/kit";
import { and, count, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "$lib/core/db/client";
import { comment, post } from "$lib/core/db/schema";
import { PUBLIC_POST_STATUSES } from "$lib/core/taxonomy";
import { canWrite, getUserByUsername, renameUser } from "$lib/core/user";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params, locals }) => {
  const u = await getUserByUsername(params.username);
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
      username: u.username,
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
        verdict: post.verdict,
        aiStatus: post.aiStatus,
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
  // 닉네임 변경. ⚠️ 대상은 항상 **로그인한 본인**이다 — URL의 username을 쓰지 마라.
  //    남의 프로필 주소로 POST하면 그대로 남의 이름이 바뀐다.
  rename: async ({ request, locals }) => {
    if (!canWrite(locals.user)) redirect(303, "/login");
    const name = String((await request.formData()).get("name") ?? "");

    // ⚠️ redirect를 try 안에 두지 마라 — SvelteKit의 redirect는 throw라서
    //    catch가 성공 경로를 400으로 바꿔 버린다.
    let username: string;
    try {
      username = (await renameUser(locals.user.id, name)).username ?? "";
    } catch (e) {
      return fail(400, { message: (e as Error).message });
    }
    // 주소가 같이 바뀌므로 새 주소로 보낸다. 안 보내면 404가 뜬다.
    redirect(303, `/users/${encodeURIComponent(username)}`);
  },
};
