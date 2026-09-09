<script lang="ts">
  import { MAX_IMAGE_BYTES, MAX_IMAGES_PER_POST } from "$lib/core/image";
  import { CATEGORIES, DEFAULT_CATEGORY } from "$lib/core/taxonomy";

  const MAX_MB = Math.floor(MAX_IMAGE_BYTES / 1024 / 1024);

  let { form } = $props();
  const label = "block text-[1rem] font-bold";
  // 필수·선택은 라벨에서 글자로 구분한다(2026-09-09 유저 지시). 별표(*)를 쓰지 마라 —
  // 뜻을 따로 배워야 하고 스크린리더는 "별"로 읽는다.
  const opt = "font-normal text-ink-3";

  // 파일 입력의 기본 UI("파일 선택 / No file chosen")를 감추고 라벨을 버튼처럼 쓴다
  // (2026-09-09 유저 지적). ⚠️ input을 `display:none`으로 지우지 마라 — 키보드
  //    포커스를 못 받는다. `sr-only`는 화면에서만 빠지고 라벨 클릭·탭 이동은 살아 있다.
  let picked = $state<string[]>([]);
  const onPick = (e: Event) => {
    const f = (e.currentTarget as HTMLInputElement).files;
    picked = f ? [...f].map((x) => x.name) : [];
  };
</script>

<svelte:head>
  <title>글쓰기 | AI 슬롭</title>
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<!-- ⚠️ 폼은 산문 폭(45rem)이다. 컨테이너를 PH 폭(1216px)으로 넓히면서 입력칸이
     화면 끝까지 늘어나 되돌린 값이고(2026-09-08), 칸이 셋으로 줄어든 뒤에도
     **유저가 좁은 쪽을 택했다**(2026-09-09). 넓히지 마라 — 쓰는 칸은 읽는 폭이다.
     넓은 폭(76rem)을 쓰는 건 피드와 상세뿐이다. -->
<div class="mx-auto max-w-[45rem]">
<h2 class="mt-3 mb-1.5 text-[1.5rem] font-bold">글쓰기</h2>

<!-- ⚠️ 처리 절차 안내 문구를 다시 넣지 마라(2026-09-09 유저 지시). 바로 게시되므로 설명할 절차가 없다. -->
  {#if form?.message}
    <p class="border-b border-ink bg-shaded px-3 py-2 text-[0.875rem] font-bold text-ink">
      {form.message}
      {#if form.duplicateSlug}<a href="/posts/{form.duplicateSlug}">기존 사례 보기</a>{/if}
    </p>
  {/if}

  <!-- ⚠️ 칸은 **제목·본문·이미지 셋**이다(2026-09-09 유저 지시 — "허들이 너무 많다").
       한 줄 요약·유형·AI 근거·자료 URL·직접경험 체크를 걷어냈다:
       요약은 본문 앞부분으로, 유형은 운영자 검토로 간다.
       ⚠️ 칸을 다시 늘리지 마라 — 사례 0건인데 폼이 제일 무거웠다.
          운영자만 아는 값(유형·판정·AI 여부)을 제보자에게 묻지 마라.
       원문 URL은 HN·긱뉴스처럼 **선택 칸으로 되돌렸다**(2026-09-09) — 본문에서
       첫 링크를 뽑는 건 추측이라 근거 링크를 먼저 붙인 글의 원문이 엉뚱하게 잡혔다.
       비우면 예전처럼 본문 첫 링크로 채운다.
       관계자 체크만 남긴 건 이해충돌 고지라서다. 체크박스 하나는 허들이 아니다.
       ⚠️ enctype이 없으면 파일이 이름 문자열로만 실려 온다. 지우지 마라. -->
  <form method="POST" enctype="multipart/form-data" class="space-y-3 px-3 py-3">
    <div>
      <label class={label} for="title">제목</label>
      <input id="title" name="title" required minlength="4" maxlength="160" class="w-full"
        value={form?.values?.title ?? ""} />
    </div>

    <div>
      <label class={label} for="url">원문 링크 <span class={opt}>(선택)</span></label>
      <input id="url" name="url" type="url" maxlength="2000" class="w-full"
        value={form?.values?.url ?? ""} />
    </div>

    <div>
      <label class={label} for="body">내용</label>
      <!-- ⚠️ placeholder를 다시 넣지 마라(2026-09-09 유저 지시). 무슨 말투로 써도
           빈 칸 안에서 예시가 지시문처럼 읽힌다. 자유 양식이라는 게 요점이다. -->
      <textarea id="body" name="body" required rows="12" minlength="10" maxlength="8000"
        class="w-full">{form?.values?.body ?? ""}</textarea>
    </div>

    <!-- ⚠️ 유형이 없으면 목록 위 분류 필터가 통째로 죽는다(2026-09-09 유저 지적).
         한때 뺐다가 되돌렸다 — 검토 게이트가 없어져서(같은 날) "운영자가 나중에
         고친다"는 전제가 사라졌다. 기본값이 `기타`라 안 고르고 넘어가도 된다. -->
    <div>
      <p class={label}>유형</p>
      <div class="mt-1 flex flex-wrap gap-1.5">
        {#each CATEGORIES as c (c.slug)}
          <label class="pick">
            <input type="radio" name="category" value={c.slug}
              checked={c.slug === DEFAULT_CATEGORY} />
            <span>{c.name}</span>
          </label>
        {/each}
      </div>
    </div>

    <div>
      <p class={label}>이미지 <span class={opt}>(선택)</span></p>
      <input id="images" name="images" type="file" accept="image/png,image/jpeg,image/webp"
        multiple class="sr-only" onchange={onPick} />
      <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
        <label for="images" class="btn cursor-pointer">파일 고르기</label>
        {#if picked.length > 0}
          <span class="text-[1rem]">{picked.join(", ")}</span>
        {/if}
      </div>
      <p class="meta mt-1">
        PNG·JPEG·WEBP, 한 장 {MAX_MB}MB까지, {MAX_IMAGES_PER_POST}장까지.
      </p>
    </div>

    <label class="flex items-start gap-1.5 text-[1rem]">
      <input type="checkbox" name="submitterAffiliated" value="true" class="mt-0.5" />
      <span>관계자입니다 (업체·제작자 본인. 글에 같이 표시됨)</span>
    </label>

    <!-- 확정 버튼은 **폼 폭 전체**다(2026-09-09 유저 지적 — "더 잘 보이게").
         헤더의 `.btn`(16px/4px)과 같은 크기로 두면 18px 입력칸 밑에서 안 보인다.
         로그인의 `코드 받기`와 같은 방식이다. -->
    <button type="submit" class="btn btn-primary btn-lg mt-1 w-full"
      >올리기</button
    >
  </form>
</div>
