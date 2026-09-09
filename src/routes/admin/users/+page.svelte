<script lang="ts">
  import { enhance } from "$app/forms";
  import { ROLES } from "$lib/core/taxonomy";

  let { data, form } = $props();
  const input = "border border-line-strong bg-surface px-2 py-1 text-[0.875rem]";
</script>

<div class="px-4 py-4">
  {#if form?.message}
    <p class="mb-3 border border-ink px-3 py-2 text-[0.875rem]">{form.message}</p>
  {/if}

  <h2 class="mb-2 text-[1rem] font-bold">회원 <span class="text-ink-3">{data.users.length}</span></h2>
  <ul class="divide-y-2 divide-line border-y-2 border-line">
    {#each data.users as u (u.id)}
      <li class="flex flex-wrap items-center gap-2 py-2.5">
        <span class="min-w-40 text-[0.9375rem] font-semibold">{u.name}</span>
        <span class="text-[0.875rem] text-ink-3">{u.username ?? "-"}</span>

        <form method="POST" action="?/role" use:enhance class="flex gap-1">
          <input type="hidden" name="id" value={u.id} />
          <select name="role" class={input}>
            {#each ROLES as r (r)}<option value={r} selected={r === u.role}>{r}</option>{/each}
          </select>
          <button type="submit" class="btn">변경</button>
        </form>

        {#if u.blockedAt}
          <form method="POST" action="?/unblock" use:enhance class="flex items-center gap-1.5">
            <input type="hidden" name="id" value={u.id} />
            <span class="tag tag-solid"
              >차단됨: {u.blockedReason}</span
            >
            <button type="submit" class="btn">해제</button>
          </form>
        {:else}
          <form method="POST" action="?/block" use:enhance class="flex gap-1">
            <input type="hidden" name="id" value={u.id} />
            <input name="reason" required placeholder="차단 사유" class="{input} w-40" />
            <button type="submit" class="btn">차단</button>
          </form>
        {/if}
      </li>
    {/each}
  </ul>
</div>
