/** Thin `fetch` wrapper: per-request timeout plus exponential-backoff retries. */

const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const DEFAULTS = { retries: 3, baseDelayMs: 300, timeoutMs: 15_000 };

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** Subset of the `Response` shape this module relies on (lets tests use fakes). */
export interface ResponseLike {
  status: number;
  json(): Promise<unknown>;
  text(): Promise<string>;
}

export type FetchLike = (url: string, options?: RequestInit) => Promise<ResponseLike>;

export interface RetryOverrides {
  retries?: number;
  baseDelayMs?: number;
  timeoutMs?: number;
  fetchImpl?: FetchLike;
  sleepImpl?: (ms: number) => Promise<void>;
}

export function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  overrides: RetryOverrides = {},
): Promise<ResponseLike> {
  const { retries, baseDelayMs, timeoutMs, fetchImpl, sleepImpl } = {
    ...DEFAULTS,
    fetchImpl: fetch as FetchLike,
    sleepImpl: defaultSleep,
    ...overrides,
  };

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const res = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs), ...options });
      if (isRetryableStatus(res.status) && attempt < retries) {
        await sleepImpl(baseDelayMs * 2 ** attempt);
        continue;
      }
      return res;
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await sleepImpl(baseDelayMs * 2 ** attempt);
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

export async function getJson(
  url: string,
  options: RequestInit = {},
  overrides: RetryOverrides = {},
): Promise<unknown> {
  const res = await fetchWithRetry(url, options, overrides);
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`GET ${url} failed with status ${res.status}`);
  }
  return res.json();
}

export async function getText(
  url: string,
  options: RequestInit = {},
  overrides: RetryOverrides = {},
): Promise<string> {
  const merged: RequestInit = {
    ...options,
    headers: { 'User-Agent': BROWSER_UA, ...(options.headers ?? {}) },
  };
  const res = await fetchWithRetry(url, merged, overrides);
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`GET ${url} failed with status ${res.status}`);
  }
  return res.text();
}

export { BROWSER_UA };
