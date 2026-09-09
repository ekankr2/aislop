// 인증. **로그인 코드 메일 + 세션 쿠키**가 전부다. 비밀번호도 소셜 OAuth도 없다.
//
// better-auth를 걷어내고 직접 구현했다(2026-09-08 유저 지시 "단순한 게 최고다").
// 쓰던 기능이 전체의 5%였는데, 라이브러리에 맞추는 코드(쿠키 옮겨 담기, 요청 스코프
// 인스턴스 캐시, 스키마 컬럼 복제)가 이 파일만큼 있었다. ⚠️ 되돌리지 마라.
//
// ⚠️ 이 파일이 이 저장소에서 **틀리면 조용한** 유일한 곳이다. 인증 버그는 에러를
//    안 내고 그냥 계정이 열린다. 아래 넷은 규칙이고 테스트(`auth.test.ts`)로 묶여 있다:
//      1. 난수는 `crypto.getRandomValues`만 쓴다 (`Math.random` 금지)
//      2. 코드·세션 토큰은 **해시로만** 저장한다 (DB가 새도 로그인은 안 된다)
//      3. 비교는 길이 무관 상수 시간으로 한다
//      4. 코드 하나당 시도 3회, 5분

import { eq } from "drizzle-orm";
import { db } from "./db/client";
import { loginCode, session, user } from "./db/schema";
import { sendMail } from "./email";
import { nowKst, toKst } from "./time";

export const CODE_TTL_MS = 5 * 60 * 1000;
export const CODE_MAX_ATTEMPTS = 3;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export const SESSION_COOKIE = "session";

// ⚠️ `secure`를 dev에서 켜면 http://localhost에 쿠키가 안 붙어 로그인이 안 된다.
export const SESSION_COOKIE_OPTIONS = {
  path: "/",
  httpOnly: true,
  sameSite: "lax",
  secure: !import.meta.env.DEV,
  maxAge: SESSION_TTL_MS / 1000,
} as const;

/* ── 원시 도구 ───────────────────────────────────────────────── */
// ⚠️ 아래 넷은 테스트(`auth.test.ts`)가 잡고 있어서 export한다. 화면에서 쓰지 마라.

// ⚠️ `Math.random`을 쓰지 마라. 예측 가능한 난수로 만든 코드는 소스가 공개돼 있으면
//    그대로 재현된다. `getRandomValues`는 CSPRNG라 소스를 다 읽어도 예측이 안 된다.
// ⚠️ `% 1000000`으로 줄이지 마라 — 모듈로 편향이 생겨 앞쪽 값이 더 자주 나온다.
//    범위를 벗어난 표본은 버리고 다시 뽑는다.
export function randomCode(): string {
  const buf = new Uint32Array(1);
  const limit = Math.floor(0xffffffff / 1_000_000) * 1_000_000;
  let n: number;
  do {
    crypto.getRandomValues(buf);
    n = buf[0];
  } while (n >= limit);
  return String(n % 1_000_000).padStart(6, "0");
}

export function randomToken(): string {
  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  return btoa(String.fromCharCode(...buf))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

export async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(s),
  );
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ⚠️ `a === b`로 비교하지 마라. 첫 글자에서 갈리면 빨리 끝나므로, 걸린 시간으로
//    앞에서 몇 글자가 맞았는지가 새어 나간다(타이밍 공격).
export function timingSafeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++)
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

/* ── 로그인 코드 ─────────────────────────────────────────────── */

