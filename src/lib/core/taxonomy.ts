// 닫힌 도메인의 **진실원**. DB엔 CHECK 제약으로만 복제하고 룩업 테이블은 만들지 않는다
// (테이블로 만드는 순간 진실원이 둘로 갈린다). 화면 문구도 여기서만 고친다.

/* ================================================================== *
 * 판정은 **두 축**이다 (2026-09-08 확정)
 *
 * ⚠️ 이 분리가 이 사이트의 신뢰 장치다. AI를 썼다는 사실과 그게 쓰레기라는
 *    판단은 다른 문제이고, 섞는 순간 "AI면 무조건 Slop"이 되어 커뮤니티가
 *    렉카가 된다. 절대 한 필드로 합치지 마라.
 * ================================================================== */

/* ── 축 1. AI 생성 여부 ──────────────────────────────────────── */
export const AI_STATUSES = [
  "confirmed",
  "self_disclosed",
  "circumstantial",
  "unknown",
  "not_ai",
] as const;
export type AiStatus = (typeof AI_STATUSES)[number];

export const AI_STATUS_LABEL: Record<AiStatus, string> = {
  confirmed: "AI 확인",
  self_disclosed: "AI 명시",
  circumstantial: "AI 정황",
  unknown: "AI 여부 불명",
  not_ai: "AI 아님",
};

// 목록에서 칩으로 띄울 값. ⚠️ `unknown`·`circumstantial`은 뺐다 —
// "모르겠다"는 칩은 정보량이 0인데 자리는 똑같이 차지해 목록을 잡음으로 채운다.
// 상세 페이지는 두 축을 항상 전부 보여준다(그게 원칙이다).
export const AI_STATUS_IN_FEED: AiStatus[] = [
  "confirmed",
  "self_disclosed",
  "not_ai",
];

// ⚠️ 힌트는 **명사형으로 끊는다**(2026-09-09 유저 지시). 화면에서 다섯 줄, 여섯 줄이
//    연달아 `~습니다`로 끝나면 같은 북소리가 나고, 그게 AI가 쓴 화면의 대표적인 냄새다.
//    산문 문단은 평서체(`~니다`), 표·목록·힌트는 명사형이다.
export const AI_STATUS_HINT: Record<AiStatus, string> = {
  confirmed: "메타데이터·업체 확인·탐지 근거로 확인됨.",
  self_disclosed: "만든 쪽이 AI 사용을 스스로 밝힘.",
  circumstantial: "정황은 있으나 단정할 근거는 아직 없음.",
  unknown: "확인하지 못함.",
  not_ai: "확인해 보니 AI 생성물이 아니었음.",
};

/* ── 축 2. 품질·행위 판정 ────────────────────────────────────── */
// ⚠️ `deceptive`(기만적 사용)는 2026-09-08에 `slop`으로 흡수했다. 되살리지 마라 —
//    "AI를 숨겼다"는 판정 값이 아니라 `verdictNote`와 `aiStatus` 조합으로 드러난다.
export const VERDICTS = [
  "unrated",
  "slop",
  "low_quality",
  "disputed",
  "not_slop",
  "exemplary",
] as const;
export type Verdict = (typeof VERDICTS)[number];

// 라벨은 짧게. 목록에서 칩 두 개가 한 줄에 들어가야 한다.
export const VERDICT_LABEL: Record<Verdict, string> = {
  unrated: "미판정",
  slop: "Slop",
  low_quality: "저품질",
  disputed: "논쟁 중",
  not_slop: "Not Slop",
  exemplary: "모범",
};

export const VERDICT_HINT: Record<Verdict, string> = {
  unrated: "아직 판정하지 않음.",
  slop: "만들 이유가 없었거나, AI 사용을 숨겨 사실과 다르게 제시함.",
  low_quality: "품질은 낮지만 속이거나 해를 끼치지는 않음.",
  disputed: "근거가 엇갈려 판단을 보류함.",
  not_slop: "확인해 보니 문제 없음.",
  exemplary: "AI를 밝히고 제대로 쓴 사례.",
};

