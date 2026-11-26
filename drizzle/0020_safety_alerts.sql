CREATE TABLE `safety_alerts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`class_id` text NOT NULL,
	`student_id` text NOT NULL,
	`session_id` text,
	`message` text NOT NULL,
	`created_at` integer NOT NULL,
	`acknowledged_at` integer,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`session_id`) REFERENCES `teach_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
