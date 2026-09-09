<script lang="ts">
  import { enhance } from "$app/forms";
  import {
    AI_STATUSES,
    AI_STATUS_LABEL,
    CATEGORIES,
    POST_STATUSES,
    POST_STATUS_LABEL,
  } from "$lib/core/taxonomy";
  import { MAX_IMAGE_BYTES, MAX_IMAGES_PER_POST } from "$lib/core/image";

  let { data, form } = $props();
  const p = $derived(data.post);
  const MAX_MB = Math.floor(MAX_IMAGE_BYTES / 1024 / 1024);
  const shots = $derived(data.evidences.filter((e) => e.storageKey && e.url));
  const label = "block text-[0.9375rem] font-bold";
</script>

<div class="py-3">
  {#if form?.message}
    <p class="mb-2 border px-2.5 py-1.5 text-[0.875rem] {form.ok
      ? 'border-line-strong text-ink-2'
      : 'border-hot bg-[#ffedd5] text-hot'}">{form.message}</p>
  {/if}

  <h3 class="text-[1.125rem] font-bold">{p.title}</h3>
  <p class="meta">제보자 {data.authorName} · {p.createdAt.slice(0, 16)}</p>
  {#if p.url}
    <p class="mt-1 text-[0.9375rem]">
      <a href={p.url} rel="nofollow noopener" target="_blank" class="break-all">{p.url}</a>
    </p>
  {/if}

  {#if p.submitReason}
    <div class="mt-2 border border-line p-2">
      <p class="meta font-bold">본문</p>
      <p class="text-[0.875rem] whitespace-pre-wrap">{p.submitReason}</p>
    </div>
  {/if}

  {#if p.firsthand || p.submitterAffiliated}
    <p class="mt-1.5 flex gap-1">
      {#if p.firsthand}<span class="tag">직접 경험</span>{/if}
      {#if p.submitterAffiliated}<span class="tag tag-solid">당사자 관계자</span>{/if}
    </p>
  {/if}

  {#if data.evidences.length > 0}
    <ul class="mt-2 text-[0.9375rem]">
      {#each data.evidences as e (e.id)}
        <li>
          · {e.description}
          {#if e.url}<a href={e.url} rel="noopener" target="_blank" class="break-all">{e.url}</a>{/if}
        </li>
      {/each}
    </ul>
  {/if}

  <hr class="my-3" />

  <form method="POST" class="space-y-2.5">
    <div class="grid gap-2 sm:grid-cols-2">
      <div>
        <label class={label} for="status">처리 상태</label>
        <select id="status" name="status" class="w-full">
          {#each POST_STATUSES as s (s)}
            <option value={s} selected={s === p.status}>{POST_STATUS_LABEL[s]}</option>
          {/each}
        </select>
      </div>
      <div>
        <label class={label} for="category">카테고리</label>
        <select id="category" name="category" class="w-full">
          {#each CATEGORIES as c (c.slug)}
            <option value={c.slug} selected={c.slug === p.category}>{c.name}</option>
          {/each}
        </select>
      </div>
    </div>

    <!-- 축 1(사실). ⚠️ 여기에 품질 판정 칸을 다시 만들지 마라(2026-09-09 유저 지시) —
         품질은 유저 표가 정한다. AI 여부만 근거로 확정한다. -->
    <fieldset class="border border-line p-2">
      <legend class="px-1 text-[0.9375rem] font-bold">축 1 — AI 사용 여부</legend>
      <select name="aiStatus" class="w-full">
        {#each AI_STATUSES as s (s)}
          <option value={s} selected={s === p.aiStatus}>{AI_STATUS_LABEL[s]}</option>
        {/each}
      </select>
      <textarea name="aiEvidence" rows="3" class="mt-1.5 w-full"
        placeholder="확인·명시로 두려면 근거 필수. 메타데이터, 업체 고지, 탐지 결과 등."
        >{p.aiEvidence ?? ""}</textarea>
    </fieldset>

    <!-- 제보 폼이 요약을 안 묻는다(2026-09-09). 저장된 값은 본문 앞부분을 잘라
         만든 것이고, 검색결과와 공유 카드에 그대로 나가므로 여기서 다듬는다. -->
    <div>
      <label class={label} for="summary">한 줄 요약 <span class="font-normal text-ink-3">검색결과·공유 카드용</span></label>
      <textarea id="summary" name="summary" rows="2" maxlength="600" class="w-full"
        >{p.summary}</textarea>
    </div>

    <div>
      <label class={label} for="problems">문제점 (한 줄에 하나)</label>
      <textarea id="problems" name="problems" rows="4" class="w-full"
        placeholder="실제 음식 사진처럼 사용&#10;AI 사용 표시 없음&#10;실제 제품과 현저한 차이"
        >{p.problems ?? ""}</textarea>
    </div>

    <div>
      <label class={label} for="facts">확인된 사실</label>
      <textarea id="facts" name="facts" rows="3" class="w-full">{p.facts ?? ""}</textarea>
    </div>

    <div class="grid gap-2 sm:grid-cols-2">
      <div>
        <label class={label} for="archiveUrl">아카이브 URL</label>
        <input id="archiveUrl" name="archiveUrl" type="url" class="w-full" value={p.archiveUrl ?? ""} />
      </div>
      <div>
        <label class={label} for="thumbUrl">썸네일 URL</label>
        <input id="thumbUrl" name="thumbUrl" type="url" class="w-full" value={p.thumbUrl ?? ""} />
      </div>
    </div>

    <div>
      <label class={label} for="reviewNote">검토 메모 <span class="font-normal text-ink-3">제보자에게만 보임</span></label>
      <textarea id="reviewNote" name="reviewNote" rows="2" class="w-full">{p.reviewNote ?? ""}</textarea>
    </div>

    <div class="flex gap-1.5">
      <button type="submit" class="btn btn-primary">저장</button>
      <a href="/admin" class="btn">취소</a>
    </div>
  </form>

  <!-- ⚠️ 판정 저장 폼 **바깥**이다. 폼은 중첩할 수 없고, 이미지 하나 올리려고 판정
       필드를 전부 다시 제출하게 만들 이유도 없다. -->
  <section class="mt-6 border-t-2 border-line pt-4">
    <h3 class="mb-2 text-[1rem] font-bold">
      이미지 <span class="text-ink-3">{shots.length}</span>
    </h3>

    {#if shots.length > 0}
      <ul class="mb-3 space-y-2">
        {#each shots as e (e.id)}
          <li class="flex items-start gap-2">
            <img src={e.url} alt={e.description} class="h-20 w-20 border border-line-strong object-cover" />
            <div class="text-[0.9375rem]">
              <p>{e.description}</p>
              <p class="meta">{e.capturedAt?.slice(0, 10) ?? ""}</p>
              <form method="POST" action="?/removeImage" use:enhance>
                <input type="hidden" name="evidenceId" value={e.id} />
                <button type="submit" class="meta underline">지우기</button>
              </form>
            </div>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="mb-3 text-[0.9375rem] text-ink-3">이미지 없음</p>
    {/if}

    <form method="POST" action="?/addImage" enctype="multipart/form-data" use:enhance
      class="space-y-2">
      <input name="images" type="file" accept="image/png,image/jpeg,image/webp" multiple
        required class="w-full text-[0.9375rem]" />
      <input name="description" maxlength="200" class="w-full" placeholder="이 이미지가 무엇인지" />
      <p class="meta">PNG·JPEG·WEBP, 한 장 {MAX_MB}MB까지, {MAX_IMAGES_PER_POST}장까지.</p>
      <button type="submit" class="btn">이미지 올리기</button>
    </form>
  </section>
</div>
