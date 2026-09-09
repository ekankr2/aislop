<script lang="ts">
  import CategoryBar from "$lib/components/CategoryBar.svelte";
  import FeedList from "$lib/components/FeedList.svelte";
  import Seo from "$lib/components/Seo.svelte";

  let { data } = $props();
</script>

<Seo title="Slop 판정" description="근거를 확인하고 운영자가 AI 슬롭으로 판정한 사례입니다." />
<CategoryBar />
<FeedList items={data.items} />
