import { and, desc, inArray, isNotNull, isNull } from "drizzle-orm";
import { db } from "$lib/core/db/client";
import { post } from "$lib/core/db/schema";
import { PUBLIC_POST_STATUSES } from "$lib/core/taxonomy";
import type { RequestHandler } from "./$types";

const BASE = "https://aislop.kr";
const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export const GET: RequestHandler = async ({ setHeaders }) => {
  const items = await db()
    .select({
      slug: post.slug,
      title: post.title,
      summary: post.summary,
      publishedAt: post.publishedAt,
    })
    .from(post)
    .where(
      and(
        inArray(post.status, PUBLIC_POST_STATUSES),
        isNull(post.deletedAt),
        isNotNull(post.publishedAt),
      ),
    )
    .orderBy(desc(post.publishedAt))
    .limit(50);

  setHeaders({
    "content-type": "application/rss+xml",
    "cache-control": "public, max-age=900",
  });
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>AI 슬롭</title>
  <link>${BASE}</link>
  <description>AI로 만든 것을 모아 슬롭인지 아닌지 같이 판단합니다.</description>
  <language>ko</language>
${items
  .map(
    (i) => `  <item>
    <title>${esc(i.title)}</title>
    <link>${BASE}/posts/${encodeURIComponent(i.slug)}</link>
    <guid isPermaLink="true">${BASE}/posts/${encodeURIComponent(i.slug)}</guid>
    <description>${esc(i.summary)}</description>
    <pubDate>${new Date(i.publishedAt ?? Date.now()).toUTCString()}</pubDate>
  </item>`,
  )
  .join("\n")}
</channel></rss>`,
  );
};
