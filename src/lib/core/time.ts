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
  return iso.slice(0, 10);
}
