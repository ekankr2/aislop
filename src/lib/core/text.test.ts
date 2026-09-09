import { expect, test } from "bun:test";
import { allUrls, excerpt, firstUrl, linkify } from "./text";

// 폼이 URL을 따로 묻지 않으므로 중복 검사와 도메인 표시가 이 함수에 걸려 있다.
test("본문 첫 주소를 원문으로 뽑는다", () => {
  expect(firstUrl("여기서 봤다 https://a.com/x 그리고 https://b.com")).toBe(
    "https://a.com/x",
  );
  expect(firstUrl("주소 없는 목격담")).toBeNull();
});

// 유저 입력이 그대로 <a href>에 들어간다. 스킴 제한이 XSS 방어선이다.
test("http(s)가 아닌 스킴은 링크로 만들지 않는다", () => {
  expect(firstUrl("javascript:alert(1)")).toBeNull();
  expect(linkify("javascript:alert(1)").every((s) => s.href === null)).toBe(
    true,
  );
});

test("문장 끝 마침표는 주소에 넣지 않는다", () => {
  expect(firstUrl("여기다 https://a.com/x.")).toBe("https://a.com/x");
});

test("링크 조각과 글자 조각으로 쪼갠다", () => {
  const segs = linkify("앞 https://a.com 뒤");
  expect(segs.map((s) => s.text)).toEqual(["앞 ", "https://a.com", " 뒤"]);
  expect(segs[1].href).toBe("https://a.com");
});

test("요약은 공백을 접고 길면 자른다", () => {
  expect(excerpt("한 줄\n\n두 줄")).toBe("한 줄 두 줄");
  expect(excerpt("가".repeat(200)).length).toBe(160);
});

// 근거 링크를 원문보다 먼저 붙이는 제보가 흔하다. 첫 링크만 보면 중복을 놓친다.
test("본문의 주소를 전부 뽑는다 — 중복 검사용", () => {
  expect(allUrls("근거 https://a.com 원문 https://b.com/x")).toEqual([
    "https://a.com",
    "https://b.com/x",
  ]);
  expect(allUrls("같은 주소 https://a.com 두 번 https://a.com")).toEqual([
    "https://a.com",
  ]);
});
