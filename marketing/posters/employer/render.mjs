import { chromium } from 'playwright';

// Three "matched, not sorted" headlines — warm to workers, relief for the
// employer, the engine credited with the work. <em> marks the one green accent.
const variants = [
  { id: 'a-found',   l1: 'Forty applied.',       l2: 'We found your <em>three.</em>' },
  { id: 'b-right',   l1: 'The <em>right three.</em>', l2: 'Not the first forty.' },
  { id: 'c-matched', l1: 'Three worth a call.',  l2: '<em>Matched, not sorted.</em>' },
];

const url = 'file://' + new URL('./poster.html', import.meta.url).pathname;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);

for (const v of variants) {
  await page.evaluate(({ l1, l2 }) => {
    document.getElementById('l1').innerHTML = l1;
    document.getElementById('l2').innerHTML = l2;
  }, v);
  await page.waitForTimeout(120);
  const el = await page.$('.poster');
  await el.screenshot({ path: `poster-${v.id}.png` });
  console.log('rendered', v.id);
}
await browser.close();
