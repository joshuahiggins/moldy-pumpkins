import { test } from 'node:test';
import assert from 'node:assert';
import { format } from '../src/logger.js';

test('format produces parseable JSON with level and message', () => {
  const line = format('info', 'hello', { count: 3 });
  const parsed = JSON.parse(line) as { level: string; message: string; count: number };
  assert.strictEqual(parsed.level, 'info');
  assert.strictEqual(parsed.message, 'hello');
  assert.strictEqual(parsed.count, 3);
});

test('format works with no fields', () => {
  const parsed = JSON.parse(format('error', 'boom')) as { level: string; message: string };
  assert.strictEqual(parsed.level, 'error');
  assert.strictEqual(parsed.message, 'boom');
});
