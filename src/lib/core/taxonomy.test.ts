import { expect, test } from "bun:test";
import {
  isAdmin,
  isEditor,
  opinion,
  PUBLIC_POST_STATUSES,
  VOTE_CHOICES,
} from "./taxonomy";

test("검토 대기·반려는 공개 피드에 나오지 않는다", () => {
  for (const s of [
    "submitted",
    "reviewing",
    "needs_evidence",
    "rejected",
    "archived",
  ]) {
    expect(PUBLIC_POST_STATUSES).not.toContain(s);
  }
});

test("역할 판정", () => {
  expect(isEditor("editor")).toBe(true);
  expect(isEditor("admin")).toBe(true);
  expect(isEditor("member")).toBe(false);
  expect(isAdmin("editor")).toBe(false);
});

/* ── 투표(여론) ───────────────────────────────────────────────── */
// ⚠️ 이 네 개가 "여론은 축 2에만, 판정과 다른 줄" 원칙의 강제 장치다.

test("투표는 두 방향뿐이다", () => {
  // 종류를 늘리려면 "그 종류가 정렬이나 판정에서 무슨 일을 하는가"에 먼저 답해라.
  expect(VOTE_CHOICES).toEqual(["slop", "ok"]);
});

test("표본이 모자라면 여론을 숫자로 내보내지 않는다", () => {
  expect(opinion(4, 0)).toBeNull();
  expect(opinion(0, 0)).toBeNull();
  expect(opinion(3, 1)).toBeNull();
  expect(opinion(4, 1)).not.toBeNull();
});

test("여론은 비율이지 점수가 아니다", () => {
  expect(opinion(8, 2)).toEqual({ total: 10, slopPct: 80 });
  expect(opinion(0, 5)).toEqual({ total: 5, slopPct: 0 });
});
