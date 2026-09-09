import { feedLoad } from "$lib/server/feed-page";
import type { PageServerLoad } from "./$types";

// 홈 = `popular` 탭. 다른 탭들과 같은 로더를 쓴다 — 쿼리를 복붙하면
// 언젠가 한 곳만 공개 조건이 빠진다.
export const load: PageServerLoad = feedLoad("popular");
