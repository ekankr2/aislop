<script lang="ts">
  let {
    page,
    pages,
  }: { page: number; pages: { n: number; href: string }[] } = $props();

  // 처음·끝·현재 앞뒤 2쪽만 남기고 사이는 …로 접는다. 쪽이 적으면 전부 보인다.
  const shown = $derived(
    pages.filter(
      (p) => p.n === 1 || p.n === pages.length || Math.abs(p.n - page) <= 2,
    ),
  );
</script>

<!-- 현재 쪽은 색이 아니라 무게로 구분한다(색은 제호와 여론 판정에만 쓴다). -->
{#if pages.length > 1}
  <nav aria-label="쪽" class="flex flex-wrap items-center gap-x-1 pt-2 pb-8">
    {#each shown as p, i (p.n)}
      {#if i > 0 && p.n - shown[i - 1].n > 1}
        <span class="px-1 text-ink-3">…</span>
      {/if}
      {#if p.n === page}
        <span aria-current="page" class="min-w-8 px-2 py-1 text-center font-bold text-ink">{p.n}</span>
      {:else}
        <a href={p.href} class="min-w-8 px-2 py-1 text-center text-ink-3">{p.n}</a>
      {/if}
    {/each}
  </nav>
{/if}
