import { error, fail, redirect } from "@sveltejs/kit";
import { and, eq } from "drizzle-orm";
import { db } from "$lib/core/db/client";
import { evidence, post, user } from "$lib/core/db/schema";
import { MAX_IMAGES_PER_POST } from "$lib/core/image";
import { ForbiddenVerdictError, reviewPost } from "$lib/core/moderation";
import {
  AI_STATUSES,
  type AiStatus,
  CATEGORY_SLUGS,
  POST_STATUSES,
  type PostStatus,
  VERDICTS,
  type Verdict,
} from "$lib/core/taxonomy";
import { nowKst } from "$lib/core/time";
import { safeHttpUrl } from "$lib/core/url";
import { requireEditor } from "$lib/server/guard";
import {
  deleteEvidenceImage,
  putEvidenceImage,
  UploadError,
} from "$lib/server/upload";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params }) => {
  const [p] = await db()
    .select()
    .from(post)
    .where(eq(post.slug, params.slug))
    .limit(1);
  if (!p) error(404, "없는 사례");

  const [author] = await db()
    .select({ name: user.name })
    .from(user)
    .where(eq(user.id, p.authorId));
  return {
    post: p,
    authorName: author?.name ?? "알 수 없음",
    evidences: await db()
      .select()
      .from(evidence)
      .where(eq(evidence.postId, p.id)),
  };
};

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export const actions: Actions = {
  // 캡처 추가. 저장 폼과 분리한 이유는 이미지 하나 올리려고 판정 필드를 전부 다시
  // 제출하게 만들 이유가 없어서다(판정은 `reviewPost`가 근거 검사를 건다).
  addImage: async ({ request, params, locals }) => {
    const u = requireEditor(locals.user);
    const f = await request.formData();
    const [p] = await db()
      .select({ id: post.id, thumbUrl: post.thumbUrl })
      .from(post)
      .where(eq(post.slug, params.slug))
      .limit(1);
    if (!p) error(404, "없는 사례");

    const files = f
      .getAll("images")
      .filter((x): x is File => x instanceof File && x.size > 0)
      .slice(0, MAX_IMAGES_PER_POST);
    if (files.length === 0) return fail(400, { message: "고른 파일 없음" });

    try {
      for (const [i, file] of files.entries()) {
        const stored = await putEvidenceImage(p.id, file);
        if (i === 0 && !p.thumbUrl)
          await db()
            .update(post)
            .set({ thumbUrl: stored.url })
            .where(eq(post.id, p.id));
        await db()
          .insert(evidence)
          .values({
            id: crypto.randomUUID(),
            postId: p.id,
            type: "screenshot",
            url: stored.url,
            storageKey: stored.key,
            description: str(f, "description") || "운영자가 보존한 화면 캡처",
            capturedAt: nowKst(),
            submittedBy: u.id,
            // 운영자가 직접 올린 것이라 검증 상태를 바로 준다.
            verifyStatus: "verified",
            verifiedBy: u.id,
            createdAt: nowKst(),
          });
      }
    } catch (e) {
      if (e instanceof UploadError) return fail(400, { message: e.message });
      throw e;
    }
    return { ok: true, message: "캡처 올림" };
  },

  // ⚠️ R2 객체까지 같이 지운다. 행만 지우면 아무도 안 가리키는 파일이 영영 남는다.
  //    (사이트 원칙의 soft delete는 **사례·댓글** 얘기다 — 근거 파일은 실물이라
  //     지우기로 했으면 실제로 지워야 한다. 감사 로그는 판정 쪽에 남는다.)
  removeImage: async ({ request, params, locals }) => {
    requireEditor(locals.user);
    const f = await request.formData();
    const id = str(f, "evidenceId");
    const [row] = await db()
      .select()
      .from(evidence)
      .where(eq(evidence.id, id))
      .limit(1);
    if (!row) return fail(404, { message: "없는 근거" });

    if (row.storageKey) await deleteEvidenceImage(row.storageKey);
    await db().delete(evidence).where(eq(evidence.id, id));
    // 썸네일이 그 파일을 가리키고 있었으면 같이 떼어낸다 — 안 그러면 목록에 깨진
    // 이미지가 남는다.
    if (row.url)
      await db()
        .update(post)
        .set({ thumbUrl: null })
        .where(and(eq(post.slug, params.slug), eq(post.thumbUrl, row.url)));
    return { ok: true, message: "캡처 지움" };
  },

  default: async ({ request, params, locals }) => {
    const u = requireEditor(locals.user);
    const f = await request.formData();

    const status = str(f, "status");
    const aiStatus = str(f, "aiStatus");
    const verdict = str(f, "verdict");
    const category = str(f, "category");
    if (!POST_STATUSES.includes(status as PostStatus))
      return fail(400, { message: "모르는 상태" });
    if (!AI_STATUSES.includes(aiStatus as AiStatus))
      return fail(400, { message: "모르는 AI 상태" });
    if (!VERDICTS.includes(verdict as Verdict))
      return fail(400, { message: "모르는 판정" });
    if (!CATEGORY_SLUGS.includes(category as (typeof CATEGORY_SLUGS)[number]))
      return fail(400, { message: "모르는 분류" });

    try {
      await reviewPost(
        params.slug,
        {
          status: status as PostStatus,
          category,
          aiStatus: aiStatus as AiStatus,
          aiEvidence: str(f, "aiEvidence") || null,
          verdict: verdict as Verdict,
          verdictNote: str(f, "verdictNote") || null,
          problems: str(f, "problems") || null,
          facts: str(f, "facts") || null,
          // ⚠️ 관리자 입력도 스킴을 검사한다 — 계정 탈취 한 번이면 이 폼이 곧 XSS 입구다.
          archiveUrl: safeHttpUrl(str(f, "archiveUrl")),
          thumbUrl: safeHttpUrl(str(f, "thumbUrl")),
          reviewNote: str(f, "reviewNote") || null,
        },
        { id: u.id, role: u.role },
      );
    } catch (e) {
      if (e instanceof ForbiddenVerdictError || e instanceof Error)
        return fail(400, { message: e.message });
      throw e;
    }

    redirect(303, "/admin");
  },
};
