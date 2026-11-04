PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_vote` (
	`post_id` text NOT NULL,
	`user_id` text NOT NULL,
	`choice` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`post_id`, `user_id`),
	FOREIGN KEY (`post_id`) REFERENCES `post`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "vote_choice" CHECK(choice in ('slop', 'ok'))
);
--> statement-breakpoint
INSERT INTO `__new_vote`("post_id", "user_id", "choice", "created_at") SELECT "post_id", "user_id", "choice", "created_at" FROM `vote`;--> statement-breakpoint
DROP TABLE `vote`;--> statement-breakpoint
ALTER TABLE `__new_vote` RENAME TO `vote`;--> statement-breakpoint
PRAGMA foreign_keys=ON;