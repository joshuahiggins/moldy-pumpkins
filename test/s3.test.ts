import { test } from 'node:test';
import assert from 'node:assert';
import type { PutObjectCommand, PutObjectCommandInput } from '@aws-sdk/client-s3';
import { uploadJson } from '../src/s3.js';
import type { S3Like } from '../src/s3.js';

process.env.S3_BUCKET = 'moldy-pumpkins';

test('uploadJson sends a PutObject with json body and content type', async () => {
  const sent: PutObjectCommandInput[] = [];
  const fakeClient: S3Like = {
    send: async (cmd: PutObjectCommand) => {
      sent.push(cmd.input);
      return {};
    },
  };
  await uploadJson('movies.json', [{ title: 'X', imdb_id: 'tt1' }], { client: fakeClient });

  assert.strictEqual(sent.length, 1);
  assert.strictEqual(sent[0]?.Bucket, 'moldy-pumpkins');
  assert.strictEqual(sent[0]?.Key, 'movies.json');
  assert.strictEqual(sent[0]?.ContentType, 'application/json');
  assert.deepStrictEqual(JSON.parse(sent[0]?.Body as string), [{ title: 'X', imdb_id: 'tt1' }]);
});
