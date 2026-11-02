CREATE TABLE `class_boss_hits` (
	`boss_id` integer NOT NULL,
	`student_id` text NOT NULL,
	`hits` integer DEFAULT 0 NOT NULL,
	`rewarded` integer DEFAULT false NOT NULL,
	PRIMARY KEY(`boss_id`, `student_id`),
	FOREIGN KEY (`boss_id`) REFERENCES `class_bosses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `class_bosses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`class_id` text NOT NULL,
	`need` integer NOT NULL,
	`hits` integer DEFAULT 0 NOT NULL,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	`beaten` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE no action
);
