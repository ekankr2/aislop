import { expect, test } from "bun:test";
import { reviewPost } from "./moderation";

// ⚠️ 여기에 운영자가 정하는 값의 테스트를 만들지 마라(2026-09-09). 판정도 AI 여부도
//    필드째로 없앴다. `reviewPost`가 하는 일은 청소다 — 분류·요약·아카이브·상태.
test("없는 글은 저장되지 않는다", async () => {
  await expect(
    reviewPost(
      "없는-슬러그",
      { status: "published" },
      {
        id: "u1",
        role: "editor",
      },
    ),
  ).rejects.toThrow();
});
