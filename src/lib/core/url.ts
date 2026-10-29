// 원문 URL 정규화 — 중복 제보 감지의 근거(브리핑 §B).
//
// 같은 기사가 utm 파라미터·www·트레일링 슬래시만 다르게 열 번 올라오는 게
// 링크 피드의 기본값이다. 저장 시 `urlKey`를 같이 박고 거기에 UNIQUE를 건다.

const TRACKING_PREFIXES = ["utm_", "fbclid", "gclid", "igshid", "ref_", "spm"];

export function normalizeUrl(raw: string): string | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;

  // 스킴·호스트는 소문자, www는 없는 것으로 친다.
  const host = u.hostname.toLowerCase().replace(/^www\./, "");

  const params = new URLSearchParams();
  for (const [k, v] of [...u.searchParams].sort(([a], [b]) =>
    a < b ? -1 : 1,
  )) {
    if (TRACKING_PREFIXES.some((p) => k.toLowerCase().startsWith(p))) continue;
    params.append(k, v);
  }
  const qs = params.toString();
  // 해시는 통째로 버린다 — 같은 문서의 다른 위치일 뿐이다.
  const path = u.pathname.replace(/\/+$/, "") || "/";
  return `${host}${path}${qs ? `?${qs}` : ""}`;
}

// 같은 서비스인지 — 원문(본문 첫 링크)의 도메인으로 본다(2026-10-29 유저 지시).
// `1in8b.life/ko`와 `1in8b.life`가 두 번 올라오는 걸 막는다. 정확한 URL 중복은 `normalizeUrl`이 따로 막는다.
// 여러 서비스가 한 도메인을 나눠 쓰는 곳은 주소 안의 식별자로 가른다. 실측(2026-10-29) 중복 호스트가 근거다.
const SERVICE_ID: Record<string, (u: URL) => string | null | undefined> = {
  "github.com": (u) =>
    u.pathname.split("/").slice(1, 3).join("/").toLowerCase(),
  "huggingface.co": (u) =>
    u.pathname.split("/").slice(1, 3).join("/").toLowerCase(),
  "apps.apple.com": (u) => u.pathname.match(/\/id(\d+)/)?.[1],
  "play.google.com": (u) => u.searchParams.get("id"),
  "chromewebstore.google.com": (u) =>
    u.pathname.split("/").filter(Boolean).at(-1),
  "store.steampowered.com": (u) => u.pathname.match(/\/app\/(\d+)/)?.[1],
};
// 글·영상·기사가 사는 곳 — 도메인이 같아도 다른 사례다. 정확한 URL로만 막는다.
// ⚠️ 언론사 원문이 첫 링크인 글(media)이 막히면 그 언론사 도메인을 여기 더하라.
const SHARED_HOSTS = new Set([
  "news.hada.io",
  "youtube.com",
  "m.youtube.com",
  "youtu.be",
  "n.news.naver.com",
  "news.naver.com",
  "blog.naver.com",
  "m.blog.naver.com",
  "v.daum.net",
  "brunch.co.kr",
  "threads.com",
  "threads.net",
  "instagram.com",
  "x.com",
  "twitter.com",
  "facebook.com",
  "reddit.com",
  "clien.net",
  "medium.com",
  "velog.io",
]);

export function serviceKey(raw: string): string | null {
  const key = normalizeUrl(raw);
  if (!key) return null;
  const u = new URL(raw.trim());
  const host = u.hostname.toLowerCase().replace(/^www\./, "");
  if (SHARED_HOSTS.has(host)) return key;
  const id = SERVICE_ID[host];
  if (!id) return host;
  const v = id(u);
  return v ? `${host}/${v}` : key;
}

// 피드에 노출하는 출처 도메인. 정규화와 달리 사람이 읽는 값이다.
export function displayDomain(raw: string): string {
  try {
    return new URL(raw).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

// `<a href>`·`<img src>`에 넣어도 되는 값인지 판단한다.
// ⚠️ 관리자 입력도 검사한다 — 계정 탈취 한 번이면 관리자 폼이 곧 XSS 입구다.
export function safeHttpUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const v = raw.trim();
  if (!v) return null;
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:" ? v : null;
  } catch {
    return null;
  }
}
