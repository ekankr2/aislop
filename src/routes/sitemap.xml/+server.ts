import { and, desc, inArray, isNull } from "drizzle-orm";
import { db } from "$lib/core/db/client";
import { post } from "$lib/core/db/schema";
import { PUBLIC_POST_STATUSES } from "$lib/core/taxonomy";
import type { RequestHandler } from "./$types";

const BASE = "https://aislop.kr";

// 정적 경로. 검색·로그인·관리자는 넣지 않는다(robots.txt와 짝).
const STATIC = [
  "",
  "/latest",
  "/verified",
  "/disputed",
  "/not-slop",
  "/slop",
  "/comments",
  "/ai-slop",
  "/about",
];

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

export const GET: RequestHandler = async ({ setHeaders }) => {
  const posts = await db()
    .select({ slug: post.slug, updatedAt: post.updatedAt })
    .from(post)
    .where(
      and(inArray(post.status, PUBLIC_POST_STATUSES), isNull(post.deletedAt)),
    )
    .orderBy(desc(post.updatedAt))
    .limit(5000);

  const urls = [
    ...STATIC.map((p) => ({
      loc: `${BASE}${p}`,
      lastmod: null as string | null,
    })),
    ...posts.map((p) => ({
      loc: `${BASE}/posts/${encodeURIComponent(p.slug)}`,
      lastmod: p.updatedAt,
    })),
  ];

  setHeaders({
    "content-type": "application/xml",
    "cache-control": "public, max-age=3600",
  });
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url><loc>${esc(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod.slice(0, 10)}</lastmod>` : ""}</url>`,
  )
  .join("\n")}
</urlset>`,
  );
};
