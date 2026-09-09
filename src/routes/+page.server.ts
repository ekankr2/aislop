import { listFeed } from "$lib/core/feed";
import { readCategory } from "$lib/server/feed-page";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ url, locals }) => {
  const category = readCategory(url);
  const viewerId = locals.user?.id ?? null;
  return {
    category,
    items: await listFeed("popular", {
      category,
      viewerId,
    }),
  };
};
