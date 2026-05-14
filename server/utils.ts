import { URL } from 'url';
import type { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Pure utility functions — no side effects, no DB access.
 * Each function is individually unit-testable.
 */

// ── URL helpers ────────────────────────────────────────────────────────────────

/**
 * Extract the bare hostname from a URL string, stripping "www.".
 * Returns 'invalid-host' on parse failure so callers never receive null/undefined.
 */
export function safeHostFromUrl(rawUrl: string): string {
  try {
    return new URL(rawUrl).host.replace(/^www\./i, '').toLowerCase();
  } catch {
    return 'invalid-host';
  }
}

/**
 * Parse URLs from Markdown text.
 * Recognises bullet lines:  `- https://…`
 * Returns a deduplicated array of valid http(s) URLs.
 */
export function parseUrlsFromMarkdown(text: string): string[] {
  const found: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*-\s+(https?:\/\/\S+)/i);
    if (m) found.push(m[1].trim());
  }
  return [...new Set(found)];
}

// ── Category normalisation ─────────────────────────────────────────────────────

/** Trim whitespace from a category name. Returns '' for falsy input. */
export function normalizeCategoryName(name: unknown): string {
  return String(name ?? '').trim();
}

/**
 * Validate a 6-digit hex colour string.
 * Falls back to the default blue (#3b82f6) for any invalid value.
 */
export function normalizeCategoryColor(color: unknown): string {
  const c = String(color ?? '').trim();
  return /^#[0-9a-fA-F]{6}$/.test(c) ? c : '#3b82f6';
}

/** Trim and validate an icon string (Material Symbols name or emoji). Falls back to folder. */
export function normalizeCategoryIcon(icon: unknown): string {
  const i = String(icon ?? '').trim();
  return i || 'folder';
}

// ── Express helper ─────────────────────────────────────────────────────────────

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/**
 * Wraps an async route handler so that rejected promises are forwarded to
 * Express's next() — compatible with Express 4 error middleware.
 */
export const asyncHandler =
  (fn: AsyncRouteHandler): RequestHandler =>
  (req, res, next) => {
    void fn(req, res, next).catch(next);
  };
