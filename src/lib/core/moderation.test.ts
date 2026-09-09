import { expect, test } from "bun:test";
import { reviewPost } from "./moderation";

// 근거 검사는 DB에 닿기 전에 끝나므로 요청 컨텍스트 없이 검증된다.
// ⚠️ 이게 축 1의 강제 장치다. 순서를 뒤로 밀면 테스트가 아니라 원칙이 깨진다.
// ⚠️ 여기에 품질 판정 테스트를 다시 만들지 마라(2026-09-09) — 품질은 유저 표가 정하고
//    운영자가 찍는 도장은 없다. 운영자가 하는 건 사실 확인뿐이다.
const editor = { id: "u1", role: "editor" };

test("AI 사용을 확인했다면 근거를 적어야 한다", async () => {
  await expect(
    reviewPost("x", { status: "published", aiStatus: "confirmed" }, editor),
  ).rejects.toThrow("근거");
  await expect(
    reviewPost(
      "x",
      { status: "published", aiStatus: "self_disclosed" },
      editor,
    ),
  ).rejects.toThrow("근거");
});
