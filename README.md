# moldy-pumpkins

Curated movie and TV browse lists, published daily as JSON for import into
**Radarr** (movies) and **Sonarr** (TV) as custom lists. A scheduled AWS Lambda
builds each list, resolves every title to an `imdb_id` (movies, via TMDB) or a
`tvdbId` (TV, via TheTVDB), and writes the results to public S3 files you can
point your \*arr instance at directly.

You do **not** need to run anything to use these lists — the URLs below are live.

## Use the lists in Radarr / Sonarr

All lists are served from `https://moldy-pumpkins.s3.us-east-1.amazonaws.com/`
and refreshed once per day.

| List                                | App    | URL                                                                                         |
| ----------------------------------- | ------ | ------------------------------------------------------------------------------------------- |
| Movies: Certified Fresh in Theaters | Radarr | <https://moldy-pumpkins.s3.us-east-1.amazonaws.com/movies-certified-fresh-in-theaters.json> |
| Movies: Certified Fresh at Home     | Radarr | <https://moldy-pumpkins.s3.us-east-1.amazonaws.com/movies-certified-fresh-at-home.json>     |
| Movies: Most Popular Coming Soon    | Radarr | <https://moldy-pumpkins.s3.us-east-1.amazonaws.com/movies-most-popular-coming-soon.json>    |
| TV: Certified Fresh Newest          | Sonarr | <https://moldy-pumpkins.s3.us-east-1.amazonaws.com/tv-certified-fresh-newest.json>          |
| TV: Certified Fresh Most Popular    | Sonarr | <https://moldy-pumpkins.s3.us-east-1.amazonaws.com/tv-certified-fresh-most-popular.json>    |

### Add a movie list to Radarr

1. Go to **Settings → Lists** and click **+** to add a list.
2. Under **Advanced**, choose **Custom Lists**.
3. Give it a **Name**, then paste one of the movie URLs above into **List URL**.
4. Set **Monitor**, **Quality Profile**, **Root Folder**, and any tags you want
   applied to titles from this list.
5. Click **Test**, then **Save**.

### Add a TV list to Sonarr

1. Go to **Settings → Import Lists** and click **+** to add a list.
2. Under **Advanced List**, choose **Custom List**.
3. Give it a **Name**, then paste one of the TV URLs above into **List URL**.
4. Set **Quality Profile**, **Root Folder**, and **Monitor** options.
5. Click **Test**, then **Save**.

### Notes

- Lists regenerate once per day; there is no benefit to polling more often.
- Titles drop off as they roll off the source browse lists. To keep what you've
  already grabbed, enable a **List Exclusions**-friendly monitor setting or take
  a library snapshot rather than letting Radarr/Sonarr unmonitor removed titles.
- Movie entries are `{ "title", "imdb_id", "poster_url" }`; TV entries are
  `{ "title", "tvdbId", "poster_url" }`.

---

## Run it yourself

Everything below is for self-hosters who want to publish their own copy of the
lists to their own S3 bucket. Most users do not need this.

### How it works

A single Lambda runs on a daily schedule and, for each configured list:

1. Fetches the source browse page and parses out the titles.
2. Resolves each title to an external ID — movies to `imdb_id` via TMDB, TV to
   `tvdbId` via TheTVDB — and attaches a poster URL.
3. Uploads the resolved array as JSON to a public S3 object.

Each list is isolated: one list failing (or returning empty) never overwrites a
healthy live list, and a run only fails outright if _every_ list fails.

### Tech stack

- **Node 22** + **TypeScript** (ESM), bundled with **esbuild**
- **AWS Lambda** + **SAM** / CloudFormation (arm64)
- **cheerio** for HTML parsing, global `fetch` with retry/backoff
- **AWS SDK v3** (`@aws-sdk/client-s3`) for uploads
- `node:test` for tests (no network or credentials required)

### Environment variables

Configuration is read lazily from environment variables (see `src/config.ts`).

