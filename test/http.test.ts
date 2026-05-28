import { test } from 'node:test';
import assert from 'node:assert';
import { fetchWithRetry, getJson } from '../src/http.js';
import type { ResponseLike } from '../src/http.js';

const noSleep = () => Promise.resolve();

function fakeResponse(status: number, body: unknown): ResponseLike {
  return {
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

test('fetchWithRetry returns a successful response on first try', async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return fakeResponse(200, {});
  };
  const res = await fetchWithRetry('http://x', {}, { fetchImpl, sleepImpl: noSleep });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(calls, 1);
});

test('fetchWithRetry retries on 503 then succeeds', async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return calls < 3 ? fakeResponse(503, {}) : fakeResponse(200, {});
  };
  const res = await fetchWithRetry('http://x', {}, { fetchImpl, sleepImpl: noSleep, retries: 3 });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(calls, 3);
});

test('fetchWithRetry retries on network error then throws after exhausting retries', async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    throw new Error('ECONNRESET');
  };
  await assert.rejects(
    fetchWithRetry('http://x', {}, { fetchImpl, sleepImpl: noSleep, retries: 2 }),
    /ECONNRESET/,
  );
  assert.strictEqual(calls, 3); // initial + 2 retries
});

test('getJson throws on non-2xx', async () => {
  const fetchImpl = async () => fakeResponse(404, {});
  await assert.rejects(getJson('http://x', {}, { fetchImpl, sleepImpl: noSleep }), /404/);
});

test('getJson returns parsed body on success', async () => {
  const fetchImpl = async () => fakeResponse(200, { hello: 'world' });
  const body = await getJson('http://x', {}, { fetchImpl, sleepImpl: noSleep });
  assert.deepStrictEqual(body, { hello: 'world' });
});
