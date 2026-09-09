import { fail } from "@sveltejs/kit";
import { desc, eq, isNull } from "drizzle-orm";
import { db } from "$lib/core/db/client";
import {
  comment,
  commentReport,
  companyResponse,
  correctionRequest,
  post,
  postReport,
  user,
} from "$lib/core/db/schema";
import {
  decideCompanyResponse,
  hideComment,
  hidePost,
  resolveCorrection,
  resolvePostReport,
  resolveReport,
} from "$lib/core/moderation";
import { requireEditor } from "$lib/server/guard";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
  const [submissions, postReports, reports, responses, corrections] =
    await Promise.all([
      db()
        .select({
          slug: post.slug,
          title: post.title,
          summary: post.summary,
          url: post.url,
          status: post.status,
          createdAt: post.createdAt,
          submitterAffiliated: post.submitterAffiliated,
          authorName: user.name,
        })
        .from(post)
        .innerJoin(user, eq(user.id, post.authorId))
        // ⚠️ 상태로 거르지 않는다. 글이 바로 게시되므로(2026-09-09) 검토 대기 큐가
        //    비어 있고, 운영자가 할 일은 **올라온 글에 판정·분류를 붙이는 것**이다.
        .where(isNull(post.deletedAt))
        .orderBy(desc(post.createdAt))
        .limit(50),
      // 글 신고. ⚠️ 사전 검토가 없어졌으므로(2026-09-09) 이 큐가 제일 급하다.
      db()
        .select({
          id: postReport.id,
          reason: postReport.reason,
          createdAt: postReport.createdAt,
          postId: post.id,
          postSlug: post.slug,
          postTitle: post.title,
          deletedAt: post.deletedAt,
        })
        .from(postReport)
        .innerJoin(post, eq(post.id, postReport.postId))
        .where(eq(postReport.status, "open"))
        .orderBy(desc(postReport.createdAt)),
      db()
        .select({
          id: commentReport.id,
          reason: commentReport.reason,
          createdAt: commentReport.createdAt,
          commentId: comment.id,
          body: comment.body,
          hiddenAt: comment.hiddenAt,
          postSlug: post.slug,
        })
        .from(commentReport)
        .innerJoin(comment, eq(comment.id, commentReport.commentId))
        .innerJoin(post, eq(post.id, comment.postId))
        .where(eq(commentReport.status, "open"))
        .orderBy(desc(commentReport.createdAt)),
      // ⚠️ 어느 글에 온 건지 같이 뽑는다(2026-09-09 유저 지시). 창구가 사례 페이지에서
      //    떨어져 나온 뒤로(`/posts/[slug]/reply`) 목록만 봐서는 대상 글을 알 수 없다.
      db()
        .select({ r: companyResponse, postSlug: post.slug, postTitle: post.title })
        .from(companyResponse)
        .innerJoin(post, eq(post.id, companyResponse.postId))
        .where(eq(companyResponse.verifyStatus, "pending"))
        .orderBy(desc(companyResponse.createdAt)),
      db()
        .select({ c: correctionRequest, postSlug: post.slug, postTitle: post.title })
        .from(correctionRequest)
        .innerJoin(post, eq(post.id, correctionRequest.postId))
        .where(eq(correctionRequest.status, "open"))
        .orderBy(desc(correctionRequest.createdAt)),
    ]);

  return { submissions, postReports, reports, responses, corrections };
};

const actorOf = (locals: App.Locals) => {
  const u = requireEditor(locals.user);
  return { id: u.id, role: u.role };
};

export const actions: Actions = {
  hideComment: async ({ request, locals }) => {
    const actor = actorOf(locals);
    const f = await request.formData();
    const reason = String(f.get("reason") ?? "").trim();
    if (!reason) return fail(400, { message: "숨김 사유를 입력" });
    await hideComment(String(f.get("commentId")), reason, actor);
    await resolveReport(String(f.get("reportId")), "resolved", actor);
    return { ok: true };
  },

  hidePost: async ({ request, locals }) => {
    const actor = actorOf(locals);
    const f = await request.formData();
    const reason = String(f.get("reason") ?? "").trim();
    if (!reason) return fail(400, { message: "내리는 사유를 입력" });
    await hidePost(String(f.get("postId")), reason, actor);
    await resolvePostReport(String(f.get("reportId")), "resolved", actor);
    return { ok: true };
  },

  dismissPostReport: async ({ request, locals }) => {
    const actor = actorOf(locals);
    const f = await request.formData();
    await resolvePostReport(String(f.get("reportId")), "dismissed", actor);
    return { ok: true };
  },

  dismissReport: async ({ request, locals }) => {
    const actor = actorOf(locals);
    const f = await request.formData();
    await resolveReport(String(f.get("reportId")), "dismissed", actor);
    return { ok: true };
  },

  decideResponse: async ({ request, locals }) => {
    const actor = actorOf(locals);
    const f = await request.formData();
    const decision = String(f.get("decision"));
    if (decision !== "verified" && decision !== "rejected")
      return fail(400, { message: "모르는 결정" });
    const note = String(f.get("verifyNote") ?? "").trim();
    // 관계 확인 근거를 안 적으면 나중에 "왜 게시했나"에 답할 수 없다.
    if (!note) return fail(400, { message: "관계 확인 근거를 입력" });
    await decideCompanyResponse(String(f.get("id")), decision, note, actor);
    return { ok: true };
  },

  resolveCorrection: async ({ request, locals }) => {
    const actor = actorOf(locals);
    const f = await request.formData();
    const status = String(f.get("status"));
    if (status !== "accepted" && status !== "rejected")
      return fail(400, { message: "모르는 결정" });
    const resolution = String(f.get("resolution") ?? "").trim();
    if (!resolution) return fail(400, { message: "처리 내용을 입력" });
    await resolveCorrection(String(f.get("id")), status, resolution, actor);
    return { ok: true };
  },
};
