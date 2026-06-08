import { eq } from 'drizzle-orm';
import { getDb, initDb, persistDb } from '@/lib/db';
import { settings } from '@/lib/db/schema';
import { AppSettings, AppSettingsSchema, DEFAULT_SETTINGS, SETTING_KEYS } from '@/lib/config';

function serializeValue(value: unknown): string {
  return JSON.stringify(value);
}

function deserializeValue(key: keyof AppSettings, raw: string): unknown {
  const parsed = JSON.parse(raw);
  return AppSettingsSchema.shape[key].parse(parsed);
}

export async function getSettings(): Promise<AppSettings> {
  await initDb();
  const db = getDb();
  const rows = await db.select().from(settings);
  const merged = { ...DEFAULT_SETTINGS };

  for (const row of rows) {
    const key = row.key as keyof AppSettings;
    if (!SETTING_KEYS.includes(key)) continue;
    try {
      (merged as Record<string, unknown>)[key] = deserializeValue(key, row.value);
    } catch {
      // keep default on bad stored value
    }
  }

  return AppSettingsSchema.parse(merged);
}

export async function updateSettings(partial: Partial<AppSettings>): Promise<AppSettings> {
  await initDb();
  const db = getDb();
  const current = await getSettings();
  const next = AppSettingsSchema.parse({ ...current, ...partial });
  const now = new Date().toISOString();

  for (const key of SETTING_KEYS) {
    if (!(key in partial)) continue;
    await db
      .insert(settings)
      .values({ key, value: serializeValue(next[key]), updatedAt: now })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: serializeValue(next[key]), updatedAt: now },
      });
  }

  persistDb();
  return next;
}