// ⚠️ 운영자만 설정할 수 있는 판정. **투표 집계로는 절대 여기 도달하지 않는다.**
//    여론(`vote`)과 이 값은 화면에 나란히 서는 다른 줄이다 — 여론은 유저가 만들고
//    이 값은 근거가 확정된 건에만 찍는 도장이다. 둘을 한 필드로 합치지 마라.
//    `unrated`·`disputed`를 뺀 나머지 전부다.
export const EDITOR_ONLY_VERDICTS: Verdict[] = [
  "slop",
  "low_quality",
  "not_slop",
  "exemplary",
];

// "Not Slop" 피드에 들어가는 것들.
export const GOOD_VERDICTS: Verdict[] = ["not_slop", "exemplary"];

/* ── 카테고리 ────────────────────────────────────────────────── */
// 사례 하나당 정확히 하나. 자유 태그는 별도(`tag`)이고 이건 닫힌 목록이다 —
// 필터가 흔들리지 않아야 "이 사이트가 뭘 다루나"가 3초 안에 읽힌다.
// ⚠️ 순서는 유저가 지정했다(2026-09-08). 가나다·알파벳순으로 정렬하지 마라 —
// 앞의 다섯이 실제로 제보가 몰리는 분류라 앞에 둔 것이다.
export const CATEGORIES = [
  { slug: "app", name: "앱·서비스" },
  { slug: "image", name: "이미지" },
  { slug: "video", name: "영상" },
  { slug: "media", name: "뉴스·미디어" },
  { slug: "review", name: "리뷰·블로그" },
  { slug: "writing", name: "글·소설" },
  { slug: "music", name: "음악" },
  { slug: "ad", name: "광고" },
] as const;
export type Category = (typeof CATEGORIES)[number]["slug"];

// 분류 한 줄 설명. /ai-slop(정의 문서)이 쓴다 —
// 두 곳에 따로 적어 두면 한쪽만 고쳐진다.
export const CATEGORY_HINT: Record<Category, string> = {
  app: "API 하나 감싼 래퍼 앱, 남의 서비스를 그대로 베낀 복제품.",
  image:
    // ⚠️ "손가락 여섯 개"로 적혀 있었다. /ai-slop이 그 신호를 낡았다고 명시하는데
    // 분류 설명이 그걸 쓰면 앞뒤가 안 맞는다(2026-09-08).
    "메뉴판·숙소·상품 사진이 실물과 다른 경우. 받아 보면 색·크기·구성이 딴판.",
  video:
    "같은 배경에 자막만 바꿔 하루 수십 개씩 올리는 쇼츠, 아동용 채널의 대량 생성 영상.",
  media: "검색 상위만 노린 의미 없는 블로그와 뉴스. 읽고 나면 남는 게 없음.",
  review: "써 보지 않고 쓴 체험담, 별점만 채우는 대량 생성 후기.",
  writing:
    "하루 만에 찍어낸 전자책과 소설. 목차는 그럴듯한데 본문은 같은 말 반복.",
  music:
    "가사도 목소리도 생성한 곡을 사람이 만든 것처럼 올려 스트리밍 수익을 챙기는 경우.",
  ad: "존재하지 않는 전문가와 후기 모델. 시술 전후 사진이 생성 이미지인 경우.",
};

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

/* ── 투표 = 여론 (축 2에만 붙는다) ───────────────────────────── */
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
  "verdict_change",
  "ai_status_change",
  "company_fix",
  "correction",
  "note",
] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

export const EVENT_KIND_LABEL: Record<EventKind, string> = {
  verdict_change: "판정 변경",
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

// 목록 위 필터 줄의 앞쪽. 분류(`CATEGORIES`)와 같은 줄에 서지만 축이 다르다.
export const VERDICT_FILTERS = [
  { label: "검증됨", href: "/verified" },
  { label: "논쟁 중", href: "/disputed" },
  { label: "Not Slop", href: "/not-slop" },
] as const;

export type FeedTab =
  | (typeof FEED_TABS)[number]["key"]
  | "verified"
  | "disputed"
  | "not-slop"
  | "slop";

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
