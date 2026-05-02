import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { db, DB_NAME } from './db';
import { asyncHandler } from './utils';

import urlRouter      from './routes/url';
import categoryRouter from './routes/category';
import ingestRouter   from './routes/ingest';

/**
 * Express application factory.
 *
 * Does NOT connect to MongoDB and does NOT call listen() — this keeps
 * the app importable in tests without side effects.
 */

const app = express();

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, '..', 'public'), { etag: false }));

// ── API Routes ─────────────────────────────────────────────────────────────────
app.use('/api/urls',       urlRouter);
app.use('/api/categories', categoryRouter);
app.use('/api/ingest',     ingestRouter);

/** Health check — verifies MongoDB connectivity */
app.get('/api/health', asyncHandler(async (_req, res) => {
  await db().command({ ping: 1 });
  res.json({ ok: true, db: DB_NAME });
}));

/** DEBUG endpoint: show raw DB counts and sample docs */
app.get('/api/debug/counts', asyncHandler(async (_req, res) => {
  const urlsCol = db().collection('urls');
  const catsCol = db().collection('categories');

  const totalUrls = await urlsCol.countDocuments();
  const activeUrls = await urlsCol.countDocuments({ deleted: false });
  const totalCats = await catsCol.countDocuments();

  const sampleUrls = await urlsCol.find().limit(3).toArray();
  const sampleCats = await catsCol.find().limit(3).toArray();

  res.json({
    ok: true,
    db: DB_NAME,
    urls: { total: totalUrls, active: activeUrls, sample: sampleUrls },
    categories: { total: totalCats, sample: sampleCats },
  });
}));

// ── 404 ────────────────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ ok: false, error: 'Not found' });
});

// ── Global error handler ───────────────────────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  res.status((err as { status?: number }).status ?? 500).json({
    ok:    false,
    error: err.message || 'Internal error',
  });
});

export default app;
