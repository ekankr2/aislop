// 닫힌 도메인의 **진실원**. DB엔 CHECK 제약으로만 복제하고 룩업 테이블은 만들지 않는다
// (테이블로 만드는 순간 진실원이 둘로 갈린다). 화면 문구도 여기서만 고친다.

/* ── 판단하는 건 유저뿐이다 — **유저 표** ────────────────────────────────
 * ⚠️ 운영자가 정하는 필드를 만들지 마라(2026-09-09 유저 지시 — "관리자가
 *    컨트롤하는 건 없다니까"). 품질 판정(`verdict`)에 이어 AI 생성 여부
 *    (`aiStatus`·`aiEvidence`)까지 걷어냈다(`drizzle/0008`).
 *    AI를 썼다는 근거는 글쓴이가 본문에 적고, 맞는지는 읽는 사람이 본다.
 * ⚠️ 되살리지 마라 — 어떤 이름으로도(확인·검증·등급·에디터 픽).
 *    여기가 비어 있는 게 이 사이트의 설계다.
 * ────────────────────────────────────────────────────────── */

// ⚠️ 여덟에서 일곱으로 줄였다(2026-09-09 유저 지시). `video`는 `image`로,
//    `review`는 `media`로 흡수했다 — 이미지와 영상은 슬롭 양상이 다르지만 지금
//    나누는 건 이르고, 뉴스와 리뷰·블로그는 "검색 노린 양산형 웹 글"로 같은 것이다.
//    사례가 쌓여서 한 분류가 목록을 다 먹으면 그때 쪼개라.
// ⚠️ 여기서 늘리지 마라. 분류가 아홉이면 대부분 0건이라 필터 줄이 계속 비어 있다.
export const CATEGORIES = [
  { slug: "app", name: "앱·서비스" },
  { slug: "image", name: "이미지·영상" },
  { slug: "media", name: "뉴스·블로그" },
  { slug: "writing", name: "책" },
  { slug: "music", name: "음악" },
  { slug: "ad", name: "광고" },
  // ⚠️ 글쓰기 폼의 기본값이다. 안 고르면 여기로 들어온다.
  //    지우려면 폼에서 유형을 필수로 만들어야 한다 — 그 교환을 이해하고 지워라.
  { slug: "etc", name: "기타" },
] as const;
export type Category = (typeof CATEGORIES)[number]["slug"];

// 유형을 안 고르면 쓰는 값. 검토 전 임시 자리다.
export const DEFAULT_CATEGORY = "etc";

// 분류 한 줄 설명. /ai-slop(정의 문서)이 쓴다 —
// 두 곳에 따로 적어 두면 한쪽만 고쳐진다.
export const CATEGORY_HINT: Record<Category, string> = {
  app: "API 하나 감싼 래퍼 앱, 남의 서비스를 그대로 베낀 복제품.",
  image:
    // ⚠️ "손가락 여섯 개"로 적혀 있었다. /ai-slop이 그 신호를 낡았다고 명시하는데
    // 분류 설명이 그걸 쓰면 앞뒤가 안 맞는다(2026-09-08).
    "실물과 다른 메뉴판·숙소·상품 사진. 같은 배경에 자막만 바꿔 하루 수십 개씩 올리는 쇼츠.",
  media:
    "검색 상위만 노린 블로그와 뉴스, 써 보지 않고 쓴 체험담. 읽고 나면 남는 게 없음.",
  writing:
    "하루 만에 찍어낸 전자책과 소설. 목차는 그럴듯한데 본문은 같은 말 반복.",
  music:
    "가사도 목소리도 생성한 곡을 사람이 만든 것처럼 올려 스트리밍 수익을 챙기는 경우.",
  ad: "존재하지 않는 전문가와 후기 모델. 시술 전후 사진이 생성 이미지인 경우.",
  etc: "위 어디에도 안 들어가는 것.",
};

// /ai-slop의 "어디에 있나"가 쓰는 목록. `etc`는 분류가 아니라 미분류 자리라 뺀다.
export const DOC_CATEGORIES = CATEGORIES.filter((c) => c.slug !== "etc");

