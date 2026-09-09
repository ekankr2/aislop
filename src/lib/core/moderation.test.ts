import { expect, test } from "bun:test";
import { ForbiddenVerdictError, reviewPost } from "./moderation";

// 역할·근거 검사는 DB에 닿기 전에 끝나므로 요청 컨텍스트 없이 검증된다.
// ⚠️ 이 세 검사가 제품 원칙의 강제 장치다. 순서를 바꾸면 테스트가 아니라 원칙이 깨진다.
const editor = { id: "u1", role: "editor" };
const member = { id: "u2", role: "member" };
const base = { status: "published" as const, aiStatus: "unknown" as const };

test("일반 회원은 Slop 판정을 내릴 수 없다", async () => {
  await expect(
    reviewPost("x", { ...base, verdict: "slop", verdictNote: "근거" }, member),
  ).rejects.toBeInstanceOf(ForbiddenVerdictError);
});

test("근거 없는 판정은 저장되지 않는다", async () => {
  await expect(
    reviewPost("x", { ...base, verdict: "slop", verdictNote: "  " }, editor),
  ).rejects.toThrow("근거");
});

test("AI 사용을 확인했다면 근거를 적어야 한다", async () => {
  await expect(
    reviewPost(
      "x",
      { status: "published", aiStatus: "confirmed", verdict: "unrated" },
      editor,
    ),
  ).rejects.toThrow("근거");
});
