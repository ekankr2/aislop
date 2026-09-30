// 탭 5개가 같은 로더를 쓴다. 라우트 파일마다 쿼리를 복붙하면
// 언젠가 한 곳만 공개 조건이 빠진다.

import { categoryCounts, countFeed, listFeed } from "$lib/core/feed";
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
    const [items, total, counts] = await Promise.all([
      listFeed(tab, {
        category,
        viewerId,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      }),
      countFeed(tab, category),
      categoryCounts(),
    ]);
    // 쪽 링크는 지금 주소에서 page만 바꾼다(분류 필터 유지). 1쪽은 page를 뺀다.
    const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const hrefFor = (n: number) => {
      const u = new URL(url);
      if (n === 1) u.searchParams.delete("page");
      else u.searchParams.set("page", String(n));
      return `${u.pathname}${u.search}`;
    };
    const pages = Array.from({ length: pageCount }, (_, i) => ({
      n: i + 1,
      href: hrefFor(i + 1),
    }));
    return { tab, category, items, counts, page, pages };
  };
