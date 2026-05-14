import path from 'path';

/**
 * Centralised configuration — override any value via environment variables.
 *
 * PORT          HTTP port to listen on                  (default: 3210)
 * MONGO_URI     MongoDB connection string               (default: localhost)
 * DB_NAME       MongoDB database name                   (default: url_organizer)
 * IMPORT_FILE   Absolute path to the default import MD  (default: .local/*.local)
 */

const ROOT = path.resolve(__dirname, '..');

export const PORT                = Number(process.env.PORT ?? 3210);
export const MONGO_URI           = process.env.MONGO_URI   ?? 'mongodb://127.0.0.1:27017';
export const DB_NAME             = process.env.DB_NAME     ?? 'url_organizer';
export const IMPORT_DEFAULT_FILE = process.env.IMPORT_FILE ?? path.join(ROOT);
