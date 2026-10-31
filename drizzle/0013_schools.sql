CREATE TABLE `ai_usage` (
	`key` text NOT NULL,
	`day` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`key`, `day`)
);
--> statement-breakpoint
CREATE TABLE `schools` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`staff_code` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `schools_staff_code_unique` ON `schools` (`staff_code`);--> statement-breakpoint
ALTER TABLE `teachers` ADD `school_id` text REFERENCES schools(id);--> statement-breakpoint
ALTER TABLE `teachers` ADD `owner` integer DEFAULT false NOT NULL;--> statement-breakpoint
-- the first account made on this Protégé is its owner (it adds schools and their staff codes)
UPDATE `teachers` SET `owner` = 1 WHERE `id` = (SELECT `id` FROM `teachers` ORDER BY `created_at` LIMIT 1);--> statement-breakpoint
-- invites are replaced by schools' staff codes
DELETE FROM `settings` WHERE `key` LIKE 'teacher_invite:%';
