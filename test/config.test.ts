import { test } from 'node:test';
import assert from 'node:assert';
import { config } from '../src/config.js';

test('config falls back to defaults when env is unset', () => {
  delete process.env.S3_BUCKET;
  delete process.env.TMDB_POSTER_URL;
  assert.strictEqual(config.S3_BUCKET, 'moldy-pumpkins');
  assert.strictEqual(config.TMDB_POSTER_URL, 'https://image.tmdb.org/t/p/w500');
});

test('config reads values from environment', () => {
  process.env.S3_BUCKET = 'my-bucket';
  process.env.TMDB_KEY = 'abc';
  assert.strictEqual(config.S3_BUCKET, 'my-bucket');
  assert.strictEqual(config.TMDB_KEY, 'abc');
});

test('missingRequired lists every unset required key', () => {
  delete process.env.TMDB_KEY;
  delete process.env.TVDB_KEY;
  assert.deepStrictEqual(config.missingRequired().sort(), ['TMDB_KEY', 'TVDB_KEY']);
});

test('missingRequired is empty when required keys are present', () => {
  process.env.TMDB_KEY = 'abc';
  process.env.TVDB_KEY = 'def';
  assert.deepStrictEqual(config.missingRequired(), []);
});
