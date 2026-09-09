// 요청 컨텍스트. core는 DB든 시크릿이든 전부 여기서 꺼낸다.
//
// ⚠️ Workers에서 `env`는 전역이 아니라 **요청 스코프**다. core 함수마다 인자로
// 넘기면(DI) 호출부가 전부 오염된다 → 요청 경계에서 한 번만 ALS를 채우고
// core는 내부에서 꺼낸다. 진입점은 `hooks.server.ts`의 handle() 하나뿐이다.
// `nodejs_als` 컴파일 플래그가 필요하다(wrangler.jsonc).

import { AsyncLocalStorage } from "node:async_hooks";
import { type DrizzleD1Database, drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export type Db = DrizzleD1Database<typeof schema>;

// Worker 바인딩·시크릿. wrangler.jsonc의 이름과 1:1로 맞춰라.
export interface AppEnv {
  DB: D1Database;
  ASSETS_BUCKET?: R2Bucket;
  CDN_BASE?: string;
  // 공개 읽기 대량추출 억제 / 로그인 쓰기 스팸 억제. 로컬 dev엔 없을 수 있다.
  PUBLIC_LIMITER?: RateLimit;
  WRITE_LIMITER?: RateLimit;
  // 로그인 코드 메일(Cloudflare Email Service). 로컬엔 바인딩이 없고 콘솔에 찍는다.
  // ⚠️ 타입을 구조로 적는다 — 바인딩 타입 이름이 베타 동안 바뀌어도 여기가 안 깨진다.
  EMAIL?: {
    send(msg: {
      to: string;
      from: string;
      subject: string;
      text?: string;
      html?: string;
    }): Promise<void>;
  };
  MAIL_FROM?: string;
  // 창구 접수 알림을 받을 주소. 없으면 알림을 건너뛴다(접수는 그대로 된다).
  ADMIN_EMAIL?: string;
  // 로컬 전용 로그인 우회(.dev.vars). 프로덕션 번들에서 사라진다 — hooks.server.ts 참조.
  DEV_USER_ID?: string;
}

interface Ctx {
  env: AppEnv;
  db: Db;
}

const als = new AsyncLocalStorage<Ctx>();

export function runWithEnv<T>(env: AppEnv, fn: () => T): T {
  return als.run({ env, db: drizzle(env.DB, { schema }) }, fn);
}

export function db(): Db {
  const c = als.getStore();
  if (!c)
    throw new Error(
      "요청 컨텍스트 없음 — 진입점을 runWithEnv()로 감쌌는지 확인해라",
    );
  return c.db;
}

export function env(): AppEnv {
  const c = als.getStore();
  if (!c)
    throw new Error(
      "요청 컨텍스트 없음 — 진입점을 runWithEnv()로 감쌌는지 확인해라",
    );
  return c.env;
}

// ⚠️ drizzle은 실패를 감싸 message엔 SQL만 넣고 원인은 `cause`에 둔다 —
// `String(e).includes("UNIQUE constraint failed")`는 영원히 false다.
export function causeChain(e: unknown): string {
  const parts: string[] = [];
  let cur: unknown = e;
  for (let i = 0; cur && i < 5; i++) {
    parts.push(String((cur as Error).message ?? cur));
    cur = (cur as { cause?: unknown }).cause;
  }
  return parts.join(" | ");
}

export const isUniqueViolation = (e: unknown): boolean =>
  causeChain(e).includes("UNIQUE constraint failed");
