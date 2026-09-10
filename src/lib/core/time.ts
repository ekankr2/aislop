// 시각은 전부 **ISO8601 KST 문자열**로 저장한다. 사전순 = 시간순이라
// SQLite에서 정렬·범위 비교가 문자열 그대로 먹는다(별도 인덱스 트릭 불필요).
// 예외 없다. 회원·세션 테이블도 같은 형식이다.

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export function nowKst(): string {
  return toKst(new Date());
}

export function toKst(d: Date): string {
  return `${new Date(d.getTime() + KST_OFFSET_MS).toISOString().slice(0, 19)}+09:00`;
}

// "3분 전" / "2시간 전" / "3일 전" / 그 이상은 날짜.
export function relative(iso: string, now: Date = new Date()): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "";
  const sec = Math.max(0, Math.floor((now.getTime() - then) / 1000));
  if (sec < 60) return "방금";
  if (sec < 3600) return `${Math.floor(sec / 60)}분 전`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}시간 전`;
  if (sec < 86400 * 7) return `${Math.floor(sec / 86400)}일 전`;
  // ⚠️ `2026-09-01`이 아니라 `26.09.01`이다(2026-09-10 유저 지적 — "날짜랑 간격이
  //    너무 넓지 않냐"). 목록 byline의 시각 칸은 **이 함수의 최장 출력**에 맞춰져
  //    있는데, 네 자리 연도가 76.9px로 혼자 튀어서 `1일 전` 행마다 43px이 비었다.
  //    두 자리로 줄이면 53.8px이라 `17시간 전`(53.7px)과 같아져 칸이 54px로 준다.
  //    연도는 남는다 — 지우면 작년 글과 올해 글이 화면에서 같아진다.
  //    기계용 값은 `<time datetime>`이 그대로 갖고 있다.
  return iso.slice(2, 10).replace(/-/g, ".");
}