// 이메일당 살아있는 코드는 **하나뿐**이다. 새로 요청하면 이전 것이 사라진다 —
// 여러 개를 살려두면 시도 횟수 제한이 코드 개수만큼 늘어난다.
export async function sendLoginCode(email: string): Promise<void> {
  const code = randomCode();
  await db()
    .insert(loginCode)
    .values({
      email,
      codeHash: await sha256(code),
      expiresAt: toKst(new Date(Date.now() + CODE_TTL_MS)),
      attempts: 0,
    })
    .onConflictDoUpdate({
      target: loginCode.email,
      set: {
        codeHash: await sha256(code),
        expiresAt: toKst(new Date(Date.now() + CODE_TTL_MS)),
        attempts: 0,
      },
    });

  // ⚠️ 본문을 더 줄이지 마라. 한 줄짜리 평문은 스팸으로 분류된다(2026-09-08 실측 —
  //    첫 발송이 Gmail 스팸함으로 갔다). 왜 받았는지 / 안 했으면 어떻게 되는지 /
  //    누가 보냈는지가 있어야 한다. 링크는 넣지 않는다 — OTP 메일의 링크는
  //    피싱 학습 대상이고, 사용자는 이미 열어 둔 창으로 돌아가면 된다.
  await sendMail({
    to: email,
    subject: `AI 슬롭 로그인 코드 ${code}`,
    text: [
      code,
      "",
      "aislop.kr 로그인 코드입니다. 5분 안에 입력하세요.",
      "요청한 적이 없으면 버리면 됩니다.",
      "",
      "AI 슬롭 · aislop.kr",
      "AI로 만든 것을 모아 슬롭인지 아닌지 같이 판단합니다.",
    ].join("\n"),
  });
}

// 맞으면 회원 id, 아니면 null. ⚠️ 호출부에서 실패 사유를 구분해 보여주지 마라 —
// "만료됐다"와 "틀렸다"를 나눠주면 대입 공격에 힌트가 된다.
export async function verifyLoginCode(
  email: string,
  code: string,
): Promise<string | null> {
  const [row] = await db()
    .select()
    .from(loginCode)
    .where(eq(loginCode.email, email))
    .limit(1);
  if (!row) return null;

  // 만료·시도초과는 행을 지운다. 남겨두면 다음 요청에서 다시 세야 한다.
  if (
    Date.parse(row.expiresAt) < Date.now() ||
    row.attempts >= CODE_MAX_ATTEMPTS
  ) {
    await db().delete(loginCode).where(eq(loginCode.email, email));
    return null;
  }

  if (!timingSafeEqual(row.codeHash, await sha256(code))) {
    await db()
      .update(loginCode)
      .set({ attempts: row.attempts + 1 })
      .where(eq(loginCode.email, email));
    return null;
  }

  // 한 번 쓴 코드는 즉시 버린다(재사용 금지).
  await db().delete(loginCode).where(eq(loginCode.email, email));
  return await upsertUser(email);
}

async function upsertUser(email: string): Promise<string> {
  const [existing] = await db()
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);
  if (existing) return existing.id;

  const id = crypto.randomUUID();
  // 이름은 비워 둔다 — `ensureUsername`이 `slop-xxxx`를 발급한다.
  // ⚠️ 이메일 앞부분을 이름으로 쓰지 마라. 작성자는 공개되므로 이메일이 공개된다.
  await db()
    .insert(user)
    .values({ id, name: "", email, createdAt: nowKst(), updatedAt: nowKst() });
  return id;
}

/* ── 세션 ────────────────────────────────────────────────────── */

// 반환값은 **쿠키에 담을 원본 토큰**이다. DB엔 해시만 들어간다.
export async function createSession(userId: string): Promise<string> {
  const token = randomToken();
  await db()
    .insert(session)
    .values({
      tokenHash: await sha256(token),
      userId,
      expiresAt: toKst(new Date(Date.now() + SESSION_TTL_MS)),
      createdAt: nowKst(),
    });
  return token;
}

export async function readSession(token: string): Promise<string | null> {
  const [row] = await db()
    .select()
    .from(session)
    .where(eq(session.tokenHash, await sha256(token)))
    .limit(1);
  if (!row) return null;
  if (Date.parse(row.expiresAt) < Date.now()) {
    await db().delete(session).where(eq(session.tokenHash, row.tokenHash));
    return null;
  }
  return row.userId;
}

export async function destroySession(token: string): Promise<void> {
  await db()
    .delete(session)
    .where(eq(session.tokenHash, await sha256(token)));
}
