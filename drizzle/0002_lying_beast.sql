CREATE TABLE `mercado_pago_connections` (
	`business_id` text PRIMARY KEY NOT NULL,
	`mp_user_id` text NOT NULL,
	`access_token_encrypted` text NOT NULL,
	`refresh_token_encrypted` text,
	`expires_at` text NOT NULL,
	`scope` text,
	`status` text DEFAULT 'connected' NOT NULL,
	`connected_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_mp_connections_user_id` ON `mercado_pago_connections` (`mp_user_id`);--> statement-breakpoint
CREATE TABLE `payment_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`reservation_id` text NOT NULL,
	`business_id` text NOT NULL,
	`provider` text DEFAULT 'mercadopago' NOT NULL,
	`external_reference` text NOT NULL,
	`provider_order_id` text,
	`checkout_url` text,
	`idempotency_key` text NOT NULL,
	`amount` integer NOT NULL,
	`marketplace_fee` integer DEFAULT 0 NOT NULL,
	`status` text NOT NULL,
	`status_detail` text,
	`stock_released_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payment_transactions_reservation_id_unique` ON `payment_transactions` (`reservation_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `payment_transactions_external_reference_unique` ON `payment_transactions` (`external_reference`);--> statement-breakpoint
CREATE UNIQUE INDEX `payment_transactions_provider_order_id_unique` ON `payment_transactions` (`provider_order_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `payment_transactions_idempotency_key_unique` ON `payment_transactions` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `idx_payment_transactions_order` ON `payment_transactions` (`provider_order_id`);--> statement-breakpoint
CREATE INDEX `idx_payment_transactions_business_status` ON `payment_transactions` (`business_id`,`status`);