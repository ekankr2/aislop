<script lang="ts">
  import { page } from "$app/state";
  import Seo from "$lib/components/Seo.svelte";

  // ⚠️ 서버 속사정을 화면에 내보내지 마라. SvelteKit 기본 화면은 처리 못 한 예외에
  //    "Internal Error"를 그대로 띄우는데, 그건 방문자에게 아무 정보도 아니면서
  //    사이트가 관리되지 않는다는 인상만 준다(2026-09-10 유저 지시).
  //    여기서는 **상태 코드별 한 줄**만 쓴다. 실제 사유는 `hooks.server.ts`의
  //    `handleError`가 서버 로그로만 남긴다.
  const COPY: Record<number, { title: string; body: string }> = {
    400: { title: "잘못된 요청", body: "주소나 입력값을 확인해라." },
    401: { title: "로그인 필요", body: "로그인하면 이어서 할 수 있다." },
    403: { title: "권한 없음", body: "이 작업을 할 수 있는 계정이 아니다." },
    404: { title: "없는 주소", body: "지워졌거나 주소가 잘못됐다." },
    429: { title: "요청이 잦음", body: "잠시 후 다시 시도." },
  };
  const fallback = {
    title: "문제 발생",
    body: "잠시 후 다시 시도. 계속 발생 시 제보",
  };
  // ⚠️ 창구 버튼은 **서버 잘못일 때만** 보여준다. 404·403까지 "알려달라"를 붙이면
  //    주소를 잘못 친 사람에게 신고를 권하는 꼴이 되고, 창구에 잡음이 쌓인다.
  const ours = $derived(page.status >= 500);
  const copy = $derived(COPY[page.status] ?? fallback);
</script>

<Seo title={copy.title} description={copy.body} noindex />

<div class="mx-auto max-w-md px-4 py-16">
  <p class="num text-[2.5rem] leading-none font-extrabold text-ink-3">{page.status}</p>
  <h1 class="mt-2 text-[1.5rem] font-extrabold">{copy.title}</h1>
  <p class="mt-2 text-[1rem] leading-relaxed text-ink-2">{copy.body}</p>
  <p class="mt-6 flex flex-wrap gap-2">
    <a href="/" class="btn">홈으로</a>
    {#if ours}
      <a href="/about#정정" class="btn">창구</a>
    {:else}
      <a href="/about" class="btn">운영 원칙</a>
    {/if}
  </p>
</div>
