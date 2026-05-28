import { test } from 'node:test';
import assert from 'node:assert';
import { lists } from '../src/lists.js';

test('there are exactly 5 lists', () => {
  assert.strictEqual(lists.length, 5);
});

test('every list has name, url, type, outputKey', () => {
  for (const list of lists) {
    assert.ok(list.name, 'name');
    assert.match(list.url, /^https:\/\//);
    assert.ok(['movie', 'tv'].includes(list.type), `type ${list.type}`);
    assert.match(list.outputKey, /\.json$/);
  }
});

test('output keys are unique', () => {
  const keys = lists.map((l) => l.outputKey);
  assert.strictEqual(new Set(keys).size, keys.length);
});

test('three movie lists and two tv lists', () => {
  assert.strictEqual(lists.filter((l) => l.type === 'movie').length, 3);
  assert.strictEqual(lists.filter((l) => l.type === 'tv').length, 2);
});
