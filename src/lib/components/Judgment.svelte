<script lang="ts">
  import { opinion } from "$lib/core/taxonomy";

  // ⚠️ **운영자가 정하는 값을 여기에 만들지 마라**(2026-09-09 유저 지시 — "관리자가
  //    컨트롤하는 건 없다니까"). 판정(`verdict`)도, AI 여부(`aiStatus`)도 필드째로
  //    걷어냈다. 이 컴포넌트가 그리는 건 **유저 표 하나**뿐이다.
  // ⚠️ 표본이 모자라면 아무것도 안 그린다. 3표에 100%는 정밀한 척만 한다.
  let {
    voteSlopCount = 0,
    voteOkCount = 0,
  }: {
    voteSlopCount?: number;
    voteOkCount?: number;
  } = $props();

  const op = $derived(opinion(voteSlopCount, voteOkCount));
  // 과반이 넘는 쪽 이름만 적는다. 두 숫자를 나란히 적으면 그게 점수판이 된다.
  const style = $derived(
    !op ? "" : op.slopPct >= 50 ? "tag-negative" : "tag-affirmative",
  );
  const label = $derived(
    !op
      ? ""
      : op.slopPct >= 50
        ? `슬롭 ${op.slopPct}%`
        : `괜찮음 ${100 - op.slopPct}%`,
  );
</script>

{#if op}
  <span class="tag {style}" title="유저 {op.total}명의 표">{label}</span>
{/if}
