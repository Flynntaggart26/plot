-- 0002: Ses kaydı yolu ve görev süresi sütunları (Feature 6 + Feature 5)
ALTER TABLE `tasks` ADD COLUMN `duration` integer;
--> statement-breakpoint
ALTER TABLE `tasks` ADD COLUMN `audio_path` text;
--> statement-breakpoint
ALTER TABLE `ideas` ADD COLUMN `audio_path` text;
