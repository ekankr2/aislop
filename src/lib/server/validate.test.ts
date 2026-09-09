import { expect, test } from "bun:test";
import { parseForm, submissionSchema } from "./validate";

const form = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.append(k, v);
  return f;
};

const base = {
  title: "충분히 긴 제목입니다",
  summary: "한 줄 요약도 충분히 깁니다.",
  category: "image",
  submitReason: "무엇이 문제인지 충분히 적었습니다.",
};

test("제보는 제목·요약·유형·이유가 있어야 통과한다", () => {
  expect(parseForm(submissionSchema, form(base)).ok).toBe(true);
  expect(parseForm(submissionSchema, form({ ...base, title: "짧" })).ok).toBe(
    false,
  );
  expect(
    parseForm(submissionSchema, form({ ...base, submitReason: "짧다" })).ok,
  ).toBe(false);
});

test("목록에 없는 카테고리는 거부한다", () => {
  expect(
    parseForm(submissionSchema, form({ ...base, category: "무엇이든" })).ok,
  ).toBe(false);
});

// z.url()은 스킴을 보지 않아 javascript:를 통과시킨다 — 이 값은 <a href>에 들어간다.
test("http(s)가 아닌 URL은 거부한다", () => {
  expect(
    parseForm(submissionSchema, form({ ...base, url: "javascript:alert(1)" }))
      .ok,
  ).toBe(false);
  expect(
    parseForm(submissionSchema, form({ ...base, url: "https://example.com" }))
      .ok,
  ).toBe(true);
});
