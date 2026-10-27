-- Geliştirme veritabanları için onarım göçü.
--
-- 0000 dosyası, yayınlanmış bir veritabanından sonra yerinde düzenlendiği için
-- eski kurulumlarda eksik tablo kalabiliyor (ör. focus_sessions); Drizzle ise
-- aynı zaman damgasına sahip göçü yeniden çalıştırmıyor. Bu göç tüm şemayı
-- IF NOT EXISTS ile tekrar tanımlar: eksik tablo/index oluşur, var olanlar
-- değişmez. Bundan sonra şema değişiklikleri her zaman YENİ bir göç olarak
-- üretilmeli, 0000 asla düzenlenmemeli.

CREATE TABLE IF NOT EXISTS `ai_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`purpose` text NOT NULL,
	`tokens_in` integer,
	`tokens_out` integer,
	`cost_est` real,
	`latency_ms` integer,
	`status` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `ai_runs_created_idx` ON `ai_runs` (`created_at`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `areas` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`color` text,
	`icon` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `chat_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`thread_id` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`model` text,
	`tokens_in` integer,
	`tokens_out` integer,
	`cost_est` real,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`thread_id`) REFERENCES `chat_threads`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "chat_messages_role_check" CHECK("chat_messages"."role" in ('user','assistant','system'))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `chat_messages_thread_idx` ON `chat_messages` (`thread_id`,`created_at`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `chat_threads` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `daily_plans` (
	`date` text PRIMARY KEY NOT NULL,
	`energy` integer,
	`intention` text,
	`capacity_min` integer,
	`ai_summary` text,
	CONSTRAINT "daily_plans_energy_check" CHECK("daily_plans"."energy" between 1 and 5)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `focus_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text,
	`planned_min` integer,
	`actual_min` integer,
	`interruptions` integer DEFAULT 0 NOT NULL,
	`mood` text,
	`started_at` text NOT NULL,
	`ended_at` text,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `focus_sessions_started_idx` ON `focus_sessions` (`started_at`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `ideas` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`body` text,
	`first_step` text,
	`constraints_json` text,
	`score` real,
	`status` text DEFAULT 'spark' NOT NULL,
	`source` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	CONSTRAINT "ideas_status_check" CHECK("ideas"."status" in ('spark','saved','committed','archived'))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `ideas_status_idx` ON `ideas` (`status`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `note_links` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`target_title` text NOT NULL,
	`resolved_id` text,
	FOREIGN KEY (`source_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`resolved_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `note_links_resolved_idx` ON `note_links` (`resolved_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `note_links_source_idx` ON `note_links` (`source_id`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `note_tags` (
	`note_id` text NOT NULL,
	`tag_id` text NOT NULL,
	PRIMARY KEY(`note_id`, `tag_id`),
	FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `notes` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`body_md` text DEFAULT '' NOT NULL,
	`folder` text,
	`is_daily` integer DEFAULT 0 NOT NULL,
	`daily_date` text,
	`content_hash` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `notes_updated_idx` ON `notes` (`updated_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `notes_daily_idx` ON `notes` (`is_daily`,`daily_date`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`area_id` text,
	`name` text NOT NULL,
	`color` text,
	`archived` integer DEFAULT 0 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`area_id`) REFERENCES `areas`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `projects_area_idx` ON `projects` (`area_id`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `tags_name_unique` ON `tags` (`name`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `task_events` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`type` text NOT NULL,
	`payload_json` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `task_events_task_idx` ON `task_events` (`task_id`,`created_at`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text,
	`parent_id` text,
	`title` text NOT NULL,
	`notes` text,
	`status` text DEFAULT 'open' NOT NULL,
	`priority` integer DEFAULT 0 NOT NULL,
	`estimate_min` integer,
	`actual_min` integer,
	`due_at` text,
	`scheduled_at` text,
	`energy` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`recurring_rule` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`completed_at` text,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`parent_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "tasks_status_check" CHECK("tasks"."status" in ('open','done','carried','dropped')),
	CONSTRAINT "tasks_energy_check" CHECK("tasks"."energy" in ('low','mid','high')),
	CONSTRAINT "tasks_priority_check" CHECK("tasks"."priority" in (0, 1))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `tasks_status_scheduled_idx` ON `tasks` (`status`,`scheduled_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `tasks_project_idx` ON `tasks` (`project_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `tasks_created_idx` ON `tasks` (`created_at`);