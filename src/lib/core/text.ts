// 본문은 **플레인 텍스트 한 덩어리**다(2026-09-09 유저 결정 — "인풋을 최대한 줄여라").
// 마크다운도 리치텍스트도 저장하지 않는다. 리치텍스트는 HTML을 저장하게 되어
// 새니타이저가 필요해지고, 이 사이트가 판정하는 대상이 AI가 만든 페이지라
// 그걸 복붙하면 저쪽 마크업이 통째로 딸려 들어온다. 둘 다 허용하면 렌더러도
// 새니타이저도 두 벌이 된다. ⚠️ 마크다운으로 올리는 건 나중에 되지만
//    리치텍스트에서 내려오는 건 안 된다 — 순서를 뒤집지 마라.

import { safeHttpUrl } from "./url";

const URL_RE = /https?:\/\/[^\s<>"')\]]+/g;

export interface Segment {
  text: string;
  href: string | null;
}

// 본문을 링크 조각과 글자 조각으로 쪼갠다. ⚠️ 문자열을 조립해 `{@html}`로
// 넘기지 마라 — 조각으로 넘겨야 Svelte가 글자 쪽을 이스케이프한다.
export function linkify(raw: string): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  for (const m of raw.matchAll(URL_RE)) {
    const start = m.index;
    // 문장 끝 마침표·쉼표는 주소가 아니다.
    const url = m[0].replace(/[.,;:!?]+$/, "");
    const href = safeHttpUrl(url);
    if (!href) continue;
    if (start > last) out.push({ text: raw.slice(last, start), href: null });
    out.push({ text: url, href });
    last = start + url.length;
  }
  if (last < raw.length) out.push({ text: raw.slice(last), href: null });
  return out;
}

// 본문의 주소 전부. 원문(`url`)은 첫 번째지만 **중복 검사는 전부로 한다** —
// 근거 링크를 원문보다 먼저 붙이면 첫 번째만 보는 검사가 같은 사례를 놓친다.
export function allUrls(raw: string): string[] {
  const out: string[] = [];
  for (const m of raw.matchAll(URL_RE)) {
    const href = safeHttpUrl(m[0].replace(/[.,;:!?]+$/, ""));
    if (href && !out.includes(href)) out.push(href);
  }
  return out;
}

// 원문 주소. 도메인 표시와 `urlKey`가 이 값에 걸려 있다.
export function firstUrl(raw: string): string | null {
  return allUrls(raw)[0] ?? null;
}

// 목록·검색결과·meta description용 한 줄. 본문 첫 문단에서 잘라 쓴다.
export function excerpt(raw: string, max = 160): string {
  const flat = raw.replace(/\s+/g, " ").trim();
  return flat.length <= max ? flat : `${flat.slice(0, max - 1).trimEnd()}…`;
}
