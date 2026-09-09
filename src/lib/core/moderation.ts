// 운영 작업. 라우트에서 직접 UPDATE 하지 말고 전부 여기를 거쳐라 —
// 감사 로그를 남기는 자리가 한 곳이어야 빠뜨리지 않는다.

import { eq } from "drizzle-orm";
import { logAudit } from "./audit";
import { db } from "./db/client";
import {
  comment,
  commentReport,
  companyResponse,
  correctionRequest,
  post,
  postReport,
} from "./db/schema";
import type { PostStatus } from "./taxonomy";
import { nowKst } from "./time";

type Actor = { id: string; role: string };

export interface ReviewInput {
  status: PostStatus;
  category?: string;
  // 검색결과·공유 카드에 나가는 한 줄. 제보 시점엔 본문에서 잘라 만든 값이라
  // (`core/text.ts`의 `excerpt`) 운영자가 다듬는 자리가 필요하다.
  summary?: string;
  problems?: string | null;
  facts?: string | null;
  archiveUrl?: string | null;
  thumbUrl?: string | null;
  reviewNote?: string | null;
}

// 운영자 후속 작업의 유일한 경로다. 여기를 우회하면 감사 로그가 빈다.
// ⚠️ **품질 판정 필드를 다시 넣지 마라**(2026-09-09 유저 지시). 품질은 유저 표가 답한다.
//    여기서 하는 일은 사실 확인(AI 여부·근거)과 분류·아카이브 붙이기다.
export async function reviewPost(
  slug: string,
  input: ReviewInput,
  actor: Actor,
): Promise<void> {
  const [p] = await db()
    .select()
    .from(post)
    .where(eq(post.slug, slug))
    .limit(1);
  if (!p) throw new Error(`사례 없음: ${slug}`);

  const now = nowKst();
  // 최초 게시 시각은 한 번만 찍는다 — 재게시할 때마다 피드 상단으로 올라오면 안 된다.
  const publishedAt =
    (input.status === "published" || input.status === "corrected") &&
    !p.publishedAt
      ? now
      : p.publishedAt;

  await db()
    .update(post)
    .set({
      status: input.status,
      category: input.category ?? p.category,
      summary: input.summary?.trim() || p.summary,
      problems: input.problems ?? null,
      facts: input.facts ?? null,
      archiveUrl: input.archiveUrl ?? null,
      thumbUrl: input.thumbUrl ?? null,
      reviewNote: input.reviewNote ?? null,
      reviewedBy: actor.id,
      publishedAt,
      updatedAt: now,
    })
    .where(eq(post.id, p.id));

  await logAudit({
    actorId: actor.id,
    action: "post.review",
    targetType: "post",
    targetId: p.id,
    reason: input.reviewNote ?? null,
    meta: {
      status: [p.status, input.status],
    },
  });
}

// 댓글 숨김. 지우지 않는다 — 지우면 대댓글 맥락이 끊기고 감사도 안 된다.
export async function hideComment(
  id: string,
  reason: string,
  actor: Actor,
): Promise<void> {
  await db()
    .update(comment)
    .set({ hiddenAt: nowKst(), hiddenBy: actor.id })
    .where(eq(comment.id, id));
  await logAudit({
    actorId: actor.id,
    action: "comment.hide",
    targetType: "comment",
    targetId: id,
    reason,
  });
}

// 글 내리기. ⚠️ 행을 지우지 않는다 — `deletedAt`만 찍고 감사 로그를 남긴다.
//    글이 바로 게시되므로(2026-09-09) 이게 유일한 즉시 대응 수단이다.
export async function hidePost(
  id: string,
  reason: string,
  actor: Actor,
): Promise<void> {
  await db().update(post).set({ deletedAt: nowKst() }).where(eq(post.id, id));
  await logAudit({
    actorId: actor.id,
    action: "post.hide",
    targetType: "post",
    targetId: id,
    reason,
  });
}

export async function resolvePostReport(
  id: string,
  status: "resolved" | "dismissed",
  actor: Actor,
): Promise<void> {
  await db()
    .update(postReport)
    .set({ status, resolvedBy: actor.id, resolvedAt: nowKst() })
    .where(eq(postReport.id, id));
  await logAudit({
    actorId: actor.id,
    action: `postReport.${status}`,
    targetType: "post_report",
    targetId: id,
  });
}

export async function resolveReport(
  id: string,
  status: "resolved" | "dismissed",
  actor: Actor,
): Promise<void> {
  await db()
    .update(commentReport)
    .set({ status, resolvedBy: actor.id, resolvedAt: nowKst() })
    .where(eq(commentReport.id, id));
  await logAudit({
    actorId: actor.id,
    action: `report.${status}`,
    targetType: "comment_report",
    targetId: id,
  });
}

// 당사자 답변 게시. 관계 확인이 선행 조건이고 그 근거를 verifyNote에 남긴다.
// ⚠️ 게시해도 기존 판정·사례는 손대지 않는다. 나란히 남는다.
export async function decideCompanyResponse(
  id: string,
  decision: "verified" | "rejected",
  verifyNote: string,
  actor: Actor,
): Promise<void> {
  await db()
    .update(companyResponse)
    .set({
      verifyStatus: decision,
      verifyNote,
      verifiedBy: actor.id,
      publishedAt: decision === "verified" ? nowKst() : null,
    })
    .where(eq(companyResponse.id, id));

  await logAudit({
    actorId: actor.id,
    action: `company_response.${decision}`,
    targetType: "company_response",
    targetId: id,
    reason: verifyNote,
  });
}

// 정정 처리. ⚠️ 반려도 공개 기록으로 남는다(`/corrections`).
export async function resolveCorrection(
  id: string,
  status: "accepted" | "rejected",
  resolution: string,
  actor: Actor,
): Promise<void> {
  const now = nowKst();
  const [c] = await db()
    .select()
    .from(correctionRequest)
    .where(eq(correctionRequest.id, id))
    .limit(1);
  if (!c) throw new Error(`정정 요청 없음: ${id}`);

  await db()
    .update(correctionRequest)
    .set({ status, resolution, resolvedBy: actor.id, resolvedAt: now })
    .where(eq(correctionRequest.id, id));

  if (status === "accepted") {
    await db()
      .update(post)
      .set({ status: "corrected", updatedAt: now })
      .where(eq(post.id, c.postId));
  }

  await logAudit({
    actorId: actor.id,
    action: `correction.${status}`,
    targetType: "correction_request",
    targetId: id,
    reason: resolution,
  });
}
