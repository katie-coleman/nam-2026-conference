import { test, expect } from '@playwright/test';
import { visit, momentOn, laneFor, shotForPR, API } from './helpers.js';

test.describe('Interests', () => {
  test('the name menu opens a topic picker whose saved ticks survive a reload', async ({ page, request }, testInfo) => {
    const { user } = await laneFor('interests.menu', testInfo);
    const at = await momentOn(0, '07:00');
    const bootstrap = await (await request.get(`${API}/bootstrap`)).json();
    const topics = bootstrap.tags.filter((t) => t.kind === 'topic');
    const original = (await (await request.get(`${API}/users/${user}`)).json()).interests;

    const open = async () => {
      await page.getByRole('button', { name: /Switch attendee/ }).click();
      await page.getByTestId('open-interests').click();
      await expect(page.getByTestId('interests-dialog')).toBeVisible();
    };
    const ticked = () => page.getByTestId('interests-dialog').locator('[aria-checked="true"]');

    try {
      await request.put(`${API}/users/${user}/interests`, { data: { interests: [topics[0].name] } });
      await visit(page, '/', { as: user, at });
      await open();

      // every topic tag and no other kind; the saved interest is ticked
      await expect(page.getByTestId('interests-dialog').getByRole('checkbox')).toHaveCount(topics.length);
      await expect(ticked()).toHaveCount(1);
      await expect(page.getByTestId(`interest-${topics[0].slug}`)).toHaveAttribute('aria-checked', 'true');

      // tick another, save, reload, reopen: both ticked
      await page.getByTestId(`interest-${topics[1].slug}`).click();
      await shotForPR(page, 'Interests dialog');
      await page.getByTestId('interests-save').click();
      await expect(page.getByTestId('interests-dialog')).toBeHidden();
      await visit(page, '/', { as: user, at });
      await open();
      await expect(ticked()).toHaveCount(2);
      await expect(page.getByTestId(`interest-${topics[1].slug}`)).toHaveAttribute('aria-checked', 'true');

      // untick everything, save an empty selection, reopen: none ticked
      await page.getByTestId(`interest-${topics[0].slug}`).click();
      await page.getByTestId(`interest-${topics[1].slug}`).click();
      await page.getByTestId('interests-save').click();
      await expect(page.getByTestId('interests-dialog')).toBeHidden();
      await visit(page, '/', { as: user, at });
      await open();
      await expect(ticked()).toHaveCount(0);

      // Escape closes without saving
      await page.getByTestId(`interest-${topics[2].slug}`).click();
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('interests-dialog')).toBeHidden();
      expect((await (await request.get(`${API}/users/${user}`)).json()).interests).toEqual([]);
    } finally {
      await request.put(`${API}/users/${user}/interests`, { data: { interests: original } });
    }
  });

  test('ticking a topic moves and resizes nothing, and the order never changes', async ({ page, request }, testInfo) => {
    const { user } = await laneFor('interests.layout', testInfo);
    const at = await momentOn(0, '07:00');
    const bootstrap = await (await request.get(`${API}/bootstrap`)).json();
    const topics = bootstrap.tags.filter((t) => t.kind === 'topic');
    const original = (await (await request.get(`${API}/users/${user}`)).json()).interests;
    const dialog = page.getByTestId('interests-dialog');

    const open = async () => {
      await page.getByRole('button', { name: /Switch attendee/ }).click();
      await page.getByTestId('open-interests').click();
      await expect(dialog).toBeVisible();
    };
    const order = () => dialog.getByRole('checkbox').evaluateAll((els) => els.map((e) => e.dataset.testid));
    const boxes = async () => {
      // the panel rises in on open; measure once it has settled
      await page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect.getComputedTiming().iterations !== Infinity).map((a) => a.finished.catch(() => {}))));
      const out = {};
      for (const t of topics) out[t.slug] = await page.getByTestId(`interest-${t.slug}`).boundingBox();
      out.save = await page.getByTestId('interests-save').boundingBox();
      out.cancel = await dialog.getByRole('button', { name: 'Cancel' }).boundingBox();
      return out;
    };
    const expected = topics.map((t) => `interest-${t.slug}`);

    try {
      await request.put(`${API}/users/${user}/interests`, { data: { interests: [] } });
      await visit(page, '/', { as: user, at });
      await open();
      expect(await order()).toEqual(expected);
      const before = await boxes();

      const first = page.getByTestId(`interest-${topics[0].slug}`);
      const borderOff = await first.evaluate((e) => getComputedStyle(e).borderColor);
      await first.click();
      await expect(first).toHaveAttribute('aria-checked', 'true');
      expect(await first.evaluate((e) => getComputedStyle(e).borderColor)).not.toBe(borderOff);
      await shotForPR(page, 'Interests dialog with a topic ticked, nothing moved');
      expect(await boxes()).toEqual(before);
      expect(await order()).toEqual(expected);

      await first.click();
      await expect(first).toHaveAttribute('aria-checked', 'false');
      expect(await boxes()).toEqual(before);

      // save a tick, reload, reopen: same order, same layout
      await page.getByTestId(`interest-${topics[1].slug}`).click();
      await page.getByTestId('interests-save').click();
      await expect(dialog).toBeHidden();
      await visit(page, '/', { as: user, at });
      await open();
      expect(await order()).toEqual(expected);
      await expect(page.getByTestId(`interest-${topics[1].slug}`)).toHaveAttribute('aria-checked', 'true');
      expect(await boxes()).toEqual(before);
    } finally {
      await request.put(`${API}/users/${user}/interests`, { data: { interests: original } });
    }
  });
});
