<script lang="ts">
  import CategoryBar from "$lib/components/CategoryBar.svelte";
  import FeedList from "$lib/components/FeedList.svelte";
  import Seo from "$lib/components/Seo.svelte";

  let { data } = $props();
</script>

<Seo title="검증됨" description="AI 사용이 확인된 글. 품질 판정과는 별개." />
<!-- ⚠️ 이 한 줄만 남긴 이유: 판정 목록 넷에 전부 `~한 사례.` 캡션을 달았더니
     판정 이름이 곧 설명이라 정보량이 0인데 같은 모양만 넷이 늘어섰다(AI 티).
     여기만 남는 건 두 축(AI 여부 / 품질)을 헷갈리지 말라는 진짜 정보라서다.
     나머지 셋에 캡션을 다시 달지 마라. -->
<p class="meta border-b-2 border-line py-1.5">AI 사용이 확인된 사례. 품질 판정과는 별개.</p>
<CategoryBar />
<FeedList items={data.items} />
