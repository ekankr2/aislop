import { fail, redirect } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import { db } from "$lib/core/db/client";
import { evidence, post } from "$lib/core/db/schema";
import { MAX_IMAGES_PER_POST } from "$lib/core/image";
import { createSubmission, DuplicateUrlError } from "$lib/core/post";
import type { Category } from "$lib/core/taxonomy";
import { nowKst } from "$lib/core/time";
import { rateLimitWrite, requireUser } from "$lib/server/guard";
import { putEvidenceImage, UploadError } from "$lib/server/upload";
import { parseForm, submissionSchema } from "$lib/server/validate";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = ({ locals, url }) => {
  if (!locals.user)
    redirect(303, `/login?next=${encodeURIComponent(url.pathname)}`);
};

export const actions: Actions = {
  default: async ({ request, locals, getClientAddress }) => {
    const user = requireUser(locals.user);
    await rateLimitWrite(getClientAddress());

    const data = await request.formData();
    const parsed = parseForm(submissionSchema, data);
    if (!parsed.ok)
      return fail(400, {
        message: parsed.message,
        duplicateSlug: null,
        values: Object.fromEntries(data),
      });

    const v = parsed.value;
    try {
      const created = await createSubmission({
        url: v.url || null,
        title: v.title,
        summary: v.summary,
        category: v.category as Category,
        submitReason: v.submitReason,
        aiEvidence: v.aiEvidence || null,
        firsthand: v.firsthand,
        submitterAffiliated: v.submitterAffiliated,
        authorId: user.id,
      });

      if (v.evidenceUrl) {
        await db().insert(evidence).values({
          id: crypto.randomUUID(),
          postId: created.id,
          type: "screenshot",
          url: v.evidenceUrl,
          description: "제보자가 첨부한 자료",
          capturedAt: nowKst(),
          submittedBy: user.id,
          createdAt: nowKst(),
        });
      }

      // 첨부 이미지. 원문은 지워지므로 캡처가 유일한 근거로 남는 일이 흔하다.
      // ⚠️ 사례가 이미 만들어진 뒤에 올린다 — 키가 postId로 묶여야 나중에 지울 때
      //    어느 사례 것인지 알 수 있다.
      const files = data
        .getAll("images")
        .filter((f): f is File => f instanceof File && f.size > 0)
        .slice(0, MAX_IMAGES_PER_POST);
      for (const [i, file] of files.entries()) {
        const stored = await putEvidenceImage(created.id, file);
        // 첫 장은 목록 썸네일로도 쓴다. 운영자가 URL을 손으로 붙이던 자리다.
        if (i === 0)
          await db()
            .update(post)
            .set({ thumbUrl: stored.url })
            .where(eq(post.id, created.id));
        await db().insert(evidence).values({
          id: crypto.randomUUID(),
          postId: created.id,
          type: "screenshot",
          url: stored.url,
          storageKey: stored.key,
          description: "제보자가 올린 화면 캡처",
          capturedAt: nowKst(),
          submittedBy: user.id,
          createdAt: nowKst(),
        });
      }
    } catch (e) {
      if (e instanceof UploadError)
        return fail(400, {
          message: e.message,
          duplicateSlug: null,
          values: Object.fromEntries(data),
        });
      if (e instanceof DuplicateUrlError)
        return fail(409, {
          message: "이미 등록된 사례임",
          duplicateSlug: e.existingSlug,
          values: Object.fromEntries(data),
        });
      throw e;
    }

    return { done: true };
  },
};
