import type { AppEnv } from "$lib/core/db/client";
import type { AppUser } from "$lib/core/user";

declare global {
  namespace App {
    interface Locals {
      user: AppUser | null;
    }
    interface Platform {
      env: AppEnv;
      context: { waitUntil(p: Promise<unknown>): void };
    }
  }
}
