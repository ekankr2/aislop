import { feedLoad } from "$lib/server/feed-page";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = feedLoad("mixed");
