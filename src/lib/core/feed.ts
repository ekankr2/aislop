// 메인 피드. 탭 = 같은 목록의 다른 필터/정렬이지 서로 다른 화면이 아니다.

import { and, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "./db/client";
import { post, user } from "./db/schema";
import {
  type Category,
  type FeedTab,
  PUBLIC_POST_STATUSES,
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
  isDemo: boolean;
  commentCount: number;
  voteSlopCount: number;
  voteOkCount: number;
  publishedAt: string | null;
  authorName: string;
  authorId: string;
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

// 🔥 정렬 점수. **논쟁 중인 글을 위로** 올린다.
//   총표 + 댓글×2 + min(슬롭, 괜찮다)×3
// ⚠️ 순추천(슬롭−괜찮다)으로 바꾸지 마라. 슬롭 표가 많은 글이 아래로 내려가면
//    이 사이트에서 제일 중요한 사례가 제일 안 보인다. 반대로 "괜찮다"만 위로 오면
//    AI 홍보 게시판이 된다. 레딧·네이트판은 "좋은 글을 위로"가 목적이라 순추천이
//    맞지만 여기 목적은 다르다.
// ⚠️ 한쪽으로 쏠린 글은 **어느 쪽이든 같은 점수**다. 슬롭 쏠림을 괜찮다 쏠림보다
//    위로 올리면 운영자 편향을 정렬에 박는 것이고, 그건 필드로 걷어낸 것을
//    알고리즘으로 되살리는 짓이다.
// `min(a,b)×3`이 갈리는 정도다 — 5:5(총 10)는 25, 10:0(총 10)은 10.
// ⚠️ 시간 감쇠를 넣지 않는다. 넣는 순간 "왜 내 글이 내려갔냐"가 상시 논쟁이 되고
//    감쇠 상수는 검증할 방법이 없다. 대신 인기 탭은 최근 30일로 창을 자른다.
// ⚠️ 여기서 식을 다시 만들지 마라. 값은 `post.heat` **컬럼**이고 갱신은
//    `core/post.ts`의 `refreshCounts`가 한다 — 식으로 정렬하면 `post_heat_idx`를
//    못 타고 필터 결과 전체를 매 요청 정렬한다.
const POPULAR_WINDOW_DAYS = 30;

function tabFilter(tab: FeedTab) {
  switch (tab) {
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
      isDemo: post.isDemo,
      commentCount: post.commentCount,
      voteSlopCount: post.voteSlopCount,
      voteOkCount: post.voteOkCount,
      publishedAt: post.publishedAt,
      authorName: user.name,
      authorId: user.id,
      heat: post.heat,
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
    .orderBy(tab === "popular" ? desc(post.heat) : desc(post.publishedAt))
    .limit(limit)
    .offset(opts.offset ?? 0);

  return rows.map((r) => ({
    ...r,
    myVote: (r.myVote as VoteChoice | null) ?? null,
  }));
}

// 분류 필터 줄이 쓰는 글 수. ⚠️ 0건인 분류는 화면에서 아예 뺀다(2026-09-09 유저 지시) —
//    누를 게 없는 링크가 아홉 개 늘어서 있으면 목록보다 필터가 무거워 보인다.
//    여기 조건은 `visible()`과 같아야 한다. 갈라지면 "필터엔 있는데 눌러도 0건"이 된다.
export async function categoryCounts(): Promise<Record<string, number>> {
  const rows = await db()
    .select({ category: post.category, n: sql<number>`count(*)` })
    .from(post)
    .where(visible())
    .groupBy(post.category);
  return Object.fromEntries(rows.map((r) => [r.category, Number(r.n)]));
}
