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
  description="AI 슬롭(AI slop)은 AI로 대충 찍어낸 결과물을 말한다. 뜻과 어원, 종류, 구별하는 방법을 정리한다."
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
    <b>AI 슬롭</b>(AI slop)은 <b>AI로 대량 생산해 인터넷에 쏟아붓는, 불쾌한 골짜기가
    느껴지는 결과물</b>을 말한다.
    <!-- ⚠️ 여기에 예시를 나열하지 마라. 아래 "어디에 있나"(CATEGORY_HINT)가 같은 넷을
         더 자세히 다시 말한다 — 한때 양산형 숏폼·전자책·리뷰·음식 사진을 여기 적어
         뒀는데 분류표와 통째로 겹쳤다(2026-09-09 유저 지적). 정의는 한 문장이면 된다. -->
  </p>

  <h3 id="어원" class="mt-8 mb-2 text-[1.125rem] font-bold">어원 — 왜 하필 '슬롭'인가</h3>
  <p>
    영어 <b>slop</b>은 가축에게 주는 구정물이다. 스팸(spam)이 받는 사람을 괴롭히는
    것이라면, 슬롭은 <b>먹으라고 내놓는다.</b> 먹을 것이 못 될 뿐이다.
    2024년 영어권에서 굳은 말이다.
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
  <!-- ⚠️ 항목마다 `굵은 라벨 — 나열 셋 — 굵은 결론`을 반복하지 마라(2026-09-09 유저
       지적 — "그냥 AI가 쓴 것 같다"). 이 절이 "단락마다 같은 구조가 반복된다"를 AI
       신호로 가르치고 있어서, 그 형태로 쓰면 자기가 쓴 판별법에 자기가 걸린다.
       라벨 하나 + 한 문장까지다. 굵은 결론을 항목마다 달지 마라.
       ⚠️ 순서(계정 → 출처 → 여러 장 → 글 → 이미지)를 뒤집지 마라. 결과물 한 장을
          뜯는 신호는 계속 약해지므로 주변 신호가 위에 온다. -->
  <p>
    정해진 방법은 없다. 자동 판별기는 자주 틀린다. 손가락 개수나 뭉개진 글자는
    2023~24년 모델의 흔적이라 지금은 잘 안 나오고, 나온다면 강한 증거지만 안 나온다고
    사람이 만든 것도 아니다. 그래서 결과물 대신 주변을 본다.
  </p>
  <!-- ⚠️ 목록은 **명사형으로 끊는다**(2026-09-09 유저 지적 — "니다 니다가 반복된다").
       한국어 평서체는 종결어미가 사실상 하나라, 짧은 항목이 다섯 개 연달아 `~습니다`로
       끝나면 같은 북소리가 난다. 산문 문단은 평서형(`~다`), 표·목록은 명사형으로 가른다
       (CLAUDE.md의 "라벨·캡션은 음슴체"와 같은 규칙이다). -->
  <dl class="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[0.9375rem]">
    <dt class="font-bold whitespace-nowrap">계정</dt>
    <dd class="text-ink-2">
      개설한 지 얼마 안 됐는데 게시물이 수백 개. 올라오는 간격까지 일정하면 사람이
      아니라 자동화가 돌리는 계정.
    </dd>

    <dt class="font-bold whitespace-nowrap">출처</dt>
    <dd class="text-ink-2">
      직접 찍었다는데 원본이 없음. 후기라는데 구매 기록이 없음. 전문가라는데 그
      이름이 다른 어디에도 없음. 병원 이름도, 학회 기록도.
    </dd>

    <dt class="font-bold whitespace-nowrap">여러 장 사이</dt>
    <dd class="text-ink-2">
      한 장은 완벽한데 같은 인물, 같은 매장의 다른 컷과 어긋나는 간판 글씨와 실내
      구조. AI 모델이 이전 장면을 기억하지 못하는 탓.
    </dd>

    <dt class="font-bold whitespace-nowrap">글</dt>
    <dd class="text-ink-2">
      읽고 나면 남는 게 없는 글. 구체적인 숫자도 이름도 없이 "결국 균형이
      중요합니다"로 끝난다.
    </dd>

    <dt class="font-bold whitespace-nowrap">이미지</dt>
    <dd class="text-ink-2">
      그림자가 어디서 오는지 알 수 없는 화면, 너무 매끄러운 피부. 이제는 보조 증거.
    </dd>
  </dl>
  <p class="mt-3 text-ink-2">
    위에 적은 것들도 AI가 좋아지면 안 통한다. 그래서 신호 하나로 판정하지 않고,
    사람들끼리 근거를 대고 같이 판별한다.
  </p>

  <h3 id="아닌것" class="mt-8 mb-2 text-[1.125rem] font-bold">AI를 썼다고 다 슬롭은 아니다</h3>
  <p>
    이게 이 사이트의 전제다. 밝히고 쓴 삽화나 번역은 슬롭이 아니다. 문제는
    속이거나 양으로 덮을 때 생긴다. 그래서 판정을 두 축으로 나눈다. 자세한 건
    <a href="/about">판정 원칙</a>에 있다.
  </p>

  <h3 id="하는일" class="mt-8 mb-2 text-[1.125rem] font-bold">여기서 하는 일</h3>
  <p>
    AI로 만들어진 거라면 무엇이든 올라온다. 슬롭만이 아니라 잘 쓴 것도. AI를 썼는지는 근거로
    확인하고, <b>슬롭인지 쓸모 있는 것인지는 보는 사람들이 투표로 정한다.</b>
    반론은 가입 없이 받고, 처리 결과는
    <a href="/about#정정">정정 기록</a>에 공개한다.
  </p>
  <p class="mt-3">
    AI를 가려내는 도구는 이미 많다. 그것들은 확률만 말하고 "AI인가"에서 멈춘다.
    알고 싶은 건 그다음. 이걸 믿어도 되는가. 여기는 그 답이 확률이 아니라 사람들의
    의견에서 나오는 <a href="/about">커뮤니티</a>다.
  </p>
</div>
</div>
