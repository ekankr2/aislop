<script lang="ts">
  import { linkify } from "$lib/core/text";

  // 유저가 쓴 본문. 플레인 텍스트 + 자동 링크가 전부다(이유는 `core/text.ts`).
  let { text, class: klass = "" }: { text: string; class?: string } = $props();
  const segments = $derived(linkify(text));
</script>

<p class="whitespace-pre-wrap {klass}">{#each segments as s, i (i)}{#if s.href}<a
      href={s.href}
      rel="nofollow ugc noopener"
      target="_blank"
      class="break-all">{s.text}</a>{:else}{s.text}{/if}{/each}</p>
