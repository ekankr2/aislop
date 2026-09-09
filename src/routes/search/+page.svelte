<script lang="ts">
  import Judgment from "$lib/components/Judgment.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import { CATEGORY_LABEL, type Category } from "$lib/core/taxonomy";
  import { relative } from "$lib/core/time";

  let { data } = $props();
</script>

<Seo title="검색" description="AI 슬롭 사례 검색." noindex />

<h2 class="mt-3 mb-1.5 text-[1.5rem] font-bold">검색</h2>
<form method="GET" class="flex gap-1.5 border-b-2 border-line px-3 py-2">
  <input name="q" value={data.q} placeholder="제목, 요약" class="w-full" />
  <button type="submit" class="btn btn-primary">검색</button>
</form>

{#if data.posts.length === 0}
  <p class="py-10 text-center text-[0.9375rem] text-ink-3">
    {data.q ? "결과 없음" : "검색어를 입력"}
  </p>
{:else}
  <ul class="divide-y-2 divide-line">
    {#each data.posts as p (p.slug)}
      <li class="py-2.5">
        <p class="mb-0.5 flex flex-wrap items-center gap-1">
          <Judgment aiStatus={p.aiStatus} />
          <span class="tag">{CATEGORY_LABEL[p.category as Category]}</span>
        </p>
        <a href="/posts/{p.slug}" class="text-[1rem] font-bold">{p.title}</a>
        <p class="line-clamp-2 text-[0.9375rem] text-ink-2">{p.summary}</p>
        <p class="meta">{p.authorName} · {relative(p.publishedAt ?? "")}</p>
      </li>
    {/each}
  </ul>
{/if}
