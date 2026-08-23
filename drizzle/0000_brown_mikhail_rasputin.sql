CREATE TABLE `businesses` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`address` text NOT NULL,
	`neighborhood` text NOT NULL,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`rating` real DEFAULT 4.8 NOT NULL,
	`closing_time` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_businesses_owner_id` ON `businesses` (`owner_id`);--> statement-breakpoint
CREATE TABLE `pack_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`business_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`normal_price` integer NOT NULL,
	`rescue_price` integer NOT NULL,
	`estimated_kg` real NOT NULL,
	`pickup_start` text NOT NULL,
	`pickup_end` text NOT NULL,
	`auto_discount` integer DEFAULT false NOT NULL,
	`final_price` integer,
	`discount_minutes` integer
);
--> statement-breakpoint
CREATE INDEX `idx_pack_templates_business_id` ON `pack_templates` (`business_id`);--> statement-breakpoint
CREATE TABLE `packs` (
	`id` text PRIMARY KEY NOT NULL,
	`business_id` text NOT NULL,
	`template_id` text,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`normal_price` integer NOT NULL,
	`rescue_price` integer NOT NULL,
	`current_price` integer NOT NULL,
	`quantity_total` integer NOT NULL,
	`quantity_available` integer NOT NULL,
	`estimated_kg` real NOT NULL,
	`pickup_start` text NOT NULL,
	`pickup_end` text NOT NULL,
	`status` text NOT NULL,
	`auto_discount` integer DEFAULT false NOT NULL,
	`final_price` integer,
	`discount_minutes` integer,
	`visual_tone` text DEFAULT 'bread' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_packs_status_pickup_end` ON `packs` (`status`,`pickup_end`);--> statement-breakpoint
CREATE INDEX `idx_packs_business_id` ON `packs` (`business_id`);--> statement-breakpoint
CREATE TABLE `reservations` (
	`id` text PRIMARY KEY NOT NULL,
	`pack_id` text NOT NULL,
	`user_id` text NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`unit_price` integer NOT NULL,
	`pickup_code` text NOT NULL,
	`status` text NOT NULL,
	`payment_status` text NOT NULL,
	`created_at` text NOT NULL,
	`collected_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reservations_pickup_code_unique` ON `reservations` (`pickup_code`);--> statement-breakpoint
CREATE INDEX `idx_reservations_user_id_created_at` ON `reservations` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_reservations_pack_id_status` ON `reservations` (`pack_id`,`status`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`neighborhood` text DEFAULT 'Montevideo' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
PRAGMA optimize;