export const CATEGORY_SLUGS = CATEGORIES.map(
  (c) => c.slug,
) as unknown as Category[];
export const CATEGORY_LABEL = Object.fromEntries(
  CATEGORIES.map((c) => [c.slug, c.name]),
) as Record<Category, string>;

/* ── 게시물 워크플로 상태 ────────────────────────────────────── */
// 제보와 게시물은 같은 행이고 검토가 승격이다. 판정(위 두 축)과 섞지 마라 —
// 여긴 "어디까지 처리됐나"만 담는다.
export const POST_STATUSES = [
  "submitted",
  "reviewing",
  "published",
  "needs_evidence",
  "rejected",
  "corrected",
  "archived",
] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

export const POST_STATUS_LABEL: Record<PostStatus, string> = {
  submitted: "제보됨",
  reviewing: "검증 중",
  published: "게시됨",
  needs_evidence: "추가 근거 필요",
  rejected: "반려",
  corrected: "정정됨",
  archived: "보관됨",
};

// 공개 피드에 보이는 상태. 이 배열 밖은 작성자·운영자만 본다.
export const PUBLIC_POST_STATUSES: PostStatus[] = ["published", "corrected"];

/* ── 투표 = 여론. 이 사이트의 유일한 판단 장치다 ─────────────── */
// 이 사이트는 "AI로 만든 것"을 전부 모으고, 그게 슬롭인지 쓸모 있는지는 유저가 정한다.
// ⚠️ **축 1(`aiStatus`)에는 절대 투표를 붙이지 마라.** AI 생성 여부는 사실이라
//    투표 대상이 아니다 — 붙이는 순간 `aiEvidence` 필수 규칙이 무의미해지고,
//    `ClaimReview` 구조화데이터가 사실 주장에서 여론 집계로 바뀐다(구글 수동 조치).
// ⚠️ 두 방향에서 더 쪼개지 마라(기만적·돈값 못함·불쾌함…). 2026-09-08에 종류별 반응을
//    걷어낸 이유는 "종류가 아무 일도 안 해서"였고, 지금 두 방향은 여론을 만든다 —
//    거기서 더 쪼개면 다시 아무 일도 안 하는 라벨이 된다. 이유는 댓글에 적는다.
export const VOTE_CHOICES = ["slop", "ok"] as const;
export type VoteChoice = (typeof VOTE_CHOICES)[number];

export const VOTE_LABEL: Record<VoteChoice, string> = {
  slop: "슬롭이다",
  ok: "괜찮다",
};

// ⚠️ 표본이 이만큼 안 되면 비율을 숨긴다. 3표에 100%는 정밀한 척만 하고 그대로
//    공격 소재가 된다 — 0~10점 평가를 걷어낸 것과 같은 이유다. 낮추지 마라.
export const VOTE_MIN = 5;

// 여론 = 표의 비율. 표본이 모자라면 `null`이고, 그때 화면은 비율을 **아예 안 그린다**
// (0%로 그리지 마라 — 없는 것과 반대인 것은 다르다).
export function opinion(
  slopCount: number,
  okCount: number,
): { total: number; slopPct: number } | null {
  const total = slopCount + okCount;
  if (total < VOTE_MIN) return null;
  return { total, slopPct: Math.round((slopCount / total) * 100) };
}

// 여론이 어느 쪽으로 기울었나. ⚠️ **띠로 판단한다**(2026-09-09 유저 지적 — "49 51은
// 어캄?"). 정확히 50만 반반으로 두면 51:49가 슬롭 판정처럼 보이고, 표가 적을 때
// 한 표 차이로 색이 뒤집힌다. 45~55는 기울지 않은 것으로 본다.
// ⚠️ 이 폭을 좁히지 마라. 넓히는 건 사례가 쌓인 뒤에 논의한다.
export const OPINION_EVEN_BAND = 5;

export function lean(slopPct: number): "slop" | "ok" | "even" {
  if (Math.abs(slopPct - 50) <= OPINION_EVEN_BAND) return "even";
  return slopPct > 50 ? "slop" : "ok";
}

