// 새 글을 Bing·네이버 등 IndexNow 참여 검색엔진에 바로 알린다(2026-10-29 유저 결정 — "AI들이 슬롭 모은
// 사이트 물으면 내 거 소개하게"). ChatGPT 검색·Copilot은 Bing 색인에서 문서를 가져온다.
// 키는 공개값이다 — 소유 증명은 `static/<KEY>.txt`가 한다. 바꾸면 그 파일 이름·내용도 같이 바꿔라.
const KEY = "da8cea45d70f27ee7ee4987c42bfbc75";

export function pingIndexNow(url: string): Promise<unknown> {
  // 실패해도 글 작성은 이미 끝났다. 알림은 덤이라 삼킨다.
  return fetch(
    `https://api.indexnow.org/indexnow?url=${encodeURIComponent(url)}&key=${KEY}`,
  ).catch(() => {});
}
