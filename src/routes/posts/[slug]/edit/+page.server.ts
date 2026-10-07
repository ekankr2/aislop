import { error, fail, redirect } from "@sveltejs/kit";
import {
  DuplicateUrlError,
  deleteOwnPost,
  getPostBySlug,
  type Post,
  updateSubmission,
} from "$lib/core/post";
import { type Category, DEFAULT_CATEGORY } from "$lib/core/taxonomy";
import { allUrls, excerpt, firstUrl } from "$lib/core/text";
import { rateLimitWrite, requireUser } from "$lib/server/guard";
import { parseForm, submissionSchema } from "$lib/server/validate";
import type { Actions, PageServerLoad } from "./$types";

// 수정·삭제는 **작성자 본인만**. 운영자는 `/admin/posts/[slug]`가 따로 있다.
// ⚠️ 운영자에게 이 화면을 열지 마라 — 남의 글 본문을 운영자가 고치는 길이 생긴다.
const ownPost = async (
  slug: string,
  userId: string | undefined,
): Promise<Post> => {
  const p = await getPostBySlug(slug);
  if (!p || p.authorId !== userId) error(404, "없는 사례");
  return p;
};

export const load: PageServerLoad = async ({ params, locals, url }) => {
  if (!locals.user)
    redirect(303, `/login?next=${encodeURIComponent(url.pathname)}`);
  const p = await ownPost(params.slug, locals.user.id);
  return {
    post: {
      slug: p.slug,
      title: p.title,
      url: p.url,
      body: p.submitReason ?? p.summary,
      category: p.category,
      submitterAffiliated: p.submitterAffiliated,
    },
  };
};

export const actions: Actions = {
  save: async ({ request, params, locals, getClientAddress }) => {
    const user = requireUser(locals.user);
    await rateLimitWrite(getClientAddress());
    const p = await ownPost(params.slug, user.id);

    const data = await request.formData();
    const parsed = parseForm(submissionSchema, data);
    if (!parsed.ok)
      return fail(400, { message: parsed.message, duplicateSlug: null });

    const v = parsed.value;
    try {
      // 글쓰기와 같은 규칙이다(submit/+page.server.ts).
      await updateSubmission(
        p,
        {
          url: v.url || firstUrl(v.body),
          dedupeUrls: [...(v.url ? [v.url] : []), ...allUrls(v.body)],
          title: v.title,
          summary: excerpt(v.body),
          category: (v.category ?? DEFAULT_CATEGORY) as Category,
          submitReason: v.body,
          submitterAffiliated: v.submitterAffiliated,
        },
        user.id,
      );
    } catch (e) {
      if (e instanceof DuplicateUrlError)
        return fail(409, {
          message: "중복 사례",
          duplicateSlug: e.existingSlug,
        });
      throw e;
    }
    redirect(303, `/posts/${encodeURIComponent(p.slug)}`);
  },

  delete: async ({ params, locals }) => {
    const user = requireUser(locals.user);
    const p = await ownPost(params.slug, user.id);
    await deleteOwnPost(p, user.id);
    redirect(303, `/users/${user.id}`);
  },
};
