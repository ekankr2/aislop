<script lang="ts">
  import { enhance } from "$app/forms";
  import { page } from "$app/state";
  import CommentThread from "$lib/components/CommentThread.svelte";
  import Judgment from "$lib/components/Judgment.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import { postJsonLd } from "$lib/core/jsonld";
  import Vote from "$lib/components/Vote.svelte";
  import {
    type AiStatus,
    CATEGORY_LABEL,
    type Category,
    EVIDENCE_TYPE_LABEL,
    type EvidenceType,
    POST_STATUS_LABEL,
    type PostStatus,
  } from "$lib/core/taxonomy";
  import { relative } from "$lib/core/time";

  let { data, form } = $props();

  const p = $derived(data.post);
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
      aiStatus: p.aiStatus as AiStatus,
      aiEvidence: p.aiEvidence,
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
    <Vote
      slug={p.slug}
      heat={p.voteSlopCount + p.voteOkCount + p.commentCount * 2}
      myVote={data.myVote}
      big
    />

    <div class="min-w-0 flex-1">
      <h1 class="text-[1.5rem] leading-snug font-bold">
        {p.title}
        {#if p.url}
          <span class="meta whitespace-nowrap">
            (<a href={p.url} rel="nofollow ugc noopener" target="_blank">{p.domain}</a>)
          </span>
        {/if}
        <Judgment
          aiStatus={p.aiStatus}
          verdict={p.verdict}
          voteSlopCount={p.voteSlopCount}
          voteOkCount={p.voteOkCount}
          full
        />
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
    <p>{p.summary}</p>

    {#if p.thumbUrl}
      <img src={p.thumbUrl} alt="" loading="lazy" class="my-2.5 max-h-[420px] border border-line" />
    {/if}

    {#if bullets(p.problems).length > 0}
      <ul class="my-2.5 list-disc space-y-0.5 pl-5">
        {#each bullets(p.problems) as b (b)}<li>{b}</li>{/each}
      </ul>
    {/if}

    {#if p.facts}<p class="my-2.5 whitespace-pre-wrap">{p.facts}</p>{/if}

    {#if p.aiEvidence}
      <p class="my-2.5 whitespace-pre-wrap">
        <b>AI 사용 근거.</b>
        {p.aiEvidence}
      </p>
    {/if}

    <!-- 우리가 R2에 올린 것만 이미지로 띄운다(`storageKey`). 외부 URL은 아래 목록에
         링크로만 남는다 — 이유는 schema.ts의 storageKey 주석. -->
    {#if shots.length > 0}
      <figure class="my-3 space-y-2">
        {#each shots as e (e.id)}
          <img src={e.url} alt={e.description} loading="lazy"
            class="w-full border border-line-strong" />
        {/each}
        <figcaption class="meta">
          제보·검토 과정에서 보존한 캡처. 원문이 지워져도 남는다.
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

  <!-- 운영자 판정만 시각적으로 떼어 놓는다. 사용자 의견과 섞이면 안 되는 유일한 블록이다.
       ⚠️ 좌측 액센트 바 + 틴트 배경(콜아웃)은 쓰지 마라 — AI가 뱉는 화면의 문법이다.
          옛 게시판의 캡션 달린 1px 박스로 떼어 놓는다. -->
  {#if p.verdictNote}
    <div class="box my-3">
      <p class="bar">운영자 판정</p>
      <div class="px-3 py-2">
        <p class="text-[0.9375rem] leading-relaxed whitespace-pre-wrap">{p.verdictNote}</p>
        <p class="meta mt-1">
          반응 수로 정해지지 않습니다. AI를 썼다는 이유만으로 Slop이 되지도 않습니다.
        </p>
      </div>
    </div>
  {/if}

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

  <details class="mb-1">
    <summary class="cursor-pointer text-[0.9375rem] text-ink-2">당사자 답변 보내기</summary>
    <form method="POST" action="?/companyResponse" use:enhance class="mt-2 space-y-1.5">
      <p class="meta">관계 확인 후 게시됩니다. 기존 기록은 삭제되지 않습니다.</p>
      <div class="grid gap-1.5 sm:grid-cols-3">
        <input name="submitterName" required maxlength="60" placeholder="이름" />
        <input name="submitterEmail" type="email" required maxlength="200" placeholder="회사 이메일" />
        <input name="submitterRole" required maxlength="80" placeholder="직함·역할" />
      </div>
      <textarea name="body" required rows="4" maxlength="4000" placeholder="답변 내용" class="w-full"
      ></textarea>
      <button type="submit" class="btn btn-primary">보내기</button>
    </form>
  </details>

  <details>
    <summary class="cursor-pointer text-[0.9375rem] text-ink-2">사실관계 정정 요청</summary>
    <form method="POST" action="?/correction" use:enhance class="mt-2 space-y-1.5">
      <div class="grid gap-1.5 sm:grid-cols-2">
        <input name="requesterName" required maxlength="60" placeholder="이름" />
        <input name="requesterEmail" type="email" required maxlength="200" placeholder="이메일" />
      </div>
      <textarea
        name="claim"
        required
        rows="3"
        maxlength="3000"
        placeholder="무엇이 사실과 다른지, 맞는 내용은 무엇인지."
        class="w-full"
      ></textarea>
      <input name="evidenceUrl" type="url" maxlength="2000" placeholder="근거 URL (선택)" class="w-full" />
      <button type="submit" class="btn btn-primary">보내기</button>
    </form>
  </details>
</section>
