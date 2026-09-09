import { error, fail, redirect } from "@sveltejs/kit";
import { and, eq } from "drizzle-orm";
import { logAudit } from "$lib/core/audit";
import { db } from "$lib/core/db/client";
import {
  comment,
  commentReport,
  companyResponse,
  correctionRequest,
  vote,
} from "$lib/core/db/schema";
import {
  canViewPost,
  getPostBySlug,
  getPostDetail,
  listComments,
  refreshCounts,
} from "$lib/core/post";
import type { VoteChoice } from "$lib/core/taxonomy";
import { nowKst } from "$lib/core/time";
import { rateLimitWrite, requireUser } from "$lib/server/guard";
import {
  commentSchema,
  companyResponseSchema,
  correctionSchema,
  parseForm,
  reportSchema,
} from "$lib/server/validate";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params, locals }) => {
  const detail = await getPostDetail(params.slug);
  if (!detail) error(404, "없는 사례");

  const viewer = locals.user
    ? { id: locals.user.id, role: locals.user.role }
    : null;
  if (!canViewPost(detail.post, viewer)) error(404, "없는 사례");

  // 버튼 상태 표시용. 한 사람 한 표는 DB PK가 강제한다.
  const [mine] = locals.user
    ? await db()
        .select({ choice: vote.choice })
        .from(vote)
        .where(
          and(eq(vote.postId, detail.post.id), eq(vote.userId, locals.user.id)),
        )
        .limit(1)
    : [];

  return {
    ...detail,
    comments: await listComments(detail.post.id),
    myVote: (mine?.choice as VoteChoice | undefined) ?? null,
  };
};

export const actions: Actions = {
  comment: async ({ request, params, locals, getClientAddress }) => {
    const user = requireUser(locals.user);
    await rateLimitWrite(getClientAddress());

    const parsed = parseForm(commentSchema, await request.formData());
    if (!parsed.ok) return fail(400, { message: parsed.message });

    const p = await getPostBySlug(params.slug);
    if (!p) error(404, "없는 사례");

    const now = nowKst();
    await db()
      .insert(comment)
      .values({
        id: crypto.randomUUID(),
        postId: p.id,
        userId: user.id,
        parentId: parsed.value.parentId || null,
        body: parsed.value.body,
        createdAt: now,
        updatedAt: now,
      });
    await refreshCounts(p.id);
    return { ok: true };
  },

  report: async ({ request, locals, getClientAddress }) => {
    const user = requireUser(locals.user);
    await rateLimitWrite(getClientAddress());

    const parsed = parseForm(reportSchema, await request.formData());
    if (!parsed.ok) return fail(400, { message: parsed.message });

    // 같은 사람이 같은 댓글을 반복 신고하면 UNIQUE에 걸린다 → 조용히 성공으로 친다.
    await db()
      .insert(commentReport)
      .values({
        id: crypto.randomUUID(),
        commentId: parsed.value.commentId,
        reporterId: user.id,
        reason: parsed.value.reason,
        createdAt: nowKst(),
      })
      .onConflictDoNothing();

    return { ok: true, message: "신고 접수함" };
  },

  // ⚠️ 당사자 답변과 정정 요청은 **비로그인 제출**이다. 가입을 요구하면 반론 창구가 닫힌다.
  companyResponse: async ({ request, params, getClientAddress }) => {
    await rateLimitWrite(getClientAddress());
    const parsed = parseForm(companyResponseSchema, await request.formData());
    if (!parsed.ok) return fail(400, { message: parsed.message });

    const p = await getPostBySlug(params.slug);
    if (!p) error(404, "없는 사례");

    await db()
      .insert(companyResponse)
      .values({
        id: crypto.randomUUID(),
        postId: p.id,
        ...parsed.value,
        createdAt: nowKst(),
      });
    return {
      ok: true,
      message: "답변 접수함. 관계 확인 후 게시됨.",
    };
  },

  correction: async ({ request, params, getClientAddress }) => {
    await rateLimitWrite(getClientAddress());
    const parsed = parseForm(correctionSchema, await request.formData());
    if (!parsed.ok) return fail(400, { message: parsed.message });

    const p = await getPostBySlug(params.slug);
    if (!p) error(404, "없는 사례");

    await db()
      .insert(correctionRequest)
      .values({
        id: crypto.randomUUID(),
        postId: p.id,
        ...parsed.value,
        evidenceUrl: parsed.value.evidenceUrl || null,
        createdAt: nowKst(),
      });
    return {
      ok: true,
      message: "정정 요청 접수함. 처리 결과는 공개 기록에 남음.",
    };
  },

  // 작성자 본인 삭제. 행을 지우지 않고 표시만 바꾼다 — 대댓글 맥락이 끊긴다.
  deleteComment: async ({ request, params, locals }) => {
    const user = requireUser(locals.user);
    const id = String((await request.formData()).get("commentId") ?? "");
    const [c] = await db()
      .select()
      .from(comment)
      .where(eq(comment.id, id))
      .limit(1);
    if (!c) error(404, "없는 댓글");
    if (c.userId !== user.id) error(403, "권한 없음");

    await db()
      .update(comment)
      .set({ deletedAt: nowKst() })
      .where(eq(comment.id, id));
    await refreshCounts(c.postId);
    await logAudit({
      actorId: user.id,
      action: "comment.delete_own",
      targetType: "comment",
      targetId: id,
    });
    // ⚠️ params.slug는 디코딩된 값이다(한글 포함). Location 헤더용으로 다시 인코딩한다.
    redirect(303, `/posts/${encodeURIComponent(params.slug)}#comments`);
  },
};
