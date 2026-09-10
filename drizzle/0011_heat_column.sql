ALTER TABLE `post` ADD `heat` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
-- 기존 행 백필. ⚠️ 식은 core/post.ts의 refreshCounts와 같아야 한다.
UPDATE `post` SET `heat` =
  `vote_slop_count` + `vote_ok_count`
  + `comment_count` * 2
  + min(`vote_slop_count`, `vote_ok_count`) * 3;--> statement-breakpoint
CREATE INDEX `post_heat_idx` ON `post` (`status`,`heat`);
