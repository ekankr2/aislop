import { describe, expect, test } from "bun:test";
import { displayDomain, normalizeUrl, safeHttpUrl } from "./url";

describe("normalizeUrl", () => {
  test("추적 파라미터와 www, 트레일링 슬래시를 같은 값으로 접는다", () => {
    const a = normalizeUrl(
      "https://www.example.com/post/?utm_source=threads&id=3",
    );
    const b = normalizeUrl("http://example.com/post?id=3");
    expect(a).toBe(b);
  });

  test("쿼리 순서가 달라도 같은 값이다", () => {
    expect(normalizeUrl("https://a.com/x?b=2&a=1")).toBe(
      normalizeUrl("https://a.com/x?a=1&b=2"),
    );
  });

  test("해시는 버린다", () => {
    expect(normalizeUrl("https://a.com/x#section")).toBe(
      normalizeUrl("https://a.com/x"),
    );
  });

  test("다른 경로는 접히지 않는다", () => {
    expect(normalizeUrl("https://a.com/x")).not.toBe(
      normalizeUrl("https://a.com/y"),
    );
  });

  test("http(s)가 아니면 거부한다", () => {
    expect(normalizeUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeUrl("그냥 문자열")).toBeNull();
  });
});

test("displayDomain은 www를 뗀다", () => {
  expect(displayDomain("https://www.news.co.kr/a/b")).toBe("news.co.kr");
  expect(displayDomain("깨진 값")).toBe("");
});

test("safeHttpUrl은 http(s)만 통과시킨다", () => {
  expect(safeHttpUrl("https://a.com")).toBe("https://a.com");
  expect(safeHttpUrl("javascript:alert(1)")).toBeNull();
  expect(safeHttpUrl("data:text/html,<script>")).toBeNull();
  expect(safeHttpUrl("")).toBeNull();
  expect(safeHttpUrl(null)).toBeNull();
});
