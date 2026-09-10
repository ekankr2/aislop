-- ⚠️ UNIQUE를 걸기 전에 기존 중복부터 지운다. 안 지우면 인덱스 생성이 실패하고
--    마이그레이션 전체가 멈춘다. 같은 (글, 신고자) 중 먼저 들어온 것만 남긴다.
DELETE FROM `post_report` WHERE `reporter_id` IS NOT NULL AND `id` NOT IN (
  SELECT min(`id`) FROM `post_report`
  WHERE `reporter_id` IS NOT NULL
  GROUP BY `post_id`, `reporter_id`
);--> statement-breakpoint
CREATE UNIQUE INDEX `post_report_once_idx` ON `post_report` (`post_id`,`reporter_id`);
