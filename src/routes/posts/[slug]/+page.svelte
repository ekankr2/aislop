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
    VOTE_MIN,
  } from "$lib/core/taxonomy";
  import { relative } from "$lib/core/time";

  let { data, form } = $props();

  const p = $derived(data.post);
  const op = $derived(opinion(p.voteSlopCount, p.voteOkCount));
  const shareUrl = $derived(`https://aislop.kr/posts/${p.slug}`);
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
        {#if data.author.username}
          <a href="/users/{data.author.username}">{data.author.name}</a>
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

    {#if p.thumbUrl}
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
      <figure class="my-3 space-y-2">
        {#each shots as e (e.id)}
          <img src={e.url} alt={e.description} loading="lazy"
            class="w-full border border-line-strong" />
        {/each}
        <figcaption class="meta">
          글에 올라온 이미지. 원문이 지워져도 남는다.
        </figcaption>
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
  <div class="my-4 border-y-2 border-line py-3">
    <p class="text-[1rem] font-bold">이거 슬롭인가</p>
    {#if data.user && !data.user.blocked}
      <form method="POST" action="/api/vote" class="mt-2 flex flex-wrap gap-2">
        <input type="hidden" name="slug" value={p.slug} />
        <input type="hidden" name="next" value={page.url.pathname} />
        <button type="submit" name="choice" value="slop"
          class="btn btn-lg {data.myVote === 'slop' ? 'btn-primary' : ''}"
          >슬롭이다{#if op} {p.voteSlopCount}{/if}</button>
        <button type="submit" name="choice" value="ok"
          class="btn btn-lg {data.myVote === 'ok' ? 'btn-primary' : ''}"
          >괜찮다{#if op} {p.voteOkCount}{/if}</button>
      </form>
      <p class="meta mt-1.5">
        {#if data.myVote}같은 걸 다시 누르면 취소, 반대쪽을 누르면 바뀜.
        {:else}한 사람 한 표.{/if}
      </p>
    {:else}
      <p class="mt-2"><a href="/login?next={encodeURIComponent(page.url.pathname)}" class="btn btn-lg">로그인하고 투표</a></p>
    {/if}
    <p class="meta mt-1.5">
      {#if op}지금까지 {op.total}명이 투표했고 {op.slopPct}%가 슬롭이라고 봤다.
      {:else}표가 {VOTE_MIN}개 모이면 여론을 보여준다.{/if}
    </p>
  </div>

  {#each data.responses as r (r.id)}
    <div class="box my-3">
      <p class="bar">당사자 답변 — {r.submitterName} ({r.submitterRole})</p>
      <p class="px-3 py-2 text-[0.9375rem] leading-relaxed whitespace-pre-wrap">{r.body}</p>
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

  <p class="meta mt-3">
    공유 <span class="select-all">{shareUrl}</span>
  </p>
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

<!-- 반론 창구. 접혀 있지만 항상 이 자리에 있다. -->
<section class="py-3">
  {#if form?.message}
    <p class="mb-2 border border-ink px-2.5 py-1.5 text-[0.9375rem]">{form.message}</p>
  {/if}

  <!-- ⚠️ 세 창구를 `<details>` 하나로 묶었다(2026-09-09 유저 지시). 접혀 있을 때
       줄이 셋이면 본문 끝이 안내문으로 어수선해진다.
       ⚠️ 셋 중 하나도 없애지 마라 — 글이 사전 검토 없이 바로 게시되므로 이게
          유일한 방어선이다. 그리고 셋 다 **비로그인**이다. 가입을 요구하면
          판정당한 쪽이 못 쓰고, 그러면 반론 기회를 줬다는 말이 성립하지 않는다. -->
  <details>
    <summary class="cursor-pointer text-[0.9375rem] text-ink-2">
      이 글에 이의가 있으면
    </summary>

    <div class="mt-2 space-y-4 border-l-2 border-line pl-3">
      <form method="POST" action="?/companyResponse" use:enhance class="space-y-1.5">
        <p class="text-[0.9375rem] font-bold">당사자 답변</p>
        <p class="meta">관계 확인 후 이 글에 나란히 게시됨. 기존 기록은 안 지움.</p>
        <div class="grid gap-1.5 sm:grid-cols-3">
          <input name="submitterName" required maxlength="60" placeholder="이름" />
          <input name="submitterEmail" type="email" required maxlength="200" placeholder="회사 이메일" />
          <input name="submitterRole" required maxlength="80" placeholder="직함·역할" />
        </div>
        <textarea name="body" required rows="4" maxlength="4000" placeholder="답변 내용" class="w-full"
        ></textarea>
        <button type="submit" class="btn">보내기</button>
      </form>

      <form method="POST" action="?/correction" use:enhance class="space-y-1.5">
        <p class="text-[0.9375rem] font-bold">사실관계 정정 요청</p>
        <p class="meta">수용·반려 모두 공개 기록에 남음.</p>
        <div class="grid gap-1.5 sm:grid-cols-2">
          <input name="requesterName" required maxlength="60" placeholder="이름" />
          <input name="requesterEmail" type="email" required maxlength="200" placeholder="이메일" />
        </div>
        <textarea name="claim" required rows="3" maxlength="3000" class="w-full"
          placeholder="무엇이 사실과 다른지, 맞는 내용은 무엇인지."></textarea>
        <input name="evidenceUrl" type="url" maxlength="2000" placeholder="근거 URL (선택)" class="w-full" />
        <button type="submit" class="btn">보내기</button>
      </form>

      <form method="POST" action="?/reportPost" use:enhance class="space-y-1.5">
        <p class="text-[0.9375rem] font-bold">신고</p>
        <p class="meta">명예훼손·개인정보·허위·스팸. 운영자가 확인 후 처리함.</p>
        <textarea name="reason" required rows="3" maxlength="1000" class="w-full"></textarea>
        <button type="submit" class="btn">신고</button>
      </form>
    </div>
  </details>
</section>
