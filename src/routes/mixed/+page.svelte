<script lang="ts">
  import CategoryBar from "$lib/components/CategoryBar.svelte";
  import FeedList from "$lib/components/FeedList.svelte";
  import Seo from "$lib/components/Seo.svelte";

  let { data } = $props();
</script>

<Seo title="애매" description="슬롭인지 아닌지 의견이 갈린 글." />
<CategoryBar counts={data.counts} />
<FeedList items={data.items} />
