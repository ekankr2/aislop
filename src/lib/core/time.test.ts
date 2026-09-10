import { expect, test } from "bun:test";
import { relative, toKst } from "./time";

test("KST 문자열은 사전순 = 시간순이다", () => {
  const a = toKst(new Date("2026-01-01T00:00:00Z"));
  const b = toKst(new Date("2026-01-02T00:00:00Z"));
  expect(a < b).toBe(true);
  expect(a.endsWith("+09:00")).toBe(true);
});

test("상대 시각", () => {
  const now = new Date("2026-09-08T12:00:00+09:00");
  expect(relative("2026-09-08T11:59:30+09:00", now)).toBe("방금");
  expect(relative("2026-09-08T11:30:00+09:00", now)).toBe("30분 전");
  expect(relative("2026-09-08T09:00:00+09:00", now)).toBe("3시간 전");
  expect(relative("2026-09-05T12:00:00+09:00", now)).toBe("3일 전");
  // 일주일이 넘으면 날짜로 떨어진다.
  expect(relative("2026-08-01T12:00:00+09:00", now)).toBe("26.08.01");
  expect(relative("깨진 값", now)).toBe("");
});
