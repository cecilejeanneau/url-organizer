import 'dotenv/config';

import { connect, urls, categories, MONGO_URI, DB_NAME } from './db';
import { PORT } from './config';
import app from './app';

/**
 * Entry point — connects to MongoDB, creates indexes, then starts HTTP server.
 *
 *   pnpm dev — tsx watch (no compilation step)
 *   pnpm build && pnpm start — compiled JS
 */

async function start(): Promise<void> {
  await connect();

  // Ensure indexes exist (createIndex is idempotent)
  await urls().createIndex({ url: 1 }, { unique: true });
  await urls().createIndex({ deleted: 1, category: 1, host: 1 });
  await categories().createIndex({ name: 1 }, { unique: true });

  app.listen(PORT, () => {
    // Server is listening
  });
}

start().catch(() => {
  process.exit(1);
});
