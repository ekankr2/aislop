import { defineConfig } from "drizzle-kit";

// 마이그레이션 SQL 생성 전용. 적용은 `wrangler d1 migrations apply`
// (drizzle-kit push/migrate는 CF API 토큰을 따로 요구하므로 쓰지 않는다).
export default defineConfig({
  schema: "./src/lib/core/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  verbose: true,
  strict: true,
});
