import { listRecentComments } from "$lib/core/post";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => ({
  comments: await listRecentComments(),
});
