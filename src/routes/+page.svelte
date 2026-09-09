<script lang="ts">
  import CategoryBar from "$lib/components/CategoryBar.svelte";
  import FeedList from "$lib/components/FeedList.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import { siteJsonLd } from "$lib/core/jsonld";

  let { data } = $props();

  // 사이트 고정값이라 사용자 입력이 안 섞이지만, 상세 페이지와 같은 방식으로 이스케이프한다.
  const jsonLdText = JSON.stringify(siteJsonLd()).replaceAll("<", "\\u003c");
</script>

<!-- ⚠️ 홈 title은 **키워드를 노리지 않는다**(2026-09-08 유저 결정). "AI 슬롭 뜻"류
     검색어는 `/ai-slop`이 먹으라고 따로 만든 문서다 — 홈이 같은 키워드를 밀면
     구글이 둘 중 뭘 올릴지 헷갈려 서로 순위를 깎는다. 홈의 일은 링크로 공유됐을 때
     **이게 뭐 하는 곳인지 한 줄로 알려주는 것** 하나다.
     거쳐 온 것: "AI로 찍어낸 것을 근거로 판정합니다"(정체는 읽혔는데 커뮤니티 신호가
     0이었다) → "AI로 찍어낸 것에 지친 사람들이 사례를 모읍니다"(사람은 모이는데
     **슬롭만 모으는 곳**으로 읽혀 스코프를 좁혔다).
     지금 문장이 하는 일 셋: 스코프("AI로 만든 것" 전부) · 커뮤니티("같이") ·
     판단 주체가 유저라는 것("판단한다"). 셋 중 하나라도 빼지 마라.
     ⚠️ "지겨운 AI" 류로 줄이지 마라 — AI 전체를 싫어하는 말로 읽혀서
     "AI 썼다고 다 슬롭은 아니다"라는 사이트 전제와 정면으로 부딪힌다.
     "기록합니다"로도 되돌리지 마라(위키·아카이브 소리가 난다). -->
<Seo
  title="AI 슬롭(AI slop)"
  description="AI로 만든 것을 모아 슬롭인지 아닌지 같이 판단한다"
/>
<svelte:head>
  {@html `<script type="application/ld+json">${jsonLdText}<\/script>`}
</svelte:head>

<CategoryBar />
<FeedList items={data.items} />