/* ── 근거 ────────────────────────────────────────────────────── */
export const EVIDENCE_TYPES = [
  "original",
  "archive",
  "screenshot",
  "comparison",
  "metadata",
  "detector",
  "receipt",
  "terms",
  "other",
] as const;
export type EvidenceType = (typeof EVIDENCE_TYPES)[number];

export const EVIDENCE_TYPE_LABEL: Record<EvidenceType, string> = {
  original: "원문",
  archive: "아카이브",
  screenshot: "화면 캡처",
  comparison: "실물 대조",
  metadata: "메타데이터",
  detector: "탐지 결과",
  receipt: "결제 내역",
  terms: "약관·고지",
  other: "기타",
};

export const VERIFY_STATUSES = ["pending", "verified", "rejected"] as const;
export type VerifyStatus = (typeof VERIFY_STATUSES)[number];

/* ── 공개 타임라인 이벤트 ────────────────────────────────────── */
export const EVENT_KINDS = [
  "ai_status_change",
  "company_fix",
  "correction",
  "note",
] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

export const EVENT_KIND_LABEL: Record<EventKind, string> = {
  ai_status_change: "AI 확인 변경",
  company_fix: "당사자 답변·개선",
  correction: "정정",
  note: "기록",
};

/* ── 피드 탭 ─────────────────────────────────────────────────── */
// ⚠️ 여기 있는 이유: 레이아웃(클라이언트 번들)이 이 값을 쓴다.
//    쿼리를 담은 `core/feed.ts`에 두면 그 파일의 `db/client` import를 따라
//    `node:async_hooks`가 브라우저 번들로 끌려가 하이드레이션이 통째로 죽는다.
//    **DB에 닿는 모듈에서 화면용 상수를 export하지 마라.**
// ⚠️ 랍스타 헤더 구조 그대로다(2026-09-08 유저 지시 "Active/Recent/Comments/Search 느낌").
//    한때 `인기`를 탭에서 빼고 로고가 그 자리를 대신하게 했는데 되돌렸다 —
//    로고는 어느 목록이 켜져 있는지를 표시하지 못해서 현재 위치를 알 수 없었다.
// ⚠️ 판정별 목록(검증됨·논쟁 중·Not Slop)은 여기 넣지 마라. 탭이 일곱 개가 되면
//    "무슨 목록인가"와 "무슨 판정인가"가 한 줄에 섞인다. 그건 필터 줄로 내렸다.
export const FEED_TABS = [
  { key: "popular", label: "활발", href: "/" },
  { key: "latest", label: "최신", href: "/latest" },
  { key: "comments", label: "댓글", href: "/comments" },
  { key: "search", label: "검색", href: "/search" },
] as const;

// ⚠️ **목록을 여론으로 가르지 마라**(2026-09-09 유저 지시). 슬롭·애매·괜찮음
//    필터가 있었는데 걷어냈다. 표가 목록을 나누기 시작하면 "슬롭 목록에 오른 업체"가
//    생기고, 그건 유저 표로 만든 판정 게시판이다. 표는 글 하나에만 붙는다.
//    그 앞에 있던 운영자 축(검증됨·논쟁 중·Not Slop, 그다음 AI 확인)도 같은 이유로 없다.
//    필터 줄에 남는 건 분류뿐이다.
export type FeedTab = (typeof FEED_TABS)[number]["key"];

/* ── 회원 역할·평판 ──────────────────────────────────────────── */
export const ROLES = ["member", "editor", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const isEditor = (r?: string | null): boolean =>
  r === "editor" || r === "admin";
export const isAdmin = (r?: string | null): boolean => r === "admin";

// 배지는 운영자가 손으로 붙인다. 자동 부여를 만들지 마라 —
// 숫자로 자동 배지를 주면 제보 수 늘리기 게임이 시작된다.
export const BADGES = [
  { slug: "trusted", name: "신뢰 제보자" },
  { slug: "image-eye", name: "이미지 감별자" },
  { slug: "app-autopsy", name: "앱 부검자" },
  { slug: "source-check", name: "출처 검증자" },
] as const;
export type BadgeSlug = (typeof BADGES)[number]["slug"];

export const BADGE_LABEL = Object.fromEntries(
  BADGES.map((b) => [b.slug, b.name]),
) as Record<string, string>;
