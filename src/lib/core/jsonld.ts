// 상세 페이지 구조화 데이터. 화면과 분리해 둔 이유는 **무엇을 내보내지 않을지**가
// 규칙이고, 그 규칙은 테스트로 고정해야 하기 때문이다.

import type { AiStatus } from "./taxonomy";

const SITE = "https://aislop.kr";
const PUBLISHER = { "@type": "Organization", name: "AI 슬롭", url: SITE };

export interface PostJsonLdInput {
  slug: string;
  title: string;
  summary: string;
  url: string | null;
  aiStatus: AiStatus;
  aiEvidence: string | null;
  publishedAt: string | null;
  updatedAt: string;
  authorName: string;
  indexable: boolean;
}

// ⚠️ ClaimReview는 **AI 생성 여부(축 1)** 에만 붙인다. 사실 판정이라서다.
//    품질(유저 표)은 의견이지 사실이 아니다 — 거기에 ClaimReview를
//    붙이면 구글 구조화데이터 수동 조치를 맞는다. 두 축을 여기서도 절대 합치지 마라.
//
// 내보내는 조건이 좁은 이유:
//   - confirmed / not_ai 만    → 나머지는 "정황"이거나 "모름"이라 판정이 아니다.
//                                self_disclosed는 만든 사람이 이미 밝혔으니 검증할 주장이 없다.
//   - aiEvidence 필수          → 근거 없는 판정은 내보내지 않는다(사이트 원칙 그대로).
//   - url 필수                 → itemReviewed.appearance가 가리킬 원문이 있어야 한다.
const CLAIM_RATING: Partial<Record<AiStatus, { value: number; name: string }>> =
  {
    confirmed: { value: 5, name: "AI 확인" },
    not_ai: { value: 1, name: "AI 아님" },
  };

// 홈에만 붙인다 — WebSite·Organization은 사이트를 대표하는 **한 페이지**에서만
// 선언해야 엔티티가 하나로 잡힌다. 목록 탭마다 복사하면 중복 선언이 된다.
//
// ⚠️ SearchAction(sitelinks 검색창)을 넣지 마라. 구글이 2024-11에 기능을 없애서
//    이제 아무 데도 안 쓰이고, /search는 noindex라 가리킬 대상도 아니다.
// ⚠️ logo를 넣지 마라. 구글은 래스터를 요구하는데 이 사이트 로고는 SVG 제호뿐이고
//    og-default.png는 1200x630 카드지 로고가 아니다. 없는 게 틀린 것보다 낫다.
export function siteJsonLd(): object[] {
  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": `${SITE}/#org`,
      name: "AI 슬롭",
      // ⚠️ 두 표기가 **같은 엔티티**라고 구글에 알리는 자리다. 이 사이트의 키워드
      //    전략("AI 슬롭"과 "AI slop"을 같이 선점) 이 한 줄로 걸려 있다 — 지우지 마라.
      alternateName: ["AI slop", "aislop.kr"],
      url: SITE,
      description:
        "AI로 찍어낸 콘텐츠·서비스를 제보받아 근거를 확인하고 판정하는 소비자 고발 매체.",
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${SITE}/#site`,
      name: "AI 슬롭",
      alternateName: "AI slop",
      url: SITE,
      inLanguage: "ko",
      publisher: { "@id": `${SITE}/#org` },
    },
  ];
}

// `/ai-slop` 전용. 이 사이트에서 **유일하게 SEO가 존재 이유인 문서**라 구조화
// 데이터를 붙인다(홈·사례엔 있는데 정작 앵커 문서만 비어 있었다, 2026-09-08).
//
// DefinedTerm을 같이 내보내는 이유: 이건 기사이기 전에 **용어 정의**다.
// alternateName이 "AI 슬롭"과 "AI slop"을 한 개념으로 묶어 주고, 그게 이 사이트의
// 키워드 전략 그대로다([[siteJsonLd]]의 Organization.alternateName과 짝).
//
// ⚠️ 날짜는 손으로 관리한다 — 문서를 실제로 고칠 때만 MODIFIED를 올려라.
//    빌드 시각을 넣지 마라. 안 고쳤는데 매번 갱신됐다고 말하는 셈이 된다.
const TERM_PUBLISHED = "2026-09-08";
const TERM_MODIFIED = "2026-09-08";

export function aiSlopPageJsonLd(): object[] {
  const pageUrl = `${SITE}/ai-slop`;
  return [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: "AI 슬롭이란",
      description:
        "AI 슬롭(AI slop)의 뜻과 어원, 어디에 있는지, 구별하는 방법.",
      inLanguage: "ko",
      datePublished: TERM_PUBLISHED,
      dateModified: TERM_MODIFIED,
      author: { "@id": `${SITE}/#org` },
      publisher: { "@id": `${SITE}/#org` },
      mainEntityOfPage: pageUrl,
      about: { "@id": `${SITE}/ai-slop#term` },
    },
    {
      "@context": "https://schema.org",
      "@type": "DefinedTerm",
      "@id": `${SITE}/ai-slop#term`,
      name: "AI 슬롭",
      alternateName: "AI slop",
      inLanguage: "ko",
      url: pageUrl,
      description:
        "AI로 값싸게 대량 생산해 인터넷에 쏟아붓는, 사람이 볼 이유가 없는 결과물.",
    },
  ];
}

export function postJsonLd(p: PostJsonLdInput): object[] {
  if (!p.indexable) return [];

  const pageUrl = `${SITE}/posts/${encodeURIComponent(p.slug)}`;
  const out: object[] = [
    {
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      headline: p.title,
      description: p.summary,
      datePublished: p.publishedAt,
      dateModified: p.updatedAt,
      author: { "@type": "Person", name: p.authorName },
      publisher: PUBLISHER,
      mainEntityOfPage: pageUrl,
    },
  ];

  const rating = CLAIM_RATING[p.aiStatus];
  if (rating && p.aiEvidence?.trim() && p.url) {
    out.push({
      "@context": "https://schema.org",
      "@type": "ClaimReview",
      url: pageUrl,
      datePublished: p.publishedAt,
      author: PUBLISHER,
      claimReviewed: `${p.title} — AI로 생성된 콘텐츠다.`,
      itemReviewed: {
        "@type": "Claim",
        appearance: { "@type": "CreativeWork", url: p.url },
      },
      reviewRating: {
        "@type": "Rating",
        ratingValue: rating.value,
        bestRating: 5,
        worstRating: 1,
        alternateName: rating.name,
      },
    });
  }

  return out;
}
