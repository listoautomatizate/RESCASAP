CREATE TABLE `legal_acceptances` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`document_type` text NOT NULL,
	`document_version` text NOT NULL,
	`accepted_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_legal_acceptances_user_document` ON `legal_acceptances` (`user_id`,`document_type`,`document_version`);--> statement-breakpoint
CREATE TABLE `merchant_applications` (
	`business_id` text PRIMARY KEY NOT NULL,
	`legal_name` text NOT NULL,
	`rut` text NOT NULL,
	`habilitation_number` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`terms_version` text NOT NULL,
	`accepted_at` text NOT NULL,
	`reviewed_at` text
);
