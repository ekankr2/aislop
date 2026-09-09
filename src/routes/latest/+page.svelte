<script lang="ts">
  import CategoryBar from "$lib/components/CategoryBar.svelte";
  import FeedList from "$lib/components/FeedList.svelte";
  import Seo from "$lib/components/Seo.svelte";

  let { data } = $props();
</script>

<Seo title="최신" description="올라온 순서대로 보는 AI 슬롭 사례 목록." />
<CategoryBar counts={data.counts} />
<FeedList items={data.items} />
