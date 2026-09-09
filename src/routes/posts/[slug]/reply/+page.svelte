<script lang="ts">
  import { enhance } from "$app/forms";
  import Seo from "$lib/components/Seo.svelte";
  import { MAX_IMAGE_BYTES } from "$lib/core/image";

  let { data, form } = $props();

  const MAX_MB = Math.floor(MAX_IMAGE_BYTES / 1024 / 1024);

  // 두 폼이 각각 한 장씩 받는다. 기본 파일 UI는 감추고 라벨을 버튼으로 쓴다
  // (`/submit`과 같은 장치). ⚠️ `display:none`으로 지우지 마라 — 키보드 포커스가 죽는다.
  let picked = $state<Record<string, string>>({});
  const onPick = (key: string) => (e: Event) => {
    const f = (e.currentTarget as HTMLInputElement).files;
    picked = { ...picked, [key]: f?.[0]?.name ?? "" };
  };
</script>

{#snippet imagePick(id: string)}
  <div>
    <input {id} name="image" type="file" accept="image/png,image/jpeg,image/webp"
      class="sr-only" onchange={onPick(id)} />
    <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
      <label for={id} class="btn cursor-pointer">이미지 고르기</label>
      {#if picked[id]}<span class="text-[1rem]">{picked[id]}</span>{/if}
      <span class="meta">PNG·JPEG·WEBP, 최대 {MAX_MB}MB</span>
    </div>
  </div>
{/snippet}

<Seo title="당사자 답변·정정 요청" description="사례에 대한 당사자 답변과 사실관계 정정 요청." noindex />

<section class="prose py-4">
  <h1 class="text-[1.5rem] font-bold">당사자 답변·사실관계 정정 요청</h1>

  <!-- ⚠️ 대상 글을 반드시 보여준다(2026-09-09 유저 지시). 창구가 사례 페이지에서
       떨어져 나와서, 이 줄이 없으면 어느 글에 보내는 건지 화면에 아무 단서가 없다.
       제출된 뒤에도 `post_id`로 붙어 있다 — 여기 표시가 그 사실과 짝이다. -->
  <div class="box mt-3">
    <p class="bar">대상 글</p>
    <p class="px-3 py-2 text-[1rem] font-bold">
      <a href="/posts/{data.slug}">{data.title}</a>
    </p>
  </div>

  {#if form?.message}
    <p class="mt-3 border border-ink px-2.5 py-1.5 text-[0.9375rem]">{form.message}</p>
  {/if}

  <form method="POST" action="?/companyResponse" enctype="multipart/form-data" use:enhance
    class="mt-5 space-y-1.5">
    <p class="text-[1.125rem] font-bold">당사자 답변</p>
    <p class="meta">관계 확인 후 글 아래에 붙는 내용</p>
    <div class="grid gap-1.5 sm:grid-cols-3">
      <input name="submitterName" required maxlength="60" placeholder="이름" />
      <input name="submitterEmail" type="email" required maxlength="200" placeholder="회사 이메일" />
      <input name="submitterRole" required maxlength="80" placeholder="직함·역할" />
    </div>
    <textarea name="body" required rows="5" maxlength="4000" placeholder="답변 내용" class="w-full"
    ></textarea>
    {@render imagePick("response-image")}
    <button type="submit" class="btn btn-lg">보내기</button>
  </form>

  <form method="POST" action="?/correction" enctype="multipart/form-data" use:enhance
    class="mt-8 space-y-1.5">
    <p class="text-[1.125rem] font-bold">사실관계 정정 요청</p>
    <p class="meta">모든 내역이 <a href="/about#정정">기록됨</a></p>
    <div class="grid gap-1.5 sm:grid-cols-2">
      <input name="requesterName" required maxlength="60" placeholder="이름" />
      <input name="requesterEmail" type="email" required maxlength="200" placeholder="이메일" />
    </div>
    <textarea name="claim" required rows="4" maxlength="3000" class="w-full"
      placeholder="무엇이 사실과 다른지, 맞는 내용은 무엇인지."></textarea>
    <input name="evidenceUrl" type="url" maxlength="2000" placeholder="근거 URL (선택)" class="w-full" />
    {@render imagePick("correction-image")}
    <button type="submit" class="btn btn-lg">보내기</button>
  </form>
</section>
