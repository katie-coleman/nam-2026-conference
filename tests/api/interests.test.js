import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { startApi } from './harness.js';

/**
 * An attendee's topic interests, chosen from the name menu. Only tags of kind
 * 'topic' may be saved; the stored form is the comma-joined names that
 * `users.interests` is seeded in.
 */

const ME = 3;

let api;
let close;
let topics;
let others;

before(async () => {
  ({ api, close } = await startApi());
  const { tags } = await api.json('/bootstrap');
  topics = tags.filter((t) => t.kind === 'topic').map((t) => t.name);
  others = ['tech', 'audience', 'vibe'].map((kind) => tags.find((t) => t.kind === kind).name);
});
after(() => close());

const interestsOf = async () => (await api.json(`/users/${ME}`)).interests;

describe('PUT /users/:id/interests', () => {
  test('saves topic tags, returns the attendee and persists them', async () => {
    const res = await api.put(`/users/${ME}/interests`, { interests: [topics[0], topics[2]] });
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.interests, [topics[0], topics[2]]);
    assert.equal(res.body.id, ME);
    assert.deepEqual(await interestsOf(), [topics[0], topics[2]]);
  });

  test('de-duplicates what it is given', async () => {
    const res = await api.put(`/users/${ME}/interests`, { interests: [topics[1], topics[1]] });
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.interests, [topics[1]]);
  });

  test('an empty selection is allowed and clears the interests', async () => {
    await api.put(`/users/${ME}/interests`, { interests: [topics[0]] });
    const res = await api.put(`/users/${ME}/interests`, { interests: [] });
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.interests, []);
    assert.deepEqual(await interestsOf(), []);
  });

  test('rejects anything that is not a topic tag, leaving what was stored', async () => {
    await api.put(`/users/${ME}/interests`, { interests: [topics[3]] });
    const bad = [
      ...others.map((name) => [name]),
      ['Not A Real Tag'],
      [topics[0], others[0]],
      [42],
      'Evaluation',
      null,
    ];
    for (const interests of bad) {
      const res = await api.put(`/users/${ME}/interests`, { interests });
      assert.equal(res.status, 400, JSON.stringify(interests));
    }
    assert.equal((await api.put(`/users/${ME}/interests`, {})).status, 400);
    assert.deepEqual(await interestsOf(), [topics[3]]);
  });

  test('an unknown attendee is a 404', async () => {
    const res = await api.put('/users/99999/interests', { interests: [topics[0]] });
    assert.equal(res.status, 404);
  });
});
