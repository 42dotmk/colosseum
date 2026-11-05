import { test, expect, type Page } from '@playwright/test';
import net from 'node:net';
import { createAdminSession, USERS, type UserName } from '../../helpers/api';
import { SOLUTIONS, SUM_TESTS, World } from '../../helpers/world';

const login = async (page: Page, name: UserName) => {
  await page.goto('/login');
  await page.locator('input').nth(0).fill(USERS[name].email);
  await page.locator('input[type=password]').fill(USERS[name].password);
  await page.getByRole('button', { name: /log ?in|sign ?in/i }).click();
  await page.waitForURL((url) => url.pathname === '/', { timeout: 20_000 });
};

const setEditorCode = async (page: Page, code: string) => {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.locator('.monaco-editor').first().click();
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Delete');
  await page.evaluate((c) => navigator.clipboard.writeText(c), code);
  await page.keyboard.press('Control+V');
};

const portOpen = (port: number) =>
  new Promise<boolean>((resolve) => {
    const s = net.connect(port, '127.0.0.1');
    s.on('connect', () => (s.destroy(), resolve(true)));
    s.on('error', () => resolve(false));
  });

test.describe('participant experience in the browser', () => {
  let world: World;
  let dispose: () => Promise<void>;
  let eventId: string, problemId: string;

  test.beforeAll(async () => {
    const admin = await createAdminSession();
    dispose = admin.dispose;
    world = new World(admin.api);
    const languageId = await world.language();
    eventId = await world.liveEvent('ui', languageId);
    problemId = await world.problem({ title: 'Sum (ui e2e)', eventId, tests: SUM_TESTS, description: '# Sum (ui e2e)\n\nAdd the two numbers. SECRET-STATEMENT-MARKER' });
    await world.register('student', eventId);
    await world.register('alice', eventId);
  });

  test.afterAll(async () => {
    await world.dispose();
    await dispose();
  });

  test('student solves a problem: run, results, only the sample test is shown', async ({ page }) => {
    await login(page, 'student');

    await page.goto(`/event/${eventId}`);
    await expect(page.getByText('LIVE')).toBeVisible();
    await page.getByText('Sum (ui e2e)').first().click();
    await expect(page).toHaveURL(new RegExp(`/compete/${problemId}`));
    await expect(page.getByText('SECRET-STATEMENT-MARKER')).toBeVisible();

    await page.getByRole('tab', { name: /^Tests/ }).click();
    await expect(page.getByText('Test 1')).toBeVisible();
    await expect(page.getByText('1 2', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('Test 2')).toHaveCount(0); // hidden and locked tests are not listed
    await expect(page.getByText('10 20')).toHaveCount(0);
    await expect(page.getByText('100 200')).toHaveCount(0);

    await setEditorCode(page, SOLUTIONS.sum);
    await page.getByRole('button', { name: /^Run$/ }).click();
    await page.getByRole('tab', { name: /^Results/ }).click();
    // visible + hidden test (the locked one is never counted for the participant)
    await expect(page.getByText('2/2').first()).toBeVisible({ timeout: 90_000 });
  });

  test('a failing solution shows failures without exposing hidden inputs', async ({ page }) => {
    await login(page, 'student');
    await page.goto(`/compete/${problemId}`);
    await setEditorCode(page, SOLUTIONS.hardcodedSample);
    await page.getByRole('button', { name: /^Run$/ }).click();
    await page.getByRole('tab', { name: /^Results/ }).click();
    await expect(page.getByText('1/2').first()).toBeVisible({ timeout: 90_000 });
    await expect(page.getByText('10 20')).toHaveCount(0);
  });

  test('another participant sees none of those submissions', async ({ page }) => {
    await login(page, 'alice');
    await page.goto(`/compete/${problemId}`);
    await page.getByRole('tab', { name: /^Results/ }).click();
    await expect(page.getByText('No submissions yet')).toBeVisible();
  });

  test('the leaderboard shows participants by username and never an email', async ({ page }) => {
    await login(page, 'alice');
    await page.goto(`/event/${eventId}`);
    await page.getByRole('tab', { name: 'Leaderboard' }).click();
    await expect(page.getByText('student', { exact: true })).toBeVisible();
    await expect(page.getByText('alice', { exact: true })).toBeVisible();
    const html = await page.content();
    expect(html).not.toContain('student@colosseum.local');
    expect(html).not.toContain('bob@colosseum.local');
  });

  test('an unregistered user does not get the problem statement', async ({ page }) => {
    await login(page, 'mallory');
    await page.goto(`/compete/${problemId}`);
    await page.waitForTimeout(3000);
    await expect(page.getByText('SECRET-STATEMENT-MARKER')).toHaveCount(0);
  });

  test('C++ autocomplete: clangd connects and flags a syntax error', async ({ page }) => {
    test.skip(!(await portOpen(3030)), 'lsp-proxy is not running on :3030');
    await login(page, 'student');
    await page.goto(`/compete/${problemId}`);
    await page.locator('.monaco-editor').first().waitFor({ state: 'visible', timeout: 30_000 });
    await page.waitForTimeout(2000);
    await page.getByText(/clangd/).first().click();
    await expect(page.getByText('clangd on')).toBeVisible({ timeout: 20_000 });
    await setEditorCode(page, '#include <iostream>\nint main() { int x = "oops"; return 0 }\n');
    await expect(page.locator('.squiggly-error, .cdr.squiggly-error').first()).toBeVisible({ timeout: 20_000 });
  });
});
