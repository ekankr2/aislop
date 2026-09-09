// D1 스키마.
//
// 원칙:
//   - 닫힌 도메인은 CHECK 제약. 진실원은 `core/taxonomy.ts`의 TS union이다.
//   - 시각은 ISO8601 KST 문자열(사전순 = 시간순). 예외 없다.
//   - 지우지 않는다. soft delete + `audit_log`가 기본이다.
//
// ⚠️ 일부러 만들지 않은 것 (2026-09-08, "최대한 간단하게"):
//   - `service` 테이블: 주인공은 **사례(post)**다. 앱·서비스는 카테고리 하나일 뿐이라
//     별도 엔티티를 두면 목록·병합·상태가 통째로 따라붙는다. 필요해지면 그때 만든다.
//   - `editorial_review`(0~10점 6축): 표본이 적을 때 숫자는 정밀한 척만 하고 공격 소재가
//     된다. 지금은 `post.verdict` + `verdictNote`로만 판정한다.
//   - `tag`/`post_tag`: 카테고리가 닫힌 목록으로 있고 검색이 있다. 자유 태그는 나중에.
//   - `collection`(기획·주간): 2026-09-08 삭제(유저 지시). 사례가 0건인데 묶음부터
//     만들고 있었다. 되살리려면 "묶을 게 있는가"에 먼저 답해라.
//   - `post_event`(공개 타임라인): 판정 변경 이력은 `audit_log`가 보존하고,
//     독자에게 보이는 기록은 `correction_request`가 담당한다.
//   - `Submission`: 제보와 게시물은 같은 행이고 검토가 승격이다(`post.status`).

import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import {
  AI_STATUSES,
  CATEGORY_SLUGS,
  EVIDENCE_TYPES,
  POST_STATUSES,
  ROLES,
  VERDICTS,
  VERIFY_STATUSES,
  VOTE_CHOICES,
} from "../taxonomy";

// CHECK 제약 문자열을 taxonomy union에서 생성한다 — 목록이 갈리지 않는다.
const oneOf = (col: string, values: readonly string[]) =>
  sql.raw(`${col} in (${values.map((v) => `'${v}'`).join(", ")})`);

/* ================================================================== *
 * 회원 · 세션 · 로그인 코드
 *
 * ⚠️ better-auth를 걷어내면서 우리 것이 됐다(2026-09-08). 규칙은 `core/auth.ts`에 있고
 *    여기 있는 건 그 규칙의 저장 형태다: **코드도 세션 토큰도 해시로만 들어간다.**
 *    평문 컬럼을 추가하지 마라 — DB 유출이 그대로 로그인이 된다.
 * ================================================================== */

export const user = sqliteTable(
  "user",
  {
    id: text("id").primaryKey(),
    // 로그인이 이메일 OTP뿐이라 가입 시엔 비어 있다 → `ensureUsername`이 채운다.
    name: text("name").notNull(),
    // 로그인 수단이자 유일한 식별자다. 코드가 도착해야 로그인되므로 소유가 곧 증명이다.
    email: text("email").notNull().unique(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),

    username: text("username").unique(),
    role: text("role").notNull().default("member"),
    // 배지는 쉼표 구분 slug. 운영자가 손으로 붙인다 —
    // 자동 부여를 만들면 제보 수 늘리기 게임이 시작된다.
    badges: text("badges"),
    // 값이 있으면 읽기만 가능하다(쓰기 전부 거부).
    blockedAt: text("blocked_at"),
    blockedReason: text("blocked_reason"),
  },
  (t) => [
    check("user_role", oneOf("role", ROLES)),
    index("user_username_idx").on(t.username),
  ],
);

export const session = sqliteTable(
  "session",
  {
    // ⚠️ 원본 토큰이 아니라 SHA-256이다. 쿠키에만 원본이 있다.
    tokenHash: text("token_hash").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    expiresAt: text("expires_at").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("session_user_idx").on(t.userId)],
);

