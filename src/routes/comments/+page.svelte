<script lang="ts">
  import Seo from "$lib/components/Seo.svelte";
  import { relative } from "$lib/core/time";

  let { data } = $props();
</script>

<Seo title="댓글" description="AI 슬롭 사례에 최근 달린 댓글." />

{#if data.comments.length === 0}
  <p class="py-16 text-center text-[0.9375rem] text-ink-3">댓글 없음</p>
{:else}
  <ul class="divide-y-2 divide-line">
    {#each data.comments as c (c.id)}
      <li class="px-1 py-2.5">
        <!-- 사례 제목이 먼저다. 댓글만 떼어 놓으면 무슨 얘기인지 알 수 없다. -->
        <p class="meta">
          <a href="/users/{c.authorUsername}">{c.authorName}</a>
          · {relative(c.createdAt)} ·
          <a href="/posts/{c.postSlug}">{c.postTitle}</a>
        </p>
        <p class="mt-0.5 text-[1rem] leading-relaxed whitespace-pre-wrap">{c.body}</p>
      </li>
    {/each}
  </ul>
{/if}
