import { defineConfig } from 'drizzle-kit';

/**
 * Migration üretimi: `npx drizzle-kit generate`
 * Uygulama migration'ları çalışma anında `useMigrations` ile uygular.
 */
export default defineConfig({
  dialect: 'sqlite',
  driver: 'expo',
  schema: './src/db/schema.ts',
  out: './drizzle',
});
