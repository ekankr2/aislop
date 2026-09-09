<script lang="ts">
  import type { FeedItem } from "$lib/core/feed";
  import { CATEGORY_LABEL, type Category } from "$lib/core/taxonomy";
  import { relative } from "$lib/core/time";
  import Judgment from "./Judgment.svelte";
  import Vote from "./Vote.svelte";

  let { items }: { items: FeedItem[] } = $props();
</script>

<!-- ⚠️ 목록이 비어도 아무것도 안 그린다(2026-09-08 유저 지시). 빈 상태 문구를
     다시 넣지 마라 — "첫 제보를 기다립니다" 류는 사이트가 비었다는 걸 광고한다. -->
{#if items.length > 0}
  <!-- 원본(lobste.rs) 행 구조 그대로: 제목 (도메인) [태그] / byline 한 줄.
       ⚠️ 여기에 뭘 더 얹지 마라. 요약문·분류·시연표시를 되살리면 행이 다시 네 줄이 된다.
          분류는 위 필터에 있고, 시연 표시는 상단 배너 한 줄로 처리한다. -->
  <ol class="py-1">
    {#each items as item (item.slug)}
      <li class="flex gap-2.5 py-[0.55em]">
        <Vote slug={item.slug} heat={item.heat} myVote={item.myVote} />

        <div class="min-w-0 flex-1">
          <p class="text-[1.25rem] leading-snug">
            <a href="/posts/{item.slug}" class="font-bold">{item.title}</a>
            {#if item.domain}
              <span class="meta whitespace-nowrap">
                (<a href={item.url} rel="nofollow ugc noopener" target="_blank">{item.domain}</a>)
              </span>
            {/if}
            <!-- ⚠️ 분류 태그는 제목 줄에 둔다(2026-09-09 유저 지시 — "목록에서 글
                 태그 보이게"). byline으로 내리면 시각·아이디·댓글과 섞여 안 읽힌다. -->
            <a href="/?category={item.category}" class="tag whitespace-nowrap"
              >{CATEGORY_LABEL[item.category as Category]}</a
            >
            <Judgment
              voteSlopCount={item.voteSlopCount}
              voteOkCount={item.voteOkCount}
            />
          </p>

          <p class="meta mt-0.5">
            <time datetime={item.publishedAt}>{relative(item.publishedAt ?? "")}</time>
            ·
            {#if item.authorUsername}
              <a href="/users/{item.authorUsername}">{item.authorName}</a>
            {:else}{item.authorName}{/if}
            ·
            <a href="/posts/{item.slug}#comments">댓글 {item.commentCount}</a>
          </p>
        </div>

        {#if item.thumbUrl}
          <img
            src={item.thumbUrl}
            alt=""
            loading="lazy"
            width="56"
            height="56"
            class="hidden h-14 w-14 shrink-0 border border-line-strong object-cover sm:block"
          />
        {/if}
      </li>
    {/each}
  </ol>
{/if}
