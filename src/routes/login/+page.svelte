<script lang="ts">
  import Seo from "$lib/components/Seo.svelte";

  let { data, form } = $props();

  // 한 화면 두 단계다. 페이지를 나누지 않는 이유 = 코드를 받은 뒤 뒤로 가기를 누르면
  // 입력한 주소가 날아가고, 사용자는 어느 주소로 받았는지부터 다시 떠올려야 한다.
  const sent = $derived(form?.step === "otp");
  // 액션 응답에 실려 온 값이 우선이다 — 액션 주소(`?/send`)가 URL 쿼리를 날린다.
  const next = $derived(form?.next ?? data.next);
</script>

<Seo title="로그인" description="aislop.kr 로그인." noindex />

<div class="mx-auto max-w-sm px-4 py-12">
  <h1 class="text-[1.5rem] font-extrabold">로그인</h1>
  <p class="mt-2 text-[1rem] leading-relaxed text-ink-2">
    비밀번호 없는 OTP 로그인.
  </p>

  <!-- ⚠️ 재전송은 **에러 옆**이다(2026-09-09 유저 지시). 코드가 틀렸다고만 하고
       다음 수를 화면 아래쪽 링크로 미루면, 문구로 "다시 받으면 됨"을 설명해야 한다.
       버튼이 옆에 있으면 그 설명이 필요 없다 — 문구가 짧아진 이유가 이것이다.
       ⚠️ 그래서 아래 "코드 다시 받기"는 이 상자가 뜰 때 숨긴다. 같은 일을 하는
       버튼이 한 화면에 둘이면 어느 쪽이 진짜인지 모른다. -->
  {#if form?.message}
    <div
      class="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border border-hot bg-[#ffedd5] px-2.5 py-1.5 text-[0.9375rem] text-hot"
    >
      <span>{form.message}</span>
      {#if sent}
        <form method="POST" action="?/send">
          <input type="hidden" name="next" value={next} />
          <input type="hidden" name="email" value={form?.email} />
          <button type="submit" class="font-bold underline">재전송</button>
        </form>
      {/if}
    </div>
  {/if}

  {#if sent}
    <form method="POST" action="?/verify" class="mt-6">
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="email" value={form?.email} />
      <!-- ⚠️ 재발송 안내는 **누가 눌렀든 똑같이** 보여야 한다. 쿨다운에 걸렸을 때만
           문구를 바꾸면 그 주소가 가입돼 있는지가 새어 나간다(가입 안 된 주소는
           코드 행이 없어 늘 발송되고, 가입된 주소만 걸린다). 그래서 상태를 묻지
           않고 항상 같은 한 줄을 둔다. -->
      <p class="text-[0.9375rem] text-ink-3">
        <b class="text-ink-2">{form?.email}</b> 발송됨.<br />
        안 오면 스팸함 확인. 다시 받는 건 1분 뒤부터 됨.
      </p>
      <!-- inputmode·autocomplete는 장식이 아니다. 폰에서 숫자 키패드가 바로 뜨고,
           iOS·안드로이드가 메일의 코드를 자동으로 채워 넣는다. -->
      <input
        name="otp"
        inputmode="numeric"
        autocomplete="one-time-code"
        maxlength="6"
        required
        placeholder="000000"
        class="num mt-2 w-full text-center text-[1.4rem] tracking-[0.4em]"
      />
      <button type="submit" class="btn btn-primary btn-lg mt-3 w-full">로그인</button>
    </form>
    {#if !form?.message}
      <form method="POST" action="?/send" class="mt-2">
        <input type="hidden" name="next" value={next} />
        <input type="hidden" name="email" value={form?.email} />
        <button type="submit" class="meta underline">코드 다시 받기</button>
      </form>
    {/if}
  {:else}
    <form method="POST" action="?/send" class="mt-6">
      <input type="hidden" name="next" value={next} />
      <input
        name="email"
        type="email"
        autocomplete="email"
        required
        placeholder="you@example.com"
        class="w-full"
      />
      <button type="submit" class="btn btn-primary btn-lg mt-3 w-full">코드 받기</button>
    </form>
  {/if}

  <p class="mt-6 text-[0.9375rem] leading-relaxed text-ink-3">
    로그인하면 <a href="/about" class="text-ink-2">운영 원칙</a>에 동의한 것으로 봄.<br />
    서비스를 비평하되 만든 사람은 건드리지 않음.
  </p>
</div>
