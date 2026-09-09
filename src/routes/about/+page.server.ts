import { desc, eq, ne } from "drizzle-orm";
import { db } from "$lib/core/db/client";
import { correctionRequest, post } from "$lib/core/db/schema";
import type { PageServerLoad } from "./$types";

// 정정 기록은 원래 `/corrections`였다. 2026-09-08에 여기로 합쳤다(유저 지시) —
// 정정 정책과 그 정책이 실제로 어떻게 굴러갔는지는 같은 페이지에서 읽혀야 한다.
// ⚠️ 수용·반려를 모두 공개한다. 수용만 보여 주면 "정정을 잘 받는다"는 인상만 남고
//    실제 판단 기준은 안 보인다.
export const load: PageServerLoad = async () => ({
  corrections: await db()
    .select({
      id: correctionRequest.id,
      claim: correctionRequest.claim,
      status: correctionRequest.status,
      resolution: correctionRequest.resolution,
      resolvedAt: correctionRequest.resolvedAt,
      postSlug: post.slug,
      postTitle: post.title,
    })
    .from(correctionRequest)
    .innerJoin(post, eq(post.id, correctionRequest.postId))
    .where(ne(correctionRequest.status, "open"))
    .orderBy(desc(correctionRequest.resolvedAt))
    .limit(100),
});
