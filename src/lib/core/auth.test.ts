// 인증 원시 도구. ⚠️ 이 파일이 무너지면 계정이 열린다 — 실패하는 테스트를 지우지 마라.
// (코드 발급·검증·세션의 DB 흐름은 여기서 안 본다. 그건 dev 서버로 직접 돌려 확인한다.)

import { describe, expect, it } from "bun:test";
import {
  CODE_MAX_ATTEMPTS,
  CODE_TTL_MS,
  randomCode,
  randomToken,
  sha256,
  timingSafeEqual,
} from "./auth";

describe("randomCode", () => {
  it("항상 여섯 자리다 — 앞자리 0이 잘리면 코드가 다섯 자리가 된다", () => {
    for (let i = 0; i < 500; i++) expect(randomCode()).toMatch(/^\d{6}$/);
  });

  it("겹치지 않는다 — 같은 값이 쏟아지면 난수원이 죽은 것이다", () => {
    const seen = new Set(Array.from({ length: 2000 }, randomCode));
    expect(seen.size).toBeGreaterThan(1900);
  });

  // 모듈로 편향이 있으면 앞쪽 구간이 더 자주 나온다. 균등하면 각 구간이 10% 근처다.
  it("첫 자리가 한쪽으로 쏠리지 않는다", () => {
    const bucket = new Array(10).fill(0);
    for (let i = 0; i < 20000; i++) bucket[Number(randomCode()[0])]++;
    for (const n of bucket) expect(n).toBeGreaterThan(20000 * 0.07);
  });
});

describe("randomToken", () => {
  it("URL에 그대로 실을 수 있다 — 쿠키에 들어가므로 +/= 가 있으면 깨진다", () => {
    expect(randomToken()).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("32바이트 이상이다 — 짧으면 대입으로 세션을 주울 수 있다", () => {
    expect(randomToken().length).toBeGreaterThanOrEqual(43);
  });

  it("겹치지 않는다", () => {
    const seen = new Set(Array.from({ length: 1000 }, randomToken));
    expect(seen.size).toBe(1000);
  });
});

describe("sha256", () => {
  it("알려진 값과 일치한다", async () => {
    expect(await sha256("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("코드를 되돌릴 수 없다 — DB에 남는 건 이 값뿐이다", async () => {
    expect(await sha256("123456")).not.toContain("123456");
  });
});

describe("timingSafeEqual", () => {
  it("같으면 참", () => {
    expect(timingSafeEqual("abc123", "abc123")).toBe(true);
  });

  it("한 글자만 달라도 거짓", () => {
    expect(timingSafeEqual("abc123", "abc124")).toBe(false);
  });

  it("길이가 달라도 예외 없이 거짓", () => {
    expect(timingSafeEqual("abc", "abc123")).toBe(false);
    expect(timingSafeEqual("", "x")).toBe(false);
  });

  it("빈 값끼리는 참 — 해시는 항상 같은 길이라 실제로는 안 생긴다", () => {
    expect(timingSafeEqual("", "")).toBe(true);
  });
});

describe("정책 상수", () => {
  // ⚠️ 늘리지 마라. 6자리는 100만분의 1이라 시도를 열어두면 뚫린다.
  it("코드는 5분, 시도 3회", () => {
    expect(CODE_TTL_MS).toBe(5 * 60 * 1000);
    expect(CODE_MAX_ATTEMPTS).toBe(3);
  });
});
