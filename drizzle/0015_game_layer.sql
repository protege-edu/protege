CREATE TABLE `encounters` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` text NOT NULL,
	`kind` text NOT NULL,
	`concept_id` text,
	`outcome` text NOT NULL,
	`tries` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `teach_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `gloams` ADD `fireflies` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `gloams` ADD `spent` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `gloams` ADD `owned` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `gloams` ADD `wearing` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `teach_sessions` ADD `play` text;