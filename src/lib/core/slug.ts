// URL은 한 번 나가면 못 바꾼다(브리핑 §7: 안정적인 slug). 제목이 바뀌어도 slug는 그대로다.
//
// 한글 제목을 로마자로 옮기지 않는다 — 음차 규칙이 갈리면 같은 제목이 다른 slug가 된다.
// 한글은 그대로 두고 퍼센트 인코딩에 맡긴다(검색엔진은 이걸 정상 처리한다).

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// 충돌 시 뒤에 짧은 접미사를 붙인다. 날짜를 붙이지 않는 이유 =
// 같은 날 같은 제목이 또 오면 다시 충돌한다.
export function uniqueSlug(
  base: string,
  taken: (s: string) => boolean,
): string {
  const b = base || "post";
  if (!taken(b)) return b;
  for (let i = 2; i < 100; i++) {
    const s = `${b}-${i}`;
    if (!taken(s)) return s;
  }
  return `${b}-${Math.random().toString(36).slice(2, 7)}`;
}
