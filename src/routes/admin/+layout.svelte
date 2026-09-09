<script lang="ts">
  import { page } from "$app/state";

  let { data, children } = $props();

  const nav = $derived([
    { href: "/admin", label: "검토 큐" },
    ...(data.role === "admin" ? [{ href: "/admin/users", label: "회원" }] : []),
  ]);
</script>

<svelte:head><meta name="robots" content="noindex, nofollow" /></svelte:head>

<h2 class="mt-3 mb-1.5 text-[1.5rem] font-bold">관리</h2>
<nav class="flex gap-1 border-b-2 border-line px-3 py-1.5">
  {#each nav as n (n.href)}
    <a href={n.href} class="btn {page.url.pathname === n.href ? 'btn-primary' : ''}">{n.label}</a>
  {/each}
</nav>

{@render children()}
