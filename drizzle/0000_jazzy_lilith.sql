CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text,
	`action` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`reason` text,
	`meta` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`actor_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `audit_target_idx` ON `audit_log` (`target_type`,`target_id`);--> statement-breakpoint
CREATE INDEX `audit_created_idx` ON `audit_log` (`created_at`);--> statement-breakpoint
CREATE TABLE `comment` (
	`id` text PRIMARY KEY NOT NULL,
	`post_id` text NOT NULL,
	`user_id` text NOT NULL,
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
CREATE INDEX `comment_post_idx` ON `comment` (`post_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `comment_user_idx` ON `comment` (`user_id`);--> statement-breakpoint
CREATE TABLE `comment_report` (
	`id` text PRIMARY KEY NOT NULL,
	`comment_id` text NOT NULL,
	`reporter_id` text NOT NULL,
	`reason` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`resolved_by` text,
	`resolved_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`comment_id`) REFERENCES `comment`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reporter_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`resolved_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "comment_report_status" CHECK(status in ('open', 'resolved', 'dismissed'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `comment_report_once_idx` ON `comment_report` (`comment_id`,`reporter_id`);--> statement-breakpoint
CREATE INDEX `comment_report_status_idx` ON `comment_report` (`status`);--> statement-breakpoint
CREATE TABLE `company_response` (
	`id` text PRIMARY KEY NOT NULL,
	`post_id` text NOT NULL,
	`submitter_name` text NOT NULL,
	`submitter_email` text NOT NULL,
	`submitter_role` text NOT NULL,
	`body` text NOT NULL,
	`verify_note` text,
	`verify_status` text DEFAULT 'pending' NOT NULL,
	`verified_by` text,
	`published_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `post`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`verified_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "company_response_verify" CHECK(verify_status in ('pending', 'verified', 'rejected'))
);
--> statement-breakpoint
CREATE INDEX `company_response_post_idx` ON `company_response` (`post_id`);--> statement-breakpoint
CREATE TABLE `correction_request` (
	`id` text PRIMARY KEY NOT NULL,
	`post_id` text NOT NULL,
	`requester_name` text NOT NULL,
	`requester_email` text NOT NULL,
	`claim` text NOT NULL,
	`evidence_url` text,
	`status` text DEFAULT 'open' NOT NULL,
	`resolution` text,
	`resolved_by` text,
	`resolved_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `post`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`resolved_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "correction_status" CHECK(status in ('open', 'accepted', 'rejected'))
);
--> statement-breakpoint
CREATE INDEX `correction_status_idx` ON `correction_request` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `evidence` (
	`id` text PRIMARY KEY NOT NULL,
	`post_id` text NOT NULL,
	`type` text NOT NULL,
	`url` text,
	`description` text NOT NULL,
	`captured_at` text,
	`submitted_by` text,
	`verify_status` text DEFAULT 'pending' NOT NULL,
	`verified_by` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `post`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`submitted_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`verified_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "evidence_type" CHECK(type in ('original', 'archive', 'screenshot', 'comparison', 'metadata', 'detector', 'receipt', 'terms', 'other')),
	CONSTRAINT "evidence_verify" CHECK(verify_status in ('pending', 'verified', 'rejected'))
);
--> statement-breakpoint
CREATE INDEX `evidence_post_idx` ON `evidence` (`post_id`);--> statement-breakpoint
CREATE TABLE `login_code` (
	`email` text PRIMARY KEY NOT NULL,
	`code_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `post` (
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
	`verdict` text DEFAULT 'unrated' NOT NULL,
	`verdict_note` text,
	`author_id` text NOT NULL,
	`status` text DEFAULT 'submitted' NOT NULL,
	`submit_reason` text,
	`firsthand` integer DEFAULT false NOT NULL,
	`submitter_affiliated` integer DEFAULT false NOT NULL,
	`review_note` text,
	`reviewed_by` text,
	`comment_count` integer DEFAULT 0 NOT NULL,
	`reaction_count` integer DEFAULT 0 NOT NULL,
	`is_demo` integer DEFAULT false NOT NULL,
	`published_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`author_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewed_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "post_status" CHECK(status in ('submitted', 'reviewing', 'published', 'needs_evidence', 'rejected', 'corrected', 'archived')),
	CONSTRAINT "post_category" CHECK(category in ('app', 'image', 'video', 'media', 'review', 'writing', 'music', 'ad')),
	CONSTRAINT "post_ai_status" CHECK(ai_status in ('confirmed', 'self_disclosed', 'circumstantial', 'unknown', 'not_ai')),
	CONSTRAINT "post_verdict" CHECK(verdict in ('unrated', 'slop', 'low_quality', 'disputed', 'not_slop', 'exemplary'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `post_slug_unique` ON `post` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `post_url_key_idx` ON `post` (`url_key`);--> statement-breakpoint
CREATE INDEX `post_feed_idx` ON `post` (`status`,`published_at`);--> statement-breakpoint
CREATE INDEX `post_category_idx` ON `post` (`category`,`published_at`);--> statement-breakpoint
CREATE INDEX `post_verdict_idx` ON `post` (`verdict`,`published_at`);--> statement-breakpoint
CREATE INDEX `post_author_idx` ON `post` (`author_id`);--> statement-breakpoint
CREATE TABLE `reaction` (
	`post_id` text NOT NULL,
	`user_id` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`post_id`, `user_id`),
	FOREIGN KEY (`post_id`) REFERENCES `post`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `session` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `session_user_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`username` text,
	`role` text DEFAULT 'member' NOT NULL,
	`badges` text,
	`blocked_at` text,
	`blocked_reason` text,
	CONSTRAINT "user_role" CHECK(role in ('member', 'editor', 'admin'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_username_unique` ON `user` (`username`);--> statement-breakpoint
CREATE INDEX `user_username_idx` ON `user` (`username`);