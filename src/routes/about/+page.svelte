<script lang="ts">
  import Seo from "$lib/components/Seo.svelte";
  import {
    AI_STATUSES,
    AI_STATUS_HINT,
    AI_STATUS_LABEL,
    CATEGORIES,
  } from "$lib/core/taxonomy";

  let { data } = $props();
</script>

<Seo
  title="소개·원칙·정정"
  description="여기가 무엇을 모으고, 슬롭인지 아닌지를 누가 어떻게 정하는지, 정정을 어떻게 처리하는지."
/>

<!-- ⚠️ 문서 페이지는 제목까지 `.prose` 안에 넣고 `mx-auto`로 가운데 놓는다.
     헤더는 1216px인데 산문만 720px로 왼쪽에 붙으면 오른쪽 절반이 빈 화면이 된다
     (2026-09-08, 컨테이너를 PH 폭으로 넓히면서 생긴 문제). 피드·상세는 좌측
     투표 칼럼이 기준선이라 왼쪽 정렬 그대로다 — 여기만 가운데다. -->
<div class="prose mx-auto">
<h1 class="mt-3 mb-1.5 text-[1.5rem] font-bold">소개·원칙·정정</h1>

<!-- 산문이라 `.prose`(45rem)로 좁힌다. 한때 컨테이너 폭(그때 60rem)에 그냥 맡겼는데
     오른쪽이 비어 보인다는 지적이 있었다 — 그건 컨테이너가 960px일 때 얘기고,
     PH 실측값 1216px로 넓힌 뒤로는 반대가 문제다. 한 줄 120자는 눈이 되돌아올
     자리를 잃는다. ⚠️ 컨테이너를 넓혔다고 여기를 같이 넓히지 마라. -->