// 이메일당 한 행. 새 코드를 요청하면 덮어쓴다 —
// 여러 개를 살려두면 시도 제한이 코드 개수만큼 늘어난다.
export const loginCode = sqliteTable("login_code", {
  email: text("email").primaryKey(),
  codeHash: text("code_hash").notNull(),
  expiresAt: text("expires_at").notNull(),
  attempts: integer("attempts").notNull().default(0),
});

/* ================================================================== *
 * 사례 (= 제보 = 게시물)
 *
 * 상세 페이지는 네 질문에 답해야 한다:
 *   1. 무엇이 게시됐는가      → title, summary, url, thumbUrl
 *   2. AI 사용이 확인됐는가   → aiStatus, aiEvidence, evidence[]
 *   3. 누구에게 어떤 피해인가 → problems
 *   4. 왜 Slop인가/아닌가     → verdict, verdictNote
 * 이 필드들이 그 답이다. 비어 있으면 게시하지 마라.
 * ================================================================== */

export const post = sqliteTable(
  "post",
  {
    id: text("id").primaryKey(),
    // 검토 대기 상태에도 slug를 미리 발급한다 — 게시 시점에 URL이 바뀌지 않는다.
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    category: text("category").notNull(),

    /* --- 1. 무엇이 게시됐는가 --- */
    url: text("url"),
    // 정규화 URL(`core/url.ts`). 중복 제보 감지의 근거라 UNIQUE다.
    urlKey: text("url_key"),
    domain: text("domain"),
    // 원문이 지워져도 남는 사본. 사례 기록의 핵심이라 게시 전에 채우는 게 원칙이다.
    archiveUrl: text("archive_url"),
    // 목록용 작은 썸네일. R2 업로드는 아직 없고 운영자가 URL을 붙인다.
    thumbUrl: text("thumb_url"),

    /* --- 2. AI 사용이 확인됐는가 (축 1) --- */
    aiStatus: text("ai_status").notNull().default("unknown"),
    // 그 판단의 근거. `confirmed`·`self_disclosed`면 반드시 채운다(moderation.ts가 강제).
    aiEvidence: text("ai_evidence"),

    /* --- 3. 누구에게 어떤 피해·불편인가 --- */
    // 줄바꿈 구분 불릿. 구조를 더 쪼개지 않는다 — 사례마다 모양이 달라 스키마가 못 따라간다.
    problems: text("problems"),
    // 확인된 사실. 주장과 분리해 적는다.
    facts: text("facts"),

    /* --- 4. 왜 Slop인가 (축 2) --- */
    // ⚠️ aiStatus와 절대 합치지 마라. AI를 썼다는 사실과 그게 쓰레기라는 판단은 다른 문제다.
    verdict: text("verdict").notNull().default("unrated"),
    // 판정 근거. 판정을 바꾸려면 이 값도 바뀌어야 한다(moderation.ts가 강제).
    verdictNote: text("verdict_note"),

    /* --- 제보 --- */
    authorId: text("author_id")
      .notNull()
      .references(() => user.id),
    status: text("status").notNull().default("submitted"),
    submitReason: text("submit_reason"),
    // 본인이 직접 겪은 일인가. 전해 들은 것과 구분해 표시한다.
    firsthand: integer("firsthand", { mode: "boolean" })
      .notNull()
      .default(false),
    // 이해관계 고지. 막지 않고 표시한다.
    submitterAffiliated: integer("submitter_affiliated", { mode: "boolean" })
      .notNull()
      .default(false),
    // 반려·추가근거 요청 사유. 제보자에게만 보인다.
    reviewNote: text("review_note"),
    reviewedBy: text("reviewed_by").references(() => user.id),

    // 집계 캐시. 정렬에 쓰므로 매번 COUNT 하지 않는다.
    // ⚠️ 진실원은 vote/comment 테이블이다 — 여기는 파생값이다.
    commentCount: integer("comment_count").notNull().default(0),
    // 여론(축 2). ⚠️ 이 둘로 `verdict`를 자동 결정하지 마라 — 다른 줄이다.
    voteSlopCount: integer("vote_slop_count").notNull().default(0),
    voteOkCount: integer("vote_ok_count").notNull().default(0),

    isDemo: integer("is_demo", { mode: "boolean" }).notNull().default(false),
    publishedAt: text("published_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    deletedAt: text("deleted_at"),
  },
  (t) => [
    check("post_status", oneOf("status", POST_STATUSES)),
    check("post_category", oneOf("category", CATEGORY_SLUGS)),
    check("post_ai_status", oneOf("ai_status", AI_STATUSES)),
    check("post_verdict", oneOf("verdict", VERDICTS)),
    // 같은 원문은 한 번만. NULL은 UNIQUE에 걸리지 않으므로 원문 없는 사례는 자유롭다.
    uniqueIndex("post_url_key_idx").on(t.urlKey),
    index("post_feed_idx").on(t.status, t.publishedAt),
    index("post_category_idx").on(t.category, t.publishedAt),
    index("post_verdict_idx").on(t.verdict, t.publishedAt),
    index("post_author_idx").on(t.authorId),
  ],
);

/* ================================================================== *
 * 근거 — 이 사이트의 존재 이유
 * ================================================================== */

export const evidence = sqliteTable(
  "evidence",
  {
    id: text("id").primaryKey(),
    postId: text("post_id")
      .notNull()
      .references(() => post.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    url: text("url"),
    // R2에 우리가 올린 파일이면 그 키가 들어간다. 외부 URL 근거는 null이다.
    // ⚠️ 이 값이 "화면에 이미지로 띄울지"의 판단 근거다 — 외부 URL을 <img>로 박지
    //    마라. CSP(img-src)가 막고, 핫링크로 남의 대역폭을 쓰고, 그쪽 로그에 우리
    //    독자의 IP가 남는다. 근거로 걸 때는 링크로만 건다.
    storageKey: text("storage_key"),
    description: text("description").notNull(),
    // "언제 확인한 값이냐". 원문은 지워지고 가격표는 바뀐다 — 없으면 근거가 아니다.
    capturedAt: text("captured_at"),
    submittedBy: text("submitted_by").references(() => user.id),
    verifyStatus: text("verify_status").notNull().default("pending"),
    verifiedBy: text("verified_by").references(() => user.id),
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    check("evidence_type", oneOf("type", EVIDENCE_TYPES)),
    check("evidence_verify", oneOf("verify_status", VERIFY_STATUSES)),
    index("evidence_post_idx").on(t.postId),
  ],
);

/* ================================================================== *
 * 투표 — 여론이다. 운영자 판정(`post.verdict`)과 다른 줄이다.
 * ================================================================== */

// PK가 (post, user)라 "한 사람 한 표"가 DB 제약으로 강제된다.
// ⚠️ `choice`를 더 쪼개지 마라(기만적·돈값 못함…) — taxonomy.ts의 "투표" 주석 참조.
// ⚠️ 이 표가 `post.verdict`에 흘러드는 경로를 만들지 마라. 여론과 판정은 나란히 서고
//    어긋날 수 있어야 한다 — 어긋나는 사례가 제일 값진 사례다.
export const vote = sqliteTable(
  "vote",
  {
    postId: text("post_id")
      .notNull()
      .references(() => post.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    choice: text("choice").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.postId, t.userId] }),
    check("vote_choice", oneOf("choice", VOTE_CHOICES)),
  ],
);

