import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseBrowseHtml, fetchList } from '../src/scraper.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = readFileSync(join(here, 'fixtures', 'browse-sample.html'), 'utf8');

test('parseBrowseHtml extracts only grid tiles in order', () => {
  const items = parseBrowseHtml(fixture, 'movie');
  assert.strictEqual(items.length, 3); // stray poster-tile excluded
  assert.deepStrictEqual(
    items.map((i) => i.title),
    ['Backrooms', 'The Perfect Neighbor', "Good Luck, Have Fun, Don't Die & Win"],
  );
});

test('parseBrowseHtml decodes HTML entities in titles', () => {
  const items = parseBrowseHtml(fixture, 'movie');
  assert.strictEqual(items[2]?.title, "Good Luck, Have Fun, Don't Die & Win");
});

test('parseBrowseHtml derives year from a trailing slug year', () => {
  const items = parseBrowseHtml(fixture, 'movie');
  assert.strictEqual(items[0]?.year, undefined);
  assert.strictEqual(items[1]?.year, 2025);
});

test('parseBrowseHtml stamps the provided type and slug', () => {
  const items = parseBrowseHtml(fixture, 'movie');
  assert.strictEqual(items[0]?.type, 'movie');
  assert.strictEqual(items[0]?.slug, '/m/backrooms');
});

test('fetchList fetches then parses', async () => {
  const getText = async (url: string) => {
    assert.strictEqual(url, 'https://example.test/list');
    return fixture;
  };
  const items = await fetchList('https://example.test/list', 'movie', { getText });
  assert.strictEqual(items.length, 3);
});
