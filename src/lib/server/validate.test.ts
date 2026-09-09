import { expect, test } from "bun:test";
import { correctionSchema, parseForm, submissionSchema } from "./validate";

const form = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.append(k, v);
  return f;
};

const base = {
  title: "충분히 긴 제목입니다",
  body: "무엇이 문제인지 충분히 적었습니다.",
};

// ⚠️ 필수는 둘뿐이다. 요약·유형·URL을 다시 필수로 만들면 여기가 먼저 깨진다.
test("글쓰기는 제목·본문만 있으면 통과한다", () => {
  expect(parseForm(submissionSchema, form(base)).ok).toBe(true);
  expect(parseForm(submissionSchema, form({ ...base, title: "짧" })).ok).toBe(
    false,
  );
  expect(parseForm(submissionSchema, form({ ...base, body: "짧다" })).ok).toBe(
    false,
  );
});

// 유형은 선택이지만 값이 오면 목록 안이어야 한다 — DB CHECK 제약과 짝이다.
test("목록에 없는 유형은 거부한다", () => {
  expect(
    parseForm(submissionSchema, form({ ...base, category: "etc" })).ok,
  ).toBe(true);
  expect(
    parseForm(submissionSchema, form({ ...base, category: "무엇이든" })).ok,
  ).toBe(false);
});

// z.url()은 스킴을 보지 않아 javascript:를 통과시킨다 — 이 값은 <a href>에 들어간다.
test("http(s)가 아닌 URL은 거부한다", () => {
  const c = {
    requesterName: "홍길동",
    requesterEmail: "a@example.com",
    claim: "사실과 다른 부분이 있습니다.",
  };
  expect(
    parseForm(
      correctionSchema,
      form({ ...c, evidenceUrl: "javascript:alert(1)" }),
    ).ok,
  ).toBe(false);
  expect(
    parseForm(
      correctionSchema,
      form({ ...c, evidenceUrl: "https://example.com" }),
    ).ok,
  ).toBe(true);
});
