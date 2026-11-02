-- 0003: Günü kapat akışı
ALTER TABLE `daily_plans` ADD COLUMN `reflection` text;
--> statement-breakpoint
ALTER TABLE `daily_plans` ADD COLUMN `closed_at` text;
