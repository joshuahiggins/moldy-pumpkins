import { test } from 'node:test';
import assert from 'node:assert';
import { login, searchSeries } from '../src/thetvdb.js';

process.env.TVDB_KEY = 'tvdbkey';
process.env.TVDB_PIN = 'pin123';

test('login posts apikey + pin and returns the token', async () => {
  const getJson = async (url: string, options?: RequestInit) => {
    assert.strictEqual(url, 'https://api4.thetvdb.com/v4/login');
    assert.strictEqual(options?.method, 'POST');
    const body = JSON.parse(options?.body as string) as { apikey: string; pin: string };
    assert.strictEqual(body.apikey, 'tvdbkey');
    assert.strictEqual(body.pin, 'pin123');
    return { data: { token: 'BEARER123' } };
  };
  const token = await login({ getJson });
  assert.strictEqual(token, 'BEARER123');
});

test('searchSeries returns tvdbId and poster from first result', async () => {
  const getJson = async (url: string, options?: RequestInit) => {
    assert.ok(url.includes('/v4/search'));
    assert.ok(url.includes('query=Hacks'));
    assert.ok(url.includes('type=series'));
    const headers = options?.headers as Record<string, string>;
    assert.strictEqual(headers.Authorization, 'Bearer BEARER123');
    return { data: [{ tvdb_id: '350665', name: 'Hacks', image_url: 'https://img/hacks.jpg' }] };
  };
  const result = await searchSeries('Hacks', 'BEARER123', { getJson });
  assert.deepStrictEqual(result, { tvdbId: 350665, poster_url: 'https://img/hacks.jpg' });
});

test('searchSeries returns null when no results', async () => {
  const getJson = async () => ({ data: [] });
  const result = await searchSeries('Nope', 'BEARER123', { getJson });
  assert.strictEqual(result, null);
});
