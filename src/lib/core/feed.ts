// 메인 피드. 탭 = 같은 목록의 다른 필터/정렬이지 서로 다른 화면이 아니다.

import { and, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "./db/client";
import { post, user } from "./db/schema";
import {
  type Category,
  type FeedTab,
  OPINION_OK_PCT,
  OPINION_SLOP_PCT,
  PUBLIC_POST_STATUSES,
  VOTE_MIN,
  type VoteChoice,
} from "./taxonomy";

export interface FeedItem {
  slug: string;
  title: string;
  summary: string;
  category: string;
  url: string | null;
  domain: string | null;
  thumbUrl: string | null;
  aiStatus: string;
  isDemo: boolean;
  commentCount: number;
  voteSlopCount: number;
  voteOkCount: number;
  publishedAt: string | null;
  authorName: string;
  authorUsername: string | null;
  heat: number;
  // 내가 던진 표. 안 던졌으면 null이다.
  myVote: VoteChoice | null;
}

// 공개 피드의 기본 조건. soft delete와 비공개 상태를 한 곳에서만 정의한다 —
// 탭마다 다시 적으면 언젠가 한 곳이 빠지고 미검토 제보가 노출된다.
const visible = () =>
  and(
    inArray(post.status, PUBLIC_POST_STATUSES),
    isNull(post.deletedAt),
    isNotNull(post.publishedAt),
  );

// 🔥 = 총 투표수(방향 무관) + 댓글. 댓글이 더 비싼 행동이라 가중치를 준다.
// ⚠️ 방향을 구분해서 세지 마라 — 슬롭 표만 세면 논쟁 중인 사례가 묻히고,
//    "많이 싸우는 사례가 위로 온다"가 이 피드가 원하는 순서다.
// ⚠️ 시간 감쇠를 넣지 않는다. 넣는 순간 "왜 내 글이 내려갔냐"가 상시 논쟁이 되고
//    감쇠 상수는 검증할 방법이 없다. 대신 인기 탭은 최근 30일로 창을 자른다.
const heatSql = sql<number>`${post.voteSlopCount} + ${post.voteOkCount} + ${post.commentCount} * 2`;
const POPULAR_WINDOW_DAYS = 30;

// 여론 비율은 저장하지 않고 표 수에서 계산한다(진실원은 vote 테이블이다).
const totalVotes = sql`(${post.voteSlopCount} + ${post.voteOkCount})`;
const slopPct = sql`(${post.voteSlopCount} * 100.0 / ${totalVotes})`;

function opinionFilter(bucket: "slop" | "mixed" | "ok") {
  const enough = sql`${totalVotes} >= ${VOTE_MIN}`;
  if (bucket === "slop")
    return sql`${enough} and ${slopPct} >= ${OPINION_SLOP_PCT}`;
  if (bucket === "ok")
    return sql`${enough} and ${slopPct} <= ${OPINION_OK_PCT}`;
  return sql`${enough} and ${slopPct} > ${OPINION_OK_PCT} and ${slopPct} < ${OPINION_SLOP_PCT}`;
}

function tabFilter(tab: FeedTab) {
  switch (tab) {
    case "verified":
      // "검증됨" = AI 사용이 확인된 사례. 판정(축 2)과 무관하다.
      return inArray(post.aiStatus, ["confirmed", "self_disclosed"]);
    // 여론 칸. ⚠️ 표본(`VOTE_MIN`)을 못 채운 글은 어디에도 안 넣는다 —
    //    3표에 100%를 "슬롭 목록"에 올리면 그게 곧 공격 수단이 된다.
    case "slop":
      return opinionFilter("slop");
    case "mixed":
      return opinionFilter("mixed");
    case "ok":
      return opinionFilter("ok");
    case "popular": {
      const since = new Date(
        Date.now() - POPULAR_WINDOW_DAYS * 86400_000,
      ).toISOString();
      return sql`${post.publishedAt} >= ${since}`;
    }
    default:
      return undefined;
  }
}

export async function listFeed(
  tab: FeedTab,
  opts: {
    category?: Category | null;
    viewerId?: string | null;
    limit?: number;
    offset?: number;
  } = {},
): Promise<FeedItem[]> {
  const limit = Math.min(opts.limit ?? 30, 100);

  const rows = await db()
    .select({
      slug: post.slug,
      title: post.title,
      summary: post.summary,
      category: post.category,
      url: post.url,
      domain: post.domain,
      thumbUrl: post.thumbUrl,
      aiStatus: post.aiStatus,
      isDemo: post.isDemo,
      commentCount: post.commentCount,
      voteSlopCount: post.voteSlopCount,
      voteOkCount: post.voteOkCount,
      publishedAt: post.publishedAt,
      authorName: user.name,
      authorUsername: user.username,
      heat: heatSql,
      // 내가 어느 쪽에 던졌는지. 로그인 안 했으면 서브쿼리 없이 null이다.
      myVote: opts.viewerId
        ? sql<string | null>`(
            select choice from vote
            where vote.post_id = ${post.id} and vote.user_id = ${opts.viewerId}
          )`
        : sql<string | null>`null`,
    })
    .from(post)
    .innerJoin(user, eq(user.id, post.authorId))
    .where(
      and(
        visible(),
        tabFilter(tab),
        opts.category ? eq(post.category, opts.category) : undefined,
      ),
    )
    .orderBy(tab === "popular" ? desc(heatSql) : desc(post.publishedAt))
    .limit(limit)
    .offset(opts.offset ?? 0);

  return rows.map((r) => ({
    ...r,
    myVote: (r.myVote as VoteChoice | null) ?? null,
  }));
}
