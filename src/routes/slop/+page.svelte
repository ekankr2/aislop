<script lang="ts">
  import CategoryBar from "$lib/components/CategoryBar.svelte";
  import FeedList from "$lib/components/FeedList.svelte";
  import Seo from "$lib/components/Seo.svelte";

  let { data } = $props();
</script>

<Seo title="슬롭" description="보는 사람들이 슬롭이라고 본 글." />
<CategoryBar />
<FeedList items={data.items} />
