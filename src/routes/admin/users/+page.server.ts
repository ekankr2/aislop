import { fail } from "@sveltejs/kit";
import { desc, eq } from "drizzle-orm";
import { logAudit } from "$lib/core/audit";
import { db } from "$lib/core/db/client";
import { user } from "$lib/core/db/schema";
import { ROLES, type Role } from "$lib/core/taxonomy";
import { nowKst } from "$lib/core/time";
import { blockUser, unblockUser } from "$lib/core/user";
import { requireAdmin } from "$lib/server/guard";
import type { Actions, PageServerLoad } from "./$types";

// ⚠️ 역할·차단은 admin 전용이다. editor는 콘텐츠만 만진다.
export const load: PageServerLoad = async ({ locals }) => {
  requireAdmin(locals.user);
  return {
    users: await db()
      .select({
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        blockedAt: user.blockedAt,
        blockedReason: user.blockedReason,
        createdAt: user.createdAt,
      })
      .from(user)
      .orderBy(desc(user.createdAt))
      .limit(200),
  };
};

export const actions: Actions = {
  role: async ({ request, locals }) => {
    const me = requireAdmin(locals.user);
    const f = await request.formData();
    const id = String(f.get("id"));
    const role = String(f.get("role"));
    if (!ROLES.includes(role as Role))
      return fail(400, { message: "모르는 역할" });
    // 마지막 관리자가 스스로를 강등하면 아무도 관리자 화면에 못 들어간다.
    if (id === me.id && role !== "admin")
      return fail(400, { message: "본인 역할은 못 낮춤" });

    await db()
      .update(user)
      .set({ role, updatedAt: nowKst() })
      .where(eq(user.id, id));
    await logAudit({
      actorId: me.id,
      action: "user.role",
      targetType: "user",
      targetId: id,
      meta: { role },
    });
    return { ok: true };
  },

  block: async ({ request, locals }) => {
    const me = requireAdmin(locals.user);
    const f = await request.formData();
    const id = String(f.get("id"));
    if (id === me.id) return fail(400, { message: "본인은 못 차단함" });

    const reason = String(f.get("reason") ?? "").trim();
    if (!reason) return fail(400, { message: "차단 사유를 입력" });

    await blockUser(id, reason);
    await logAudit({
      actorId: me.id,
      action: "user.block",
      targetType: "user",
      targetId: id,
      reason,
    });
    return { ok: true };
  },

  unblock: async ({ request, locals }) => {
    const me = requireAdmin(locals.user);
    const id = String((await request.formData()).get("id"));
    await unblockUser(id);
    await logAudit({
      actorId: me.id,
      action: "user.unblock",
      targetType: "user",
      targetId: id,
    });
    return { ok: true };
  },
};
