-- 로컬 개발용 시연 데이터. ⚠️ **--remote로 절대 돌리지 마라.**
--
-- 왜 있나: dev DB가 비면 목록 좌측 여론 표시(`.opinion`)가 전부 "표 없음"이라
-- 판정 상태를 화면에서 볼 수 없다. 실제로 그래서 `괜찮음` 라벨이 밑줄 밖으로
-- 삐져나오는 걸 한참 못 봤다(2026-09-10). 여기 여섯 글은 **여섯 상태를 하나씩**
-- 덮는다 — 이 균형을 깨지 마라, 그게 이 파일의 전부다:
--
--   14:2  → 슬롭 88%      6:5 → 박빙 55%      5:5 → 박빙 50%
--   1:11  → 괜찮음 92%    0:1 → 미판정(1표)   0:0 → 빈 줄
--
-- 0:0을 지우지 마라. 프로덕션에서 제일 흔한 상태고(스코프가 "AI로 만든 모든 것"
-- 이라 대다수가 `VOTE_MIN`을 못 넘긴다), 제일 자주 잊는 상태다.
--
-- ⚠️ p2는 **근거 두 갈래를 다 덮는 유일한 글**이다 — 올린 이미지(`storage_key` 있음,
-- 상세에서 <img>)와 외부 URL(`storage_key` 없음, 링크 목록). 이게 없던 동안
-- 상세의 이미지 경로가 로컬에서 아예 안 그려져서, 썸네일과 근거 이미지가 같은 장을
-- 두 번 띄우는 걸 배포 뒤에야 알았다(2026-09-11). 이 두 행을 지우지 마라.
-- ⚠️ 업로드 첫 장은 post.thumb_url 이자 evidence 행이다(submit/+page.server.ts).
-- 그래서 여기도 **같은 URL**을 양쪽에 넣는다 — 다르게 넣으면 그 겹침이 안 보인다.
--
-- 쓰는 법:  bun run db:migrate:local && bun run db:seed:local
--
-- ⚠️ 리셋은 `is_demo = 1`만 지운다. 네가 손으로 만든 글은 안 건드린다.
-- ⚠️ 표 수는 `vote` 행이 아니라 post의 비정규화 칼럼이 화면을 그린다(`refreshCounts`
--    가 채우는 값). 그래서 vote 행 수와 표시 숫자가 안 맞는 게 정상이다 —
--    맞추려고 vote를 수십 개 만들지 마라.
-- ⚠️ user는 `INSERT OR IGNORE`다. 이미 있으면 그대로 둔다 — 지웠다 넣으면
--    세션이 끊기고 `DEV_USER_ID` 로그인 우회가 죽는다.

DELETE FROM comment  WHERE post_id IN (SELECT id FROM post WHERE is_demo = 1);
DELETE FROM vote     WHERE post_id IN (SELECT id FROM post WHERE is_demo = 1);
DELETE FROM evidence WHERE post_id IN (SELECT id FROM post WHERE is_demo = 1);
DELETE FROM post     WHERE is_demo = 1;

INSERT OR IGNORE INTO user (id, name, email, created_at, updated_at, role, badges, blocked_at, blocked_reason) VALUES
  ('dev-admin', 'slopmaster', 'dev@localhost', '2026-09-08T00:00:00+09:00', '2026-09-08T15:55:01+09:00', 'admin', NULL, NULL, NULL);
INSERT OR IGNORE INTO user (id, name, email, created_at, updated_at, role, badges, blocked_at, blocked_reason) VALUES
  ('u-a', '슬롭사냥꾼', 'a@localhost', '2026-09-09T10:00:00+09:00', '2026-09-09T10:00:00+09:00', 'member', NULL, NULL, NULL);
INSERT OR IGNORE INTO user (id, name, email, created_at, updated_at, role, badges, blocked_at, blocked_reason) VALUES
  ('u-b', '지나가던사람', 'b@localhost', '2026-09-09T10:00:00+09:00', '2026-09-09T10:00:00+09:00', 'member', NULL, NULL, NULL);

