CREATE TABLE `vote` (
	`post_id` text NOT NULL,
	`user_id` text NOT NULL,
	`choice` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`post_id`, `user_id`),
	FOREIGN KEY (`post_id`) REFERENCES `post`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "vote_choice" CHECK(choice in ('slop', 'ok'))
);
--> statement-breakpoint
ALTER TABLE `post` ADD `vote_slop_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `post` ADD `vote_ok_count` integer DEFAULT 0 NOT NULL;