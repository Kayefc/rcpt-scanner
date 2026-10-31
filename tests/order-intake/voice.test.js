// Voice input for orders/index.html, with a fake speech engine.
// Run from the repo root: node tests/order-intake/voice.test.js   (needs playwright)
const path = require('path');
const { chromium, devices } = require('playwright');
const APP = 'file://' + path.resolve(__dirname, '../../orders/index.html');

// Each session is one listening run of the speech engine. Each "event" is the full results list the engine
// reports at that moment: [text, isFinal]. autoEnd: the engine stops by itself afterwards, as phones do after
// a few seconds of silence; the app should start a new session and keep what it heard.
const FAKE = sessions => `
  window.__sessions = ${JSON.stringify(sessions)};
  window.__started = 0;
  window.SpeechRecognition = window.webkitSpeechRecognition = class {
    start() {
      const s = window.__sessions[window.__started++] || { events: [] };
      s.events.forEach((list, n) => setTimeout(() => {
        const results = list.map(([t, f]) => Object.assign([{ transcript: t }], { isFinal: f }));
        this.onresult && this.onresult({ resultIndex: 0, results });
      }, 20 * (n + 1)));
      if (s.autoEnd) setTimeout(() => { this.onerror && this.onerror({ error: 'no-speech' }); this.onend && this.onend(); }, 20 * (s.events.length + 2));
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
  {
    name: 'Android: microphone switches itself off between phrases; listening carries on until Stop',
    android: true,
    sessions: [
      { autoEnd: true, events: [[['Kahaila', true]]] },
      { autoEnd: true, events: [[['two', true]], [['two', true], ['two carrot cakes', true]]] },
      { autoEnd: true, events: [] },
      { autoEnd: false, events: [[['3', true]], [['3', true], ['3x cookie dough chocolate chip brownies', true]]] },
    ],
    expect: ['Kahaila', '2 carrot cakes', '3x cookie dough chocolate chip brownies'],
  },
];

(async () => {
  const browser = await chromium.launch();
  let failed = 0;
  for (const c of cases) {
    const ctx = await browser.newContext(c.android ? devices['Pixel 7'] : { viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    page.on('pageerror', e => { console.log('  page error:', e.message); failed++; });
    const sessions = c.sessions || [{ events: c.events, autoEnd: false }];
    await page.addInitScript(FAKE(sessions));
    await page.goto(APP);
    await page.click('#micBtn');
    await page.waitForTimeout(sessions.reduce((t, x) => t + 20 * (x.events.length + 3), 0) + 200);
    const stillOn = await page.evaluate(() => listening);
    if (!stillOn) { console.log('  stopped listening before Stop was tapped'); failed++; }
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
