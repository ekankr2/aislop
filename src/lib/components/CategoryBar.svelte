<script lang="ts">
  import { page } from "$app/state";
  import { CATEGORIES, OPINION_FILTERS } from "$lib/core/taxonomy";

  // 분류는 별도 페이지로 만들지 않고 목록 위에 얹는 필터다.
  // ⚠️ 알약 아홉 개를 늘어놓지 마라 — 목록보다 필터가 무거워진다. 평문 링크로 둔다.
  const current = $derived(page.url.searchParams.get("category"));
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
  <!-- 여론별 목록. 헤더 탭에서 내려온 것이다 — 탭은 "어느 목록"이고 여기는 "어떤 것만"이다.
       ⚠️ 마지막 `AI 확인`은 축이 다르다(사실 vs 여론). 구분자로 떼어 놓은 이유다 —
          같이 붙여 두면 "검증을 통과했다"처럼 품질로 읽힌다. -->
  {#each OPINION_FILTERS as v, i (v.href)}
    {@const on = page.url.pathname === v.href}
    {#if i === OPINION_FILTERS.length - 1}
      <span aria-hidden="true" class="text-line-strong">|</span>
    {/if}
    <a href={v.href} aria-current={on ? "page" : undefined} class="navlink">{v.label}</a>
  {/each}
  <span aria-hidden="true" class="text-line-strong">|</span>
  <a href={href()} aria-current={current ? undefined : "page"} class="navlink">전체</a>
  {#each CATEGORIES as c (c.slug)}
    <a
      href={href(c.slug)}
      aria-current={current === c.slug ? "page" : undefined}
      class="navlink">{c.name}</a
    >
  {/each}
</nav>
