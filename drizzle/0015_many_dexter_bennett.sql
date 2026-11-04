PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_comment` (
	`id` text PRIMARY KEY NOT NULL,
	`post_id` text NOT NULL,
	`user_id` text,
	`anon_name` text,
	`anon_ip` text,
	`parent_id` text,
	`body` text NOT NULL,
	`hidden_at` text,
	`hidden_by` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`post_id`) REFERENCES `post`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`hidden_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_comment`("id", "post_id", "user_id", "anon_name", "anon_ip", "parent_id", "body", "hidden_at", "hidden_by", "created_at", "updated_at", "deleted_at") SELECT "id", "post_id", "user_id", "anon_name", "anon_ip", "parent_id", "body", "hidden_at", "hidden_by", "created_at", "updated_at", "deleted_at" FROM `comment`;--> statement-breakpoint
DROP TABLE `comment`;--> statement-breakpoint
ALTER TABLE `__new_comment` RENAME TO `comment`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `comment_post_idx` ON `comment` (`post_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `comment_user_idx` ON `comment` (`user_id`);