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
