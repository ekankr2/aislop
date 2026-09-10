<script lang="ts">
  import { enhance } from "$app/forms";
  import { relative } from "$lib/core/time";

  interface CommentRow {
    id: string;
    parentId: string | null;
    body: string;
    createdAt: string;
    hiddenAt: string | null;
    deletedAt: string | null;
    userId: string;
    authorName: string;
    authorId: string;
  }

  let {
    comments,
    viewerId,
  }: { comments: CommentRow[]; viewerId: string | null } = $props();

  const roots = $derived(comments.filter((c) => !c.parentId));
  const childrenOf = (id: string) => comments.filter((c) => c.parentId === id);

  // 어떤 답글 폼이 열려 있는지. 한 번에 하나만 연다.
  let replyTo = $state<string | null>(null);
</script>

{#snippet item(c: CommentRow, depth: number)}
  <li class={depth > 0 ? "border-l-2 border-line pl-3" : ""}>
    <div class="py-2.5">
      {#if c.deletedAt}
        <p class="text-[0.9375rem] text-ink-3 italic">작성자가 지운 댓글</p>
      {:else if c.hiddenAt}
        <!-- 숨김도 지우지 않는다. 자리가 남아 있어야 대댓글의 맥락이 유지된다. -->
        <p class="text-[0.9375rem] text-ink-3 italic">운영 규칙에 따라 가린 댓글</p>
      {:else}
        <div class="mb-0.5 flex flex-wrap items-center gap-x-2 text-[0.875rem] text-ink-3">
          {#if c.authorId}
            <a href="/users/{c.authorId}" class="font-semibold text-ink-2 no-underline hover:underline"
              >{c.authorName}</a
            >
          {:else}<span class="font-semibold text-ink-2">{c.authorName}</span>{/if}
          <time datetime={c.createdAt}>{relative(c.createdAt)}</time>
        </div>
        <p class="prose text-[1rem] leading-relaxed whitespace-pre-wrap text-ink">{c.body}</p>

        <div class="mt-1 flex gap-3 text-[0.875rem] text-ink-3">
          {#if viewerId && depth === 0}
            <button
              type="button"
              class="hover:underline"
              onclick={() => (replyTo = replyTo === c.id ? null : c.id)}>답글</button
            >
          {/if}
          {#if viewerId === c.userId}
            <form method="POST" action="?/deleteComment" use:enhance>
              <input type="hidden" name="commentId" value={c.id} />
              <button type="submit" class="hover:underline">삭제</button>
            </form>
          {/if}
          {#if viewerId && viewerId !== c.userId}
            <details class="inline">
              <summary class="cursor-pointer list-none hover:underline">신고</summary>
              <form method="POST" action="?/report" use:enhance class="mt-1.5 flex gap-1.5">
                <input type="hidden" name="commentId" value={c.id} />
                <input
                  name="reason"
                  required
                  maxlength="500"
                  placeholder="신고 사유"
                  class="w-56"
                />
                <button type="submit" class="btn btn-primary"
                  >보내기</button
                >
              </form>
            </details>
          {/if}
        </div>

        {#if replyTo === c.id}
          <form method="POST" action="?/comment" use:enhance={() => async ({ update }) => {
            replyTo = null;
            await update();
          }} class="mt-2">
            <input type="hidden" name="parentId" value={c.id} />
            <textarea
              name="body"
              required
              rows="2"
              maxlength="2000"
              class="w-full"
              placeholder="답글"
            ></textarea>
            <button type="submit" class="btn btn-primary mt-1"
              >답글 등록</button
            >
          </form>
        {/if}
      {/if}
    </div>

    {#if childrenOf(c.id).length > 0}
      <ul class="ml-1">
        {#each childrenOf(c.id) as child (child.id)}
          {@render item(child, depth + 1)}
        {/each}
      </ul>
    {/if}
  </li>
{/snippet}

<!-- ⚠️ 여기에 border-t를 다시 넣지 마라(2026-09-09 유저 지적 — "디바이더가
     왜 이렇게 많냐"). `.bar`의 회색 배경 + 아래 선이 이미 구획이라 선이 둘로 겹쳤다. -->
<section id="comments" class="px-4 py-4">
  <h2 class="bar">
    댓글 {comments.filter((c) => !c.deletedAt && !c.hiddenAt).length}
  </h2>

  {#if viewerId}
    <form method="POST" action="?/comment" use:enhance class="mb-3">
      <textarea
        name="body"
        required
        rows="3"
        maxlength="2000"
        class="w-full"
      ></textarea>
      <button type="submit" class="btn btn-primary mt-1"
        >댓글 등록</button
      >
    </form>
  {:else}
    <p class="mb-3 text-[0.875rem] text-ink-3">
      <a href="/login" class="text-ink no-underline underline-offset-2 hover:underline">로그인</a>한
      사용자만 댓글을 쓸 수 있음. 익명 댓글은 안 받음.
    </p>
  {/if}

  {#if roots.length === 0}
    <p class="py-4 text-[0.9375rem] text-ink-3">댓글 없음</p>
  {:else}
    <ul class="divide-y-2 divide-line">
      {#each roots as c (c.id)}{@render item(c, 0)}{/each}
    </ul>
  {/if}
</section>
