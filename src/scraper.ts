import { load } from 'cheerio';
import { getText as defaultGetText } from './http.js';
import type { ListType, ScrapedItem } from './types.js';

/** Extracts a release year from a trailing `_YYYY` segment of a slug, if present. */
export function yearFromSlug(slug: string): number | undefined {
  const match = /_(\d{4})$/.exec(slug);
  return match ? Number(match[1]) : undefined;
}

/** Parses a browse-page HTML document into the titles in its media grid. */
export function parseBrowseHtml(html: string, type: ListType): ScrapedItem[] {
  const $ = load(html);
  const items: ScrapedItem[] = [];

  $('[data-qa="discovery-media-list"] poster-tile[media-url]').each((_, el) => {
    const slug = $(el).attr('media-url');
    const title = ($(el).find('rt-img').attr('alt') ?? '').trim();
    if (!slug || !title) return;
    items.push({ title, slug, year: yearFromSlug(slug), type });
  });

  return items;
}

export interface ScraperDeps {
  getText?: typeof defaultGetText;
}

/** Fetches a browse page and parses its titles. */
export async function fetchList(
  url: string,
  type: ListType,
  deps: ScraperDeps = {},
): Promise<ScrapedItem[]> {
  const getText = deps.getText ?? defaultGetText;
  const html = await getText(url);
  return parseBrowseHtml(html, type);
}
