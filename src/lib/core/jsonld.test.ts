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
  publishedAt: "2026-09-08T12:00:00+09:00",
  updatedAt: "2026-09-08T12:00:00+09:00",
  authorName: "제보자",
  indexable: true,
};

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

  // ⚠️ ClaimReview를 내보내지 않는다. 팩트체크 마크업은 사실 판정에만 붙일 수 있는데
  //    이 사이트에는 운영자가 확정하는 사실 필드가 없다(2026-09-09에 걷어냈다).
  //    되살리면 구조화데이터 수동 조치 대상이다.
  it("ClaimReview를 내보내지 않는다", () => {
    expect(JSON.stringify(postJsonLd(base))).not.toContain("ClaimReview");
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
