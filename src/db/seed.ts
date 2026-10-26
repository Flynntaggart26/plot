import { getDb } from './client';
import { areas, projects, settings } from './schema';

/**
 * İlk açılış verisi. Idempotent: her açılışta çağrılabilir, var olanı ezmez.
 * Inbox, görevlerin varsayılan kabıdır — kullanıcı proje seçmek zorunda kalmaz.
 */
export const INBOX_AREA_ID = 'area-inbox';
export const INBOX_PROJECT_ID = 'project-inbox';

const DEFAULT_SETTINGS: { key: string; value: string }[] = [
  { key: 'schema_version', value: '1' },
  { key: 'must_do_limit', value: '3' },
  { key: 'locale', value: 'tr' },
];

export function seedDatabase(): void {
  const db = getDb();
  db.transaction((tx) => {
    tx.insert(areas)
      .values({ id: INBOX_AREA_ID, name: 'Inbox', icon: 'tray-outline', sortOrder: 0 })
      .onConflictDoNothing()
      .run();

    tx.insert(projects)
      .values({
        id: INBOX_PROJECT_ID,
        areaId: INBOX_AREA_ID,
        name: 'Inbox',
        sortOrder: 0,
      })
      .onConflictDoNothing()
      .run();

    for (const item of DEFAULT_SETTINGS) {
      tx.insert(settings).values(item).onConflictDoNothing().run();
    }
  });
}
