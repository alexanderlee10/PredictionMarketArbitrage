import cron from 'node-cron';
import { runScan } from './scanner';
import { getSettings } from '@/lib/settings';
import { logger } from '@/lib/logger';
import { initDb } from '@/lib/db';

async function main() {
  await initDb();
  const settings = await getSettings();

  logger.info('Starting scanner scheduler', {
    intervalSeconds: settings.refreshIntervalSeconds,
    mockMode: settings.useMockData,
  });

  // Run immediately on start
  await runScan();

  const cronExpr = `*/${Math.max(1, Math.floor(settings.refreshIntervalSeconds / 60))} * * * *`;
  cron.schedule(cronExpr, async () => {
    try {
      await runScan();
    } catch (err) {
      logger.error('Scheduled scan failed', { err });
    }
  });

  logger.info(`Scheduler running (cron: ${cronExpr})`);
}

main().catch((err) => {
  logger.error('Scheduler fatal error', { err });
  process.exit(1);
});
