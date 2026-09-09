<script lang="ts">
  import { page } from "$app/state";
  import { CATEGORIES } from "$lib/core/taxonomy";

  // 분류는 별도 페이지로 만들지 않고 목록 위에 얹는 필터다.
  // ⚠️ 알약 아홉 개를 늘어놓지 마라 — 목록보다 필터가 무거워진다. 평문 링크로 둔다.
  let { counts }: { counts?: Record<string, number> } = $props();
  const current = $derived(page.url.searchParams.get("category"));
  // 0건인 분류는 안 그린다(2026-09-09 유저 지시). ⚠️ 지금 보고 있는 분류는 0건이어도
  //    남긴다 — 마지막 글이 내려간 순간 필터가 사라지면 "내가 뭘 눌렀지"가 된다.
  const shown = $derived(
    CATEGORIES.filter(
      (c) => !counts || (counts[c.slug] ?? 0) > 0 || current === c.slug,
    ),
  );
  const href = (slug?: string) => {
    const u = new URL(page.url);
    if (slug) u.searchParams.set("category", slug);
    else u.searchParams.delete("category");
    return u.pathname + u.search;
  };
</script>

<!-- ⚠️ 간격은 헤더 메뉴(28px)보다 좁은 16px다. 여기는 항목이 열두 개라 같은 값을 주면
     두 줄로 접히고, 그러면 "어느 목록"과 "어떤 것만"이 세로로 섞여 읽힌다. -->
<nav aria-label="목록 필터" class="meta flex flex-wrap items-center gap-x-4 gap-y-1.5 py-3">
  <a href={href()} aria-current={current ? undefined : "page"} class="navlink">전체</a>
  {#each shown as c (c.slug)}
    <a
      href={href(c.slug)}
      aria-current={current === c.slug ? "page" : undefined}
      class="navlink">{c.name}</a
    >
  {/each}
</nav>
