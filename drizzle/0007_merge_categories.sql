PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_post` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`category` text NOT NULL,
	`url` text,
	`url_key` text,
	`domain` text,
	`archive_url` text,
	`thumb_url` text,
	`ai_status` text DEFAULT 'unknown' NOT NULL,
	`ai_evidence` text,
	`problems` text,
	`facts` text,
	`author_id` text NOT NULL,
	`status` text DEFAULT 'submitted' NOT NULL,
	`submit_reason` text,
	`firsthand` integer DEFAULT false NOT NULL,
	`submitter_affiliated` integer DEFAULT false NOT NULL,
	`review_note` text,
	`reviewed_by` text,
	`comment_count` integer DEFAULT 0 NOT NULL,
	`vote_slop_count` integer DEFAULT 0 NOT NULL,
	`vote_ok_count` integer DEFAULT 0 NOT NULL,
	`is_demo` integer DEFAULT false NOT NULL,
	`published_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`author_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewed_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "post_status" CHECK(status in ('submitted', 'reviewing', 'published', 'needs_evidence', 'rejected', 'corrected', 'archived')),
	CONSTRAINT "post_category" CHECK(category in ('app', 'image', 'media', 'writing', 'music', 'ad', 'etc')),
	CONSTRAINT "post_ai_status" CHECK(ai_status in ('confirmed', 'self_disclosed', 'circumstantial', 'unknown', 'not_ai'))
);
--> statement-breakpoint
INSERT INTO `__new_post`("id", "slug", "title", "summary", "category", "url", "url_key", "domain", "archive_url", "thumb_url", "ai_status", "ai_evidence", "problems", "facts", "author_id", "status", "submit_reason", "firsthand", "submitter_affiliated", "review_note", "reviewed_by", "comment_count", "vote_slop_count", "vote_ok_count", "is_demo", "published_at", "created_at", "updated_at", "deleted_at") SELECT "id", "slug", "title", "summary", "category", "url", "url_key", "domain", "archive_url", "thumb_url", "ai_status", "ai_evidence", "problems", "facts", "author_id", "status", "submit_reason", "firsthand", "submitter_affiliated", "review_note", "reviewed_by", "comment_count", "vote_slop_count", "vote_ok_count", "is_demo", "published_at", "created_at", "updated_at", "deleted_at" FROM `post`;--> statement-breakpoint
DROP TABLE `post`;--> statement-breakpoint
ALTER TABLE `__new_post` RENAME TO `post`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `post_slug_unique` ON `post` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `post_url_key_idx` ON `post` (`url_key`);--> statement-breakpoint
CREATE INDEX `post_feed_idx` ON `post` (`status`,`published_at`);--> statement-breakpoint
CREATE INDEX `post_category_idx` ON `post` (`category`,`published_at`);--> statement-breakpoint
CREATE INDEX `post_author_idx` ON `post` (`author_id`);