<script lang="ts">
  import type { FeedItem } from "$lib/core/feed";
  import {
    CATEGORY_LABEL,
    type Category,
    lean,
    opinion,
  } from "$lib/core/taxonomy";
  import { relative } from "$lib/core/time";

  let { items }: { items: FeedItem[] } = $props();
</script>

<!-- ⚠️ 목록이 비어도 아무것도 안 그린다(2026-09-08 유저 지시). 빈 상태 문구를
     다시 넣지 마라 — "첫 제보를 기다립니다" 류는 사이트가 비었다는 걸 광고한다. -->
{#if items.length > 0}
  <!-- 원본(lobste.rs) 행 구조 그대로: 제목 (도메인) [태그] / byline 한 줄.
       ⚠️ 여기에 뭘 더 얹지 마라. 요약문·분류·시연표시를 되살리면 행이 다시 네 줄이 된다.
          분류는 위 필터에 있고, 시연 표시는 상단 배너 한 줄로 처리한다. -->
  <ol class="pt-5 pb-1">
    {#each items as item (item.slug)}
      {@const op = opinion(item.voteSlopCount, item.voteOkCount)}
      {@const side = op ? lean(op.slopPct) : null}
      <!-- ⚠️ 목록에 투표 버튼을 다시 넣지 마라(2026-09-09 유저 지시). 좌측 40px
           화살표 칼럼이 있었는데 걷어냈다 — ▲/▼는 "추천/비추천"으로 굳은 기호라
           "이 제보 잘 올렸다"로 ▲를 누르는 오조작이 반드시 생긴다. 여기 축은
           추천이 아니라 슬롭/괜찮다다.
           그리고 제목만 보고 찍는 표는 여론의 질을 떨어뜨린다 — 근거를 읽고 찍는
           게 이 제품의 전부라, 투표는 상세의 글자 버튼에서만 받는다.
           HN은 추천 하나뿐이라 목록 투표가 맞지만 우리는 두 방향이라 다르다. -->
      <li class="flex items-center gap-2.5 py-[0.55em]">
        <!-- 레딧 배치: 썸네일 → 여론 → 제목(2026-09-09 유저 지시).
             ⚠️ 여론 블록은 **썸네일과 같은 56px 정사각형**이다. 크기를 키우지 마라 —
                목록을 훑는 눈이 제목보다 여기 먼저 걸리면 순위표가 된다.
             ⚠️ 썸네일 안에 %를 겹쳐 넣지 마라(유저 지시). 두 블록은 나란히 선다. -->
        {#if op}
          <!-- ⚠️ 크기·색은 `app.css`의 `.opinion`에 있다. Tailwind 유틸로 키우려
               하지 마라 — 레이어 밖 CSS라 유틸이 진다. -->
          <!-- 상세로 가는 링크다(2026-09-09 유저 지시). 목록에서 이 네모가 제목만큼
               큰 과녁이라, 눌러도 아무 일이 없으면 고장으로 읽힌다. -->
          <a
            href="/posts/{item.slug}"
            aria-label="{item.title} — 유저 {op.total}명 중 슬롭 {op.slopPct}%"
            title="유저 {op.total}명 중 슬롭 {op.slopPct}%"
            class="opinion opinion-{side}"
          >
            <!-- 숫자는 **라벨이 가리키는 쪽의 비율**이다. 박빙일 땐 슬롭 비율을
                 쓴다(45~55 구간이라 어느 쪽으로 읽어도 반반이다). -->
            <!-- ⚠️ 라벨은 **한글 명사형 셋**이다: `슬롭` · `박빙` · `괜찮음`.
                 `slop`(로마자)과 `정상`이었는데 둘 다 갈아치웠다(2026-09-10):
                 · `slop`은 이 사이트에서 유일하게 로마자로 적힌 UI 글자였다 —
                   `박빙`·`괜찮음`과 나란히 서면 글자 높이부터 달라 한 벌로 안 읽힌다.
                 · `정상`은 반대편을 **비정상**으로 만든다. 이 사이트는 "AI를 썼다고
                   다 슬롭은 아니다"가 전제고 푸터가 "만든 사람을 공격하지 않는다"라
                   적혀 있다 — 표의 반대쪽 이름이 그걸 뒤집으면 안 된다.
                 ⚠️ 투표 버튼(`슬롭이다`/`괜찮다`)과 **같은 낱말을 쓴다**. 던진 표와
                    돌아온 라벨이 다른 말이면 자기가 뭘 눌렀는지 되짚어야 한다. -->
            <b>{side === "ok" ? 100 - op.slopPct : op.slopPct}%</b>
            <span>{side === "even" ? "박빙" : side === "slop" ? "슬롭" : "괜찮음"}</span>
          </a>
        {:else}
          <!-- 아직 표가 없는 글. ⚠️ 빈 칸으로 두지 마라(2026-09-09 유저 지적 —
               "왼쪽에 아무것도 안 보이자나"). 표가 모자란 글이 다수인 게 정상
               상태라, 그 상태가 화면에서는 고장으로 읽힌다.
               ⚠️ 여기에 점수·예측·"검토중" 같은 걸 넣지 마라. 아직 아무 표도
                  없다는 사실 그대로만 적는다. 눌러서 상세로 가는 게 이 칸의 일이다. -->
          <a
            href="/posts/{item.slug}"
            aria-label="{item.title} — 아직 표 없음"
            title="아직 표 없음"
            class="opinion opinion-none"
          >
            <!-- ⚠️ 판정 문구를 넣지 마라(2026-09-10 유저 지시 — "중간 회색줄은
                 없애라"). 대신 **표 수라는 사실**만 적는다: 0표와 4표가 똑같이
                 비어 보이면 한 표가 판정을 연다는 걸 아무도 모른다.
                 ⚠️ 높이는 항상 두 줄이다 — 무너지면 회색 줄이 다른 행보다 올라붙어
                    왼쪽 칼럼의 줄 정렬이 깨진다. -->
            <b aria-hidden="true">&nbsp;</b>
            {#if item.voteSlopCount + item.voteOkCount > 0}
              <span class="opinion-pending"
                >{item.voteSlopCount + item.voteOkCount}표</span
              >
            {:else}
              <span aria-hidden="true">&nbsp;</span>
            {/if}
          </a>
        {/if}

        <div class="min-w-0 flex-1">
          <p class="text-[1.25rem] leading-snug">
            <a href="/posts/{item.slug}" class="font-bold">{item.title}</a>
            {#if item.domain}
              <span class="meta whitespace-nowrap">
                (<a href={item.url} rel="nofollow ugc noopener" target="_blank">{item.domain}</a>)
              </span>
            {/if}
            <!-- ⚠️ 분류 태그는 제목 줄에 둔다(2026-09-09 유저 지시 — "목록에서 글
                 태그 보이게"). byline으로 내리면 시각·아이디·댓글과 섞여 안 읽힌다. -->
            <span class="meta">·</span>
            <a href="/?category={item.category}" class="cat"
              >{CATEGORY_LABEL[item.category as Category]}</a
            >
          </p>

          <p class="meta mt-0.5">
            <time datetime={item.publishedAt}>{relative(item.publishedAt ?? "")}</time>
            ·
            {#if item.authorId}
              <a href="/users/{item.authorId}">{item.authorName}</a>
            {:else}{item.authorName}{/if}
            ·
            <a href="/posts/{item.slug}#comments">댓글 {item.commentCount}</a>
            <!-- ⚠️ 실제 표를 여기 적는다(2026-09-09 유저 지적 — "반반이라고 하면
                 몇 대 몇인지 알 수가 없잖아"). 네모 안에 우겨넣지 마라 — 56px에
                 네 숫자가 들어가면 뭉개진다.
                 ⚠️ 여기는 `VOTE_MIN` 아래에서도 보여준다. 비율은 표본이 적으면
                    정밀한 척을 하지만 **표 수는 그냥 사실**이다. -->
            {#if op}
              · <span title="슬롭 {item.voteSlopCount} : 괜찮음 {item.voteOkCount}"
                >{item.voteSlopCount}:{item.voteOkCount}</span
              >
            {/if}
          </p>
        </div>

      </li>
    {/each}
  </ol>
{/if}
