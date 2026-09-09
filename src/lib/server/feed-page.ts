// 탭 5개가 같은 로더를 쓴다. 라우트 파일마다 쿼리를 복붙하면
// 언젠가 한 곳만 공개 조건이 빠진다.

import { listFeed } from "$lib/core/feed";
import {
  CATEGORY_SLUGS,
  type Category,
  type FeedTab,
} from "$lib/core/taxonomy";

export const readCategory = (url: URL): Category | null => {
  const c = url.searchParams.get("category");
  return c && CATEGORY_SLUGS.includes(c as Category) ? (c as Category) : null;
};

export const feedLoad =
  (tab: FeedTab) =>
  async ({ url, locals }: { url: URL; locals: App.Locals }) => {
    const category = readCategory(url);
    const viewerId = locals.user?.id ?? null;
    return {
      tab,
      category,
      items: await listFeed(tab, {
        category,
        viewerId,
      }),
    };
  };
