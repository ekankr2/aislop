<script lang="ts">
  import CategoryBar from "$lib/components/CategoryBar.svelte";
  import FeedList from "$lib/components/FeedList.svelte";
  import Seo from "$lib/components/Seo.svelte";

  let { data } = $props();
</script>

<Seo title="최신" description="제보된 AI 슬롭 사례를 올라온 순서대로 봅니다." />
<CategoryBar />
<FeedList items={data.items} />
