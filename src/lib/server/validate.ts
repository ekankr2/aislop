// 입력 검증은 zod 한 곳에서. 폼 필드를 라우트마다 손으로 까면
// 길이 제한을 빠뜨리고 그게 곧 D1 용량 사고가 된다.

import { z } from "zod";
import { CATEGORY_SLUGS } from "$lib/core/taxonomy";

const trimmed = (max: number) => z.string().trim().max(max);

// ⚠️ `z.url()`은 스킴을 보지 않아 `javascript:alert(1)`도 통과시킨다.
// 이 값은 그대로 `<a href>`에 들어가므로 스킴 제한이 곧 XSS 방어선이다.
const httpUrl = (max: number) =>
  z
    .url()
    .max(max)
    .refine((v) => v.startsWith("http://") || v.startsWith("https://"), {
      message: "http 또는 https 주소만 됨",
    });

export const submissionSchema = z.object({
  url: z.union([httpUrl(2000), z.literal("")]).optional(),
  title: trimmed(160).min(4, "제목은 4자 이상"),
  summary: trimmed(600).min(10, "한 줄 요약은 10자 이상"),
  category: z.enum(CATEGORY_SLUGS as [string, ...string[]]),
  submitReason: trimmed(1500).min(10, "Slop이라고 보는 이유를 10자 이상"),
  aiEvidence: trimmed(1500).optional(),
  evidenceUrl: z.union([httpUrl(2000), z.literal("")]).optional(),
  firsthand: z.coerce.boolean().default(false),
  submitterAffiliated: z.coerce.boolean().default(false),
});

export const commentSchema = z.object({
  body: trimmed(2000).min(2, "내용을 입력"),
  parentId: trimmed(40).optional(),
});

export const reportSchema = z.object({
  commentId: trimmed(40).min(1),
  reason: trimmed(500).min(4, "신고 사유를 입력"),
});

export const companyResponseSchema = z.object({
  submitterName: trimmed(60).min(1, "이름을 입력"),
  submitterEmail: z.email().max(200),
  submitterRole: trimmed(80).min(1, "직함·역할을 입력"),
  body: trimmed(4000).min(10, "내용을 입력"),
});

export const correctionSchema = z.object({
  requesterName: trimmed(60).min(1),
  requesterEmail: z.email().max(200),
  claim: trimmed(3000).min(10, "무엇이 사실과 다른지 입력"),
  evidenceUrl: z.union([httpUrl(2000), z.literal("")]).optional(),
});

// 폼 파싱 결과를 라우트마다 같은 모양으로 다룬다.
export function parseForm<T extends z.ZodType>(
  schema: T,
  data: FormData,
): { ok: true; value: z.output<T> } | { ok: false; message: string } {
  const raw: Record<string, unknown> = {};
  for (const [k, v] of data.entries()) if (typeof v === "string") raw[k] = v;
  const r = schema.safeParse(raw);
  return r.success
    ? { ok: true, value: r.data }
    : {
        ok: false,
        message: r.error.issues[0]?.message ?? "입력이 잘못됨",
      };
}
