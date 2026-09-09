<script lang="ts">
  import {
    AI_STATUS_LABEL,
    type AiStatus,
    opinion,
    VERDICT_LABEL,
    type Verdict,
  } from "$lib/core/taxonomy";

  // ⚠️ 목록에서 칩은 **하나**다 (2026-09-08 유저 지적 — "랍스터도 뱃지 수 적다").
  //    우선순위: 여론 > 운영자 판정 > 없음. AI 상태는 byline 평문으로 내린다.
  //    칩 두 개가 나란히 있으면 서로 다른 두 체계가 같은 무게로 보여 목록이 무거워진다.
  //    ⚠️ 상세(`full`)에서는 **AI 여부 · 여론 · 운영자 판정을 전부** 보여준다.
  //       여론과 판정은 다른 줄이고, 어긋나는 게 정상이다.
  let {
    aiStatus,
    verdict,
    voteSlopCount = 0,
    voteOkCount = 0,
    full = false,
  }: {
    aiStatus: string;
    verdict: string;
    voteSlopCount?: number;
    voteOkCount?: number;
    full?: boolean;
  } = $props();

  // 색은 셋: 파랑(AI 여부) · 똥색(문제 있음) · 이끼색(괜찮음). 나머지는 무채색.
  const verdictStyle: Record<Verdict, string> = {
    unrated: "tag-meta",
    slop: "tag-negative",
    low_quality: "tag-meta",
    disputed: "tag-meta",
    not_slop: "tag-affirmative",
    exemplary: "tag-affirmative",
  };

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
  <span class="tag {verdictStyle[verdict as Verdict]}">{VERDICT_LABEL[verdict as Verdict]}</span>
{:else if op}
  <span class="tag {opStyle}">{opLabel}</span>
{:else if verdict !== "unrated"}
  <span class="tag {verdictStyle[verdict as Verdict]}">{VERDICT_LABEL[verdict as Verdict]}</span>
{/if}
