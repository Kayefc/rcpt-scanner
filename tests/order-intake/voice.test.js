// Voice input for orders/index.html, with a fake speech engine.
// Run from the repo root: node tests/order-intake/voice.test.js   (needs playwright)
const path = require('path');
const { chromium, devices } = require('playwright');
const APP = 'file://' + path.resolve(__dirname, '../../orders/index.html');

// Each "event" is the full results list the engine reports at that moment: [text, isFinal].
const FAKE = events => `
  window.SpeechRecognition = window.webkitSpeechRecognition = class {
    start() {
      const evs = ${JSON.stringify(events)};
      evs.forEach((list, n) => setTimeout(() => {
        const results = list.map(([t, f]) => Object.assign([{ transcript: t }], { isFinal: f }));
        this.onresult && this.onresult({ resultIndex: 0, results });
      }, 20 * (n + 1)));
    }
    stop() { setTimeout(() => this.onend && this.onend(), 10); }
  };`;

const cases = [
  {
    name: 'Android: each final repeats the phrase so far (the reported bug)',
    android: true,
    events: [[['3', true]], [['3', true], ['3 cookie', true]], [['3', true], ['3 cookie', true], ['3 cookie dough', true]],
      [['3', true], ['3 cookie', true], ['3 cookie dough', true], ['3 cookie dough chocolate', true], ['3x cookie dough chocolate chip brownies', true]]],
    expect: ['3x cookie dough chocolate chip brownies'],
  },
  {
    name: 'Android: a second item after a pause is kept',
    android: true,
    events: [[['Kahaila', true]], [['Kahaila', true], ['Kahaila two carrot', true]], [['Kahaila', true], ['Kahaila two carrot cakes', true], ['three banana loaves', true]]],
    expect: ['Kahaila', '2 carrot cakes', '3 banana loaves'],
  },
  {
    name: 'Desktop: separate final phrases are joined as said',
    android: false,
    events: [[['Kahaila', true]], [['Kahaila', true], [' two carrot cakes', true]], [['Kahaila', true], [' two carrot cakes', true], [' three banana loaves and twelve white chocolate raspberry cookies', true]]],
    expect: ['Kahaila', '2 carrot cakes', '3 banana loaves', '12 white chocolate raspberry cookies'],
  },
];

(async () => {
  const browser = await chromium.launch();
  let failed = 0;
  for (const c of cases) {
    const ctx = await browser.newContext(c.android ? devices['Pixel 7'] : { viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    page.on('pageerror', e => { console.log('  page error:', e.message); failed++; });
    await page.addInitScript(FAKE(c.events));
    await page.goto(APP);
    await page.click('#micBtn'); await page.waitForTimeout(40 * c.events.length + 100);
    await page.click('#micBtn'); await page.waitForTimeout(150);
    const lines = (await page.inputValue('#paste')).split('\n');
    const ok = JSON.stringify(lines) === JSON.stringify(c.expect);
    if (!ok) failed++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${c.name}`);
    if (!ok) console.log('  got:     ', lines, '\n  expected:', c.expect);
    else console.log('  items:', await page.evaluate(() => draft.items.map(i => `${i.qty} ${i.name}`).join(' | ')));
    await ctx.close();
  }
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
