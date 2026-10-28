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
});
