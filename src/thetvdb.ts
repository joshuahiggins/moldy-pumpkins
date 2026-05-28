import { getJson as defaultGetJson } from './http.js';
import { config } from './config.js';
import type { SeriesMatch } from './types.js';

const BASE = 'https://api4.thetvdb.com/v4';

interface LoginResponse {
  data: { token: string };
}

interface SearchResponse {
  data?: { tvdb_id?: string; image_url?: string }[];
}

export interface TvdbDeps {
  getJson?: typeof defaultGetJson;
}

/** Authenticates against TheTVDB v4 and returns a bearer token. */
export async function login(deps: TvdbDeps = {}): Promise<string> {
  const getJson = deps.getJson ?? defaultGetJson;
  const body: { apikey: string; pin?: string } = { apikey: config.TVDB_KEY };
  if (config.TVDB_PIN) body.pin = config.TVDB_PIN;

  const res = (await getJson(`${BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })) as LoginResponse;
  return res.data.token;
}

/** Resolves a series title to its TheTVDB id and poster, using a bearer token. */
export async function searchSeries(
  title: string,
  token: string,
  deps: TvdbDeps = {},
): Promise<SeriesMatch | null> {
  const getJson = deps.getJson ?? defaultGetJson;
  const params = new URLSearchParams({ query: title, type: 'series' });

  const res = (await getJson(`${BASE}/search?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  })) as SearchResponse;

  const first = res.data?.[0];
  if (!first) return null;

  const tvdbId = Number(first.tvdb_id);
  if (!tvdbId) return null;

  return { tvdbId, poster_url: first.image_url ?? null };
}
