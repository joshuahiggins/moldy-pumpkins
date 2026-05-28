import { getJson as defaultGetJson } from './http.js';
import { config } from './config.js';
import type { MovieMatch } from './types.js';

const BASE = 'https://api.themoviedb.org/3';

interface TmdbSearchResponse {
  results?: { id?: number }[];
}

interface TmdbMovieResponse {
  imdb_id?: string | null;
  poster_path?: string | null;
}

export interface TmdbDeps {
  getJson?: typeof defaultGetJson;
}

/** Resolves a movie title (optionally year-filtered) to its IMDb id and poster. */
export async function searchMovie(
  title: string,
  year?: number,
  deps: TmdbDeps = {},
): Promise<MovieMatch | null> {
  const getJson = deps.getJson ?? defaultGetJson;

  const params = new URLSearchParams({ api_key: config.TMDB_KEY, query: title });
  if (year) params.set('year', String(year));

  const search = (await getJson(`${BASE}/search/movie?${params.toString()}`)) as TmdbSearchResponse;
  const first = search.results?.[0];
  if (!first?.id) return null;

  const movie = (await getJson(
    `${BASE}/movie/${first.id}?api_key=${config.TMDB_KEY}`,
  )) as TmdbMovieResponse;
  if (!movie.imdb_id) return null;

  return {
    imdb_id: movie.imdb_id,
    poster_url: movie.poster_path ? config.TMDB_POSTER_URL + movie.poster_path : null,
  };
}
