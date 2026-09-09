<script lang="ts">
  import CategoryBar from "$lib/components/CategoryBar.svelte";
  import FeedList from "$lib/components/FeedList.svelte";
  import Seo from "$lib/components/Seo.svelte";

  let { data } = $props();
</script>

<Seo title="Not Slop" description="확인해 보니 문제 없었거나 제대로 쓴 사례." />
<CategoryBar />
<FeedList items={data.items} />
