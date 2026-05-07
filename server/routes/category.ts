import { Router } from 'express';
import { urls as urlsCol, categories as categoriesCol } from '../db';
import {
  normalizeCategoryName,
  normalizeCategoryColor,
  normalizeCategoryIcon,
  asyncHandler,
} from '../utils';

/**
 * Category routes — mounted at /api/categories
 *
 * GET    /api/categories       List categories merged with live URL counts
 * POST   /api/categories       Create (or upsert) a category
 * PATCH  /api/categories/:name Rename + update color/icon; cascades to urls
 */

const router = Router();

// ── GET /api/categories ────────────────────────────────────────────────────────

router.get('/', asyncHandler(async (_req, res) => {
  // Run both queries in parallel
  const [usageRows, metaRows] = await Promise.all([
    urlsCol()
      .aggregate([
        { $match: { deleted: { $ne: true }, category: { $ne: '' } } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ])
      .toArray(),

    categoriesCol()
      .find({})
      .project({ name: 1, color: 1, icon: 1 })
      .sort({ name: 1 })
      .toArray(),
  ]);

  // Merge usage counts with stored metadata
  const merged = new Map<string, { name: string; count: number; color: string; icon: string }>();

  for (const row of usageRows) {
    const id = row['_id'] as string;
    merged.set(id, { name: id, count: row['count'] as number, color: '#3b82f6', icon: '📁' });
  }

  for (const meta of metaRows) {
    const name = meta['name'] as string;
    const prev = merged.get(name) ?? { name, count: 0, color: '#3b82f6', icon: '📁' };
    merged.set(name, {
      ...prev,
      color: normalizeCategoryColor(meta['color']),
      icon: normalizeCategoryIcon(meta['icon']),
    });
  }

  const categories = [...merged.values()].sort((a, b) => a.name.localeCompare(b.name));
  res.json({ ok: true, categories });
}));

// ── POST /api/categories ───────────────────────────────────────────────────────

router.post('/', asyncHandler(async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const name = normalizeCategoryName(body['name']);
  const color = normalizeCategoryColor(body['color']);
  const icon = normalizeCategoryIcon(body['icon']);

  if (!name) {
    res.status(400).json({ ok: false, error: 'Category name is required.' });
    return;
  }

  await categoriesCol().updateOne(
    { name },
    {
      $set: { name, color, icon, updatedAt: new Date() },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  );

  const saved = await categoriesCol().findOne({ name }, { projection: { name: 1, color: 1, icon: 1 } });

  res.json({ ok: true, category: { name, color, icon } });
}));

// ── PATCH /api/categories/:name ────────────────────────────────────────────────

router.patch('/:name', asyncHandler(async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const categoryName = decodeURIComponent(req.params.name);
  const nextName = normalizeCategoryName(body['name'] ?? categoryName);
  const color = normalizeCategoryColor(body['color']);
  const icon = normalizeCategoryIcon(body['icon']);

  if (!categoryName || !nextName) {
    res.status(400).json({ ok: false, error: 'Category name is required.' });
    return;
  }

  // Cascade rename to all URLs referencing the old name
  if (nextName !== categoryName) {
    await urlsCol().updateMany(
      { category: categoryName },
      { $set: { category: nextName, updatedAt: new Date() } }
    );
    await categoriesCol().deleteOne({ name: categoryName });
  }

  await categoriesCol().updateOne(
    { name: nextName },
    {
      $set: { name: nextName, color, icon, updatedAt: new Date() },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  );

  res.json({ ok: true, category: { name: nextName, color, icon } });
}));

export default router;
