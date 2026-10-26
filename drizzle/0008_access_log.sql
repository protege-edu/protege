CREATE TABLE `access_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`at` integer NOT NULL,
	`teacher_id` text NOT NULL,
	`action` text NOT NULL,
	`class_id` text,
	`student_id` text
);
