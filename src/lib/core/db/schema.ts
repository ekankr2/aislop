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
//     된다. 품질은 유저 표(`vote`)가 답한다.
//   - `tag`/`post_tag`: 카테고리가 닫힌 목록으로 있고 검색이 있다. 자유 태그는 나중에.
//   - `collection`(기획·주간): 2026-09-08 삭제(유저 지시). 사례가 0건인데 묶음부터
//     만들고 있었다. 되살리려면 "묶을 게 있는가"에 먼저 답해라.
//   - `post_event`(공개 타임라인): 상태 변경 이력은 `audit_log`가 보존하고,
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
  CATEGORY_SLUGS,
  EVIDENCE_TYPES,
  POST_STATUSES,
  ROLES,
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
    // 닉네임이자 프로필 주소다(`/users/<name>`). 로그인이 이메일 OTP뿐이라 가입 시엔
    // 비어 있고 `ensureName`이 `slop-xxxx`를 발급한다.
    // ⚠️ 표시 이름과 URL 키를 다시 두 칸으로 쪼개지 마라(2026-09-09 유저 지시 —
    //    "걍 이메일, 닉네임 두 개로 가면 안 되냐"). 원래 `username`이 따로 있었는데
    //    `renameUser`가 늘 name을 slugify해서 채우는, 값이 하나뿐인 두 칸이었다.
    //    UNIQUE라 같은 이름 사칭이 막힌다 — 판정 사이트에서 이게 링크 안정성보다 크다.
    name: text("name").notNull().unique(),
    // 로그인 수단이자 유일한 식별자다. 코드가 도착해야 로그인되므로 소유가 곧 증명이다.
    email: text("email").notNull().unique(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),

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
    index("user_name_idx").on(t.name),
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
 *   2. AI를 썼다는 근거       → 글쓴이가 본문에 적는다. 운영자 필드는 없다.
 *   3. 누구에게 어떤 피해인가 → problems
 *   4. 슬롭인가                → 유저 표(`vote`). ⚠️ 운영자 판정 필드는 없다.
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

    /* --- 3. 누구에게 어떤 피해·불편인가 --- */
    // 줄바꿈 구분 불릿. 구조를 더 쪼개지 않는다 — 사례마다 모양이 달라 스키마가 못 따라간다.
    problems: text("problems"),
    // 확인된 사실. 주장과 분리해 적는다.
    facts: text("facts"),

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
    // 여론(축 2) 집계 캐시. 정렬·필터가 쓴다. 진실원은 `vote` 테이블이다.
    voteSlopCount: integer("vote_slop_count").notNull().default(0),
    voteOkCount: integer("vote_ok_count").notNull().default(0),
    // 인기 정렬 점수. ⚠️ 계산식이 아니라 **컬럼**이다 — 식으로 두면 ORDER BY가 인덱스를
    //    못 타고 필터 결과 전체를 정렬한다. 식의 정의와 갱신은 `core/post.ts`의
    //    `refreshCounts` 한 곳에만 둔다(표·댓글이 바뀌는 유일한 길목이다).
    heat: integer("heat").notNull().default(0),

    isDemo: integer("is_demo", { mode: "boolean" }).notNull().default(false),
    publishedAt: text("published_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    deletedAt: text("deleted_at"),
  },
  (t) => [
    check("post_status", oneOf("status", POST_STATUSES)),
    check("post_category", oneOf("category", CATEGORY_SLUGS)),
    // 같은 원문은 한 번만. NULL은 UNIQUE에 걸리지 않으므로 원문 없는 사례는 자유롭다.
    uniqueIndex("post_url_key_idx").on(t.urlKey),
    index("post_feed_idx").on(t.status, t.publishedAt),
    index("post_heat_idx").on(t.status, t.heat),
    index("post_category_idx").on(t.category, t.publishedAt),
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
 * 투표 — 품질(축 2)의 **유일한** 답이다. 운영자 판정 필드는 없다(2026-09-09 제거).
 * ================================================================== */

// PK가 (post, user)라 "한 사람 한 표"가 DB 제약으로 강제된다.
// ⚠️ `choice`를 더 쪼개지 마라(기만적·돈값 못함…) — taxonomy.ts의 "투표" 주석 참조.
// ⚠️ 이 표를 요약한 값을 `post`에 필드로 굳히지 마라(운영자 판정을 되살리는 지름길이다).
//    비율은 그때그때 `opinion()`이 센다.
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
    // 첨부 이미지 한 장(선택). 계약서·발주 메일 캡처처럼 관계를 증명하는 것이 온다.
    // ⚠️ `evidence` 테이블에 넣지 마라 — 거기는 **게시된 근거**고 이건 심사 중 제출물이다.
    imageUrl: text("image_url"),
    imageKey: text("image_key"),
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

/* 글 신고. ⚠️ 사전 검토를 없앤(2026-09-09) 자리를 메우는 창구다 —
   글이 바로 게시되므로 잘못된 글을 **빨리 내리는 경로**가 없으면 방어선이 없다.
   ⚠️ 비로그인 제출이다(정정 요청과 같은 이유). 판정당한 쪽이 가입부터 해야 하면
      창구가 닫힌다. 대신 IP 레이트리밋이 걸린다. */
export const postReport = sqliteTable(
  "post_report",
  {
    id: text("id").primaryKey(),
    postId: text("post_id")
      .notNull()
      .references(() => post.id, { onDelete: "cascade" }),
    // 로그인 상태면 채운다. 비로그인 신고는 null이다.
    reporterId: text("reporter_id").references(() => user.id),
    reason: text("reason").notNull(),
    status: text("status").notNull().default("open"),
    resolvedBy: text("resolved_by").references(() => user.id),
    resolvedAt: text("resolved_at"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    check(
      "post_report_status",
      sql.raw("status in ('open', 'resolved', 'dismissed')"),
    ),
    index("post_report_status_idx").on(t.status, t.createdAt),
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
    // 첨부 이미지 한 장(선택). 링크가 죽었거나 로그인 뒤에 있는 화면이 근거일 때 쓴다.
    imageUrl: text("image_url"),
    imageKey: text("image_key"),
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
    // 예: "post.publish", "post.hide", "comment.hide", "user.block"
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
