import { test } from 'node:test';
import assert from 'node:assert';
import { run, resolveMovies, resolveSeries, type RunDeps } from '../src/index.js';
import type { ScrapedItem } from '../src/types.js';

test('resolveMovies keeps resolved titles and skips unresolved', async () => {
  const items: ScrapedItem[] = [
    { title: 'Has Id', slug: '/m/has-id', year: 2025, type: 'movie' },
    { title: 'No Id', slug: '/m/no-id', type: 'movie' },
  ];
  const resolve = async (item: ScrapedItem) =>
    item.title === 'Has Id' ? { imdb_id: 'tt9', poster_url: 'https://p/9.jpg' } : null;

  const records = await resolveMovies(items, resolve);
  assert.deepStrictEqual(records, [
    { title: 'Has Id', imdb_id: 'tt9', poster_url: 'https://p/9.jpg' },
  ]);
});

test('resolveSeries keeps resolved titles and skips unresolved', async () => {
  const items: ScrapedItem[] = [
    { title: 'Show A', slug: '/tv/a', type: 'tv' },
    { title: 'Show B', slug: '/tv/b', type: 'tv' },
  ];
  const resolve = async (item: ScrapedItem) =>
    item.title === 'Show A' ? { tvdbId: 111, poster_url: 'https://p/a.jpg' } : null;

  const records = await resolveSeries(items, resolve);
  assert.deepStrictEqual(records, [
    { title: 'Show A', tvdbId: 111, poster_url: 'https://p/a.jpg' },
  ]);
});

test('run isolates a failing list and still returns a summary', async () => {
  const deps: RunDeps = {
    lists: [
      { name: 'Good', url: 'u1', type: 'movie', outputKey: 'good.json' },
      { name: 'Bad', url: 'u2', type: 'movie', outputKey: 'bad.json' },
    ],
    fetchList: async (url) => {
      if (url === 'u2') throw new Error('rt down');
      return [{ title: 'M', slug: '/m/m', year: 2025, type: 'movie' }];
    },
    searchMovie: async () => ({ imdb_id: 'tt1', poster_url: null }),
    uploadJson: async () => {},
  };
  const summary = await run(deps);
  assert.strictEqual(summary.Good?.written, true);
  assert.strictEqual(summary.Good?.found, 1);
  assert.strictEqual(summary.Bad?.written, false);
  assert.ok(summary.Bad?.error?.includes('rt down'));
});

test('run skips upload when a scrape returns empty (never overwrites a live list)', async () => {
  const uploads: string[] = [];
  const deps: RunDeps = {
    lists: [
      { name: 'Empty', url: 'u1', type: 'movie', outputKey: 'empty.json' },
      { name: 'Good', url: 'u2', type: 'movie', outputKey: 'good.json' },
    ],
    fetchList: async (url) =>
      url === 'u1' ? [] : [{ title: 'M', slug: '/m/m', year: 2025, type: 'movie' }],
    searchMovie: async () => ({ imdb_id: 'tt1', poster_url: null }),
    uploadJson: async (key) => {
      uploads.push(key);
    },
  };
  const summary = await run(deps);
  assert.strictEqual(summary.Empty?.written, false);
  assert.ok(summary.Empty?.error);
  assert.strictEqual(summary.Good?.written, true);
  assert.deepStrictEqual(uploads, ['good.json']);
});

test('run skips upload when nothing resolves (never overwrites a live list)', async () => {
  const uploads: string[] = [];
  const deps: RunDeps = {
    lists: [{ name: 'AllNull', url: 'u1', type: 'movie', outputKey: 'allnull.json' }],
    fetchList: async () => [{ title: 'M', slug: '/m/m', year: 2025, type: 'movie' }],
    searchMovie: async () => null,
    uploadJson: async (key) => {
      uploads.push(key);
    },
  };
  await assert.rejects(run(deps), /All lists failed/);
  assert.deepStrictEqual(uploads, []);
});

