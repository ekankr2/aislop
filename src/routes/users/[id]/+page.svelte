<script lang="ts">
  import { enhance } from "$app/forms";
  import Judgment from "$lib/components/Judgment.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import { BADGE_LABEL, POST_STATUS_LABEL, type PostStatus } from "$lib/core/taxonomy";
  import { relative } from "$lib/core/time";

  let { data, form } = $props();
</script>

<Seo title={data.profile.name} description="{data.profile.name} 님이 올린 AI 슬롭 사례." />

<h2 class="mt-3 mb-1.5 text-[1.5rem] font-bold">{data.profile.name}</h2>

<div class="border-b-2 border-line px-3 py-2.5">
  <p class="meta">가입 {data.profile.joinedAt}</p>

  {#if data.profile.badges.length > 0}
    <p class="mt-1 flex flex-wrap gap-1">
      {#each data.profile.badges as b (b)}<span class="tag tag-acid">{BADGE_LABEL[b] ?? b}</span>{/each}
    </p>
  {/if}

  <!-- 평판은 숫자 몇 개로 끝낸다. 팔로워나 점수로 영향력을 만들지 않는다. -->
  <dl class="mt-2 flex flex-wrap gap-x-4 text-[0.9375rem]">
    <div><dt class="inline text-ink-3">제보</dt> <dd class="num inline font-bold">{data.stats.submitted}</dd></div>
    <div><dt class="inline text-ink-3">게시됨</dt> <dd class="num inline font-bold">{data.stats.published}</dd></div>
    <div><dt class="inline text-ink-3">정정됨</dt> <dd class="num inline font-bold">{data.stats.corrected}</dd></div>
    <div><dt class="inline text-ink-3">댓글</dt> <dd class="num inline font-bold">{data.stats.comments}</dd></div>
  </dl>

  {#if data.isSelf}
    <!-- 처음 로그인하면 `slop-xxxx`가 발급된다(이메일에서 이름을 만들면 주소가 새므로).
         바꿀 자리가 없으면 그 임의값을 평생 쓰게 된다. -->
    <form method="POST" action="?/rename" use:enhance class="mt-3 flex flex-wrap items-center gap-2">
      <input
        name="name"
        value={data.profile.name}
        minlength="2"
        maxlength="8"
        required
        aria-label="이름"
        class="w-44"
      />
      <button type="submit" class="btn">이름 바꾸기</button>
    </form>
    {#if form?.message}
      <p class="mt-1 text-[0.9375rem] text-hot">{form.message}</p>
    {/if}

    <form method="POST" action="/logout" class="mt-3">
      <button type="submit" class="btn">로그아웃</button>
    </form>
  {/if}
</div>

<h3 class="meta mt-3 mb-1 font-bold !text-ink">제보 기록</h3>
{#if data.posts.length === 0}
  <p class="py-10 text-center text-[0.9375rem] text-ink-3">제보 없음</p>
{:else}
  <ul class="divide-y-2 divide-line">
    {#each data.posts as p (p.slug)}
      <li class="px-3 py-2">
        <p class="mb-0.5 flex flex-wrap items-center gap-1">
          <Judgment voteSlopCount={p.voteSlopCount} voteOkCount={p.voteOkCount} />
          {#if p.status !== "published"}
            <span class="tag">{POST_STATUS_LABEL[p.status as PostStatus]}</span>
          {/if}
        </p>
        <a href="/posts/{p.slug}" class="text-[0.9375rem] font-bold">{p.title}</a>
        <p class="meta">{relative(p.publishedAt ?? p.createdAt)}</p>
        {#if data.isSelf && p.reviewNote}
          <!-- 반려 이유를 모르면 다시 제보할 수 없다. 제보자에게만 보인다. -->
          <p class="mt-1 border border-dashed border-line-strong px-2 py-1 text-[0.9375rem] text-ink-2">
            운영자 메모: {p.reviewNote}
          </p>
        {/if}
      </li>
    {/each}
  </ul>
{/if}
