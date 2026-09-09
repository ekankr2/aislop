DROP INDEX `user_username_unique`;--> statement-breakpoint
DROP INDEX `user_username_idx`;--> statement-breakpoint
CREATE UNIQUE INDEX `user_name_unique` ON `user` (`name`);--> statement-breakpoint
CREATE INDEX `user_name_idx` ON `user` (`name`);--> statement-breakpoint
ALTER TABLE `user` DROP COLUMN `username`;