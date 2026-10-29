-- 0002: Ses kaydı yolu ve görev süresi sütunları (Feature 6 + Feature 5)
ALTER TABLE `tasks` ADD COLUMN `duration` integer;
ALTER TABLE `tasks` ADD COLUMN `audio_path` text;
ALTER TABLE `ideas` ADD COLUMN `audio_path` text;