| Variable          | Required | Default                           | Purpose                                                                                                     |
| ----------------- | -------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `TMDB_KEY`        | yes      | —                                 | TMDB v3 API key, used to resolve movie titles to `imdb_id`.                                                 |
| `TVDB_KEY`        | yes      | —                                 | TheTVDB v4 API key, used to resolve TV titles to `tvdbId`.                                                  |
| `TVDB_PIN`        | no       | _(empty)_                         | TheTVDB subscriber PIN. Only required for user-subscription keys; leave unset for project/v4 keys.          |
| `TMDB_POSTER_URL` | no       | `https://image.tmdb.org/t/p/w500` | Base URL prepended to TMDB poster paths.                                                                    |
| `S3_BUCKET`       | no       | `moldy-pumpkins`                  | Destination bucket for the JSON lists.                                                                      |
| `DRY_RUN`         | no       | `false`                           | When `true` (or `1`), resolve and log the lists instead of uploading. See [Dry run](#dry-run-no-s3-writes). |

> The bucket variable is `S3_BUCKET`, not `AWS_BUCKET`: AWS Lambda reserves all
> `AWS_`-prefixed environment-variable names, so the function would refuse to
> deploy with that name.

If a required variable (`TMDB_KEY` or `TVDB_KEY`) is unset when the handler runs,
it logs a `missing required configuration` error naming the absent variables, so
a misconfigured deployment is obvious in the logs rather than surfacing only as
unresolved titles.

### Develop

Requirements:

- Node 22 (`nvm use`)
- AWS CLI configured with credentials that can `s3:PutObject` to your bucket
  (for a real `npm start` only)

Install and run the checks:

```sh
npm install
npm test         # runs against injected fakes + frozen fixtures — no creds/network
npm run lint
npm run typecheck
npm run format   # or format:check in CI
```

#### Setting variables locally

Local runs load a git-ignored `.env` file via `dotenv` (wired up in
`src/local.ts`, the local entry point — the deployed Lambda never imports it):

```sh
# .env
TMDB_KEY=your_tmdb_v3_key
TVDB_KEY=your_thetvdb_v4_key
# TVDB_PIN=your_pin            # only if your TheTVDB key requires one
# TMDB_POSTER_URL=https://image.tmdb.org/t/p/w500
# S3_BUCKET=moldy-pumpkins     # override to write to a test bucket
```

Or export them in your shell before running:

```sh
export TMDB_KEY=your_tmdb_v3_key
export TVDB_KEY=your_thetvdb_v4_key
```

#### Running locally

`npm start` invokes the handler once and prints the per-list summary as JSON.
This performs a **real** fetch, real TMDB/TheTVDB calls, and a real `PutObject`,
so you need both the API keys above and AWS credentials in scope. Point
`S3_BUCKET` at a scratch bucket if you do not want to overwrite live lists.

```sh
npm start
```

#### Dry run (no S3 writes)

Set `DRY_RUN=true` to resolve every list and log the results **without**
uploading. This exercises the full fetch-and-resolve pipeline with only the
TMDB/TheTVDB keys — no AWS credentials or bucket access required.

```sh
npm run start:dry          # equivalent to: DRY_RUN=true npm start
```

Each list prints a `dry run - skipping upload` log line with the resolved
records, and the summary marks every list `{ "written": false, "dryRun": true }`.

### Deploy

The deployed Lambda does **not** read a `.env` file — its environment variables
are set by CloudFormation from the SAM template parameters in `template.yaml`.
You supply secret values as parameter overrides at deploy time.

`BucketName` is **required** and has no default: S3 bucket names share one global
namespace, so each deployment must supply its own globally-unique name (which is
also the bucket SAM creates).

First-time, interactive deploy (prompts for region, stack name, bucket name, and
the secret parameters, then saves your answers to `samconfig.toml`):

```sh
npm run deploy:guided
```

When prompted, supply your bucket name and credentials:

```
BucketName: your-unique-bucket-name
TmdbKey: <TMDB_KEY>
TvdbKey: <TVDB_KEY>
TvdbPin: <TVDB_PIN>   # leave blank if unused
```

Subsequent deploys reuse the saved config:

```sh
npm run deploy
```

Both scripts run `sam build` first, so the deployed artifact always reflects the
current source. To pass parameters non-interactively (e.g. in CI):

```sh
npm run deploy -- --parameter-overrides \
  BucketName=your-unique-bucket-name TmdbKey=<TMDB_KEY> TvdbKey=<TVDB_KEY>
```

| Template parameter | Maps to env var   | Notes                                                          |
| ------------------ | ----------------- | -------------------------------------------------------------- |
| `BucketName`       | `S3_BUCKET`       | **Required**, no default. Names the public bucket SAM creates. |
| `TmdbKey`          | `TMDB_KEY`        | `NoEcho` — not shown in CloudFormation output.                 |
| `TvdbKey`          | `TVDB_KEY`        | `NoEcho`.                                                      |
| `TvdbPin`          | `TVDB_PIN`        | `NoEcho`; defaults to empty. Omit the override if unused.      |
| `TmdbPosterUrl`    | `TMDB_POSTER_URL` | Defaults to the TMDB w500 base URL.                            |

To rotate a key, redeploy with a new `--parameter-overrides` value — there is no
need to touch `.env`, which is local-only.

## License

[MIT](LICENSE)
