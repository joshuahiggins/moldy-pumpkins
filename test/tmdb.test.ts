import { test } from 'node:test';
import assert from 'node:assert';
import { searchMovie } from '../src/tmdb.js';

process.env.TMDB_KEY = 'testkey';
process.env.TMDB_POSTER_URL = 'https://image.tmdb.org/t/p/w500';

test('searchMovie resolves title to imdb_id and poster_url', async () => {
  const getJson = async (url: string) => {
    if (url.includes('/search/movie')) {
      assert.ok(url.includes('query=Backrooms'));
      assert.ok(url.includes('year=2026'));
      return { results: [{ id: 42 }] };
    }
    if (url.includes('/movie/42')) {
      return { imdb_id: 'tt1234567', poster_path: '/abc.jpg' };
    }
    throw new Error(`unexpected url ${url}`);
  };
  const result = await searchMovie('Backrooms', 2026, { getJson });
  assert.deepStrictEqual(result, {
    imdb_id: 'tt1234567',
    poster_url: 'https://image.tmdb.org/t/p/w500/abc.jpg',
  });
});

test('searchMovie returns null when no results', async () => {
  const getJson = async () => ({ results: [] });
  const result = await searchMovie('Nonexistent', undefined, { getJson });
  assert.strictEqual(result, null);
});

test('searchMovie returns null when movie has no imdb_id', async () => {
  const getJson = async (url: string) =>
    url.includes('/search/movie') ? { results: [{ id: 7 }] } : { imdb_id: null, poster_path: null };
  const result = await searchMovie('Obscure', undefined, { getJson });
  assert.strictEqual(result, null);
});
