<script lang="ts">
  import { AI_STATUS_LABEL, type AiStatus, opinion } from "$lib/core/taxonomy";

  // ⚠️ 여기에 **운영자 판정을 다시 만들지 마라**(2026-09-09 유저 지시 — "이건
  //    유저들의 공간이라니까"). 품질 판정은 유저 표(여론)가 전부고, 운영자가 찍는
  //    도장은 `verdict` 필드째로 걷어냈다.
  //    남은 축은 AI 사용 여부 하나이고 그건 판정이 아니라 사실이다.
  // ⚠️ 목록에서 칩은 **하나**다(2026-09-08 유저 지적 — "랍스터도 뱃지 수 적다").
  //    여론이 있으면 여론, 없으면 없다. AI 상태는 byline 평문으로 내린다.
  let {
    aiStatus,
    voteSlopCount = 0,
    voteOkCount = 0,
    full = false,
  }: {
    aiStatus: string;
    voteSlopCount?: number;
    voteOkCount?: number;
    full?: boolean;
  } = $props();

  // ⚠️ 표본이 모자라면 `null`이고 칩을 아예 안 그린다. 3표에 100%는 정밀한 척만 한다.
  const op = $derived(opinion(voteSlopCount, voteOkCount));
  // 과반이 넘는 쪽 이름만 적는다. 두 숫자를 나란히 적으면 그게 점수판이 된다.
  const opStyle = $derived(
    !op ? "" : op.slopPct >= 50 ? "tag-negative" : "tag-affirmative",
  );
  const opLabel = $derived(
    !op
      ? ""
      : op.slopPct >= 50
        ? `슬롭 ${op.slopPct}%`
        : `괜찮음 ${100 - op.slopPct}%`,
  );
</script>

{#if full}
  <span class="tag tag-media">{AI_STATUS_LABEL[aiStatus as AiStatus]}</span>
  {#if op}
    <span class="tag {opStyle}" title="유저 {op.total}명의 표">{opLabel}</span>
  {/if}
{:else if op}
  <span class="tag {opStyle}">{opLabel}</span>
{/if}