<div class="py-3 text-[1rem] leading-relaxed">
<!-- ⚠️ 여기에 정의를 다시 풀어 쓰지 마라. 한때 /ai-slop 첫 문단을 그대로 복사해
     뒀는데, 두 페이지가 같은 예시 문장을 쓰면 구글이 유사문서로 보고 서로 순위를
     깎는다(2026-09-08). 정의는 /ai-slop 한 곳에서만 한다. -->
  <!-- ⚠️ 이 두 문단의 **순서를 바꾸지 마라**(2026-09-08 유저 지시). 사람을 부르는 건
       "지겹다"는 공감이고, 판정을 지탱하는 건 "공공의 이익"(#왜)이다. 둘은 자리가
       다르다 — 감정을 판정 근거 자리로 올리면 "AI 싫어하는 애들"이 되어 판정이
       통째로 의심받고, 반대로 동기를 빼면 소비자원 안내문이 되어 아무도 안 모인다.
       ⚠️ 여기에 "역겹다" 류를 쓰지 마라. 이 페이지는 판정당한 쪽이 캡처해서 인용하고
       기업 법무가 읽는 문서다. 그 감정은 홈과 사례 본문에서 쓴다. -->
  <p>
    양산형 쇼츠, 실물과 딴판인 음식 사진. 사람이 볼 이유가 없는 것들이 판을 치면서
    인터넷이 피곤해졌다.
  </p>
  <p class="mt-3">
    여기는 그 피로가 모이는 곳이다. 욕하고 흩어지는 대신 사례를 남기는 쪽이다.
    AI로 만든 것을 가져와 근거를 확인하고, <b><a href="/ai-slop">슬롭</a>인지 쓸모
    있는 것인지는 보는 사람들이 정한다.</b> 렉카 말고 고발 미디어 쪽이다.
  </p>
  <!-- ⚠️ 이 문단을 지우지 마라. 사이트가 "AI 탐지기 하나 더"로 읽히면 존재 이유가
       사라진다. 탐지기와 겹치는 건 축 1뿐이고, 이 사이트의 값은 축 2와 누적에 있다. -->
  <p class="mt-3">
    AI를 가려내는 도구는 이미 많다. 확률만 알려줄 뿐 근거가 없고, 모델이
    좋아질수록 더 틀린다. 무엇보다 <b>"AI인가"까지만 답한다.</b> 정작 알고 싶은 건
    그다음, 이걸 믿어도 되는가. 그 답은 사람이 근거를 들고 와서 같이 따져야 나온다.
  </p>

  <h3 id="두축" class="mt-8 mb-2 text-[1.125rem] font-bold">판정은 두 축이다</h3>
  <p class="text-ink-2">
    AI로 만들었는지와 그게 쓰레기인지는 <b>같은 문제가 아니다.</b> 섞는 순간 "AI면 무조건 Slop"이
    되어 버려서, 두 축을 끝까지 따로 둔다.
  </p>

  <p class="mt-3 font-bold">축 1 — AI 생성 여부</p>
  <dl class="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[0.9375rem]">
    {#each AI_STATUSES as s (s)}
      <dt><span class="tag">{AI_STATUS_LABEL[s]}</span></dt>
      <dd class="text-ink-2">{AI_STATUS_HINT[s]}</dd>
    {/each}
  </dl>

  <!-- ⚠️ 여기에 운영자 판정 값 목록을 다시 만들지 마라(2026-09-09 유저 지시 —
       "이건 유저들의 공간이라니까"). 축 2는 표 하나로 끝난다. -->
  <p class="mt-3 font-bold">축 2 — 슬롭인가</p>
  <p class="mt-1 text-[0.9375rem] text-ink-2">
    이 축에는 운영자가 없다. <a href="#투표">보는 사람들의 표</a>가 답이다.
  </p>

  <h3 id="범위" class="mt-8 mb-2 text-[1.125rem] font-bold">다루는 범위</h3>
  <p class="text-ink-2">
    {#each CATEGORIES as c, i (c.slug)}<a href="/?category={c.slug}">{c.name}</a>{#if i < CATEGORIES.length - 1}&nbsp;·
    {/if}{/each}
  </p>
  <p class="mt-1 text-ink-2">
    <!-- 분류별 설명은 /ai-slop이 CATEGORY_HINT로 이미 한다. 여기 다시 나열하지 마라. -->
    분류별 설명은 <a href="/ai-slop#종류">AI 슬롭이란</a>에. 다루는 건 사람이 아니라
    <b>서비스와 결과물</b>이고, 특정인의 사생활과 신상은 다루지 않는다.
  </p>

  <h3 id="원칙" class="mt-8 mb-2 text-[1.125rem] font-bold">원칙</h3>
  <!-- ⚠️ 항목은 **한 문장**이다(2026-09-09 유저 지적 — "니다 반복이 너무 많다").
       선언 + 부연으로 두 문장씩 쓰면 아홉 항목에 종결어미가 열여덟 번 온다.
       ⚠️ 다만 여기는 형법 310조 방어선이라 명사형으로 끊지 마라. 선언문은 평서체다. -->
  <ol class="list-decimal space-y-1.5 pl-5 text-ink-2">
    <li><b class="text-ink">서비스를 비평하고 사람은 공격하지 않는다.</b></li>
    <li>
      <b class="text-ink">AI 사용 여부는 투표로 정하지 않는다.</b> 의견이 아니라
      사실이라 근거로 확인한다.
    </li>
    <li>
      <b class="text-ink">슬롭인지 아닌지는 보는 사람들이 정한다.</b> 사례마다 투표하고
      결과를 그대로 보여준다.
    </li>
    <li>
      <b class="text-ink">AI를 썼다는 이유만으로 Slop이 되지 않는다.</b> 잘 쓴 사례도
      함께 모은다.
    </li>
    <li>
      <b class="text-ink">제보는 바로 게시되지 않는다.</b> 접수 → 중복 검사 →
      운영자 검토 → 공개 순서로 처리하고, 이때 보는 건 사실관계지 슬롭 여부가 아니다.
    </li>
    <li>
      <b class="text-ink">반론을 받는다.</b> 당사자의 공식 답변과 정정 요청은 기존
      기록과 나란히 남는다.
    </li>
    <li>
      <b class="text-ink">고쳐지면 판정도 바뀐다.</b> 처리 결과는 수용·반려 모두
      <a href="#정정">아래 정정 기록</a>에 공개한다.
    </li>
    <li>
      <b class="text-ink">돈을 받고 글이나 판정을 지우지 않는다.</b> 그런 기능을 아예
      만들지 않았다.
    </li>
    <li>
      <b class="text-ink">익명 폭로 게시판이 되지 않게</b> 로그인한 사람만 쓸 수 있다.
    </li>
  </ol>

  <h3 id="투표" class="mt-8 mb-2 text-[1.125rem] font-bold">투표와 여론</h3>
  <p class="text-ink-2">
    사례마다 <b>슬롭이다 / 괜찮다</b> 중 하나에 표를 던진다. 한 사람 한 표다.
    같은 쪽을 다시 누르면 취소, 반대쪽을 누르면 바뀐다. 표가 여론이 되는 자리라
    로그인한 사람만 던질 수 있다.
  </p>
  <p class="mt-3 text-ink-2">
    표가 어느 정도 모이면 비율을 사례 옆에 붙인다. <b>적을 때는 안 붙인다.</b>
    세 표에 100%는 정확해 보이기만 할 뿐이다. 비율까지가 끝이고 이걸 합쳐 점수로 만들지는
    않는다. 이유는 댓글에 적으면 된다. 여론은 표보다 그쪽이 움직인다.
  </p>
  <p class="mt-3 text-ink-2">
    <b>운영자는 슬롭인지 아닌지를 정하지 않는다.</b> 하는 일은 사실 확인이다. AI를 썼는지
    근거로 확인하고, 분류를 붙이고, 원문이 지워지기 전에 사본을 남긴다. 그 위에 무슨
    도장을 찍을지는 보는 사람들이 정한다.
  </p>

  <h3 id="왜" class="mt-8 mb-2 text-[1.125rem] font-bold">왜 공개하는가</h3>
  <!-- ⚠️ 이 절을 지우지 마라. 실명 서비스를 판정하는 사이트라 명예훼손 방어선이
       필요하고, 형법 310조는 "진실한 사실이고 오로지 공공의 이익에 관한 때"
       위법성을 조각한다. 목적을 사이트가 스스로 밝혀 두는 게 그 출발점이다.
       원칙만 적고 목적을 안 적어 둔 상태였다(2026-09-08). -->
  <p class="text-ink-2">
    이 기록은 <b>소비자가 속아서 돈과 시간을 쓰는 것을 막으려고</b> 공개한다. 실물과
    다른 사진을 보고 주문하는 일, 전문가인 줄 알고 상담을 받는 일을 줄이려는 것이지
    만든 사람을 망신 주려는 것이 아니다.
  </p>
  <p class="mt-3 text-ink-2">
    그래서 <b>확인된 사실과 의견을 나눠 적고</b>, 근거 없이는 판정하지 않으며, 당사자 반론을
    같은 자리에 나란히 싣고, 틀린 것은 정정 기록으로 남긴다. 사실관계가 틀렸다는 지적은
    언제든 받는다.
  </p>

  <h3 id="운영" class="mt-8 mb-2 text-[1.125rem] font-bold">운영</h3>
  <p class="text-ink-2">
    aislop.kr 운영자 1인이 만들고 판정한다. 어떤 업체·기관의 후원도 받지 않고, 광고와
    제휴 링크도 싣지 않는다. 판정 대상과 이해관계가 생기면 해당 사례에 표시한다.
  </p>
  <!-- ⚠️ 이건 크레딧이 아니라 **이해충돌 고지**다(2026-09-08 유저 결정).
       한때 푸터에 "by eklab" + 링크를 달까 논의했는데, 바로 위 문단이 "광고와 제휴
       링크를 싣지 않습니다"라 정면으로 부딪히고, 판정당한 쪽이 "웹 개발 영리 업체가
       운영한다" 한 줄로 판정 전체를 홍보로 재프레이밍할 수 있다.
       먼저 밝힌 이해관계는 공격 재료가 안 되지만 숨겼다가 발각되면 은폐가 된다.
       ⚠️ **링크를 걸지 마라**(유저 지시). 링크가 붙는 순간 고지가 아니라 홍보가 된다.
       홍보가 필요하면 방향을 뒤집어라 — eklab 쪽에서 aislop을 제작 사례로 소개한다. -->
  <p class="mt-3 text-ink-2">
    운영자는 웹 개발·과외 일(eklab)을 한다. 판정 대상에 웹 서비스가 포함되므로 미리
    밝혀 둔다. 관련된 사례를 판정할 일이 생기면 해당 사례에 표시한다.
  </p>
  <p class="mt-3 text-ink-2">
    문의·항의·정정 요청: <a href="mailto:ekankr2@gmail.com">ekankr2@gmail.com</a><br />
    사례별 반론은 해당 사례 하단의 <b>당사자 답변</b> 폼이 더 빠르다. 가입 없이
    넣을 수 있고, 게시되면 기록과 나란히 남는다.
  </p>

  <h3 id="정정" class="mt-8 mb-2 text-[1.125rem] font-bold">정정</h3>
  <p class="text-ink-2">
    사실관계가 틀렸다면 사례 하단의 정정 요청 폼으로 알리면 된다. 근거를 확인하고 처리한 뒤
    수용과 반려를 모두 아래에 남긴다. 기록은 지우지 않는다.
  </p>

  {#if data.corrections.length > 0}
    <ul class="mt-2 divide-y-2 divide-line border-t-2 border-line">
      {#each data.corrections as c (c.id)}
        <li class="py-2.5">
          <p class="meta flex flex-wrap items-center gap-x-2">
            <span class="tag {c.status === 'accepted' ? 'tag-affirmative' : ''}"
              >{c.status === "accepted" ? "수용" : "반려"}</span
            >
            {#if c.resolvedAt}<time datetime={c.resolvedAt}>{c.resolvedAt.slice(0, 10)}</time>{/if}
            <a href="/posts/{c.postSlug}">{c.postTitle}</a>
          </p>
          <p class="mt-0.5 text-[0.9375rem] whitespace-pre-wrap">{c.claim}</p>
          {#if c.resolution}
            <p class="mt-0.5 border-l-2 border-line pl-2.5 text-[0.9375rem] text-ink-2">
              {c.resolution}
            </p>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</div>
</div>
