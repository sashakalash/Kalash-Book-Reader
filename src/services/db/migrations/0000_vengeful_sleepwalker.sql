CREATE TABLE `book_categories` (
	`book_id` text NOT NULL,
	`category_id` text NOT NULL,
	FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `books` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`author` text,
	`cover_path` text,
	`file_path` text NOT NULL,
	`format` text NOT NULL,
	`status` text DEFAULT 'want-to-read' NOT NULL,
	`rating` integer,
	`date_added` integer NOT NULL,
	`date_modified` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_name_unique` ON `categories` (`name`);--> statement-breakpoint
CREATE TABLE `notes` (
	`id` text PRIMARY KEY NOT NULL,
	`book_id` text NOT NULL,
	`text` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `reading_positions` (
	`book_id` text PRIMARY KEY NOT NULL,
	`cfi` text,
	`chapter_index` integer,
	`page` integer,
	`percentage` real DEFAULT 0 NOT NULL,
	`text_anchor` text,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE cascade
);
