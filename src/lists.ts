import type { ListDef } from './types.js';

/**
 * The browse lists this pipeline publishes. Source URLs live here (and only
 * here); everything downstream is brand-neutral.
 */
export const lists: ListDef[] = [
  {
    name: 'Movies: Certified Fresh in Theaters',
    url: 'https://www.rottentomatoes.com/browse/movies_in_theaters/critics:certified_fresh~sort:popular',
    type: 'movie',
    outputKey: 'movies-certified-fresh-in-theaters.json',
  },
  {
    name: 'Movies: Certified Fresh at Home',
    url: 'https://www.rottentomatoes.com/browse/movies_at_home/critics:certified_fresh~sort:popular',
    type: 'movie',
    outputKey: 'movies-certified-fresh-at-home.json',
  },
  {
    name: 'Movies: Most Popular Coming Soon',
    url: 'https://www.rottentomatoes.com/browse/movies_coming_soon/sort:popular',
    type: 'movie',
    outputKey: 'movies-most-popular-coming-soon.json',
  },
  {
    name: 'TV: Certified Fresh Newest',
    url: 'https://www.rottentomatoes.com/browse/tv_series_browse/critics:fresh~sort:newest',
    type: 'tv',
    outputKey: 'tv-certified-fresh-newest.json',
  },
  {
    name: 'TV: Certified Fresh Most Popular',
    url: 'https://www.rottentomatoes.com/browse/tv_series_browse/critics:fresh~sort:popular',
    type: 'tv',
    outputKey: 'tv-certified-fresh-most-popular.json',
  },
];
