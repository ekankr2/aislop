import { describe, expect, it } from "bun:test";
import {
  aiSlopPageJsonLd,
  type PostJsonLdInput,
  postJsonLd,
  siteJsonLd,
} from "./jsonld";

const base: PostJsonLdInput = {
  slug: "테스트-사례",
  title: "실물과 다른 숙소 사진",
  summary: "등록 사진이 AI 생성물이었다.",
  url: "https://example.com/a",
  aiStatus: "confirmed",
  aiEvidence: "메타데이터에 생성 모델명이 남아 있음.",
  publishedAt: "2026-09-08T12:00:00+09:00",
  updatedAt: "2026-09-08T12:00:00+09:00",
  authorName: "제보자",
  indexable: true,
};

const claim = (i: Partial<PostJsonLdInput>) =>
  postJsonLd({ ...base, ...i }).find(
    (n) => (n as { "@type": string })["@type"] === "ClaimReview",
  );

describe("postJsonLd", () => {
  it("비공개 사례는 아무것도 내보내지 않는다", () => {
    expect(postJsonLd({ ...base, indexable: false })).toEqual([]);
  });

  it("한글 슬러그를 인코딩한다", () => {
    const [article] = postJsonLd(base) as { mainEntityOfPage: string }[];
    expect(article.mainEntityOfPage).toBe(
      "https://aislop.kr/posts/%ED%85%8C%EC%8A%A4%ED%8A%B8-%EC%82%AC%EB%A1%80",
    );
  });

  it("AI 확인 + 근거 + 원문 URL이면 ClaimReview를 낸다", () => {
    expect(claim({})).toMatchObject({
      reviewRating: { ratingValue: 5, alternateName: "AI 확인" },
      itemReviewed: { appearance: { url: "https://example.com/a" } },
    });
  });

  it("AI 아님은 같은 주장을 거짓으로 판정한다", () => {
    expect(claim({ aiStatus: "not_ai" })).toMatchObject({
      reviewRating: { ratingValue: 1, alternateName: "AI 아님" },
    });
  });

  // ⚠️ 아래 넷이 이 파일의 존재 이유다. 하나라도 풀면 구조화데이터 수동 조치 위험.
  it("정황·불명·자진밝힘에는 ClaimReview를 붙이지 않는다", () => {
    for (const s of ["circumstantial", "unknown", "self_disclosed"] as const) {
      expect(claim({ aiStatus: s })).toBeUndefined();
    }
  });

  it("근거가 없으면 ClaimReview를 붙이지 않는다", () => {
    expect(claim({ aiEvidence: null })).toBeUndefined();
    expect(claim({ aiEvidence: "   " })).toBeUndefined();
  });

  it("원문 URL이 없으면(목격담) ClaimReview를 붙이지 않는다", () => {
    expect(claim({ url: null })).toBeUndefined();
  });

  it("품질 판정(verdict)은 ClaimReview에 전혀 관여하지 않는다", () => {
    // verdict는 입력에 아예 없다. 이 테스트는 그 사실을 문서로 고정한다.
    expect(Object.keys(base)).not.toContain("verdict");
  });
});

describe("siteJsonLd", () => {
  const nodes = siteJsonLd() as Record<string, unknown>[];
  const pick = (t: string) => nodes.find((n) => n["@type"] === t) ?? {};
  const org = pick("Organization");
  const site = pick("WebSite");

  it("두 표기를 같은 엔티티로 묶는다", () => {
    expect(org.alternateName).toContain("AI slop");
    expect(site.alternateName).toBe("AI slop");
  });

  it("WebSite는 Organization을 @id로 참조한다 — 엔티티가 둘로 갈라지면 안 된다", () => {
    expect(site.publisher).toEqual({ "@id": org["@id"] });
  });

  it("SearchAction을 내보내지 않는다(구글이 2024-11에 없앤 기능)", () => {
    expect(JSON.stringify(nodes)).not.toContain("SearchAction");
  });

  it("logo를 내보내지 않는다(래스터 로고가 없다)", () => {
    expect(org.logo).toBeUndefined();
  });
});

describe("aiSlopPageJsonLd", () => {
  const nodes = aiSlopPageJsonLd() as Record<string, unknown>[];
  const pick = (t: string) => nodes.find((n) => n["@type"] === t) ?? {};

  it("용어를 DefinedTerm으로 내보내고 두 표기를 묶는다", () => {
    const term = pick("DefinedTerm");
    expect(term.name).toBe("AI 슬롭");
    expect(term.alternateName).toBe("AI slop");
  });

  it("Article이 그 용어를 about으로 가리킨다", () => {
    expect(pick("Article").about).toEqual({
      "@id": pick("DefinedTerm")["@id"],
    });
  });

  it("작성자·발행자가 사이트 Organization과 같은 엔티티다", () => {
    const org = (siteJsonLd() as Record<string, unknown>[]).find(
      (n) => n["@type"] === "Organization",
    );
    expect(pick("Article").publisher).toEqual({ "@id": org?.["@id"] });
  });

  it("날짜는 시각 없는 날짜 문자열이다 — 빌드 시각을 넣지 마라", () => {
    const a = pick("Article");
    expect(a.datePublished).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(a.dateModified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
