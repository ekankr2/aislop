import { error, fail, redirect } from "@sveltejs/kit";
import { and, eq } from "drizzle-orm";
import { logAudit } from "$lib/core/audit";
import { db } from "$lib/core/db/client";
import {
  comment,
  commentReport,
  companyResponse,
  correctionRequest,
  postReport,
  vote,
} from "$lib/core/db/schema";
import {
  canViewPost,
  getPostBySlug,
  getPostDetail,
  listComments,
  refreshCounts,
} from "$lib/core/post";
import { VOTE_CHOICES, type VoteChoice } from "$lib/core/taxonomy";
import { nowKst } from "$lib/core/time";
import { rateLimitWrite, requireUser } from "$lib/server/guard";
import {
  commentSchema,
  companyResponseSchema,
  correctionSchema,
  parseForm,
  postReportSchema,
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
  // 투표(여론). ⚠️ 한때 `/api/vote` 엔드포인트였다(피드 라우트 다섯 개가 같은 폼을
  //    쓰던 시절의 흔적). 목록에서 투표를 걷어내면서 쓰는 곳이 여기 하나가 됐고,
  //    액션으로 옮겨야 `use:enhance`가 응답을 받아 화면을 갱신할 수 있다
  //    (`+server.ts`는 액션이 아니라 enhance가 결과를 못 읽는다).
  // ⚠️ JS 없이도 동작해야 한다. enhance는 점진적 향상이라 JS가 없으면 평범한 폼
  //    POST로 떨어진다 — 그 성질을 깨는 코드를 이 액션에 넣지 마라.
  // ⚠️ 이 표가 품질(축 2)의 유일한 답이다. 운영자 판정 필드를 여기서 되살리지 마라.
  // 로그인 강제가 1인 1표의 유일한 방어선이다 — 표가 여론이 되는 순간
  // 판정당할 쪽이 직접 몰려온다. 비로그인 투표를 열지 마라.
  vote: async ({ request, params, locals, getClientAddress }) => {
    const user = requireUser(locals.user);
    await rateLimitWrite(getClientAddress());

    const choice = String((await request.formData()).get("choice") ?? "");
    if (!VOTE_CHOICES.includes(choice as VoteChoice)) error(400, "없는 선택");

    const p = await getPostBySlug(params.slug);
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
    return { ok: true };
  },

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

  // 글 신고. ⚠️ 비로그인 제출이다 — 사전 검토 없이 바로 게시되므로(2026-09-09)
  //    잘못된 글을 빨리 내리는 경로가 창구 중 제일 급하다. 가입을 요구하면 닫힌다.
  reportPost: async ({ request, params, locals, getClientAddress }) => {
    await rateLimitWrite(getClientAddress());
    const parsed = parseForm(postReportSchema, await request.formData());
    if (!parsed.ok) return fail(400, { message: parsed.message });

    const p = await getPostBySlug(params.slug);
    if (!p) error(404, "없는 사례");

    // 같은 사람이 같은 글을 반복 신고하면 UNIQUE에 걸린다 → 조용히 성공으로 친다
    // (댓글 신고와 같은 방식). ⚠️ 비로그인 신고는 reporterId가 null이라 안 걸린다 —
    //    그쪽은 IP 유량 제한이 막고, 운영 화면이 글 단위로 묶어 보여준다.
    await db()
      .insert(postReport)
      .values({
        id: crypto.randomUUID(),
        postId: p.id,
        reporterId: locals.user?.id ?? null,
        reason: parsed.value.reason,
        createdAt: nowKst(),
      })
      .onConflictDoNothing();
    return { ok: true, message: "신고 접수함." };
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
