<script lang="ts">
  import Body from "$lib/components/Body.svelte";
  import { enhance } from "$app/forms";
  import { page } from "$app/state";
  import CommentThread from "$lib/components/CommentThread.svelte";
  import Judgment from "$lib/components/Judgment.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import { postJsonLd } from "$lib/core/jsonld";
  import {
    CATEGORY_LABEL,
    type Category,
    EVIDENCE_TYPE_LABEL,
    type EvidenceType,
    opinion,
    POST_STATUS_LABEL,
    type PostStatus,
  } from "$lib/core/taxonomy";
  import { relative } from "$lib/core/time";

  let { data, form } = $props();

  const p = $derived(data.post);
  const op = $derived(opinion(p.voteSlopCount, p.voteOkCount));
  const bullets = (s: string | null) =>
    (s ?? "")
      .split("\n")
      .map((l) => l.replace(/^[-·*]\s*/, "").trim())
      .filter(Boolean);

  const indexable = $derived(p.status === "published" || p.status === "corrected");
  // 이미지로 띄울 것과 링크로 남길 것을 가른다.
  const shots = $derived(data.evidences.filter((e) => e.storageKey && e.url));
  const links = $derived(data.evidences.filter((e) => !e.storageKey));
  // ⚠️ `<`를 이스케이프한다. 제목·요약은 사용자 입력이라 닫는 script 태그가 섞이면
  //    JSON-LD 블록이 거기서 끊기고 뒤가 마크업으로 파싱된다(XSS).
  //    (이 주석에도 그 태그를 그대로 적지 마라 — svelte 파서가 여기서 script를 닫는다.)
  const jsonLd = $derived(
    postJsonLd({
      slug: p.slug,
      title: p.title,
      summary: p.summary,
      url: p.url,
      publishedAt: p.publishedAt,
      updatedAt: p.updatedAt,
      authorName: data.author.name,
      indexable,
    }),
  );
  const jsonLdText = $derived(JSON.stringify(jsonLd).replaceAll("<", "\\u003c"));
</script>

