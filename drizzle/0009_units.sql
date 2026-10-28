CREATE TABLE `units` (
	`id` text PRIMARY KEY NOT NULL,
	`teacher_id` text NOT NULL,
	`title` text NOT NULL,
	`source_name` text,
	`grade` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `class_lessons` ADD `position` integer;--> statement-breakpoint
ALTER TABLE `lessons` ADD `unit_id` text REFERENCES units(id);--> statement-breakpoint
ALTER TABLE `lessons` ADD `position` integer;