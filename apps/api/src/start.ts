/**
 * Start command for single-container hosts (the Render test environment): apply
 * migrations, refresh the catalog seed, then start the API. Production runs migrations
 * as a separate release task instead (see docs/deploy-api.md).
 */
import { runMigrations } from './db/migrate';
import { seed } from './db/seed';

async function start() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required');
  await runMigrations(url);
  await seed(url);
  await import('./main');
}

start().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