<Seo title={p.title} description={p.summary} type="article" noindex={!indexable} />
<svelte:head>
  {#if jsonLd.length > 0}
    {@html `<script type="application/ld+json">${jsonLdText}<\/script>`}
  {/if}
</svelte:head>

<article class="py-3">
  <!-- 상단은 피드 행과 **같은 모양**이다(lobste.rs 댓글 페이지 방식) — 목록에서 넘어온
       사람이 같은 줄을 다시 보고 자기가 뭘 눌렀는지 확인한다.
       ⚠️ 제목은 우리 페이지고 원문은 괄호 안 도메인이다. 뒤집지 마라 —
          원문은 지워지고(그래서 archiveUrl이 있다) 목격담은 원문이 아예 없기도 하다. -->
  <div class="flex gap-2.5">
    <div class="min-w-0 flex-1">
      <h1 class="text-[1.5rem] leading-snug font-bold">
        {p.title}
        {#if p.url}
          <span class="meta whitespace-nowrap">
            (<a href={p.url} rel="nofollow ugc noopener" target="_blank">{p.domain}</a>)
          </span>
        {/if}
        <Judgment voteSlopCount={p.voteSlopCount} voteOkCount={p.voteOkCount} />
        <a href="/?category={p.category}" class="tag">{CATEGORY_LABEL[p.category as Category]}</a>
        {#if p.status !== "published"}
          <span class="tag tag-negative">{POST_STATUS_LABEL[p.status as PostStatus]}</span>
        {/if}
      </h1>

      <p class="meta mt-1">
        <time datetime={p.publishedAt ?? p.createdAt}>{relative(p.publishedAt ?? p.createdAt)}</time>
        ·
        {#if data.author.id}
          <a href="/users/{data.author.id}">{data.author.name}</a>
        {:else}{data.author.name}{/if}
        {#if p.archiveUrl}
          · <a href={p.archiveUrl} rel="noopener" target="_blank">아카이브</a>
        {/if}
        {#if p.firsthand}· 직접 경험{/if}
        {#if p.submitterAffiliated}· <span class="font-bold text-ink">당사자 관계자 제보</span>{/if}
      </p>
    </div>
  </div>

  <div class="prose mt-3 text-[1rem] leading-[1.75]">
    <!-- 본문. `summary`는 검색결과·공유 카드용 한 줄이라 화면에서는 본문이 이긴다
         (본문 앞부분을 잘라 만든 값이라 같이 띄우면 첫 줄이 두 번 나온다).
         검토 전 제보에는 본문이 있고, 운영자가 정리한 뒤에는 요약만 남기도 한다. -->
    {#if p.submitReason}<Body text={p.submitReason} />{:else}<p>{p.summary}</p>{/if}

    <!-- 업로드 첫 장은 목록 썸네일이면서 근거 이미지이기도 하다(submit/+page.server.ts).
         아래 `shots`가 같은 URL을 다시 그리므로 여기서는 겹치지 않을 때만 띄운다
         — 운영자가 손으로 붙인 썸네일만 남는다. -->
    {#if p.thumbUrl && !shots.some((e) => e.url === p.thumbUrl)}
      <img src={p.thumbUrl} alt="" loading="lazy" class="my-2.5 max-h-[420px] border border-line" />
    {/if}

    {#if bullets(p.problems).length > 0}
      <ul class="my-2.5 list-disc space-y-0.5 pl-5">
        {#each bullets(p.problems) as b (b)}<li>{b}</li>{/each}
      </ul>
    {/if}

    {#if p.facts}<p class="my-2.5 whitespace-pre-wrap">{p.facts}</p>{/if}

    <!-- 우리가 R2에 올린 것만 이미지로 띄운다(`storageKey`). 외부 URL은 아래 목록에
         링크로만 남는다 — 이유는 schema.ts의 storageKey 주석. -->
    {#if shots.length > 0}
      <!-- ⚠️ 높이를 묶는다(2026-09-10 퍼널 점검). 안 묶으면 근거 이미지가 본문을
           통째로 밀어내고 **이 글의 투표 버튼이 두 화면 아래**로 내려간다
           (모바일 실측: 이미지 601+612px, 투표까지 1,968px = 2.3화면).
           근거는 잘리면 안 되므로 잘라내지 않고 `object-contain`으로 줄이고,
           원본은 눌러서 새 탭에서 본다.
           ⚠️ 값은 위 `thumbUrl`·아래 당사자 답변 이미지와 **같은 420px**이다.
              한 화면 안에 세 종류 이미지가 다른 높이로 서면 근거의 무게가 달라 보인다. -->
      <figure class="my-3 space-y-2">
        {#each shots as e (e.id)}
          <a href={e.url} rel="noopener" target="_blank">
            <img src={e.url} alt={e.description} loading="lazy"
              class="max-h-[420px] w-full border border-line-strong object-contain" />
          </a>
        {/each}
      </figure>
    {/if}

    {#if links.length > 0}
      <ul class="my-2.5 text-[0.9375rem]">
        {#each links as e (e.id)}
          <li class="py-0.5">
            · <b>{EVIDENCE_TYPE_LABEL[e.type as EvidenceType]}</b> — {e.description}
            {#if e.url}
              <a href={e.url} rel="nofollow ugc noopener" target="_blank" class="break-all">{e.url}</a>
            {/if}
            <span class="meta">
              {#if e.capturedAt}{e.capturedAt.slice(0, 10)} 확인{/if}
              {#if e.verifyStatus !== "verified"}· 검증 전{/if}
            </span>
          </li>
        {/each}
      </ul>
    {/if}
  </div>


  <!-- ⚠️ 투표는 **글 밑에 라벨 붙은 버튼**이다(2026-09-09 유저 지시 — "투표라는 말이
       없고 숫자밖에 없어서 UX가 구리다"). 상세에서 좌측 화살표 칼럼을 대신한다 —
       한 화면에 같은 투표 장치가 둘이면 어느 쪽이 진짜인지 모른다. 목록은 화살표 그대로.
       ⚠️ 여기가 이 사이트의 유일한 판단 장치다. 작게 만들지 마라.
       ⚠️ 색을 넣지 마라. 누른 쪽은 채움(검정)으로 표시한다. -->
  <!-- 이 사이트의 유일한 판단 장치다. 가운데 정렬 + 넉넉한 여백으로 본문과
       댓글 사이에서 혼자 서게 한다(2026-09-09 유저 지시). -->
  <!-- ⚠️ `id="vote"`를 지우지 마라. 로그인 링크의 `next`가 이 앵커를 물고 간다
       (login/+page.server.ts의 safeNext가 프래그먼트를 살린다). -->
  <div id="vote" class="my-8 flex flex-col items-center py-5">
    {#if data.user && !data.user.blocked}
      <!-- ⚠️ `use:enhance`는 점진적 향상이다 — JS가 없으면 평범한 폼 POST로 떨어져
           그대로 동작한다. 붙인 이유는 **전체 새로고침을 없애기 위해서**다
           (2026-09-10 유저 지적 — "추천 누르면 페이지 리프레시된다").
           ⚠️ 기본 동작(applyAction + invalidateAll)에 기대라. 표 수를 화면에서
              손으로 더하지 마라 — 취소·갈아타기까지 세 갈래를 화면이 다시 계산하게
              되고, 서버가 이미 답을 갖고 있다. -->
      <form method="POST" action="?/vote" use:enhance class="flex flex-wrap justify-center gap-2">
        <button type="submit" name="choice" value="slop"
          class="btn btn-lg btn-vote btn-slop {data.myVote === 'slop' ? 'btn-primary' : ''}"
          >슬롭이다<span class="ml-2 font-normal">{p.voteSlopCount}</span></button>
        <button type="submit" name="choice" value="ok"
          class="btn btn-lg btn-vote {data.myVote === 'ok' ? 'btn-primary' : ''}"
          >괜찮다<span class="ml-2 font-normal">{p.voteOkCount}</span></button>
      </form>
    {:else if data.user}
      <!-- 쓰기가 막힌 계정. 표가 어떻게 갈렸는지는 보여 주되 누를 수는 없다.
           (막혔다는 안내는 헤더 아래 띠가 이미 하고 있다 — 여기서 또 말하지 마라.) -->
      <div class="flex flex-wrap justify-center gap-2 opacity-50">
        <span class="btn btn-lg btn-vote btn-slop"
          >슬롭이다<span class="ml-2 font-normal">{p.voteSlopCount}</span></span>
        <span class="btn btn-lg btn-vote"
          >괜찮다<span class="ml-2 font-normal">{p.voteOkCount}</span></span>
      </div>
    {:else}
      <!-- ⚠️ 비로그인에게도 **버튼 두 개를 그대로 보여준다**(2026-09-10 퍼널 점검).
           전에는 `로그인하고 투표` 한 덩어리였는데, 그러면 처음 온 사람은 고를 게
           뭔지(슬롭이다/괜찮다) 모르는 채로 로그인을 결심해야 한다 — 순서가 거꾸로다.
           누르면 로그인으로 보내고 `#vote`로 이 자리에 되돌린다.
           ⚠️ 모양을 로그인 상태와 다르게 만들지 마라. 다르면 이게 진짜 투표
              장치라는 걸 못 알아본다. 바뀌는 건 목적지뿐이다. -->
      {@const back = `/login?next=${encodeURIComponent(`${page.url.pathname}#vote`)}`}
      <div class="flex flex-wrap justify-center gap-2">
        <a href={back} class="btn btn-lg btn-vote btn-slop"
          >슬롭이다<span class="ml-2 font-normal">{p.voteSlopCount}</span></a>
        <a href={back} class="btn btn-lg btn-vote"
          >괜찮다<span class="ml-2 font-normal">{p.voteOkCount}</span></a>
      </div>
      <p class="meta mt-2.5">누르면 로그인. 메일 주소만 있으면 됨</p>
    {/if}
  </div>

  {#each data.responses as r (r.id)}
    <div class="box my-3">
      <p class="bar">당사자 답변 — {r.submitterName} ({r.submitterRole})</p>
      <p class="px-3 py-2 text-[0.9375rem] leading-relaxed whitespace-pre-wrap">{r.body}</p>
      {#if r.imageUrl}
        <img src={r.imageUrl} alt="당사자가 올린 이미지" loading="lazy"
          class="mx-3 mb-3 max-h-[420px] border border-line" />
      {/if}
    </div>
  {/each}

  {#if data.corrections.length > 0}
    <div class="my-3 text-[0.9375rem]">
      <p class="text-[0.9375rem] font-bold">정정 기록</p>
      {#each data.corrections as c (c.id)}
        <p class="py-0.5">
          · <span class="meta">{c.resolvedAt?.slice(0, 10)} {c.status === "accepted" ? "수용" : "반려"}</span>
          {c.resolution ?? c.claim}
        </p>
      {/each}
    </div>
  {/if}
</article>


<CommentThread comments={data.comments} viewerId={page.data.user?.id ?? null} />

{#if data.related.length > 0}
  <section class="border-b-2 border-line px-3 py-2">
    <p class="meta mb-1">같은 분류의 다른 사례</p>
    <ul class="text-[0.9375rem]">
      {#each data.related as r (r.slug)}
        <li class="truncate py-0.5">· <a href="/posts/{r.slug}">{r.title}</a></li>
      {/each}
    </ul>
  </section>
{/if}

<!-- 사후 창구. 글이 사전 검토 없이 바로 게시되므로 이게 유일한 방어선이다.
     ⚠️ 셋 중 하나도 없애지 마라 — 글 신고 · 정정 요청 · 당사자 답변.
     ⚠️ 전부 **비로그인**이다. 가입을 요구하면 판정당한 쪽이 못 쓰고,
        그러면 반론 기회를 줬다는 말이 성립하지 않는다(형법 310조 방어선).
     ⚠️ "이 글에 이의가 있으면" 우산 메뉴로 다시 묶지 마라(2026-09-09 유저 지시).
        라벨이 뭘 여는지 말을 안 해서 접힌 상태에서는 정체 불명의 줄 하나였다.
        당사자용 폼 둘은 `/posts/[slug]/reply`로 뺐다 — 판정 글을 읽으러 온 사람에겐
        잡음이고, 정작 쓸 사람(업체)은 본문 끝까지 안 내려온다. -->
<section class="flex flex-wrap items-center gap-2 py-3">
  {#if form?.message}
    <p class="w-full border border-ink px-2.5 py-1.5 text-[0.9375rem]">{form.message}</p>
  {/if}

  <details>
    <summary class="btn cursor-pointer">신고</summary>
    <form method="POST" action="?/reportPost" use:enhance class="mt-2 space-y-1.5">
      <p class="meta">명예훼손·개인정보·허위·스팸. 운영자가 확인 후 처리함.</p>
      <textarea name="reason" required rows="3" maxlength="1000" class="w-full"
        placeholder="어디가 문제인지 입력"></textarea>
      <button type="submit" class="btn">보내기</button>
    </form>
  </details>

  <a href="/posts/{p.slug}/reply" class="btn">당사자 답변·사실관계 정정 요청</a>
</section>
