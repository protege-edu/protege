CREATE TABLE `teachers` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`password_hash` text,
	`recovery_hash` text,
	`google_id_hash` text,
	`failed_logins` integer DEFAULT 0 NOT NULL,
	`locked_until` integer,
	`onboarded_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `teachers_email_unique` ON `teachers` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `teachers_google_id_hash_unique` ON `teachers` (`google_id_hash`);--> statement-breakpoint
ALTER TABLE `classes` ADD `teacher_id` text REFERENCES teachers(id);--> statement-breakpoint
ALTER TABLE `classes` ADD `code` text;--> statement-breakpoint
ALTER TABLE `classes` ADD `google_sign_in` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `classes` ADD `paused_at` integer;--> statement-breakpoint
CREATE UNIQUE INDEX `classes_code_unique` ON `classes` (`code`);--> statement-breakpoint
ALTER TABLE `lessons` ADD `teacher_id` text REFERENCES teachers(id);--> statement-breakpoint
ALTER TABLE `students` ADD `key_hash` text;--> statement-breakpoint
ALTER TABLE `students` ADD `google_id_hash` text;--> statement-breakpoint
ALTER TABLE `students` ADD `failed_keys` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `students` ADD `locked_until` integer;--> statement-breakpoint
ALTER TABLE `students` ADD `met_gloam_at` integer;--> statement-breakpoint
ALTER TABLE `students` ADD `last_seen_at` integer;