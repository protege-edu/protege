CREATE TABLE `gloams` (
	`student_id` text PRIMARY KEY NOT NULL,
	`light` integer DEFAULT 0 NOT NULL,
	`lessons` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `teach_sessions` ADD `checkpoints` text DEFAULT '[]' NOT NULL;