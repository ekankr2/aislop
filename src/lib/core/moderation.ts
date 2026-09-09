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
} from "./db/schema";
import {
  type AiStatus,
  EDITOR_ONLY_VERDICTS,
  isEditor,
  type PostStatus,
  type Verdict,
} from "./taxonomy";
import { nowKst } from "./time";

type Actor = { id: string; role: string };

export class ForbiddenVerdictError extends Error {
  constructor(v: Verdict) {
    super(`'${v}' 판정은 운영자만 설정할 수 있습니다.`);
  }
}

export interface ReviewInput {
  status: PostStatus;
  category?: string;
  aiStatus: AiStatus;
  aiEvidence?: string | null;
  verdict: Verdict;
  verdictNote?: string | null;
  problems?: string | null;
  facts?: string | null;
  archiveUrl?: string | null;
  thumbUrl?: string | null;
  reviewNote?: string | null;
}

// ⚠️ 판정 변경의 유일한 경로다. 여기를 우회하면 감사 로그가 비고
//    "판정이 왜 바뀌었나"에 답할 수 없게 된다.
export async function reviewPost(
  slug: string,
  input: ReviewInput,
  actor: Actor,
): Promise<void> {
  // ⚠️ 검사가 **DB 조회보다 먼저**다. 이 세 개가 제품 원칙의 강제 장치이고,
  //    뒤로 밀면 잘못된 입력이 DB에 닿은 뒤에야 막힌다.
  if (EDITOR_ONLY_VERDICTS.includes(input.verdict) && !isEditor(actor.role)) {
    throw new ForbiddenVerdictError(input.verdict);
  }
  if (input.verdict !== "unrated" && !input.verdictNote?.trim()) {
    throw new Error("판정에는 근거가 필요합니다.");
  }
  if (
    (input.aiStatus === "confirmed" || input.aiStatus === "self_disclosed") &&
    !input.aiEvidence?.trim()
  ) {
    throw new Error("AI 사용을 확인했다면 그 근거를 적어야 합니다.");
  }

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
      aiStatus: input.aiStatus,
      aiEvidence: input.aiEvidence ?? null,
      verdict: input.verdict,
      verdictNote: input.verdictNote ?? null,
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
    reason: input.verdictNote ?? input.reviewNote ?? null,
    meta: {
      status: [p.status, input.status],
      aiStatus: [p.aiStatus, input.aiStatus],
      verdict: [p.verdict, input.verdict],
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
