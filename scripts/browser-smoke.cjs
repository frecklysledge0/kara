/* Optional browser regression check. See docs/ui-repair-review.md for setup. */
/* eslint-disable @typescript-eslint/no-require-imports -- Standalone CommonJS runner resolves the optional Playwright install via NODE_PATH. */
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const base = process.env.MILLPROOF_TEST_URL || 'http://localhost:3000';
const executablePath = process.env.MILLPROOF_CHROME_PATH || (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : undefined);

(async () => {
  const browser = await chromium.launch({ executablePath, headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Warehouse shelving', exact: true }).click();
    assert.match(await page.getByLabel('Describe your project and steel requirements').inputValue(), /warehouse shelving/i);
    await page.getByRole('button', { name: 'Find steel', exact: true }).click();
    await page.locator('.grade-option').first().waitFor({ timeout: 65000 });
    assert.ok(await page.locator('.grade-option').count() > 0);
    console.log('PASS buyer prompt, real search API, and grade results');

    const globe = page.locator('svg.earth');
    await globe.scrollIntoViewIfNeeded();
    const bounds = await globe.boundingBox();
    for (let index = 0; index < 5; index++) {
      await page.mouse.move(bounds.x + bounds.width * .45, bounds.y + bounds.height * .6);
      await page.mouse.down();
      await page.mouse.move(bounds.x + bounds.width * .8, bounds.y + bounds.height * .7, { steps: 8 });
      await page.mouse.move(bounds.x - 10, bounds.y + 15, { steps: 4 });
      await page.mouse.up();
    }
    await page.getByRole('button', { name: 'Rotate globe east' }).click();
    console.log('PASS globe dragging, release outside globe, and keyboard-reachable controls');

    await page.getByRole('link', { name: 'Know Your Steel', exact: true }).click();
    for (const property of ['Strength', 'Corrosion', 'Weldability', 'Composition']) {
      await page.getByRole('button', { name: property, exact: true }).click();
      await page.locator('#property-title').filter({ hasText: property }).waitFor();
    }
    await page.getByLabel('Explore a grade').selectOption('aisi-316l');
    await page.locator('.steel-cylinder.is-pipe').waitFor({ state: 'attached' });
    const scene = page.locator('.specimen-scene');
    await scene.scrollIntoViewIfNeeded();
    const turn = await scene.evaluate((element) => element.style.getPropertyValue('--specimen-turn'));
    await page.waitForTimeout(250);
    assert.notEqual(await scene.evaluate((element) => element.style.getPropertyValue('--specimen-turn')), turn);
    await page.getByRole('button', { name: 'Pause rotation' }).click();
    await page.waitForTimeout(100);
    const paused = await scene.evaluate((element) => element.style.getPropertyValue('--specimen-turn'));
    await page.waitForTimeout(200);
    assert.equal(await scene.evaluate((element) => element.style.getPropertyValue('--specimen-turn')), paused);
    await page.getByRole('button', { name: 'Rotate specimen right' }).click();
    assert.notEqual(await scene.evaluate((element) => element.style.getPropertyValue('--specimen-turn')), paused);
    await page.getByLabel('Compare with').selectOption('astm-a36');
    assert.equal(await page.locator('.grade-compare-grid article').count(), 2);
    console.log('PASS all four property panels, grade-specific specimen, rotation/pause, and grade comparison');

    await page.getByRole('link', { name: /^Compare(?: \(\d\))?$/ }).click();
    await page.locator('.comparison-catalog article').first().waitFor({ timeout: 20000 });
    await page.locator('.comparison-catalog .compare-toggle').nth(0).click();
    await page.locator('.comparison-catalog .compare-toggle').nth(1).click();
    assert.equal(await page.locator('.comparison-table thead th').count(), 3);
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('.comparison-table').waitFor({ timeout: 20000 });
    assert.equal(await page.locator('.comparison-table thead th').count(), 3);
    await page.getByRole('button', { name: 'Clear comparison', exact: true }).click();
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('.comparison-empty').waitFor({ timeout: 20000 });
    console.log('PASS lot comparison selection, persistence, removal, and honest empty state');

    // Exercise account UI against controlled responses; never create a real account.
    let signups = 0, signin = 'failure';
    const fakeUser = { id: '00000000-0000-4000-8000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'seller@example.invalid', email_confirmed_at: new Date().toISOString(), user_metadata: { company_name: 'Browser Test Steel', role: 'seller' }, app_metadata: { provider: 'email', providers: ['email'] }, created_at: new Date().toISOString() };
    await page.route('**/auth/v1/**', async (route) => {
      const pathname = new URL(route.request().url()).pathname;
      if (pathname.endsWith('/signup')) {
        const body = route.request().postDataJSON();
        assert.equal(body.data.company_name, 'Browser Test Steel'); signups++;
        return route.fulfill({ status: 200, json: { user: fakeUser, session: null } });
      }
      if (pathname.endsWith('/token')) {
        if (signin === 'failure') return route.fulfill({ status: 400, json: { error: 'invalid_grant', error_description: 'Invalid login credentials' } });
        return route.fulfill({ status: 200, json: { access_token: 'browser-test-token', refresh_token: 'browser-test-refresh', token_type: 'bearer', expires_in: 3600, user: fakeUser } });
      }
      if (pathname.endsWith('/logout')) return route.fulfill({ status: 204 });
      return route.fulfill({ status: 200, json: fakeUser });
    });
    await page.getByRole('link', { name: 'For Sellers' }).click();
    await page.getByLabel('Work email').waitFor();
    assert.match(page.url(), /\/sell$/);
    await page.getByRole('button', { name: 'Create account', exact: true }).click();
    await page.getByLabel('Company name', { exact: true }).fill('Browser Test Steel');
    await page.getByLabel('Work email').fill('seller@example.invalid');
    await page.getByLabel('Password', { exact: true }).fill('test-password-only');
    await page.getByRole('button', { name: 'Create seller account', exact: true }).click();
    await page.getByRole('heading', { name: 'Check your email' }).waitFor();
    assert.equal(signups, 1);
    await page.getByRole('button', { name: 'Back to sign in' }).click();
    await page.getByRole('button', { name: 'Sign in to workspace' }).click();
    await page.getByRole('alert').filter({ hasText: 'Invalid login credentials' }).waitFor();
    assert.equal(await page.getByLabel('Work email').inputValue(), 'seller@example.invalid');
    signin = 'success';
    await page.getByRole('button', { name: 'Sign in to workspace' }).click();
    await page.locator('input[type=file]').first().waitFor({ state: 'attached' });
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await page.getByLabel('Work email').waitFor();
    console.log('PASS direct seller entry, signup confirmation, failed signin, successful signin/upload gate, and signout (mocked auth)');

    await page.setViewportSize({ width: 375, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const url of ['/', '/know-your-steel?grade=aisi-316l', '/compare', '/sell', '/verify', '/orders', '/listings']) {
      await page.goto(base + url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Horizontal overflow on ${url}`);
      if (url.includes('know-your-steel')) {
        await page.locator('.specimen-scene[data-animate=false]').waitFor();
        assert.equal(await page.getByRole('button', { name: 'Reduced motion' }).isDisabled(), true);
        await page.getByRole('button', { name: 'Strength', exact: true }).focus();
        await page.keyboard.press('Enter');
        await page.locator('#property-title').filter({ hasText: 'Strength' }).waitFor();
      }
    }
    console.log('PASS 375px route layouts, reduced motion, and keyboard property control');
    assert.deepEqual(errors, [], 'Browser runtime/hydration errors');
    console.log('PASS no browser runtime or hydration errors');
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
