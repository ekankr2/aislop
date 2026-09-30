// 탭 5개가 같은 로더를 쓴다. 라우트 파일마다 쿼리를 복붙하면
// 언젠가 한 곳만 공개 조건이 빠진다.

import { categoryCounts, listFeed } from "$lib/core/feed";
import {
  CATEGORY_SLUGS,
  type Category,
  type FeedTab,
} from "$lib/core/taxonomy";

const PAGE_SIZE = 30;

export const readCategory = (url: URL): Category | null => {
  const c = url.searchParams.get("category");
  return c && CATEGORY_SLUGS.includes(c as Category) ? (c as Category) : null;
};

export const feedLoad =
  (tab: FeedTab) =>
  async ({ url, locals }: { url: URL; locals: App.Locals }) => {
    const category = readCategory(url);
    const viewerId = locals.user?.id ?? null;
    const page = Math.max(
      1,
      Number.parseInt(url.searchParams.get("page") ?? "", 10) || 1,
    );
    // 한 줄 더 읽어 다음 쪽이 있는지 본다 — count 쿼리를 따로 돌리지 않는다.
    const [rows, counts] = await Promise.all([
      listFeed(tab, {
        category,
        viewerId,
        limit: PAGE_SIZE + 1,
        offset: (page - 1) * PAGE_SIZE,
      }),
      categoryCounts(),
    ]);
    let next: string | null = null;
    if (rows.length > PAGE_SIZE) {
      const u = new URL(url);
      u.searchParams.set("page", String(page + 1));
      next = `${u.pathname}${u.search}`;
    }
    return { tab, category, items: rows.slice(0, PAGE_SIZE), counts, next };
  };
