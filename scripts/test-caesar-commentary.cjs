// Requires Playwright and Chrome. Serve the repository before running.
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const {createHash} = require('node:crypto');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(process.env.APP_URL||'http://127.0.0.1:9871',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.LATIN_COMMENTARY?.['De Bello Gallico, 1.7']);
  const counts=[21,13,20,11,11,17,15];
  for(let chapter=1;chapter<=7;chapter++) {
   if(chapter>1)await page.getByRole('button',{name:'Reset',exact:true}).click();
   const key=`De Bello Gallico, 1.${chapter}`;
   await page.locator('select').selectOption(`Caesar||${key}`,{force:true});
   await page.getByRole('button',{name:'Start Annotating',exact:true}).click();
   await page.locator('#qa-commentary-toggle').click();
   const panel=page.locator('#qa-commentary-panel');
   await panel.waitFor();
   assert.equal(await panel.getAttribute('data-key'),key);
   assert.equal(await panel.locator('article').count(),counts[chapter-1]);
   assert.equal(await panel.locator('a').count(),0);
   assert.equal(await panel.locator('.qa-unmatched-note').count(),0);
   assert.match(await panel.locator('.qa-note-link').first().innerText(),/Overview/);
   assert.match(await panel.locator('.qa-note-link').last().innerText(),new RegExp(`Chapter 1.${chapter}`));
   assert(!/\bLine \d/.test(await panel.locator('.qa-note-link').last().innerText()));
   const paragraphs=await panel.locator('article > div').allTextContents();
   const hash=createHash('sha256').update(paragraphs.map(t=>t.replace(/\s+/g,' ').trim()).join('\n')).digest('hex');
   assert.equal(hash,await page.evaluate(key=>window.LATIN_CAESAR_COMMENTARY[key].sourceNotesSha256,key));
   assert.match(await page.locator('#qa-commentary-credit').innerText(),/Dickinson College Commentaries/);
   await page.locator('#editor-container .qa-commentary-word').first().click();
   assert(await panel.locator('.qa-note-selected').count()>0);
   await panel.locator('.qa-note-link').last().click();
   assert.equal(await panel.locator('article').last().evaluate(el=>el.classList.contains('qa-note-selected')),true);
   assert(await page.locator('#editor-container .qa-commentary-selected').count()>0);
   if(chapter===1&&process.env.SCREENSHOT_DIR)await page.screenshot({path:`${process.env.SCREENSHOT_DIR}/caesar-commentary.png`,animations:'disabled'});
  }
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const layout=await page.locator('#qa-commentary-panel').boundingBox();
  assert(layout.y>=0&&layout.y+layout.height<=844);
  // An unsupported Caesar chapter must not inherit the last chapter's notes.
  await page.getByRole('button',{name:'Reset',exact:true}).click();
  await page.locator('select').selectOption('Caesar||De Bello Gallico, 4.24',{force:true});
  await page.getByRole('button',{name:'Start Annotating',exact:true}).click();
  assert.equal(await page.locator('#qa-commentary-toggle').count(),0);
  assert.equal(await page.locator('#qa-commentary-panel').count(),0);
  assert.deepEqual(errors,[]);
  console.log('PASS: all seven Caesar chapters, 108 rendered note paragraphs with source hashes, plain reference text, linked Latin and cards, chapter labels and attribution, mobile bounds, unsupported-chapter reset.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
