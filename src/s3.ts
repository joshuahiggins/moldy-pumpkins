import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { config } from './config.js';

const defaultClient = new S3Client({});

/** Minimal S3 client surface this module needs (lets tests inject a fake). */
export interface S3Like {
  send(command: PutObjectCommand): Promise<unknown>;
}

export interface S3Deps {
  client?: S3Like;
}

/** Uploads `data` as a public, day-cached JSON object under `key`. */
export async function uploadJson(key: string, data: unknown, deps: S3Deps = {}): Promise<void> {
  const client: S3Like = deps.client ?? (defaultClient as unknown as S3Like);
  await client.send(
    new PutObjectCommand({
      Bucket: config.S3_BUCKET,
      Key: key,
      Body: JSON.stringify(data),
      ContentType: 'application/json',
      CacheControl: 'max-age=86400',
    }),
  );
}
