import { fail, redirect } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import { db } from "$lib/core/db/client";
import { evidence, post } from "$lib/core/db/schema";
import { MAX_IMAGES_PER_POST } from "$lib/core/image";
import { createSubmission, DuplicateUrlError } from "$lib/core/post";
import { type Category, DEFAULT_CATEGORY } from "$lib/core/taxonomy";
import { allUrls, excerpt, firstUrl } from "$lib/core/text";
import { nowKst } from "$lib/core/time";
import { rateLimitWrite, requireUser } from "$lib/server/guard";
import { putEvidenceImage, UploadError } from "$lib/server/upload";
import { parseForm, submissionSchema } from "$lib/server/validate";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = ({ locals, url }) => {
  if (!locals.user)
    redirect(303, `/login?next=${encodeURIComponent(url.pathname)}`);
};

// 실패했을 때 폼에 되채울 값. ⚠️ `Object.fromEntries(data)`를 그대로 쓰지 마라 —
// FormData에 File이 섞여 있으면 SvelteKit이 실패 응답을 직렬화하지 못해 **500**이 난다
// (2026-09-10 재현: 이미지를 붙인 채 제목을 짧게 쓰면 통째로 500). 문자열 칸만 돌려준다.
// 파일 입력은 어차피 브라우저가 되채워 주지 못한다.
const textValues = (d: FormData): Record<string, string> =>
  Object.fromEntries(
    [...d].filter((e): e is [string, string] => typeof e[1] === "string"),
  );

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
        values: textValues(data),
      });

    const v = parsed.value;
    let slug: string;
    try {
      // 요약은 안 묻고 본문에서 잘라 만든다. 폼 주석 참조.
      // 원문 링크는 선택 칸이라, 비었으면 본문 첫 링크로 대신한다.
      // ⚠️ 중복 검사는 원문 하나가 아니라 **본문의 모든 링크**로 한다 —
      //    근거 링크를 먼저 붙인 글이 흔해서 첫 링크만 보면 같은 사례를 놓친다.
      const created = await createSubmission({
        url: v.url || firstUrl(v.body),
        dedupeUrls: [...(v.url ? [v.url] : []), ...allUrls(v.body)],
        title: v.title,
        summary: excerpt(v.body),
        category: (v.category ?? DEFAULT_CATEGORY) as Category,
        submitReason: v.body,
        firsthand: false,
        submitterAffiliated: v.submitterAffiliated,
        authorId: user.id,
      });
      slug = created.slug;

      // 첨부 이미지. 원문은 지워지므로 이게 유일한 근거로 남는 일이 흔하다.
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
          description: "글쓴이가 올린 이미지",
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
          values: textValues(data),
        });
      if (e instanceof DuplicateUrlError)
        return fail(409, {
          message: "중복 사례",
          duplicateSlug: e.existingSlug,
          values: textValues(data),
        });
      throw e;
    }

    // 바로 게시되므로 완료 화면 대신 글로 보낸다.
    // ⚠️ `redirect`는 throw다 — try 블록 안에 두면 catch가 삼킨다.
    redirect(303, `/posts/${encodeURIComponent(slug)}`);
  },
};
