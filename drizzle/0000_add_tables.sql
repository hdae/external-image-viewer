CREATE TABLE `buckets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`token` text NOT NULL,
	`is_revoked` integer DEFAULT false
);
--> statement-breakpoint
CREATE INDEX `token_idx` ON `buckets` (`token`);--> statement-breakpoint
CREATE TABLE `images` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`hash` text NOT NULL,
	`ip` text NOT NULL,
	`metadata` text NOT NULL,
	`created_at` integer DEFAULT (current_timestamp) NOT NULL,
	`bucket_id` integer,
	FOREIGN KEY (`bucket_id`) REFERENCES `buckets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `hash_idx` ON `images` (`hash`);