<script lang="ts">
  import { page } from "$app/state";
  import { type VoteChoice, VOTE_LABEL } from "$lib/core/taxonomy";

  // 목록·상세가 같은 칼럼을 쓴다. 원본(lobste.rs) `div.voters { width: 40px }`.
  //
  // ⚠️ 극성을 뒤집지 마라: 위(▲) = 괜찮다, 아래(▼) = 슬롭이다.
  //    "위 = 좋음"은 안 배워도 아는 규칙이라 뒤집으면 오조작이 그대로 여론에 섞인다.
  // ⚠️ 가운데 숫자는 **총 투표수**(방향 무관)다. 정렬 점수(`heat`)를 여기 띄우지 마라 —
  //    2026-09-09에 한 번 그랬는데(논쟁 가중이 섞인 합성값) 아무도 못 읽는 숫자가
  //    목록에 뜬다. 순추천(추천−반대)도 마찬가지다. 그건 점수고, 점수는 표본이
  //    적을 때 정밀한 척만 한다. 어느 쪽이 우세한지는 행에 붙는 여론 칩이 말한다.
  let {
    slug,
    votes,
    myVote,
    big = false,
  }: {
    slug: string;
    votes: number;
    myVote: VoteChoice | null;
    big?: boolean;
  } = $props();

  const canVote = $derived(!!page.data.user && !page.data.user.blocked);
  const back = $derived(page.url.pathname + page.url.search);
  const size = $derived(big ? "text-[1.75rem]" : "text-[1.5rem]");

  const arrow = (c: VoteChoice) => (c === "ok" ? "▲" : "▼");
  // ⚠️ 화살표에 색을 넣지 마라(2026-09-08 유저 지시 — "포인트색없이 로고만").
  //    눌린 쪽은 **진하게**, 안 누른 쪽은 연하게 — 구분은 색이 아니라 명도로 한다.
  //    색이 남는 자리는 제호 하나뿐이다.
  const tone = (c: VoteChoice) =>
    myVote === c ? "text-ink" : "text-ink-3 hover:text-ink";
  const label = (c: VoteChoice) =>
    myVote === c ? `${VOTE_LABEL[c]} 취소` : VOTE_LABEL[c];
</script>

<div class="score num shrink-0 pt-0.5 leading-none">
  {#if canVote}
    <form method="POST" action="/api/vote">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="next" value={back} />
      {#each ["ok", "slop"] as const as c, i (c)}
        {#if i === 1}
          <span class="mt-0.5 mb-0.5 block font-bold {size} text-ink-2">{votes}</span>
        {/if}
        <button
          type="submit"
          name="choice"
          value={c}
          aria-pressed={myVote === c}
          aria-label={label(c)}
          title={label(c)}
          class="block w-full cursor-pointer text-[0.8rem] leading-none {tone(c)}"
        >
          <span aria-hidden="true">{arrow(c)}</span>
        </button>
      {/each}
    </form>
  {:else}
    <!-- 비로그인도 화살표를 그대로 본다(2026-09-09 유저 지시 — "비로그인일 때도 다
         보여주면 좋다"). ⚠️ 죽은 span으로 두지 마라 — 눌러도 아무 일이 안 나면
         "고장났나"가 된다. 로그인으로 보내고 끝나면 이 글로 돌아온다. -->
    {#each ["ok", "slop"] as const as c, i (c)}
      {#if i === 1}
        <span class="mt-0.5 mb-0.5 block font-bold {size} text-ink-2">{votes}</span>
      {/if}
      <a
        href="/login?next={encodeURIComponent(back)}"
        aria-label="{VOTE_LABEL[c]} — 로그인 필요"
        title="{VOTE_LABEL[c]} — 로그인 필요"
        class="block w-full text-[0.8rem] leading-none text-ink-3 hover:text-ink"
      >
        <span aria-hidden="true">{arrow(c)}</span>
      </a>
    {/each}
  {/if}
</div>
