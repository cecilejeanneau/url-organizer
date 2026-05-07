import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { urls } from '../db';
import { asyncHandler } from '../utils';

/**
 * URL routes — mounted at /api/urls
 *
 * GET    /api/urls     List active URLs (query params: search, category, host)
 * PATCH  /api/urls/:id Update name, category, or deleted flag
 */

const router = Router();

// ── GET /api/urls ──────────────────────────────────────────────────────────────

router.get('/', asyncHandler(async (req, res) => {
  const search = String(req.query.search ?? '').trim().toLowerCase();
  const category = String(req.query.category ?? '').trim();
  const host = String(req.query.host ?? '').trim().toLowerCase();

  const q: Record<string, unknown> = { deleted: { $ne: true } };
  if (category) q.category = category;
  if (host) q.host = host;

  let rows = await urls()
    .find(q)
    .project({ url: 1, host: 1, name: 1, category: 1 })
    .sort({ host: 1, url: 1 })
    .toArray();

  // Client-side full-text filter (dataset is small; avoids a text index)
  if (search) {
    rows = rows.filter(r =>
      String(r['url'] ?? '').toLowerCase().includes(search) ||
      String(r['host'] ?? '').toLowerCase().includes(search) ||
      String(r['name'] ?? '').toLowerCase().includes(search)
    );
  }

  const items = rows.map(r => ({
    id: String(r['_id']),
    url: r['url'] as string,
    host: r['host'] as string,
    name: (r['name'] as string) || '',
    category: (r['category'] as string) || '',
  }));

  res.json({ ok: true, items });
}));

// ── PATCH /api/urls/:id ────────────────────────────────────────────────────────

router.patch('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const body = req.body as Record<string, unknown>;

  // Only allow known, safe fields
  const patch: Record<string, unknown> = {};
  if (typeof body['name'] === 'string') patch['name'] = (body['name'] as string).trim();
  if (typeof body['category'] === 'string') patch['category'] = (body['category'] as string).trim();
  if (typeof body['deleted'] === 'boolean') patch['deleted'] = body['deleted'];

  if (!Object.keys(patch).length) {
    res.status(400).json({ ok: false, error: 'No valid fields to update.' });
    return;
  }

  patch['updatedAt'] = new Date();
  const r = await urls().updateOne({ _id: new ObjectId(id) }, { $set: patch });
  res.json({ ok: true, matched: r.matchedCount, modified: r.modifiedCount });
}));

export default router;
