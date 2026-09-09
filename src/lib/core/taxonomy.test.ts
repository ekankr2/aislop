import { expect, test } from "bun:test";
import {
  AI_STATUSES,
  EDITOR_ONLY_VERDICTS,
  isAdmin,
  isEditor,
  opinion,
  PUBLIC_POST_STATUSES,
  VERDICTS,
  VOTE_CHOICES,
} from "./taxonomy";

// 이 사이트의 신뢰 장치. 두 축이 합쳐지면 "AI면 무조건 Slop"이 된다.
test("AI 생성 여부와 품질 판정은 겹치는 값이 없다", () => {
  const overlap = (AI_STATUSES as readonly string[]).filter((a) =>
    (VERDICTS as readonly string[]).includes(a),
  );
  expect(overlap).toEqual([]);
});

test("판정은 운영자만 내린다 — unrated·disputed를 뺀 전부", () => {
  const community = VERDICTS.filter((v) => !EDITOR_ONLY_VERDICTS.includes(v));
  expect(community).toEqual(["unrated", "disputed"]);
});

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

test("여론은 운영자 판정에 도달하지 않는다", () => {
  // 표가 아무리 쏠려도 verdict는 별개 필드다 — 집계에서 판정으로 가는 함수가 없어야 한다.
  // 여기 `opinion()` 결과를 Verdict로 바꾸는 헬퍼가 생기면 이 테스트를 지우기 전에
  // CLAUDE.md "여론과 운영자 판정은 다른 줄이다"부터 읽어라.
  const op = opinion(100, 0);
  expect(op).toEqual({ total: 100, slopPct: 100 });
  expect(EDITOR_ONLY_VERDICTS).toContain("slop");
});
