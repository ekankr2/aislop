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
      {@const verdict = side === "even" ? "박빙" : side === "slop" ? "슬롭" : "괜찮음"}
      {@const pct = op ? (side === "ok" ? 100 - op.slopPct : op.slopPct) : 0}
      <!-- ⚠️ 목록에 투표 버튼을 다시 넣지 마라(2026-09-09 유저 지시). 좌측 40px
           화살표 칼럼이 있었는데 걷어냈다 — ▲/▼는 "추천/비추천"으로 굳은 기호라
           "이 제보 잘 올렸다"로 ▲를 누르는 오조작이 반드시 생긴다. 여기 축은
           추천이 아니라 슬롭/괜찮다다.
           그리고 제목만 보고 찍는 표는 여론의 질을 떨어뜨린다 — 근거를 읽고 찍는
           게 이 제품의 전부라, 투표는 상세의 글자 버튼에서만 받는다.
           HN은 추천 하나뿐이라 목록 투표가 맞지만 우리는 두 방향이라 다르다. -->
      <li class="flex items-start gap-2.5 py-[0.55em]">
        <!-- 레딧 배치: 썸네일 → 여론 → 제목(2026-09-09 유저 지시).
             ⚠️ 여론 칸의 **정렬·간격·크기는 여기 유틸이 전부 갖는다**(2026-09-10 유저
                지시). `app.css`의 `.opinion`에 배치 속성을 되돌리지 마라 — 배치가 두
                곳으로 갈리면 어느 쪽이 이기는지 매번 따져야 한다.
             ⚠️ **제목 첫 줄에 맞춘다**(`items-start` + `pt-[4px]`, 2026-09-10 실측).
                `items-center`였는데 모바일에서 제목이 2~3줄로 접히면 블록 중앙이 첫 줄보다
                16~31px 아래로 내려가 왼쪽 숫자만 처져 보였다 — 제목이 길수록 더 벌어진다.
                눈은 숫자를 제목 블록이 아니라 **첫 줄**과 나란히 놓고 본다.
             ⚠️ 위아래 패딩은 이제 다르다. 아래 9px은 밑줄(`::after`) 자리라 못 줄이고,
                위 4px은 `b`(19.8px)의 중앙을 제목 첫 줄(27.5px) 중앙에 맞춘 값이다.
             ⚠️ 폭 56px(`w-14`)을 키우지 마라 — 목록을 훑는 눈이 제목보다 여기 먼저
                걸리면 순위표가 된다. -->
        {#if op}
          <!-- 색·타이포는 `app.css`의 `.opinion`에 있다. 배치는 위 유틸이 갖는다. -->
          <!-- 상세로 가는 링크다(2026-09-09 유저 지시). 목록에서 이 네모가 제목만큼
               큰 과녁이라, 눌러도 아무 일이 없으면 고장으로 읽힌다. -->
          <a
            href="/posts/{item.slug}"
            aria-label="{item.title} — 유저 {op.total}명 중 슬롭 {op.slopPct}%"
            title="유저 {op.total}명 중 슬롭 {op.slopPct}%"
            class="flex max-sm:hidden w-14 shrink-0 flex-col items-center gap-px pt-[4px] pb-[9px] opinion opinion-{side}"
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
            <b>{pct}%</b>
            <span>{verdict}</span>
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
            class="flex max-sm:hidden w-14 shrink-0 flex-col items-center gap-px pt-[4px] pb-[9px] opinion opinion-none"
          >
            <!-- ⚠️ 판정 문구를 넣지 마라(2026-09-10 유저 지시 — "중간 회색줄은
                 없애라"). 대신 **표 수라는 사실**만 적는다: 0표와 4표가 똑같이
                 비어 보이면 한 표가 판정을 연다는 걸 아무도 모른다.
                 ⚠️ 높이(36.2px)는 판정 칸의 두 줄을 그대로 베낀 값이다 — 숫자 19.8 +
                    간격 1 + 라벨 15.4. 안 맞추면 회색 밑줄만 다른 행보다 내려앉는다.
                 ⚠️ **표 수는 그 두 줄의 한가운데다**(2026-09-10 유저 지시 — "1표 저게 너무
                    밑에 있음" → 첫 줄로 올렸더니 "지금은 너무 높잖아, 중간이 없냐").
                    숫자 자리도 라벨 자리도 아닌 가운데다: 판정이 안 난 칸이라 어느
                    한 줄에 앉으면 그 줄의 값인 척한다. 두 줄 중 하나로 되돌리지 마라. -->
            <span
              class="opinion-pending flex h-[36.2px] items-center"
              aria-hidden={item.voteSlopCount + item.voteOkCount > 0 ? undefined : "true"}
            >
              {#if item.voteSlopCount + item.voteOkCount > 0}
                {item.voteSlopCount + item.voteOkCount}표
              {/if}
            </span>
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

          <!-- ⚠️ byline은 **칼럼이다**(2026-09-10 유저 지적 — "17시간전이랑 1일전 길이가
               달라서 그다음 것도 다르고, 해서 다 뒤틀려 있다" → "아직 댓글 위치는
               뒤죽박죽이다"). 흐르는 텍스트로 되돌리지 마라 — 앞 칸이 한 글자만 달라도
               뒤가 전부 밀려서 목록을 훑는 눈이 매 행 시작점을 새로 찾아야 한다.
               폭은 전부 실측 최댓값이다(390px 화면, byline 가용폭 342px):
                 시각 57px  = `23시간 전` 56.7px. **1~59분·1~23시간·1~6일·날짜를 전부
                              돌려서 나온 최댓값이다** — 54px이었다가 `17시간 전`(53.7px)이
                              하루 뒤 `18시간 전`이 되면서 두 줄로 접혔다. 숫자마다 폭이
                              다르니 눈에 보이는 값 하나로 재지 마라.
                              ⚠️ `whitespace-nowrap`은 안전장치다. 폭을 잘못 잡아도 줄이
                                 접히는 대신 칸을 밀고 나가서 바로 눈에 띈다.
                              ⚠️ 날짜 표기를 네 자리 연도로 되돌리면 76.9px이 돼 이 칸이
                                 20px 넓어진다(`core/time.ts`).
                 이름 97px  = 한글 8자 96.8px. **닉네임 상한 8자에 묶여 있다**
                              (`core/user.ts`) — 상한을 올리면 여기가 먼저 깨진다.
                 댓글 43px  = `댓글 12`. `min-w`라 세 자리가 되면 늘어난다.
                 판정        = 마지막이라 폭이 자유롭다. `괜찮음 100%` 76.9px가 최대고
                              57+6+97+6+43+6+77 = 292px로 342px 안에 든다.
               ⚠️ 칸 사이 `·`를 되살리지 마라. 칼럼이 이미 가르는데 점까지 찍으면 `1일 전`
                  뒤 공백에 점 하나가 붕 떠서 오타처럼 보인다. -->
          <p class="meta mt-0.5 flex items-baseline gap-x-1.5 leading-[20px]">
            <time class="w-[57px] shrink-0 whitespace-nowrap" datetime={item.publishedAt}
              >{relative(item.publishedAt ?? "")}</time
            >
            <!-- ⚠️ `truncate`는 로마자 8자 같은 넓은 글자만 걸린다 — 한글 8자는 96.8px로
                 온전히 들어간다. 이름이 잘리면 "누가 올렸나"라는 신뢰 신호가 깎이므로
                 폭을 더 줄이지 마라. -->
            <span class="w-[97px] shrink-0 truncate">
              {#if item.authorId}
                <a href="/users/{item.authorId}">{item.authorName}</a>
              {:else}{item.authorName}{/if}
            </span>
            <a href="/posts/{item.slug}#comments" class="min-w-[43px] shrink-0"
              >댓글 {item.commentCount}</a
            >
            <!-- ⚠️ 실제 표(`14:2`)를 여기 적지 마라 — 넣었다가 뺐다(2026-09-10 유저 지시
                 "피시에서 14:2 등 비율이 보이는데 저거 없애라"). 2026-09-09에 "반반이라고
                 하면 몇 대 몇인지 알 수가 없잖아"로 들어온 자리인데, 그 뒤 왼쪽 칸이
                 밑줄 색으로 기울기를 말하고 여기 `슬롭 88%`가 비율을 말하게 되면서
                 같은 정보를 세 번째로 적는 칸이 됐다.
                 ⚠️ `VOTE_MIN` 아래의 `N표`는 남는다. 그건 비율이 아니라 **아직 판정이
                    안 열렸다는 사실**이라 다른 정보다.
                 ⚠️ **모바일 판정은 여기다**(2026-09-10 유저 지시). 좁은 화면에서는 왼쪽
                    56px 칸을 통째로 빼고(`max-sm:hidden`) 판정을 byline 끝에 한 마디로
                    붙인다 — 표가 없는 글이 다수인 게 정상이라 칸을 남기면 매 행 빈
                    상자만 그려지고, 제목 시작선이 행마다 두 곳으로 갈린다.
                 ⚠️ **색을 뺐다가 되돌렸다**(2026-09-10 유저 지적 — "색깔이 없어서 그런가
                    구별이 안 되네"). 굵기만으로는 `슬롭 88%`와 `괜찮음 92%`가 같은 회색
                    줄에서 안 갈린다 — 데스크톱은 밑줄 색이 그 일을 하는데 여기는 밑줄이
                    없으니 색이 글자로 와야 한다. paper 대비 실측 sludge 6.85:1 ·
                    affirmative 4.99:1로 둘 다 AA(4.5) 통과다.
                 ⚠️ 박빙만 `text-ink`다. 한쪽으로 안 기운 게 그 판정의 내용이라 갈색도
                    이끼색도 거짓이 된다. 굵기가 회색 byline과 갈라 준다. -->
            {#if op}
              <b
                class="sm:hidden text-[1rem] font-bold tabular-nums {side === 'slop'
                  ? 'text-sludge'
                  : side === 'ok'
                    ? 'text-affirmative'
                    : 'text-ink'}">{verdict} {pct}%</b
              >
            {:else if item.voteSlopCount + item.voteOkCount > 0}
              <span class="sm:hidden">{item.voteSlopCount + item.voteOkCount}표</span>
            {/if}
          </p>
        </div>

      </li>
    {/each}
  </ol>
{/if}
