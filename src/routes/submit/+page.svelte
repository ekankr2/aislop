<script lang="ts">
  import { MAX_IMAGE_BYTES, MAX_IMAGES_PER_POST } from "$lib/core/image";
  import { CATEGORIES } from "$lib/core/taxonomy";

  const MAX_MB = Math.floor(MAX_IMAGE_BYTES / 1024 / 1024);

  let { form } = $props();
  const label = "block text-[0.9375rem] font-bold";
</script>

<svelte:head>
  <title>제보하기 | AI 슬롭</title>
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<!-- ⚠️ 폼도 산문 폭(45rem)으로 묶는다. 컨테이너를 PH 폭(1216px)으로 넓히면서
     입력칸이 화면 끝까지 늘어났다(2026-09-08) — 한 줄짜리 URL 입력이 1미터면
     쓰기 힘들고 화면이 비어 보인다. 넓은 폭을 쓰는 건 피드와 상세뿐이다. -->
<div class="mx-auto max-w-[45rem]">
<h2 class="mt-3 mb-1.5 text-[1.5rem] font-bold">제보하기</h2>

{#if form?.done}
  <div class="py-10 text-center">
    <p class="text-[1.125rem] font-bold">제보 접수함</p>
    <p class="meta mt-1.5">
      중복 검사하고 운영자 검토를 거쳐 올라감. 진행 상태는 프로필에서 볼 수 있음.
    </p>
    <p class="mt-3"><a href="/submit" class="btn">하나 더 제보하기</a> <a href="/" class="btn">홈으로</a></p>
  </div>
{:else}
  <p class="meta border-b-2 border-line px-3 py-1.5">
    접수 → 중복 검사 → 운영자 검토 → 공개 순으로 처리함. 바로 안 올라감.
  </p>

  {#if form?.message}
    <p class="border-b border-ink bg-shaded px-3 py-2 text-[0.875rem] font-bold text-ink">
      {form.message}
      {#if form.duplicateSlug}<a href="/posts/{form.duplicateSlug}">기존 사례 보기</a>{/if}
    </p>
  {/if}

  <!-- ⚠️ enctype이 없으면 파일이 이름 문자열로만 실려 온다. 지우지 마라. -->
  <form method="POST" enctype="multipart/form-data" class="space-y-3 px-3 py-3">
    <div>
      <label class={label} for="url">원문 URL</label>
      <input id="url" name="url" type="url" maxlength="2000" class="w-full"
        placeholder="https://..." value={form?.values?.url ?? ""} />
    </div>

    <div>
      <label class={label} for="title">제목 *</label>
      <input id="title" name="title" required minlength="4" maxlength="160" class="w-full"
        value={form?.values?.title ?? ""} />
    </div>

    <div>
      <label class={label} for="summary">한 줄 요약 *</label>
      <input id="summary" name="summary" required minlength="10" maxlength="600" class="w-full"
        value={form?.values?.summary ?? ""} />
    </div>

    <div>
      <label class={label} for="category">유형 *</label>
      <select id="category" name="category" required class="w-full">
        {#each CATEGORIES as c (c.slug)}<option value={c.slug}>{c.name}</option>{/each}
      </select>
    </div>

    <div>
      <label class={label} for="submitReason">Slop이라고 보는 이유 *</label>
      <textarea id="submitReason" name="submitReason" required rows="4" minlength="10" maxlength="1500"
        class="w-full" placeholder="무엇이 문제인지, 누구에게 어떤 불편이나 피해를 주는지"
        >{form?.values?.submitReason ?? ""}</textarea>
    </div>

    <div>
      <label class={label} for="aiEvidence">AI 사용 근거</label>
      <textarea id="aiEvidence" name="aiEvidence" rows="3" maxlength="1500" class="w-full"
        placeholder="손가락 개수, 반복되는 문장 구조, 메타데이터, 업체 고지. 없으면 비워 둠"
        >{form?.values?.aiEvidence ?? ""}</textarea>
      <p class="meta mt-0.5">
        AI를 썼다는 것만으로 Slop이 되지 않음. 두 축은 따로 판단함.
      </p>
    </div>

    <div>
      <label class={label} for="images">화면 캡처</label>
      <input id="images" name="images" type="file" accept="image/png,image/jpeg,image/webp"
        multiple class="w-full text-[0.9375rem]" />
      <p class="meta mt-1">
        PNG·JPEG·WEBP, 한 장 {MAX_MB}MB까지, {MAX_IMAGES_PER_POST}장까지. 사례에 그대로 보임.
      </p>
    </div>

    <div>
      <label class={label} for="evidenceUrl">자료 URL</label>
      <input id="evidenceUrl" name="evidenceUrl" type="url" maxlength="2000" class="w-full" />
    </div>

    <label class="flex items-start gap-1.5 text-[0.875rem]">
      <input type="checkbox" name="firsthand" value="true" class="mt-1" />
      <span>본인이 직접 겪은 일임</span>
    </label>

    <label class="flex items-start gap-1.5 text-[0.875rem]">
      <input type="checkbox" name="submitterAffiliated" value="true" class="mt-1" />
      <span>본인이 해당 업체·제작자 관계자임 (사례에 같이 표시됨)</span>
    </label>

    <button type="submit" class="btn btn-primary">제보하기</button>
  </form>
{/if}
</div>
