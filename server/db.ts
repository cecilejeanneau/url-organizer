import { MongoClient, Db, Collection } from 'mongodb';
import { MONGO_URI, DB_NAME } from './config';

/**
 * MongoDB connection module.
 *
 * Call connect() once at startup. All other modules obtain live collections
 * via the urls() and categories() getter functions.
 *
 * The client is bounded (small pool) and gracefully closed on process exit
 * to avoid leaking sockets across `tsx watch` restarts, which can exhaust
 * mongod's connection budget over time.
 */

let _client: MongoClient | null = null;
let _db: Db | null = null;
let _shutdownHooked = false;

/**
 * Connect to MongoDB. Idempotent — safe to call multiple times.
 */
export async function connect(): Promise<Db> {
  if (_db) return _db;
  _client = new MongoClient(MONGO_URI, {
    maxPoolSize: 10,
    minPoolSize: 0,
    serverSelectionTimeoutMS: 3000,
    connectTimeoutMS: 3000,
    socketTimeoutMS: 10000,
    waitQueueTimeoutMS: 3000,
  });
  await _client.connect();
  _db = _client.db(DB_NAME);
  hookShutdown();
  return _db;
}

/** Close the MongoClient (used on shutdown / before re-load in dev). */
export async function disconnect(): Promise<void> {
  const client = _client;
  _client = null;
  _db = null;
  if (client) {
    try {
      await client.close(true);
    } catch {
      // Ignore — best-effort shutdown.
    }
  }
}

function hookShutdown(): void {
  if (_shutdownHooked) return;
  _shutdownHooked = true;
  const handler = (): void => {
    void disconnect().finally(() => process.exit(0));
  };
  process.once('SIGINT', handler);
  process.once('SIGTERM', handler);
  process.once('SIGHUP', handler);
  // tsx watch sends SIGUSR2 before reloading on Unix; on Windows it kills the process.
  process.once('beforeExit', () => { void disconnect(); });
}

/**
 * Return the live Db instance. Throws if connect() was not called first.
 */
export function db(): Db {
  if (!_db) throw new Error('DB not initialised — call connect() first');
  return _db;
}

/** Live reference to the urls collection. */
export const urls       = (): Collection => db().collection('urls');

/** Live reference to the categories collection. */
export const categories = (): Collection => db().collection('categories');

export { DB_NAME, MONGO_URI };