INSERT INTO post (id, slug, title, summary, category, url, url_key, domain, archive_url, thumb_url, problems, facts, author_id, status, submit_reason, firsthand, submitter_affiliated, review_note, reviewed_by, comment_count, vote_slop_count, vote_ok_count, is_demo, published_at, created_at, updated_at, deleted_at, heat) VALUES
  ('p2', '인스타에서-본-성형외과-광고', '인스타에서 본 성형외과 광고, 전후 사진이 같은 얼굴이 아니다', '같은 광고 안에서 시술 전과 후 사진의 귀 모양과 점 위치가 다르다. 병원 이름으로 검색하면 후기가 세 달 사이에 몰려 있다.', 'ad', NULL, NULL, NULL, NULL, '/og-2026-09.png', NULL, NULL, 'u-b', 'published', '같은 광고 안에서 시술 전과 후 사진의 귀 모양과 점 위치가 다르다.

병원 이름으로 검색하면 후기가 세 달 사이에 몰려 있고 문장 길이가 다 비슷하다.', 1, 0, NULL, NULL, 7, 14, 2, 1, '2026-09-09T09:00:00+09:00', '2026-09-09T09:00:00+09:00', '2026-09-09T09:00:00+09:00', NULL, 36);
INSERT INTO post (id, slug, title, summary, category, url, url_key, domain, archive_url, thumb_url, problems, facts, author_id, status, submit_reason, firsthand, submitter_affiliated, review_note, reviewed_by, comment_count, vote_slop_count, vote_ok_count, is_demo, published_at, created_at, updated_at, deleted_at, heat) VALUES
  ('p1', 'ai로-전자책-8-690종을-내는-출판사', 'AI로 전자책 8,690종을 내는 출판사', 'AI로 전자책을 찍어내는 출판사. YES24에 8,690종이 있고 그중 2,152건에 AI 활용 콘텐츠 태그가 붙어 있다.', 'writing', 'https://luminarybooks.co.kr', 'luminarybooks.co.kr', 'luminarybooks.co.kr', NULL, NULL, NULL, NULL, 'u-a', 'published', 'AI로 전자책을 찍어내는 출판사. YES24에 8,690종이 있고 그중 2,152건에 AI 활용 콘텐츠 태그가 붙어 있다.

상품 페이지에는 "편집자의 최종 검토를 거쳐 제작되었습니다"라고 적혀 있는데, 홈페이지에는 "사람의 개입 없이도 출판 품질 기준을 충족하는 완전 자동화 파이프라인"이라고 적혀 있다.

https://www.yes24.com/product/goods/187041369', 0, 0, NULL, NULL, 3, 6, 5, 1, '2026-09-09T11:00:00+09:00', '2026-09-09T11:00:00+09:00', '2026-09-09T16:54:58+09:00', NULL, 32);
INSERT INTO post (id, slug, title, summary, category, url, url_key, domain, archive_url, thumb_url, problems, facts, author_id, status, submit_reason, firsthand, submitter_affiliated, review_note, reviewed_by, comment_count, vote_slop_count, vote_ok_count, is_demo, published_at, created_at, updated_at, deleted_at, heat) VALUES
  ('p5', 'ai가-쓴-공공기관-보도자료', 'AI가 초안을 쓴 공공기관 보도자료, 밝히지는 않았다', '담당자가 AI로 초안을 쓴다고 인터뷰에서 말했는데 보도자료에는 표시가 없다.', 'media', 'https://example.or.kr/press/1', 'example.or.kr/press/1', 'example.or.kr', NULL, NULL, NULL, NULL, 'u-b', 'published', '담당자가 AI로 초안을 쓴다고 인터뷰에서 말했는데 보도자료 어디에도 표시가 없다.

내용 자체는 사실관계가 맞고 읽을 만하다. 표시를 안 한 게 문제인지 아닌지에서 갈린다.', 0, 0, NULL, NULL, 0, 5, 5, 1, '2026-09-09T07:00:00+09:00', '2026-09-09T07:00:00+09:00', '2026-09-10T08:59:03+09:00', NULL, 25);
INSERT INTO post (id, slug, title, summary, category, url, url_key, domain, archive_url, thumb_url, problems, facts, author_id, status, submit_reason, firsthand, submitter_affiliated, review_note, reviewed_by, comment_count, vote_slop_count, vote_ok_count, is_demo, published_at, created_at, updated_at, deleted_at, heat) VALUES
  ('p3', '국립국어원-ai-맞춤법-도우미', '국립국어원이 만든 AI 맞춤법 도우미', '공공기관이 AI로 만든 서비스를 밝히고 공개했다. 오류 신고 창구도 같이 열어 뒀다.', 'app', 'https://example.go.kr/spellcheck', 'example.go.kr/spellcheck', 'example.go.kr', NULL, NULL, NULL, NULL, 'u-a', 'published', '공공기관이 AI로 만든 서비스를 밝히고 공개했다. 오류 신고 창구도 같이 열어 뒀다.

AI를 썼다고 다 슬롭은 아니라는 쪽 사례로 올린다.', 0, 0, NULL, NULL, 2, 1, 11, 1, '2026-09-08T15:00:00+09:00', '2026-09-08T15:00:00+09:00', '2026-09-08T15:00:00+09:00', NULL, 19);
INSERT INTO post (id, slug, title, summary, category, url, url_key, domain, archive_url, thumb_url, problems, facts, author_id, status, submit_reason, firsthand, submitter_affiliated, review_note, reviewed_by, comment_count, vote_slop_count, vote_ok_count, is_demo, published_at, created_at, updated_at, deleted_at, heat) VALUES
  ('p4', '유튜브-쇼츠-채널-하루-40개', '같은 배경에 자막만 바꿔 하루 40개씩 올라오는 쇼츠 채널', '채널 개설 3주, 영상 800개. 업로드 간격이 22분으로 일정하다.', 'image', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'u-b', 'published', '채널 개설 3주, 영상 800개. 업로드 간격이 22분으로 일정하다.

내레이션 목소리가 전부 같고 배경 영상 세 개가 돌아가며 재사용된다.', 0, 0, NULL, NULL, 0, 0, 1, 1, '2026-09-09T08:00:00+09:00', '2026-09-09T08:00:00+09:00', '2026-09-10T09:36:56+09:00', NULL, 1);
INSERT INTO post (id, slug, title, summary, category, url, url_key, domain, archive_url, thumb_url, problems, facts, author_id, status, submit_reason, firsthand, submitter_affiliated, review_note, reviewed_by, comment_count, vote_slop_count, vote_ok_count, is_demo, published_at, created_at, updated_at, deleted_at, heat) VALUES
  ('p6', 'ai가-쓴-여행-블로그-가보지-않은-식당-후기', 'AI가 쓴 여행 블로그, 가보지 않은 식당 후기', '검색 상위에 뜨는 맛집 후기인데 그 가게는 2년 전에 폐업했다.', 'writing', 'https://example.blog/jeju-food', 'example.blog/jeju-food', 'example.blog', NULL, NULL, NULL, NULL, 'u-a', 'published', '제주 맛집을 검색하다 발견했다. 사진 속 간판이 지금 건물과 다르고, 적힌 메뉴가 폐업 전 메뉴다.', 0, 0, NULL, NULL, 0, 0, 0, 1, '2026-09-09 22:27:39', '2026-09-09 22:27:39', '2026-09-09 22:27:39', NULL, 0);

INSERT INTO evidence (id, post_id, type, url, storage_key, description, captured_at, submitted_by, verify_status, created_at) VALUES
  ('e1', 'p2', 'screenshot', '/og-2026-09.png', 'demo/p2-shot.png', '글쓴이가 올린 이미지', '2026-09-09', 'u-b', 'pending', '2026-09-09T09:00:00+09:00');
INSERT INTO evidence (id, post_id, type, url, storage_key, description, captured_at, submitted_by, verify_status, created_at) VALUES
  ('e2', 'p2', 'original', 'https://example.com/ads/12345', NULL, '광고가 걸려 있던 게시물', '2026-09-09', 'dev-admin', 'verified', '2026-09-09T09:20:00+09:00');

INSERT INTO vote (post_id, user_id, choice, created_at) VALUES
  ('p1', 'dev-admin', 'ok', '2026-09-09T16:54:58+09:00');
INSERT INTO vote (post_id, user_id, choice, created_at) VALUES
  ('p1', 'u-a', 'slop', '2026-09-09T11:05:00+09:00');
INSERT INTO vote (post_id, user_id, choice, created_at) VALUES
  ('p1', 'u-b', 'ok', '2026-09-09T11:06:00+09:00');
INSERT INTO vote (post_id, user_id, choice, created_at) VALUES
  ('p2', 'u-a', 'slop', '2026-09-09T09:10:00+09:00');
INSERT INTO vote (post_id, user_id, choice, created_at) VALUES
  ('p3', 'u-b', 'ok', '2026-09-08T15:10:00+09:00');
INSERT INTO vote (post_id, user_id, choice, created_at) VALUES
  ('p4', 'dev-admin', 'ok', '2026-09-10T09:36:56+09:00');
INSERT INTO vote (post_id, user_id, choice, created_at) VALUES
  ('p5', 'dev-admin', 'ok', '2026-09-10T08:59:03+09:00');

INSERT INTO comment (id, post_id, user_id, parent_id, body, hidden_at, hidden_by, created_at, updated_at, deleted_at) VALUES
  ('c1', 'p1', 'u-b', NULL, '홈페이지 문구가 더 정확할 것 같은데. 상품 페이지 쪽은 그냥 관행적으로 붙이는 문장 아닌가.', NULL, NULL, '2026-09-09T11:30:00+09:00', '2026-09-09T11:30:00+09:00', NULL);
INSERT INTO comment (id, post_id, user_id, parent_id, body, hidden_at, hidden_by, created_at, updated_at, deleted_at) VALUES
  ('c2', 'p1', 'u-a', 'c1', '그럴 수도 있는데 그러면 상품 페이지 쪽이 사실과 다른 게 된다.', NULL, NULL, '2026-09-09T11:40:00+09:00', '2026-09-09T11:40:00+09:00', NULL);
INSERT INTO comment (id, post_id, user_id, parent_id, body, hidden_at, hidden_by, created_at, updated_at, deleted_at) VALUES
  ('c3', 'p1', 'u-b', NULL, '의약품제조학을 30분 검수라는 게 제일 걸린다.', NULL, NULL, '2026-09-09T12:00:00+09:00', '2026-09-09T12:00:00+09:00', NULL);
INSERT INTO comment (id, post_id, user_id, parent_id, body, hidden_at, hidden_by, created_at, updated_at, deleted_at) VALUES
  ('c4', 'p2', 'u-a', NULL, '전후 사진은 원래 광고법상 규제 대상이라 생성 이미지면 더 문제다.', NULL, NULL, '2026-09-09T09:30:00+09:00', '2026-09-09T09:30:00+09:00', NULL);
INSERT INTO comment (id, post_id, user_id, parent_id, body, hidden_at, hidden_by, created_at, updated_at, deleted_at) VALUES
  ('c5', 'p3', 'u-b', NULL, '이런 건 오히려 잘 쓴 사례로 남겨야 한다.', NULL, NULL, '2026-09-08T16:00:00+09:00', '2026-09-08T16:00:00+09:00', NULL);