test('run logs in once for tv and reuses the token across tv lists', async () => {
  let logins = 0;
  const seenTokens: string[] = [];
  const deps: RunDeps = {
    lists: [
      { name: 'TV1', url: 'u1', type: 'tv', outputKey: 'tv1.json' },
      { name: 'TV2', url: 'u2', type: 'tv', outputKey: 'tv2.json' },
    ],
    fetchList: async () => [{ title: 'Show', slug: '/tv/show', type: 'tv' }],
    login: async () => {
      logins += 1;
      return 'TOKEN';
    },
    searchSeries: async (title, token) => {
      seenTokens.push(token);
      return { tvdbId: 1, poster_url: null };
    },
    uploadJson: async () => {},
  };
  const summary = await run(deps);
  assert.strictEqual(logins, 1);
  assert.deepStrictEqual(seenTokens, ['TOKEN', 'TOKEN']);
  assert.strictEqual(summary.TV1?.written, true);
  assert.strictEqual(summary.TV2?.written, true);
});

test('run in dry-run mode resolves but never uploads', async () => {
  const uploads: string[] = [];
  const deps: RunDeps = {
    dryRun: true,
    lists: [{ name: 'Dry', url: 'u1', type: 'movie', outputKey: 'dry.json' }],
    fetchList: async () => [{ title: 'M', slug: '/m/m', year: 2025, type: 'movie' }],
    searchMovie: async () => ({ imdb_id: 'tt1', poster_url: null }),
    uploadJson: async (key) => {
      uploads.push(key);
    },
  };
  const summary = await run(deps);
  assert.deepStrictEqual(uploads, []);
  assert.strictEqual(summary.Dry?.dryRun, true);
  assert.strictEqual(summary.Dry?.written, false);
  assert.strictEqual(summary.Dry?.resolved, 1);
});

test('run logs an error naming missing required config', async () => {
  const original = process.stdout.write;
  const lines: string[] = [];
  process.stdout.write = ((chunk: string | Uint8Array) => {
    lines.push(String(chunk));
    return true;
  }) as typeof process.stdout.write;
  try {
    const deps: RunDeps = {
      missingRequired: () => ['TMDB_KEY'],
      lists: [{ name: 'Only', url: 'u', type: 'movie', outputKey: 'o.json' }],
      fetchList: async () => [{ title: 'M', slug: '/m/m', year: 2025, type: 'movie' }],
      searchMovie: async () => ({ imdb_id: 'tt1', poster_url: null }),
      uploadJson: async () => {},
    };
    await run(deps);
  } finally {
    process.stdout.write = original;
  }
  const logged = lines.join('');
  assert.match(logged, /missing required configuration/);
  assert.match(logged, /TMDB_KEY/);
});

test('run does not log a config error when nothing is missing', async () => {
  const original = process.stdout.write;
  const lines: string[] = [];
  process.stdout.write = ((chunk: string | Uint8Array) => {
    lines.push(String(chunk));
    return true;
  }) as typeof process.stdout.write;
  try {
    const deps: RunDeps = {
      missingRequired: () => [],
      lists: [{ name: 'Only', url: 'u', type: 'movie', outputKey: 'o.json' }],
      fetchList: async () => [{ title: 'M', slug: '/m/m', year: 2025, type: 'movie' }],
      searchMovie: async () => ({ imdb_id: 'tt1', poster_url: null }),
      uploadJson: async () => {},
    };
    await run(deps);
  } finally {
    process.stdout.write = original;
  }
  assert.doesNotMatch(lines.join(''), /missing required configuration/);
});

test('run throws when every list fails', async () => {
  const deps: RunDeps = {
    lists: [{ name: 'Only', url: 'u', type: 'movie', outputKey: 'o.json' }],
    fetchList: async () => {
      throw new Error('boom');
    },
    searchMovie: async () => null,
    uploadJson: async () => {},
  };
  await assert.rejects(run(deps), /All lists failed/);
});
