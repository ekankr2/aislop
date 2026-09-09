import { fail } from "@sveltejs/kit";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "$lib/core/db/client";
import {
  comment,
  commentReport,
  companyResponse,
  correctionRequest,
  post,
  user,
} from "$lib/core/db/schema";
import {
  decideCompanyResponse,
  hideComment,
  resolveCorrection,
  resolveReport,
} from "$lib/core/moderation";
import { requireEditor } from "$lib/server/guard";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
  const [submissions, reports, responses, corrections] = await Promise.all([
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
      .where(
        and(
          inArray(post.status, ["submitted", "reviewing", "needs_evidence"]),
          isNull(post.deletedAt),
        ),
      )
      .orderBy(desc(post.createdAt)),
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
    db()
      .select()
      .from(companyResponse)
      .where(eq(companyResponse.verifyStatus, "pending"))
      .orderBy(desc(companyResponse.createdAt)),
    db()
      .select()
      .from(correctionRequest)
      .where(eq(correctionRequest.status, "open"))
      .orderBy(desc(correctionRequest.createdAt)),
  ]);

  return { submissions, reports, responses, corrections };
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
