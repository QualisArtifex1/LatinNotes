// Requires Playwright and installed Chrome. Run against a local HTTP server:
// APP_URL=http://127.0.0.1:9871 node scripts/test-reading-highlights.cjs
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const fs = require('node:fs');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('dialog', dialog => dialog.accept());
    await page.goto(process.env.APP_URL || 'http://127.0.0.1:9871', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.LATIN_READINGS && window.LATIN_COMMENTARY);
    const fixtures = await page.evaluate(() => {
      const tokenize = text => text.split('\n').map(line => line.split(/(\s+)/).filter(Boolean).map(text => ({ id: crypto.randomUUID(), text })));
      const session = text => ({ linesOfWords: tokenize(text), lines: [], translation: '', notes: '', fontSize: 48, lineSpacing: 32 });
      const first = window.LATIN_LESSONS[0];
      const second = window.LATIN_LESSONS[1];
      const custom = session(first.text);
      // Same word count and almost the same text: even a shared 80-character
      // prefix must not leave the previous lesson's commentary attached.
      custom.linesOfWords.at(-1).filter(w => w.text.trim()).at(-1).text = 'mutatum';
      const legacyKey = 'Epistulae, 6.16';
      const legacyText = Object.values(window.LATIN_READINGS).map(readings => readings[legacyKey]).find(Boolean);
      const slots = [session(first.text), custom, session(second.text), session(legacyText)];
      slots.forEach((value, index) => localStorage.setItem(`qualis-artifex-save-${index + 1}`, JSON.stringify(value)));
      return { first: first.label, second: second.label, legacyKey };
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.LATIN_COMMENTARY);
    await page.locator('select').selectOption({ label: fixtures.first }, { force: true });
    await page.getByRole('button', { name: 'Start Annotating', exact: true }).click();
    await page.locator('#qa-commentary-toggle').click();
    await page.locator('#qa-commentary-panel').waitFor();
    assert.equal(await page.locator('#qa-commentary-panel').getAttribute('data-key'), fixtures.first);

    const load = async slot => {
      await page.getByTitle('Load Session', { exact: true }).click();
      await page.getByTitle('Load Session', { exact: true }).locator('..').getByRole('button', { name: new RegExp(`^${slot}\\b`) }).click();
      await page.waitForFunction(() => !document.querySelector('button[title="Load Session"] + div'));
    };
    await load(2);
    await page.waitForFunction(() => !document.getElementById('qa-commentary-panel') && !document.getElementById('qa-commentary-toggle'));
    assert.equal(await page.locator('.qa-commentary-word, #qa-commentary-credit').count(), 0);
    assert.equal(await page.evaluate(() => localStorage.getItem('qa-commentary-current-reading')), null);
    assert.equal(await page.locator('body').evaluate(body => body.classList.contains('qa-commentary-active')), false);
    await load(3);
    await page.locator('#qa-commentary-toggle').click();
    await page.waitForFunction(key => document.getElementById('qa-commentary-panel')?.dataset.key === key, fixtures.second);
    await load(4);
    await page.waitForFunction(key => document.getElementById('qa-commentary-panel')?.dataset.key === key, fixtures.legacyKey);
    // Loading supported saved work from the opening screen also recovers the
    // right commentary, even when localStorage holds a stale previous key.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Load Previous Session', exact: true }).click();
    await page.getByRole('button', { name: /^1\b/ }).click();
    await page.waitForFunction(key => document.getElementById('qa-commentary-toggle')?.title.includes(key), fixtures.first);
    await page.locator('#qa-commentary-toggle').click();

    const colors = { red: 'rgb(248, 113, 113)', green: 'rgb(74, 222, 128)', blue: 'rgb(96, 165, 250)', yellow: 'rgb(250, 204, 21)', purple: 'rgb(192, 132, 252)', orange: 'rgb(251, 146, 60)' };
    const words = Object.keys(colors).map((highlight, i) => [{ id: `color-${i}`, text: ['Arma', 'virumque', 'cano', 'Troiae', 'primus', 'oris'][i], highlight }]);
    const snapshot = { format: 'latin-notes-snapshot', version: 1, session: { words, lines: [], translation: '', notes: '', fontSize: 48, lineSpacing: 16 } };
    await page.locator('input[type=file]').setInputFiles({ name: 'highlights.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(snapshot)) });
    await page.waitForFunction(() => document.querySelectorAll('#editor-container .qa-highlight').length === 6 && !document.getElementById('qa-commentary-panel'));
    const luminance = rgb => {
      const channels = rgb.match(/\d+/g).map(Number).map(n => { n /= 255; return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4; });
      return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
    };
    await page.evaluate(() => document.fonts.ready);
    for (const theme of ['light', 'dark']) {
      if (await page.locator('html').evaluate(el => el.classList.contains('dark')) !== (theme === 'dark')) {
        await page.getByRole('button', { name: /Switch to .* Mode/ }).click();
      }
      await page.waitForFunction(theme => getComputedStyle(document.getElementById('editor-container')).backgroundColor === (theme === 'dark' ? 'rgb(41, 37, 36)' : 'rgb(255, 255, 255)'), theme);
      for (const [color, expected] of Object.entries(colors)) {
        const style = await page.locator(`#editor-container .qa-highlight-${color}`).evaluate(el => ({ bg: getComputedStyle(el).backgroundColor, fg: getComputedStyle(el).color }));
        assert.equal(style.bg, expected, `${theme}: ${color} stays opaque`);
        assert.equal(style.fg, 'rgb(28, 25, 23)');
        assert((luminance(style.bg) + .05) / (luminance(style.fg) + .05) >= 4.5, `${theme}: ${color} text contrast`);
      }
      if (process.env.SCREENSHOT_DIR) {
        fs.mkdirSync(process.env.SCREENSHOT_DIR, { recursive: true });
        await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/highlights-${theme}.png` });
      }
    }
    // Verify the toolbar applies the same palette through the real annotation action.
    await page.locator('#editor-container [draggable=true]').first().click();
    await page.getByTitle('Highlight Blue [B]', { exact: true }).click();
    assert.equal(await page.locator('#editor-container [draggable=true] > span').first().evaluate(el => getComputedStyle(el).backgroundColor), colors.blue);
    assert.deepEqual(errors, []);
    console.log('PASS: commentary reset, same-count/shared-prefix memory load, other lessons, legacy saved readings, fresh-page memory, snapshots, six opaque colors in both themes, >=4.5:1 text contrast, toolbar highlighting.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
