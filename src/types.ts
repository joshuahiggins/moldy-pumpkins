/** Shared domain types for the scrape → resolve → publish pipeline. */

export type ListType = 'movie' | 'tv';

/** A browse list to scrape and the S3 key its resolved JSON is written to. */
export interface ListDef {
  name: string;
  url: string;
  type: ListType;
  outputKey: string;
}

/** A single title scraped from an upstream browse page. */
export interface ScrapedItem {
  title: string;
  slug: string;
  year?: number;
  type: ListType;
}

/** A movie resolved against TMDB. */
export interface MovieMatch {
  imdb_id: string;
  poster_url: string | null;
}

/** A series resolved against TheTVDB. */
export interface SeriesMatch {
  tvdbId: number;
  poster_url: string | null;
}

/** Published record consumed by Radarr (movies). */
export interface MovieRecord {
  title: string;
  imdb_id: string;
  poster_url: string | null;
}

/** Published record consumed by Sonarr (TV). */
export interface SeriesRecord {
  title: string;
  tvdbId: number;
  poster_url: string | null;
}
