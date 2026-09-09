<script lang="ts">
  import { browser } from "$app/environment";
  import { page } from "$app/state";
  import "../app.css";
  import { FEED_TABS, isEditor } from "$lib/core/taxonomy";

  // Pretendard @font-face를 첫 페인트 경로 밖으로 뺀다 — 이유는 `lib/fonts.css`.
  // 정적 import로 되돌리면 다시 렌더 블로킹 CSS에 합쳐진다.
  if (browser) import("$lib/fonts.css");

  let { data, children } = $props();

  const current = $derived(page.url.pathname);
</script>

<a
  href="#main"
  class="sr-only focus:not-sr-only focus:absolute focus:top-1 focus:left-1 focus:z-50 focus:bg-ink focus:px-2 focus:py-1 focus:text-white"
>
  본문으로 건너뛰기
</a>

<!-- 폭은 **Product Hunt 실측값**이다(2026-09-08 유저 지시 — "피시치고 너무 작다").
     PH 안쪽 컨테이너 `max-w-layout` = **1216px**(=76rem), 좌우 `px-6` = **24px**.
     한때 lobste.rs 원본값 60rem(960px)이었는데 큰 모니터에서 화면 절반이 비었다.
     ⚠️ **헤더·푸터는 전폭이고 안쪽만 `.shell-inner`로 묶는다**(유저 지적 — "아직도
        헤더가 꽉 안 차잖음"). 헤더를 컨테이너 안에 다시 집어넣지 마라 — 구분선이
        1216px에서 끊겨 페이지가 화면 가운데 뜬 카드처럼 보인다. PH도 이 구조다.
     ⚠️ 지어내지 마라 — 바꿔야 하면 producthunt.com에서 다시 뽑아라.
     ⚠️ `.prose`(45rem)는 **같이 넓히지 마라**. 목록은 넓게 훑고 본문은 좁게 읽는다 —
        컨테이너가 넓어질수록 이 분리가 더 중요해진다. -->
<div class="app-shell">
  <!-- 제호 + 목록 탭 + 계정 메뉴가 한 줄이다(2026-09-08 유저 지시).
       ⚠️ 태그라인을 다시 넣지 마라 — 한 줄에 셋이 붙으면 제호가 잡다해진다. -->
  <header class="site-header">
   <!-- 간격은 PH 실측이다(2026-09-08 유저 지시 — "메뉴들 좀만 더 넓게 배치").
        PH 헤더: 세로 패딩 20px, 제호↔메뉴 32px, 메뉴 사이 28px, 우측 계정 16px.
        우리는 10/12/12/10이라 전부 절반 이하로 붙어 있었다.
        ⚠️ 다시 좁히지 마라 — 붙여 놓으면 제호와 메뉴가 한 덩어리로 읽힌다. -->
   <div class="shell-inner flex flex-wrap items-baseline gap-x-8 gap-y-2 py-5">
    <!-- 제호는 **도메인 그대로** `aislop.kr`다(2026-09-08 유저 결정, FactCheck.org 방식).
         모노그램 `ais`에서 되돌린 것 — 이름과 카테고리가 같은 말이라 이름만으로는
         구별이 안 되고, 유일하게 하나뿐인 건 도메인이라서다. 제호가 곧 주소면
         스크린샷으로 퍼져도 출처가 같이 간다.
         ⚠️ `.kr`을 브랜드색(똥색) 밖에 두는 건 색 덩어리를 줄이려는 것이지 장식이 아니다.
         브랜드색이 등장하는 자리는 여기와 형광펜(`.mark`) 둘뿐이다. -->
    <!-- ⚠️ aria-label은 **눈에 보이는 글자("aislop.kr")를 그대로 품어야** 한다.
         "AI 슬롭 홈"으로 두면 음성 제어 사용자가 화면에 보이는 대로 "aislop.kr"이라
         말했을 때 이 링크가 안 잡힌다(axe label-content-name-mismatch, 2026-09-08 실측). -->
    <a href="/" aria-label="aislop.kr 홈" class="logo-link">
      <!-- 제호 마크. 소프트아이스크림처럼 감아 올린 똥 나선이다(2024-09-08 유저 선택 'A').
           ⚠️ 손으로 그린 경로가 아니라 나선을 계산해 뽑은 값이다: 2.35바퀴, 반지름 12.2→1.6,
              y 25.2→6.6, 세로눌림 0.34, 굵기 5.4. 좌표를 눈대중으로 고치지 마라 —
              고쳐야 하면 저 여섯 숫자를 바꿔서 다시 뽑아라.
           ⚠️ 이모지(💩)로 대체하지 마라: 폰트마다 다르게 그려지고 이 사이트는 이모지를 안 쓴다.
           같은 도형이 +layout.svelte 제호에도 인라인으로 있다 — 한쪽만 고치지 마라. -->
      <svg class="logo-mark" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
        <path d="M16.0 29.3L14.1 29.1L12.4 28.7L10.7 28.2L9.2 27.7L7.9 27.1L6.8 26.4L5.9 25.7L5.3 24.9L5.0 24.2L4.9 23.4L5.1 22.6L5.5 21.9L6.2 21.2L7.1 20.5L8.2 19.9L9.4 19.3L10.8 18.9L12.3 18.5L13.8 18.2L15.3 17.9L16.9 17.8L18.3 17.7L19.7 17.7L21.0 17.8L22.1 17.9L23.1 18.1L23.8 18.3L24.4 18.6L24.7 18.8L24.8 19.1L24.8 19.4L24.5 19.6L24.0 19.8L23.3 20.0L22.5 20.2L21.6 20.3L20.5 20.3L19.4 20.3L18.2 20.2L17.0 20.1L15.8 19.9L14.7 19.6L13.6 19.3L12.6 18.9L11.7 18.5L10.9 18.0L10.3 17.5L9.9 17.0L9.5 16.4L9.4 15.9L9.4 15.3L9.6 14.8L9.9 14.3L10.4 13.8L11.0 13.4L11.6 12.9L12.4 12.6L13.2 12.2L14.0 12.0L14.9 11.7L15.8 11.5L16.6 11.4L17.4 11.3L18.1 11.2L18.7 11.2L19.3 11.2L19.7 11.2L20.0 11.2L20.2 11.2L20.4 11.3L20.3 11.3L20.2 11.4L20.0 11.4L19.7 11.4L19.4 11.4L18.9 11.3L18.4 11.2L17.9 11.1L17.4 11.0L16.9 10.8L16.4 10.6L15.9 10.4L15.4 10.1L15.0 9.9L14.6 9.6L14.3 9.3L14.1 8.9L14.0 8.6L13.9 8.3L13.8 8.0L13.9 7.7L14.0 7.4L14.1 7.1L14.3 6.8L14.5 6.5L14.7 6.3" />
      </svg><span class="logo">aislop</span><span class="logo-tld">.kr</span>
    </a>

    <nav aria-label="목록" class="flex flex-wrap items-baseline gap-x-7 text-[1rem]">
      {#each FEED_TABS as tab (tab.key)}
        {@const on = current === tab.href}
        <a href={tab.href} aria-current={on ? "page" : undefined} class="navlink">{tab.label}</a>
      {/each}
    </nav>

    <nav class="meta ml-auto flex items-baseline gap-x-4">
      {#if data.user}
        {#if isEditor(data.user.role)}<a href="/admin" class="navlink">관리</a>{/if}
        <a href="/users/{data.user.id}" class="navlink">{data.user.name}</a>
        <a href="/submit" class="btn btn-primary">글쓰기</a>
      {:else}
        <a href="/login" class="btn">로그인</a>
      {/if}
    </nav>
   </div>
  </header>

  {#if data.user?.blocked}
    <p class="shell-inner border-b-2 border-line py-1.5 text-[0.9375rem] font-bold text-ink">
      이 계정은 쓰기가 막혀 있음. 읽기만 됨.
    </p>
  {/if}

  <main id="main" class="site-main shell-inner">
    {@render children()}
  </main>

  <footer class="site-footer">
    <div class="shell-inner meta py-4 leading-relaxed">
      <nav class="footer-nav mb-1 flex flex-wrap gap-x-3">
        <a href="/ai-slop">AI 슬롭이란</a>
        <a href="/about">소개·원칙·정정</a>
        <a href="/rss.xml">RSS</a>
      </nav>
      <p>서비스를 비평한다. 만든 사람을 공격하지 않는다.</p>
      <p>© {new Date().getFullYear()} AI 슬롭 · aislop.kr</p>
    </div>
  </footer>
</div>
