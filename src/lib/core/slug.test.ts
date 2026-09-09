import { expect, test } from "bun:test";
import { slugify, uniqueSlug } from "./slug";

test("한글은 로마자로 옮기지 않고 그대로 둔다", () => {
  expect(slugify("배달앱 AI 음식사진")).toBe("배달앱-ai-음식사진");
});

test("기호는 하이픈으로 접고 양끝은 자른다", () => {
  expect(slugify("  FitTrackGPT: 3일 체험!! ")).toBe("fittrackgpt-3일-체험");
});

test("충돌하면 접미사를 붙인다", () => {
  const taken = new Set(["a", "a-2"]);
  expect(uniqueSlug("a", (s) => taken.has(s))).toBe("a-3");
});

test("빈 제목도 slug를 만든다", () => {
  expect(uniqueSlug(slugify("!!!"), () => false)).toBe("post");
});
