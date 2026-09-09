import { and, desc, eq, inArray, isNull, like, or } from "drizzle-orm";
import { db } from "$lib/core/db/client";
import { post, user } from "$lib/core/db/schema";
import { PUBLIC_POST_STATUSES } from "$lib/core/taxonomy";
import type { PageServerLoad } from "./$types";

// LIKE 검색이다. D1에 FTS5를 붙일 수는 있지만 글이 수백 건일 땐 인덱스 유지 비용만
// 늘고 체감이 같다 — 느려지면 그때 붙인다.
export const load: PageServerLoad = async ({ url }) => {
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 100);
  if (!q) return { q, posts: [] };

  const term = `%${q}%`;
  return {
    q,
    posts: await db()
      .select({
        slug: post.slug,
        title: post.title,
        summary: post.summary,
        category: post.category,
        aiStatus: post.aiStatus,
        verdict: post.verdict,
        publishedAt: post.publishedAt,
        authorName: user.name,
      })
      .from(post)
      .innerJoin(user, eq(user.id, post.authorId))
      .where(
        and(
          inArray(post.status, PUBLIC_POST_STATUSES),
          isNull(post.deletedAt),
          or(like(post.title, term), like(post.summary, term)),
        ),
      )
      .orderBy(desc(post.publishedAt))
      .limit(50),
  };
};
