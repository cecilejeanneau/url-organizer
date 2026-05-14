import { Router } from 'express';
import fs from 'fs';
import { urls } from '../db';
import { safeHostFromUrl, parseUrlsFromMarkdown, asyncHandler } from '../utils';
import { IMPORT_DEFAULT_FILE } from '../config';

/**
 * Import route — mounted at /api/import
 *
 * POST /api/import/default  Import URLs from the default Markdown file
 */

const router = Router();

// ── POST /api/import/default ───────────────────────────────────────────────────

// NOTE: default/import-from-server file route removed — importing is done via client file upload

// ── POST /api/ingest/upload ──────────────────────────────────────────────────

router.post('/upload', asyncHandler(async (req, res) => {
  const content = (req.body && typeof req.body.content === 'string') ? req.body.content : null;
  if (!content) {
    res.status(400).json({ ok: false, error: 'Missing content in request body' });
    return;
  }

  const urlList = parseUrlsFromMarkdown(content);
  const stats = await importUrls(urlList);

  res.json({ ok: true, totalParsed: urlList.length, ...stats });
}));

// ── helpers ────────────────────────────────────────────────────────────────────

interface ImportStats {
  inserted: number;
  skipped: number;
}

/**
 * Bulk-insert URLs into MongoDB, silently skipping duplicates.
 */
async function importUrls(urlList: string[]): Promise<ImportStats> {
  let inserted = 0;
  let skipped = 0;

  for (const url of urlList) {
    try {
      await urls().insertOne({
        url,
        host: safeHostFromUrl(url),
        name: '',
        category: '',
        deleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      inserted++;
    } catch (e: unknown) {
      // 11000 = duplicate key (unique index on url) — expected, not an error
      if ((e as { code?: number }).code === 11000) skipped++;
      else throw e;
    }
  }

  return { inserted, skipped };
}

export default router;
