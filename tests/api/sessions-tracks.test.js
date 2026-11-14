import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { startApi } from './harness.js';

/** `trackSlug` takes one slug or several, comma-separated. */

let api;
let close;
let a;
let b;

const ids = (list) => list.map((s) => s.id).sort((x, y) => x - y);

before(async () => {
  ({ api, close } = await startApi());
  const boot = await api.json('/bootstrap');
  [a, b] = boot.tracks.map((t) => t.slug);
});
after(() => close());

describe('GET /api/sessions?trackSlug=', () => {
  test('one slug returns only that track', async () => {
    const only = await api.json(`/sessions?trackSlug=${a}`);
    assert.ok(only.length > 0);
    assert.ok(only.every((s) => s.track.slug === a));
  });

  test('several slugs return the union of each alone', async () => {
    const ofA = await api.json(`/sessions?trackSlug=${a}`);
    const ofB = await api.json(`/sessions?trackSlug=${b}`);
    const both = await api.json(`/sessions?trackSlug=${a},${b}`);
    assert.deepEqual(ids(both), ids([...ofA, ...ofB]));
    assert.ok(both.length > ofA.length);
  });

  test('stray commas and spaces are ignored', async () => {
    const ofA = await api.json(`/sessions?trackSlug=${a}`);
    const messy = await api.json(`/sessions?trackSlug=,${a}, ,`);
    assert.deepEqual(ids(messy), ids(ofA));
  });
});
