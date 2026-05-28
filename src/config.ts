/**
 * Runtime configuration, read lazily from the environment.
 *
 * Values are exposed as getters so they reflect `process.env` at access time.
 * That keeps the deployed Lambda free of any file loading (env vars come from
 * the SAM template) while letting tests set `process.env` and read back without
 * re-importing the module. Local development loads a `.env` via `src/local.ts`.
 */

/** Environment variables the pipeline cannot run without. */
const REQUIRED = ['TMDB_KEY', 'TVDB_KEY'] as const;

export const config = {
  /** TMDB v3 API key, used to resolve movie titles to an `imdb_id`. */
  get TMDB_KEY(): string {
    return process.env.TMDB_KEY ?? '';
  },
  /** Base URL prepended to TMDB poster paths. */
  get TMDB_POSTER_URL(): string {
    return process.env.TMDB_POSTER_URL ?? 'https://image.tmdb.org/t/p/w500';
  },
  /** TheTVDB v4 API key, used to resolve TV titles to a `tvdbId`. */
  get TVDB_KEY(): string {
    return process.env.TVDB_KEY ?? '';
  },
  /** TheTVDB subscriber PIN. Only required for user-subscription keys. */
  get TVDB_PIN(): string {
    return process.env.TVDB_PIN ?? '';
  },
  /** Destination bucket for the published JSON lists. */
  get S3_BUCKET(): string {
    return process.env.S3_BUCKET ?? 'moldy-pumpkins';
  },
  /** When true, resolve and log the lists instead of uploading to S3. */
  get DRY_RUN(): boolean {
    return ['true', '1'].includes((process.env.DRY_RUN ?? '').toLowerCase());
  },
  /** Returns the names of any required variables that are unset. */
  missingRequired(): string[] {
    return REQUIRED.filter((key) => !process.env[key]);
  },
};
