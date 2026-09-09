<script lang="ts">
  import Seo from "$lib/components/Seo.svelte";
  import { aiSlopPageJsonLd } from "$lib/core/jsonld";
  import { CATEGORIES, CATEGORY_HINT } from "$lib/core/taxonomy";

  const jsonLdText = JSON.stringify(aiSlopPageJsonLd()).replaceAll("<", "\\u003c");

  // ⚠️ 이 페이지는 사이트에서 **유일하게 SEO가 존재 이유인** 문서다.
  //    "AI 슬롭"과 "AI slop" 둘 다 한국에서 아직 아무도 안 먹은 키워드고,
  //    그 정의를 여기가 쓰면 표준이 된다. 그래서 /about(소개·판정 원칙)과 분리해 뒀다.
  //    내용을 줄이지 마라 — 얇은 정의 페이지는 색인은 되고 순위는 안 나온다.

</script>

<Seo
  title="AI 슬롭이란"
  description="AI 슬롭(AI slop)은 AI로 대충 찍어낸 결과물을 말합니다. 뜻과 어원, 종류, 구별하는 방법을 정리합니다."
/>

<svelte:head>
  {@html `<script type="application/ld+json">${jsonLdText}<\/script>`}
</svelte:head>

<!-- ⚠️ `mx-auto`로 가운데. 이유는 /about의 같은 자리 주석에 적어 뒀다. -->
<div class="prose mx-auto">
<h1 class="mt-3 mb-1.5 text-[1.5rem] font-bold">AI 슬롭이란</h1>

<!-- 산문이라 `.prose`(45rem)로 좁힌다. 목록·헤더(76rem)와 폭이 다른 게 맞다 —
     목록은 넓게 훑고 본문은 좁게 읽는다. ⚠️ 컨테이너에 맞춰 넓히지 마라. -->
