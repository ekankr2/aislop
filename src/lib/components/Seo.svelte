<script lang="ts">
  import { page } from "$app/state";

  // 제목 접미사. 표기 통일 지점이다.
  // ⚠️ 괄호로 영문을 문다 — `AI 슬롭 · AI slop` 이던 것을 바꿨다(2026-09-08 유저 결정).
  //    가운뎃점을 쓰면 홈에서 `이름 · 이름 — 설명`으로 구분자가 둘 겹쳐 지저분하고
  //    두 표기가 별개 이름처럼 읽힌다. 괄호는 신문·사전이 외래어를 다는 방식이라
  //    **한 이름**으로 읽힌다. 가운뎃점으로 되돌리지 마라.
  const SITE = "AI 슬롭(AI slop)";

  // 페이지마다 손으로 <svelte:head>를 적으면 canonical·OG를 빠뜨린다.
  // ⚠️ canonical은 쿼리스트링을 뺀 경로다 — 정렬·페이지 파라미터가 붙은 URL이
  //    각각 색인되면 같은 내용이 중복 색인된다.
  let {
    title,
    description,
    image = "/og-2026-09.png",
    type = "website",
    noindex = false,
  }: {
    title: string;
    description: string;
    image?: string;
    type?: "website" | "article";
    noindex?: boolean;
  } = $props();

  const canonical = $derived(new URL(page.url.pathname, "https://aislop.kr").toString());
  // ⚠️ 접미사에 한글·영문을 **둘 다** 넣는다. "AI 슬롭"과 "AI slop"은 한국에서
  //    아직 아무도 안 먹은 빈 키워드라 모든 페이지에서 두 표기를 같이 노출해 선점한다.
  //    붙이는 순서(한글 먼저)는 사이트가 한국어라는 신호다. 하나로 줄이지 마라.
  const full = $derived(title === SITE ? `${SITE} — ${description}` : `${title} | ${SITE}`);
</script>

<svelte:head>
  <title>{full}</title>
  <meta name="description" content={description} />
  <link rel="canonical" href={canonical} />
  {#if noindex}<meta name="robots" content="noindex, nofollow" />{/if}

  <meta property="og:site_name" content="AI 슬롭" />
  <meta property="og:locale" content="ko_KR" />
  <meta property="og:type" content={type} />
  <meta property="og:title" content={full} />
  <meta property="og:description" content={description} />
  <meta property="og:url" content={canonical} />
  <meta property="og:image" content={new URL(image, "https://aislop.kr").toString()} />
  <!-- ⚠️ OG 이미지는 전부 1200x630이다(static/og-2026-09.png). 카카오톡·트위터가
       크기를 미리 알아야 큰 카드로 펼친다 — 다른 비율 이미지를 넣지 마라. -->
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content={full} />
  <meta name="twitter:card" content="summary_large_image" />
</svelte:head>
