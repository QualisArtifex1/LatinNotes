// Requires Playwright and Chrome; serve this repository locally before running.
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
(async () => {
  const browser = await chromium.launch({channel:'chrome',headless:true});
  try {
    const base = process.env.APP_URL || 'http://127.0.0.1:9871';
    const context = await browser.newContext({viewport:{width:1280,height:900},permissions:['clipboard-read','clipboard-write']});
    // Real nested-frame navigation and clipboard transfer, without depending on
    // the remote library's uptime or changing document text.
    await context.route('https://www.thelatinlibrary.com/**', route => {
      const path = new URL(route.request().url()).pathname;
      const body = path === '/' ? '<a href="/vergil.html">Vergil</a>'
        : path === '/vergil.html' ? '<a href="/vergil/aen1.shtml">Aeneid I</a>'
        : '<p id="passage">Arma virumque canō, Trōiae quī prīmus ab ōrīs<br>Ītaliam, fātō profugus.</p><p>Not selected.</p>';
      return route.fulfill({contentType:'text/html; charset=utf-8',body:`<!doctype html><meta charset="utf-8">${body}`});
    });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base,{waitUntil:'domcontentloaded'});
    await page.locator('select').selectOption({index:1},{force:true});
    const before = await page.locator('textarea[placeholder="Or paste your Latin text here..."]').inputValue();
    const open = async () => {
      const promise = page.waitForEvent('popup');
      await page.getByRole('button',{name:'Gather Text',exact:true}).click();
      const popup = await promise;
      popup.on('pageerror', error => errors.push(error.message));
      await popup.getByRole('button',{name:'Add copied text',exact:true}).waitFor();
      return popup;
    };
    let popup = await open();
    assert(new URL(popup.url()).pathname.endsWith('/gather-text.html'));
    assert.equal(await popup.evaluate(() => window.innerWidth),960);
    await Promise.all([
      popup.waitForEvent('framenavigated',{predicate:frame => frame.url().endsWith('/vergil.html')}),
      popup.frameLocator('#library').getByRole('link',{name:'Vergil',exact:true}).click()
    ]);
    await popup.frameLocator('#library').getByRole('link',{name:'Aeneid I',exact:true}).click();
    // Reopening focuses the existing window and keeps the selected reading.
    await page.getByRole('button',{name:'Gather Text',exact:true}).click();
    assert.equal(context.pages().length,2);
    await popup.frameLocator('#library').locator('#passage').waitFor();
    await popup.bringToFront();
    await popup.frameLocator('#library').locator('body').click();
    const latin = await popup.frameLocator('#library').locator('#passage').evaluate(el => {
      const range = document.createRange(); range.selectNodeContents(el);
      const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
      return selection.toString();
    });
    await popup.frameLocator('#library').locator('#passage').press('ControlOrMeta+c');
    // Messages from another window or another origin must not replace the draft.
    await page.evaluate(() => window.postMessage({type:'latinnotes:gather-text',token:'forged',requestId:'bad',text:'forged text'},location.origin));
    assert.equal(await page.locator('textarea[placeholder="Or paste your Latin text here..."]').inputValue(),before);
    assert.equal(await popup.evaluate(() => navigator.clipboard.readText()), latin.trim(), 'Selected Latin reaches the clipboard');
    const close = popup.waitForEvent('close');
    await popup.getByRole('button',{name:'Add copied text',exact:true}).click();
    await close;
    assert.equal(await page.locator('textarea[placeholder="Or paste your Latin text here..."]').inputValue(),latin.trim());
    assert.equal(await page.locator('select').inputValue(),'');
    assert.equal(await page.getByRole('button',{name:'Start Annotating',exact:true}).isEnabled(),true);

    if (process.env.SCREENSHOT_DIR) await page.screenshot({path:`${process.env.SCREENSHOT_DIR}/gather-import.png`,animations:'disabled'});
    popup = await open();
    await popup.evaluate(() => { navigator.clipboard.readText = async () => { throw new DOMException('Permission denied','NotAllowedError'); }; });
    await popup.getByRole('button',{name:'Add copied text',exact:true}).click();
    await popup.locator('#paste-dialog[open]').waitFor();
    await popup.getByRole('button',{name:'Add text',exact:true}).click();
    assert.match(await popup.locator('#paste-status').innerText(),/Copy some Latin/);
    await popup.locator('#latin-text').fill('  Gallia est omnis divisa\nin partes trēs.  ');
    const pastedClose = popup.waitForEvent('close');
    await popup.getByRole('button',{name:'Add text',exact:true}).click();
    await pastedClose;
    assert.equal(await page.locator('textarea[placeholder="Or paste your Latin text here..."]').inputValue(),'Gallia est omnis divisa\nin partes trēs.');
    popup = await open();
    await popup.evaluate(() => { navigator.clipboard.readText = () => new Promise(() => {}); });
    await popup.getByRole('button',{name:'Add copied text',exact:true}).click();
    await popup.getByRole('button',{name:'Paste instead',exact:true}).click();
    await popup.locator('#latin-text').fill('Salvē, amīce!');
    const waitingClose = popup.waitForEvent('close');
    await popup.getByRole('button',{name:'Add text',exact:true}).click();
    await waitingClose;
    assert.equal(await page.locator('textarea[placeholder="Or paste your Latin text here..."]').inputValue(),'Salvē, amīce!');
    await page.getByRole('button',{name:'Start Annotating',exact:true}).click();
    await page.locator('#editor-container').waitFor();
    assert.match((await page.locator('#editor-container').innerText()).replace(/\s+/g,' '),/Salvē, amīce!/);
    assert.equal(await page.locator('#qa-commentary-toggle').count(),0);
    assert.deepEqual(errors,[]);

    const mobile = await context.newPage();
    await mobile.setViewportSize({width:390,height:844});
    await mobile.goto(base,{waitUntil:'domcontentloaded'});
    await mobile.evaluate(() => { window.open = () => null; });
    await mobile.getByRole('button',{name:'Gather Text',exact:true}).click();
    assert.match(await mobile.locator('.gather-text-control [role=status]').innerText(),/blocked/);
    await mobile.getByRole('button',{name:'Start Annotating',exact:true}).scrollIntoViewIfNeeded();
    assert.equal(await mobile.getByRole('button',{name:'Start Annotating',exact:true}).isVisible(),true);
    assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth > innerWidth),false);
    if (process.env.SCREENSHOT_DIR) {
      await mobile.screenshot({path:`${process.env.SCREENSHOT_DIR}/gather-home-mobile.png`,animations:'disabled'});
      const standalone = await context.newPage();
      await standalone.setViewportSize({width:960,height:760});
      await standalone.emulateMedia({colorScheme:'dark'});
      await standalone.goto(new URL('gather-text.html',base+'/').href,{waitUntil:'domcontentloaded'});
      await standalone.screenshot({path:`${process.env.SCREENSHOT_DIR}/gather-window-dark.png`,animations:'disabled'});
    }
    await context.close();
    console.log('PASS: popup size, library navigation, selected-text copy, import and automatic return, window reuse, accents/newlines, cleared selection, denied clipboard and paste fallback, blocked popups, annotation start.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });
