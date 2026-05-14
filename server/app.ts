import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { db, DB_NAME } from './db';
import { asyncHandler } from './utils';

import urlRouter      from './routes/url';
import categoryRouter from './routes/category';
import ingestRouter   from './routes/ingest';

const app = express();
const isDev = process.env.NODE_ENV !== 'production';

// ── Live-reload (dev only) ─────────────────────────────────────────────────────
const liveReloadClients = new Set<Response>();

if (isDev) {
  const publicDir = path.join(__dirname, '..', 'public');
  fs.watch(publicDir, { recursive: true }, (_event, filename) => {
    if (!filename) return;
    for (const res of liveReloadClients) {
      try { res.write('data: reload\n\n'); } catch { /* client gone */ }
    }
  });
}

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, '..', 'public'), {
  etag: !isDev,
  lastModified: !isDev,
  maxAge: isDev ? 0 : '1h',
  setHeaders: (res) => {
    if (!isDev) return;
    // Avoid stale HTML/CSS/JS during local development.
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
  },
}));
app.use(express.static(path.join(__dirname, '..', 'public'), {
  etag: !isDev,
  lastModified: !isDev,
  maxAge: isDev ? 0 : '1h',
  setHeaders: (res) => {
    if (!isDev) return;
    // Avoid stale HTML/CSS/JS during local development.
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
  },
}));

// ── API Routes ─────────────────────────────────────────────────────────────────
app.use('/api/urls',       urlRouter);
app.use('/api/categories', categoryRouter);
app.use('/api/ingest',     ingestRouter);

/** Health check — verifies MongoDB connectivity */
app.get('/api/health', asyncHandler(async (_req, res) => {
  await db().command({ ping: 1 });
  res.json({ ok: true, db: DB_NAME });
}));

/** Dev live-reload SSE endpoint */
if (isDev) {
  app.get('/__livereload', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    liveReloadClients.add(res);
    req.on('close', () => liveReloadClients.delete(res));
  });
}

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
