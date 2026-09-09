<script lang="ts">
  import { enhance } from "$app/forms";
  import { POST_STATUS_LABEL, type PostStatus } from "$lib/core/taxonomy";
  import { relative } from "$lib/core/time";

  let { data, form } = $props();

  const input = "border border-line-strong bg-surface px-2 py-1 text-[0.875rem]";
  const btn = "btn btn-primary";
  const btnGhost = "btn";
</script>

{#if form?.message}
  <p class="mx-4 mt-3 border border-ink px-3 py-2 text-[0.875rem]">{form.message}</p>
{/if}

<section class="px-4 py-4">
  <h2 class="mb-2 text-[1rem] font-bold">최근 글 <span class="text-ink-3">{data.submissions.length}</span></h2>
  {#if data.submissions.length === 0}
    <p class="text-[0.9375rem] text-ink-3">올라온 글 없음</p>
  {:else}
    <ul class="divide-y-2 divide-line border-y-2 border-line">
      {#each data.submissions as s (s.slug)}
        <li class="py-2.5">
          <div class="flex flex-wrap items-center gap-2 text-[0.875rem] text-ink-3">
            <span class="border border-line-strong px-1.5 py-px"
              >{POST_STATUS_LABEL[s.status as PostStatus]}</span
            >
            <span>{s.authorName}</span>
            <span>{relative(s.createdAt)}</span>
            {#if s.submitterAffiliated}
              <span class="tag tag-solid">업체 관계자</span>
            {/if}
          </div>
          <a href="/admin/posts/{s.slug}" class="text-[1rem] font-bold text-ink no-underline hover:underline"
            >{s.title}</a
          >
          <p class="line-clamp-2 text-[0.875rem] text-ink-2">{s.summary}</p>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<!-- ⚠️ 글 신고가 댓글 신고보다 위다. 글은 검토 없이 바로 게시되므로(2026-09-09)
     여기가 유일한 즉시 대응 창구다. -->
<section class="border-t-2 border-line px-4 py-4">
  <h2 class="mb-2 text-[1rem] font-bold">글 신고 <span class="text-ink-3">{data.postReports.length}</span></h2>
  {#if data.postReports.length === 0}
    <p class="text-[0.9375rem] text-ink-3">처리할 신고 없음</p>
  {:else}
    <ul class="divide-y-2 divide-line border-y-2 border-line">
      {#each data.postReports as r (r.id)}
        <li class="py-2.5">
          <p class="text-[0.875rem] text-ink-3">
            {relative(r.createdAt)}
            {#if r.deletedAt}· <span class="font-bold text-ink">내려간 글</span>{/if}
          </p>
          <a href="/posts/{r.postSlug}" class="text-[1rem] font-bold text-ink no-underline hover:underline"
            >{r.postTitle}</a
          >
          <p class="my-1 border-l-2 border-line pl-2 text-[0.9375rem] text-ink">{r.reason}</p>
          <div class="flex flex-wrap gap-1.5">
            <form method="POST" action="?/hidePost" use:enhance class="flex gap-1.5">
              <input type="hidden" name="reportId" value={r.id} />
              <input type="hidden" name="postId" value={r.postId} />
              <input name="reason" required placeholder="내리는 사유" class="{input} w-48" />
              <button type="submit" class={btn}>내리기</button>
            </form>
            <form method="POST" action="?/dismissPostReport" use:enhance>
              <input type="hidden" name="reportId" value={r.id} />
              <button type="submit" class={btnGhost}>기각</button>
            </form>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<section class="border-t-2 border-line px-4 py-4">
  <h2 class="mb-2 text-[1rem] font-bold">댓글 신고 <span class="text-ink-3">{data.reports.length}</span></h2>
  {#if data.reports.length === 0}
    <p class="text-[0.9375rem] text-ink-3">처리할 신고 없음</p>
  {:else}
    <ul class="divide-y-2 divide-line border-y-2 border-line">
      {#each data.reports as r (r.id)}
        <li class="py-2.5">
          <p class="text-[0.875rem] text-ink-3">
            사유: {r.reason} · <a href="/posts/{r.postSlug}#comments" class="text-ink-2">해당 글</a>
          </p>
          <p class="my-1 border-l-2 border-line pl-2 text-[0.9375rem] text-ink">{r.body}</p>
          <div class="flex flex-wrap gap-1.5">
            <form method="POST" action="?/hideComment" use:enhance class="flex gap-1.5">
              <input type="hidden" name="reportId" value={r.id} />
              <input type="hidden" name="commentId" value={r.commentId} />
              <input name="reason" required placeholder="숨김 사유" class="{input} w-48" />
              <button type="submit" class={btn}>숨김</button>
            </form>
            <form method="POST" action="?/dismissReport" use:enhance>
              <input type="hidden" name="reportId" value={r.id} />
              <button type="submit" class={btnGhost}>기각</button>
            </form>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<section class="border-t-2 border-line px-4 py-4">
  <h2 class="mb-2 text-[1rem] font-bold">업체 답변 승인 <span class="text-ink-3">{data.responses.length}</span></h2>
  {#if data.responses.length === 0}
    <p class="text-[0.9375rem] text-ink-3">승인할 답변 없음</p>
  {:else}
    <ul class="divide-y-2 divide-line border-y-2 border-line">
      {#each data.responses as { r, postSlug, postTitle } (r.id)}
        <li class="py-2.5">
          <p class="text-[0.875rem]">
            <a href="/posts/{postSlug}" class="font-bold">{postTitle}</a>
          </p>
          <p class="text-[0.875rem] text-ink-3">
            {r.submitterName} · {r.submitterRole} · {r.submitterEmail}
          </p>
          <p class="my-1 border-l-2 border-line pl-2 text-[0.9375rem] whitespace-pre-wrap text-ink">{r.body}</p>
          {#if r.imageUrl}
            <a href={r.imageUrl} rel="noopener" target="_blank">
              <img src={r.imageUrl} alt="첨부" class="my-1 max-h-64 border border-line" />
            </a>
          {/if}
          <form method="POST" action="?/decideResponse" use:enhance class="flex flex-wrap gap-1.5">
            <input type="hidden" name="id" value={r.id} />
            <input name="verifyNote" required placeholder="관계 확인 근거" class="{input} w-64" />
            <button type="submit" name="decision" value="verified" class={btn}>게시</button>
            <button type="submit" name="decision" value="rejected" class={btnGhost}>반려</button>
          </form>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<section class="border-t-2 border-line px-4 py-4">
  <h2 class="mb-2 text-[1rem] font-bold">정정 요청 <span class="text-ink-3">{data.corrections.length}</span></h2>
  {#if data.corrections.length === 0}
    <p class="text-[0.9375rem] text-ink-3">처리할 정정 요청 없음</p>
  {:else}
    <ul class="divide-y-2 divide-line border-y-2 border-line">
      {#each data.corrections as { c, postSlug, postTitle } (c.id)}
        <li class="py-2.5">
          <p class="text-[0.875rem]">
            <a href="/posts/{postSlug}" class="font-bold">{postTitle}</a>
          </p>
          <p class="text-[0.875rem] text-ink-3">{c.requesterName} · {c.requesterEmail}</p>
          <p class="my-1 text-[0.9375rem] whitespace-pre-wrap text-ink">{c.claim}</p>
          {#if c.imageUrl}
            <a href={c.imageUrl} rel="noopener" target="_blank">
              <img src={c.imageUrl} alt="첨부" class="my-1 max-h-64 border border-line" />
            </a>
          {/if}
          {#if c.evidenceUrl}
            <a href={c.evidenceUrl} rel="noopener" target="_blank" class="text-[0.9375rem] break-all text-ink-2"
              >{c.evidenceUrl}</a
            >
          {/if}
          <form method="POST" action="?/resolveCorrection" use:enhance class="mt-1 flex flex-wrap gap-1.5">
            <input type="hidden" name="id" value={c.id} />
            <input name="resolution" required placeholder="처리 내용 (공개 기록에 남음)" class="{input} w-72" />
            <button type="submit" name="status" value="accepted" class={btn}>수용</button>
            <button type="submit" name="status" value="rejected" class={btnGhost}>반려</button>
          </form>
        </li>
      {/each}
    </ul>
  {/if}
</section>
