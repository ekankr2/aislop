// 사례 = 제보 = 게시물. 상태만 다르다(schema.ts 상단 주석 참조).

import { and, desc, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { db } from "./db/client";
import {
  comment,
  companyResponse,
  correctionRequest,
  evidence,
  post,
  user,
} from "./db/schema";
import { slugify, uniqueSlug } from "./slug";
import type { Category } from "./taxonomy";
import { PUBLIC_POST_STATUSES } from "./taxonomy";
import { nowKst } from "./time";
import { displayDomain, normalizeUrl } from "./url";

export type Post = typeof post.$inferSelect;

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const [row] = await db()
    .select()
    .from(post)
    .where(and(eq(post.slug, slug), isNull(post.deletedAt)))
    .limit(1);
  return row ?? null;
}

// 비공개 사례는 작성자와 운영자만 본다. 이 판단을 화면에 맡기지 않는다.
export const canViewPost = (
  p: Post,
  viewer: { id: string; role: string } | null,
): boolean =>
  PUBLIC_POST_STATUSES.includes(
    p.status as (typeof PUBLIC_POST_STATUSES)[number],
  ) ||
  (!!viewer &&
    (viewer.id === p.authorId ||
      viewer.role === "editor" ||
      viewer.role === "admin"));

export async function getPostDetail(slug: string) {
  const p = await getPostBySlug(slug);
  if (!p) return null;

  const [author] = await db()
    .select({ name: user.name, username: user.username })
    .from(user)
    .where(eq(user.id, p.authorId))
    .limit(1);

  const [evidences, responses, corrections, related] = await Promise.all([
    db()
      .select()
      .from(evidence)
      .where(eq(evidence.postId, p.id))
      .orderBy(evidence.createdAt),
    // 게시되지 않은 답변은 노출하지 않는다(운영자가 관계 확인 후 게시).
    db()
      .select()
      .from(companyResponse)
      .where(
        and(
          eq(companyResponse.postId, p.id),
          eq(companyResponse.verifyStatus, "verified"),
        ),
      )
      .orderBy(desc(companyResponse.publishedAt)),
    // 처리된 정정만. 접수만 된 요청은 공개하지 않는다.
    db()
      .select()
      .from(correctionRequest)
      .where(
        and(
          eq(correctionRequest.postId, p.id),
          ne(correctionRequest.status, "open"),
        ),
      )
      .orderBy(desc(correctionRequest.resolvedAt)),
    // 같은 카테고리의 최근 사례.
    db()
      .select({ slug: post.slug, title: post.title })
      .from(post)
      .where(
        and(
          eq(post.category, p.category),
          ne(post.id, p.id),
          isNull(post.deletedAt),
          eq(post.status, "published"),
        ),
      )
      .orderBy(desc(post.publishedAt))
      .limit(5),
  ]);

  return {
    post: p,
    author: author ?? { name: "알 수 없음", username: null },
    evidences,
    responses,
    corrections,
    related,
  };
}

export async function listComments(postId: string) {
  return db()
    .select({
      id: comment.id,
      parentId: comment.parentId,
      body: comment.body,
      createdAt: comment.createdAt,
      hiddenAt: comment.hiddenAt,
      deletedAt: comment.deletedAt,
      userId: comment.userId,
      authorName: user.name,
      authorUsername: user.username,
    })
    .from(comment)
    .innerJoin(user, eq(user.id, comment.userId))
    .where(eq(comment.postId, postId))
    .orderBy(comment.createdAt);
}

// 전 사이트 최근 댓글. `/comments` 피드용 (랍스타 Comments 탭).
// ⚠️ 숨김·삭제된 댓글과 비공개 사례의 댓글은 뺀다 — 공개 피드는 사례 목록과
//    같은 공개 조건을 통과해야 한다. 여기가 새면 미검토 제보의 제목이 새어 나간다.
export async function listRecentComments(limit = 40) {
  return db()
    .select({
      id: comment.id,
      body: comment.body,
      createdAt: comment.createdAt,
      authorName: user.name,
      authorUsername: user.username,
      postSlug: post.slug,
      postTitle: post.title,
    })
    .from(comment)
    .innerJoin(user, eq(user.id, comment.userId))
    .innerJoin(post, eq(post.id, comment.postId))
    .where(
      and(
        isNull(comment.hiddenAt),
        isNull(comment.deletedAt),
        isNull(post.deletedAt),
        inArray(post.status, PUBLIC_POST_STATUSES),
      ),
    )
    .orderBy(desc(comment.createdAt))
    .limit(limit);
}

export interface NewSubmission {
  url: string | null;
  title: string;
  summary: string;
  category: Category;
  submitReason: string | null;
  aiEvidence: string | null;
  firsthand: boolean;
  submitterAffiliated: boolean;
  authorId: string;
}

export class DuplicateUrlError extends Error {
  constructor(public existingSlug: string) {
    super("이미 등록된 사례입니다.");
  }
}

// 제보 저장. `submitted` 상태로 들어가고 slug는 지금 발급한다 —
// 게시 시점에 URL이 바뀌지 않아야 한다.
// ⚠️ aiStatus·verdict는 손대지 않는다(각각 unknown·unrated로 시작).
//    제보만으로 판정이 생기면 안 된다.
export async function createSubmission(
  input: NewSubmission,
): Promise<{ id: string; slug: string }> {
  const urlKey = input.url ? normalizeUrl(input.url) : null;

  if (urlKey) {
    const [dup] = await db()
      .select({ slug: post.slug })
      .from(post)
      .where(eq(post.urlKey, urlKey))
      .limit(1);
    if (dup) throw new DuplicateUrlError(dup.slug);
  }

  const existing = await db().select({ slug: post.slug }).from(post);
  const taken = new Set(existing.map((r) => r.slug));
  const slug = uniqueSlug(slugify(input.title), (s) => taken.has(s));

  const id = crypto.randomUUID();
  const now = nowKst();

  await db()
    .insert(post)
    .values({
      id,
      slug,
      title: input.title,
      summary: input.summary,
      category: input.category,
      url: input.url,
      urlKey,
      domain: input.url ? displayDomain(input.url) : null,
      aiEvidence: input.aiEvidence,
      authorId: input.authorId,
      status: "submitted",
      submitReason: input.submitReason,
      firsthand: input.firsthand,
      submitterAffiliated: input.submitterAffiliated,
      createdAt: now,
      updatedAt: now,
    });

  return { id, slug };
}

// 집계 캐시 갱신. 진실원은 vote/comment 테이블이고 여기는 파생값이다.
export async function refreshCounts(postId: string): Promise<void> {
  await db()
    .update(post)
    .set({
      voteSlopCount: sql`(select count(*) from vote where vote.post_id = ${postId} and vote.choice = 'slop')`,
      voteOkCount: sql`(select count(*) from vote where vote.post_id = ${postId} and vote.choice = 'ok')`,
      commentCount: sql`(
        select count(*) from comment
        where comment.post_id = ${postId} and comment.deleted_at is null and comment.hidden_at is null
      )`,
      updatedAt: nowKst(),
    })
    .where(eq(post.id, postId));
}
