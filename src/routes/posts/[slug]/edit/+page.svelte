<script lang="ts">
  import { busy } from "$lib/core/busy";
  import { CATEGORIES } from "$lib/core/taxonomy";

  let { data, form } = $props();
  const p = $derived(data.post);
  const label = "block text-[1rem] font-bold";
  const opt = "font-normal text-ink-3";
</script>

<svelte:head>
  <title>글 수정 | AI 슬롭</title>
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<!-- 글쓰기 폼(`submit/+page.svelte`)과 같은 칸·같은 폭이다. 이미지는 여기서 안 바꾼다 —
     근거로 걸린 사진을 작성자가 바꿔 끼우면 표가 무엇을 보고 던져졌는지 흐려진다. -->
<div class="mx-auto max-w-[45rem]">
  <h2 class="mt-3 mb-1.5 text-[1.5rem] font-bold">글 수정</h2>

  {#if form?.message}
    <p class="border-b border-ink bg-shaded px-3 py-2 text-[0.875rem] font-bold text-ink">
      {form.message}
      {#if form.duplicateSlug}<a href="/posts/{form.duplicateSlug}">기존 사례 보기</a>{/if}
    </p>
  {/if}

  <form method="POST" action="?/save" use:busy class="space-y-3 px-3 py-3">
    <div>
      <label class={label} for="title">제목</label>
      <input id="title" name="title" required minlength="4" maxlength="160" class="w-full"
        value={p.title} />
    </div>

    <div>
      <label class={label} for="url">원문 링크 <span class={opt}>(선택)</span></label>
      <input id="url" name="url" type="url" maxlength="2000" class="w-full" value={p.url ?? ""} />
    </div>

    <div>
      <label class={label} for="body">내용</label>
      <textarea id="body" name="body" required rows="12" minlength="10" maxlength="8000"
        class="w-full">{p.body}</textarea>
    </div>

    <div>
      <p class={label}>유형</p>
      <div class="mt-1 flex flex-wrap gap-1.5">
        {#each CATEGORIES as c (c.slug)}
          <label class="pick">
            <input type="radio" name="category" value={c.slug} checked={c.slug === p.category} />
            <span>{c.name}</span>
          </label>
        {/each}
      </div>
    </div>

    <label class="flex items-start gap-1.5 text-[1rem]">
      <input type="checkbox" name="submitterAffiliated" value="true" class="mt-0.5"
        checked={p.submitterAffiliated} />
      <span>관계자입니다 (업체·제작자 본인. 글에 같이 표시됨)</span>
    </label>

    <button type="submit" data-busy="저장 중" class="btn btn-primary btn-lg mt-1 w-full">저장</button>
  </form>

  <!-- 삭제는 접어 둔다. 한 번 더 눌러야 지워진다 — 브라우저 confirm 창은 안 쓴다. -->
  <details class="px-3 pb-6">
    <summary class="btn cursor-pointer">글 삭제</summary>
    <form method="POST" action="?/delete" use:busy class="mt-2 space-y-1.5">
      <p class="meta">목록·검색에서 빠짐. 되돌리려면 운영자에게 연락.</p>
      <button type="submit" data-busy="지우는 중" class="btn btn-primary">삭제</button>
    </form>
  </details>
</div>
