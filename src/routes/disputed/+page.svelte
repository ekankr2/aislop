<script lang="ts">
  import CategoryBar from "$lib/components/CategoryBar.svelte";
  import FeedList from "$lib/components/FeedList.svelte";
  import Seo from "$lib/components/Seo.svelte";

  let { data } = $props();
</script>

<Seo title="논쟁 중" description="근거가 엇갈려 판단을 보류한 사례." />
<CategoryBar />
<FeedList items={data.items} />