<div class="py-2 text-[1rem] leading-relaxed">
  <p>
    <b>AI 슬롭</b>(AI slop)은 <b>AI로 값싸게 대량 생산해 인터넷에 쏟아붓는, 사람이 볼 이유가 없는
    결과물</b>을 말합니다. 메뉴판과 다른 AI 음식 사진, 하루 만에 찍어낸 전자책,
    써 보지 않고 쓴 후기, 진짜 사건 사진처럼 유통되는 생성 이미지 같은 것들입니다.
  </p>

  <h3 id="어원" class="mt-8 mb-2 text-[1.125rem] font-bold">어원 — 왜 하필 '슬롭'인가</h3>
  <p>
    영어 <b>slop</b>은 가축에게 주는 구정물, 먹다 남은 짬을 뜻합니다. 스팸(spam)이 받는 사람을
    괴롭히는 것이라면, 슬롭은 <b>먹으라고 내놓기는 하는데 먹을 것이 못 되는 것</b>에 가깝습니다.
    2024년 영어권에서 생성형 AI 결과물을 가리키는 말로 굳었습니다.
  </p>
  <p class="mt-3">
    한국어로 굳은 번역어는 아직 없습니다. '저품질 AI 콘텐츠'는 길고 밋밋하고, 'AI 쓰레기'는 만든
    사람을 때리는 말이 됩니다. 이 사이트는 <b>AI 슬롭</b>으로 씁니다.
  </p>

  <h3 id="종류" class="mt-8 mb-2 text-[1.125rem] font-bold">어디에 있나</h3>
  <dl class="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[0.9375rem]">
    {#each CATEGORIES as c (c.slug)}
      <dt class="font-bold whitespace-nowrap">
        <a href="/?category={c.slug}">{c.name}</a>
      </dt>
      <dd class="text-ink-2">{CATEGORY_HINT[c.slug]}</dd>
    {/each}
  </dl>

  <h3 id="구별" class="mt-8 mb-2 text-[1.125rem] font-bold">구별하는 방법</h3>
  <p>
    확실한 한 방은 없습니다. 자동 판별기도 자주 틀립니다. 그리고 <b>예전에 통하던 신호는
    대부분 수명이 끝났습니다</b> — 손가락 개수, 뭉개진 글자, 녹아 붙은 배경은 2023~24년
    모델의 흔적입니다. 지금도 틀려 있다면 강한 증거지만, <b>멀쩡하다고 사람이 만든 것은
    아닙니다.</b> 그래서 결과물 한 장을 뜯어보는 대신 <b>그 주변</b>을 봅니다.
  </p>
  <ul class="mt-1.5 ml-4 list-disc text-ink-2 marker:text-ink-3">
    <li class="mt-1">
      <b class="!text-ink">계정</b> — 개설한 지 얼마 안 됐는데 게시물이 수백 개고, 업로드
      간격이 일정하고, 주제가 서로 관련이 없습니다. <b>지금 가장 강한 신호가 이것입니다.</b>
      결과물은 좋아져도 사람이 만들 수 없는 물량과 규칙성은 숨기기 어렵습니다.
    </li>
    <li class="mt-1">
      <b class="!text-ink">출처</b> — 사건 사진이라는데 원본이 없고, 후기라는데 구매 기록이
      없고, 전문가라는데 그 이름이 다른 어디에도 없습니다. 되짚어 올라갈 곳이 없으면
      그림이 아무리 그럴듯해도 근거가 아닙니다.
    </li>
    <li class="mt-1">
      <b class="!text-ink">여러 장 사이</b> — 한 장은 완벽한데 같은 인물·같은 매장의 다른
      컷과 안 맞습니다. 간판 글씨가 바뀌고, 실내 구조가 달라지고, 그림자 방향이 서로
      어긋납니다. 모델은 장면을 기억하지 않아서 <b>일관성이 품질보다 늦게 따라옵니다.</b>
    </li>
    <li class="mt-1">
      <b class="!text-ink">글</b> — 단락마다 같은 구조가 반복되고, 구체적인 숫자·이름·날짜가
      없고, 결론이 원론입니다. 문장이 어색해서가 아니라 <b>읽고 나서 남는 게 없어서</b>
      알아봅니다.
    </li>
    <li class="mt-1">
      <b class="!text-ink">이미지 자체</b> — 조명이 어디서 오는지 알 수 없이 모든 면이 균일하게
      밝고, 피부와 재질이 지나치게 매끄럽고, 배경 군중·패턴이 반복됩니다. <b>이건 이제
      보조 신호입니다</b> — 이것만으로 판정하지 않습니다.
    </li>
  </ul>
  <p class="mt-2 text-ink-2">
    이미지 메타데이터(C2PA·생성 모델명)가 남아 있으면 그게 가장 확실한 근거지만, 대부분은
    업로드 과정에서 지워집니다.
  </p>
  <p class="mt-3 text-ink-2">
    ⚠️ 이 목록은 모델이 좋아지면 낡습니다. 그래서 이 사이트는 신호 하나로 판정하지 않고
    <b>근거를 붙여 사례로 남깁니다</b> — 판별법은 바뀌어도 기록은 남습니다.
  </p>

  <h3 id="아닌것" class="mt-8 mb-2 text-[1.125rem] font-bold">AI를 썼다고 다 슬롭은 아닙니다</h3>
  <p>
    이게 이 사이트의 전제입니다. AI로 만들었는지와 그게 문제인지는 <b>같은 문제가 아닙니다.</b>
    밝히고 쓴 삽화, 번역, 초안 정리는 슬롭이 아닙니다. 문제가 되는 건 대개
    <b>속이거나</b>(실물인 척, 사람인 척), <b>양으로 밀어내</b> 볼 만한 것을 덮을 때입니다.
    그래서 판정을 두 축으로 나눠 따로 표시합니다 —
    <a href="/about">판정 원칙</a>에 자세히 적어 뒀습니다.
  </p>

  <h3 id="하는일" class="mt-8 mb-2 text-[1.125rem] font-bold">여기서 하는 일</h3>
  <p>
    <b>AI로 만든 것을 모읍니다 — 슬롭으로 보이는 것만이 아니라 잘 쓴 것도 함께.</b>
    제보를 받아 AI를 썼는지부터 근거로 확인하고, <b>그게 슬롭인지 쓸모 있는 것인지는
    보는 사람들이 투표로 정합니다.</b> 원문은 지워지기 때문에 보존본을 함께 답니다.
    지목된 쪽은 <b>가입 없이</b> 반론과 정정을 넣을 수 있고, 처리 결과는
    <a href="/about#정정">정정 기록</a>에 공개됩니다.
  </p>
  <p class="mt-3">
    AI를 가려내는 판별 도구는 이미 많습니다. 도구는 확률을 알려줄 뿐 근거를 남기지 않고,
    모델이 좋아질수록 잘 틀립니다. 그리고 <b>"AI인가"에서 멈춥니다</b> — 정작 알고 싶은
    "그래서 이걸 믿어도 되는가"는 사람이 근거를 들고 와야 답이 나오고, 그 기록이 쌓여야
    같은 곳에 또 속지 않습니다. 그래서 도구가 아니라 <a href="/about">커뮤니티</a>입니다.
  </p>
  <p class="mt-3">
    <a href="/submit" class="btn btn-primary">제보하기</a>
  </p>
</div>
</div>
