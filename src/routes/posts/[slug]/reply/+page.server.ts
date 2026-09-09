import { error, fail } from "@sveltejs/kit";
import { db } from "$lib/core/db/client";
import { companyResponse, correctionRequest } from "$lib/core/db/schema";
import { adminEmail, notify } from "$lib/core/email";
import { canViewPost, getPostBySlug } from "$lib/core/post";
import { nowKst } from "$lib/core/time";
import { rateLimitWrite } from "$lib/server/guard";
import { putEvidenceImage, UploadError } from "$lib/server/upload";
import {
  companyResponseSchema,
  correctionSchema,
  parseForm,
} from "$lib/server/validate";
import type { Actions, PageServerLoad } from "./$types";

const SITE = "https://aislop.kr";

// 당사자 창구를 사례 본문에서 떼어 낸 페이지(2026-09-09 유저 지시 — "여기 두지 말고
// 버튼으로 남겨"). 상세 밑에 접혀 있으면 판정 글을 읽으러 온 사람에게는 잡음이고,
// 정작 이걸 쓸 사람(업체·제작자)은 본문 끝까지 안 내려온다.
// ⚠️ 비로그인 제출이다. 가입을 요구하면 반론 창구가 닫힌다 — 그러면 반론 기회를
//    줬다는 말이 성립하지 않고, 형법 310조 방어선이 같이 무너진다.
// ⚠️ noindex다(`Seo`). 사례마다 같은 폼이 하나씩 생겨 색인되면 얇은 중복 페이지가 된다.
export const load: PageServerLoad = async ({ params, locals }) => {
  const p = await getPostBySlug(params.slug);
  if (!p) error(404, "없는 사례");

  const viewer = locals.user
    ? { id: locals.user.id, role: locals.user.role }
    : null;
  if (!canViewPost(p, viewer)) error(404, "없는 사례");

  return { slug: p.slug, title: p.title };
};

// 첨부 이미지 한 장. 사례가 아니라 **제출물**에 붙는다 — 게시 전이라 `evidence`에
// 넣지 않고 행에 URL만 들고 있다가, 운영자가 승인할 때 화면에 나간다.
// 키는 `evidence/<postId>/...`라 사례를 지우면 같이 정리된다.
async function attach(postId: string, data: FormData) {
  const file = data.get("image");
  if (!(file instanceof File) || file.size === 0)
    return { imageUrl: null, imageKey: null };
  const stored = await putEvidenceImage(postId, file);
  return { imageUrl: stored.url, imageKey: stored.key };
}

export const actions: Actions = {
  companyResponse: async ({ request, params, getClientAddress }) => {
    await rateLimitWrite(getClientAddress());
    const data = await request.formData();
    const parsed = parseForm(companyResponseSchema, data);
    if (!parsed.ok) return fail(400, { message: parsed.message });

    const p = await getPostBySlug(params.slug);
    if (!p) error(404, "없는 사례");

    let img: { imageUrl: string | null; imageKey: string | null };
    try {
      img = await attach(p.id, data);
    } catch (e) {
      if (e instanceof UploadError) return fail(400, { message: e.message });
      throw e;
    }

    await db()
      .insert(companyResponse)
      .values({
        id: crypto.randomUUID(),
        postId: p.id,
        ...parsed.value,
        ...img,
        createdAt: nowKst(),
      });

    const to = adminEmail();
    if (to)
      await notify({
        to,
        subject: `[aislop] 당사자 답변 — ${p.title}`,
        text: `${parsed.value.submitterName} (${parsed.value.submitterRole}) · ${parsed.value.submitterEmail}\n\n${parsed.value.body}\n\n글: ${SITE}/posts/${encodeURIComponent(p.slug)}\n처리: ${SITE}/admin`,
      });

    return { ok: true, message: "답변 접수함. 관계 확인 후 게시됨." };
  },

  correction: async ({ request, params, getClientAddress }) => {
    await rateLimitWrite(getClientAddress());
    const data = await request.formData();
    const parsed = parseForm(correctionSchema, data);
    if (!parsed.ok) return fail(400, { message: parsed.message });

    const p = await getPostBySlug(params.slug);
    if (!p) error(404, "없는 사례");

    let img: { imageUrl: string | null; imageKey: string | null };
    try {
      img = await attach(p.id, data);
    } catch (e) {
      if (e instanceof UploadError) return fail(400, { message: e.message });
      throw e;
    }

    await db()
      .insert(correctionRequest)
      .values({
        id: crypto.randomUUID(),
        postId: p.id,
        ...parsed.value,
        evidenceUrl: parsed.value.evidenceUrl || null,
        ...img,
        createdAt: nowKst(),
      });

    const to = adminEmail();
    if (to)
      await notify({
        to,
        subject: `[aislop] 정정 요청 — ${p.title}`,
        text: `${parsed.value.requesterName} · ${parsed.value.requesterEmail}\n\n${parsed.value.claim}\n\n근거: ${parsed.value.evidenceUrl || "없음"}\n첨부: ${img.imageUrl ?? "없음"}\n\n글: ${SITE}/posts/${encodeURIComponent(p.slug)}\n처리: ${SITE}/admin`,
      });

    return {
      ok: true,
      message: "정정 요청 접수함. 처리 결과는 공개 기록에 남음.",
    };
  },
};