/* ================================================================== *
 * 댓글 · 신고
 * ================================================================== */

export const comment = sqliteTable(
  "comment",
  {
    id: text("id").primaryKey(),
    postId: text("post_id")
      .notNull()
      .references(() => post.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    // 1단계 대댓글까지만. 무한 트리는 모바일에서 읽을 수 없다.
    parentId: text("parent_id"),
    body: text("body").notNull(),
    // 운영자 숨김. 지우지 않는다 — 지우면 대댓글 맥락이 끊기고 감사도 안 된다.
    hiddenAt: text("hidden_at"),
    hiddenBy: text("hidden_by").references(() => user.id),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    deletedAt: text("deleted_at"),
  },
  (t) => [
    index("comment_post_idx").on(t.postId, t.createdAt),
    index("comment_user_idx").on(t.userId),
  ],
);

export const commentReport = sqliteTable(
  "comment_report",
  {
    id: text("id").primaryKey(),
    commentId: text("comment_id")
      .notNull()
      .references(() => comment.id, { onDelete: "cascade" }),
    reporterId: text("reporter_id")
      .notNull()
      .references(() => user.id),
    reason: text("reason").notNull(),
    status: text("status").notNull().default("open"),
    resolvedBy: text("resolved_by").references(() => user.id),
    resolvedAt: text("resolved_at"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    check(
      "comment_report_status",
      sql.raw("status in ('open', 'resolved', 'dismissed')"),
    ),
    // 한 사람이 같은 댓글을 반복 신고해 큐를 채우지 못하게 한다.
    uniqueIndex("comment_report_once_idx").on(t.commentId, t.reporterId),
    index("comment_report_status_idx").on(t.status),
  ],
);

/* ================================================================== *
 * 당사자 답변 · 정정 요청
 *
 * ⚠️ 둘 다 **비로그인 제출**이다. 당사자가 회원일 이유가 없고,
 *    가입을 요구하면 반론 창구가 닫힌다. 대신 게시 전 운영자가 관계를 확인한다.
 * ================================================================== */

export const companyResponse = sqliteTable(
  "company_response",
  {
    id: text("id").primaryKey(),
    postId: text("post_id")
      .notNull()
      .references(() => post.id, { onDelete: "cascade" }),
    submitterName: text("submitter_name").notNull(),
    submitterEmail: text("submitter_email").notNull(),
    submitterRole: text("submitter_role").notNull(),
    body: text("body").notNull(),
    // 관계 확인 근거를 운영자가 적는다. 없으면 "왜 게시했나"에 답할 수 없다.
    verifyNote: text("verify_note"),
    verifyStatus: text("verify_status").notNull().default("pending"),
    verifiedBy: text("verified_by").references(() => user.id),
    publishedAt: text("published_at"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    check("company_response_verify", oneOf("verify_status", VERIFY_STATUSES)),
    index("company_response_post_idx").on(t.postId),
  ],
);

export const correctionRequest = sqliteTable(
  "correction_request",
  {
    id: text("id").primaryKey(),
    postId: text("post_id")
      .notNull()
      .references(() => post.id, { onDelete: "cascade" }),
    requesterName: text("requester_name").notNull(),
    requesterEmail: text("requester_email").notNull(),
    claim: text("claim").notNull(),
    evidenceUrl: text("evidence_url"),
    status: text("status").notNull().default("open"),
    // 처리 결과. ⚠️ 반려도 공개한다(`/corrections`) — 수용만 보여 주면 판단 기준이 안 보인다.
    resolution: text("resolution"),
    resolvedBy: text("resolved_by").references(() => user.id),
    resolvedAt: text("resolved_at"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    check(
      "correction_status",
      sql.raw("status in ('open', 'accepted', 'rejected')"),
    ),
    index("correction_status_idx").on(t.status, t.createdAt),
  ],
);

/* ================================================================== *
 * 컬렉션 — 주간 랭킹·기획. 스레드/유튜브에서 링크할 자리다.
 * ================================================================== */

/* ================================================================== *
 * 감사 로그
 *
 * 판정 변경 이력이 여기 남는다. 관리자도 지우지 못한다 —
 * 애플리케이션에 DELETE 경로를 두지 않는 게 그 강제다(D1엔 권한으로 막을 방법이 없다).
 * ================================================================== */

export const auditLog = sqliteTable(
  "audit_log",
  {
    id: text("id").primaryKey(),
    actorId: text("actor_id").references(() => user.id),
    // 예: "post.publish", "post.verdict", "comment.hide", "user.block"
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    reason: text("reason"),
    // 변경 전/후 스냅샷(JSON 문자열). 구조를 고정하지 않는다 —
    // 읽는 사람이 사람이고, 고정하면 새 액션마다 마이그레이션이 붙는다.
    meta: text("meta"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    index("audit_target_idx").on(t.targetType, t.targetId),
    index("audit_created_idx").on(t.createdAt),
  ],
);
