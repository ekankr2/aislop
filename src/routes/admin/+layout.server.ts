import { requireEditor } from "$lib/server/guard";
import type { LayoutServerLoad } from "./$types";

// ⚠️ 관리자 게이트는 여기 하나다. 하위 라우트가 각자 검사하면 언젠가 한 곳이 빠진다.
export const load: LayoutServerLoad = ({ locals }) => {
  const u = requireEditor(locals.user);
  return { role: u.role };
};
