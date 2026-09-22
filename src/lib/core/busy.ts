import type { SubmitFunction } from "@sveltejs/kit";
import { enhance } from "$app/forms";

/**
 * `use:enhance` + 전송 중 잠금. `use:enhance`를 쓰던 자리에 그대로 갈아 끼운다.
 *
 * 전송이 끝날 때까지 폼 안의 버튼을 전부 `disabled`로 잠그고, `data-busy`를 단
 * 버튼은 글자를 그 값으로 바꾼다(`data-busy="올리는 중"`).
 *
 * ⚠️ 스피너·로딩 오버레이를 만들지 마라(2026-09-22 유저 지적 — "은근 버퍼링이 있는데
 *    로딩 오버레이나 disabled 없으니까 좀"). 두 가지 이유다 —
 *    · `app.css` 맨 아래 차단 블록이 `animation: none !important`라 스피너가 안 돈다.
 *      그걸 뚫으려고 예외를 파면 AI 냄새 차단이 통째로 무너진다.
 *    · 화면을 덮는 모달 로딩은 이 사이트가 피하는 SaaS 문법이다.
 *    눌린 버튼이 잠기고 글자가 바뀌는 것으로 족하다. 잠기는 건 **버튼뿐이다** —
 *    입력칸까지 잠그면 실패했을 때 쓰던 글에 손을 못 댄다.
 */
export function busy(node: HTMLFormElement, fn?: SubmitFunction) {
  return enhance(node, async (input) => {
    const buttons = [...node.querySelectorAll("button")].filter(
      (b) => !b.disabled,
    );
    const labels = buttons.map((b) => b.textContent);
    for (const b of buttons) {
      b.disabled = true;
      if (b.dataset.busy) b.textContent = b.dataset.busy;
    }

    // ⚠️ 잠그는 건 `await`보다 먼저여야 한다(위 for 문). 여기서 기다리는 동안에도
    //    버튼은 이미 잠겨 있어야 연타가 막힌다.
    //    ⚠️ 넘겨받은 `fn`이 `cancel()`을 부르면 아래 콜백이 안 돌아 버튼이 잠긴 채
    //       남는다. 지금 그렇게 쓰는 폼은 없다 — 생기면 여기서 풀어 줘라.
    const done = await fn?.(input);
    return async (result) => {
      // ⚠️ `await`가 먼저다. 기본 동작(`applyAction` + `invalidateAll`)이 끝나기 전에
      //    버튼을 풀면 아직 옛 숫자가 그려진 화면에서 다시 누를 수 있다.
      if (typeof done === "function") await done(result);
      else await result.update();
      for (const [i, b] of buttons.entries()) {
        b.disabled = false;
        if (b.dataset.busy) b.textContent = labels[i];
      }
    };
  });
}
