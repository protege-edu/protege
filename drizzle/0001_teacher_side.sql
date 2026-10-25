CREATE TABLE `class_lessons` (
	`class_id` text NOT NULL,
	`lesson_id` text NOT NULL,
	`assigned_at` integer NOT NULL,
	PRIMARY KEY(`class_id`, `lesson_id`),
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `classes` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`grade` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `lessons` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`grade` integer NOT NULL,
	`status` text NOT NULL,
	`blueprint` text,
	`source_name` text,
	`source_text` text,
	`problem` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`approved_at` integer
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `students` ADD `class_id` text REFERENCES classes(id);--> statement-breakpoint
ALTER TABLE `teach_sessions` ADD `class_id` text REFERENCES classes(id);