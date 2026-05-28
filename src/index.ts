import { lists as defaultLists } from './lists.js';
import { fetchList as defaultFetchList } from './scraper.js';
import { searchMovie as defaultSearchMovie } from './tmdb.js';
import { login as defaultLogin, searchSeries as defaultSearchSeries } from './thetvdb.js';
import { uploadJson as defaultUploadJson } from './s3.js';
import { config } from './config.js';
import { info, warn, error } from './logger.js';
import type {
  ListDef,
  ListType,
  MovieMatch,
  MovieRecord,
  ScrapedItem,
  SeriesMatch,
  SeriesRecord,
} from './types.js';

/** Resolves scraped movies to published records, skipping (and logging) misses. */
export async function resolveMovies(
  items: ScrapedItem[],
  resolve: (item: ScrapedItem) => Promise<MovieMatch | null>,
): Promise<MovieRecord[]> {
  const records: MovieRecord[] = [];
  for (const item of items) {
    const found = await resolve(item);
    if (found?.imdb_id) {
      records.push({ title: item.title, imdb_id: found.imdb_id, poster_url: found.poster_url });
    } else {
      warn('unresolved movie', { title: item.title });
    }
  }
  return records;
}

/** Resolves scraped series to published records, skipping (and logging) misses. */
export async function resolveSeries(
  items: ScrapedItem[],
  resolve: (item: ScrapedItem) => Promise<SeriesMatch | null>,
): Promise<SeriesRecord[]> {
  const records: SeriesRecord[] = [];
  for (const item of items) {
    const found = await resolve(item);
    if (found?.tvdbId) {
      records.push({ title: item.title, tvdbId: found.tvdbId, poster_url: found.poster_url });
    } else {
      warn('unresolved series', { title: item.title });
    }
  }
  return records;
}

/** Injectable seams for `run`. Anything unset falls back to the real implementation. */
export interface RunDeps {
  lists?: ListDef[];
  fetchList?: (url: string, type: ListType) => Promise<ScrapedItem[]>;
  searchMovie?: (title: string, year?: number) => Promise<MovieMatch | null>;
  login?: () => Promise<string>;
  searchSeries?: (title: string, token: string) => Promise<SeriesMatch | null>;
  uploadJson?: (key: string, data: unknown) => Promise<void>;
  dryRun?: boolean;
  missingRequired?: () => string[];
}

export interface ListSummary {
  found?: number;
  resolved?: number;
  written: boolean;
  dryRun?: boolean;
  error?: string;
}

/**
 * Scrapes, resolves, and publishes every list. Each list is isolated: one
 * failure is recorded in the summary and the rest still run. A list is never
 * uploaded unless it scraped *and* resolved at least one title, so a markup
 * change or bad credentials can never overwrite a live list with an empty one.
 * Throws only if every list fails.
 */
export async function run(deps: RunDeps = {}): Promise<Record<string, ListSummary>> {
  const lists = deps.lists ?? defaultLists;
  const fetchList = deps.fetchList ?? defaultFetchList;
  const searchMovie = deps.searchMovie ?? defaultSearchMovie;
  const login = deps.login ?? defaultLogin;
  const searchSeries = deps.searchSeries ?? defaultSearchSeries;
  const uploadJson = deps.uploadJson ?? defaultUploadJson;
  const dryRun = deps.dryRun ?? config.DRY_RUN;
  const missingRequired = deps.missingRequired ?? config.missingRequired;

  const missing = missingRequired();
  if (missing.length) {
    error('missing required configuration', { missing });
  }

  const summary: Record<string, ListSummary> = {};
  let tvToken: string | null = null;
  let anySuccess = false;

  for (const list of lists) {
    try {
      info('list start', { list: list.name });
      const items = await fetchList(list.url, list.type);
      if (!items.length) {
        throw new Error('scrape returned no items (markup may have changed)');
      }

      let records: MovieRecord[] | SeriesRecord[];
      if (list.type === 'tv') {
        tvToken ??= await login();
        const token = tvToken;
        records = await resolveSeries(items, (item) => searchSeries(item.title, token));
      } else {
        records = await resolveMovies(items, (item) => searchMovie(item.title, item.year));
      }

      if (!records.length) {
        throw new Error('no titles resolved (api credentials may be invalid)');
      }

      if (dryRun) {
        info('dry run - skipping upload', {
          list: list.name,
          outputKey: list.outputKey,
          resolved: records.length,
          records,
        });
        summary[list.name] = {
          found: items.length,
          resolved: records.length,
          written: false,
          dryRun: true,
        };
      } else {
        await uploadJson(list.outputKey, records);
        summary[list.name] = { found: items.length, resolved: records.length, written: true };
      }
      anySuccess = true;
      info('list complete', { list: list.name, resolved: records.length });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      summary[list.name] = { error: message, written: false };
      error('list failed', { list: list.name, error: message });
    }
  }

  if (!anySuccess) throw new Error('All lists failed');
  return summary;
}

/** AWS Lambda entry point. Scheduled daily by the SAM template. */
export const handler = (): Promise<Record<string, ListSummary>> => run();
