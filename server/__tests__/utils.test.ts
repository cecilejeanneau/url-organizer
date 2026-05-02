import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  safeHostFromUrl,
  parseUrlsFromMarkdown,
  normalizeCategoryName,
  normalizeCategoryColor,
  normalizeCategoryIcon,
} from '../utils';

/**
 * Unit tests for server/utils.ts — pure functions, no DB required.
 *
 * Run:  pnpm test
 */

// ── safeHostFromUrl ────────────────────────────────────────────────────────────

describe('safeHostFromUrl', () => {
  it('strips www. prefix', () =>
    assert.equal(safeHostFromUrl('https://www.example.com/path?q=1'), 'example.com'));

  it('handles no www', () =>
    assert.equal(safeHostFromUrl('https://github.com'), 'github.com'));

  it('lowercases the host', () =>
    assert.equal(safeHostFromUrl('https://GitHub.COM'), 'github.com'));

  it('returns invalid-host for a bare string', () =>
    assert.equal(safeHostFromUrl('not-a-url'), 'invalid-host'));

  it('returns invalid-host for empty string', () =>
    assert.equal(safeHostFromUrl(''), 'invalid-host'));
});

// ── parseUrlsFromMarkdown ──────────────────────────────────────────────────────

describe('parseUrlsFromMarkdown', () => {
  it('parses markdown bullet URLs', () => {
    const md = '# Title\n- https://example.com\n- https://github.com\nignored line';
    assert.deepEqual(parseUrlsFromMarkdown(md), ['https://example.com', 'https://github.com']);
  });

  it('deduplicates identical URLs', () => {
    const md = '- https://example.com\n- https://example.com';
    assert.deepEqual(parseUrlsFromMarkdown(md), ['https://example.com']);
  });

  it('ignores non-bullet lines and non-http URLs', () => {
    const md = 'https://example.com\nftp://ftp.test.com\n- https://keep.me';
    assert.deepEqual(parseUrlsFromMarkdown(md), ['https://keep.me']);
  });

  it('returns empty array for empty input', () =>
    assert.deepEqual(parseUrlsFromMarkdown(''), []));
});

// ── normalizeCategoryName ──────────────────────────────────────────────────────

describe('normalizeCategoryName', () => {
  it('trims whitespace', () =>
    assert.equal(normalizeCategoryName('  Tools  '), 'Tools'));

  it('returns empty string for null', () =>
    assert.equal(normalizeCategoryName(null), ''));

  it('returns empty string for undefined', () =>
    assert.equal(normalizeCategoryName(undefined), ''));
});

// ── normalizeCategoryColor ─────────────────────────────────────────────────────

describe('normalizeCategoryColor', () => {
  it('accepts a valid 6-digit hex', () =>
    assert.equal(normalizeCategoryColor('#ff0000'), '#ff0000'));

  it('accepts uppercase hex', () =>
    assert.equal(normalizeCategoryColor('#AABBCC'), '#AABBCC'));

  it('falls back on named color', () =>
    assert.equal(normalizeCategoryColor('red'), '#3b82f6'));

  it('falls back on empty string', () =>
    assert.equal(normalizeCategoryColor(''), '#3b82f6'));

  it('falls back on 3-digit hex', () =>
    assert.equal(normalizeCategoryColor('#fff'), '#3b82f6'));
});

// ── normalizeCategoryIcon ──────────────────────────────────────────────────────

describe('normalizeCategoryIcon', () => {
  it('returns the given emoji', () =>
    assert.equal(normalizeCategoryIcon('🔧'), '🔧'));

  it('falls back to 📁 on empty string', () =>
    assert.equal(normalizeCategoryIcon(''), '📁'));

  it('falls back to 📁 for null', () =>
    assert.equal(normalizeCategoryIcon(null), '📁'));
});
