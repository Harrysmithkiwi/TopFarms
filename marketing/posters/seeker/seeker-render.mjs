import { chromium } from 'playwright';

// Three "fit, not just skills" headlines — warm, worker-respecting, dignity not
// desperation. They name life-fit (accommodation, partner's work, visa, timing),
// the thing workers genuinely can't find elsewhere. <em> = the one green accent.
const variants = [
  { id: 'a-life',    l1: 'The job that fits your <em>life.</em>', s1: 84, l2: 'Not just your CV.',           s2: 84 },
  { id: 'b-named',   l1: 'Accommodation. Couples.<br>Visa. Shed. Timing.', s1: 50, l2: '<em>Your job’s in here.</em>', s2: 84 },
  { id: 'c-fits',    l1: 'Find work that <em>fits.</em>',          s1: 84, l2: 'Not whatever’s left.',      s2: 84 },
];

const url = 'file://' + new URL('./seeker-poster.html', import.meta.url).pathname;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);

for (const v of variants) {
  await page.evaluate((v) => {
    const l1 = document.getElementById('l1'), l2 = document.getElementById('l2');
    l1.innerHTML = v.l1; l2.innerHTML = v.l2;
    l1.style.fontSize = v.s1 + 'px'; l2.style.fontSize = v.s2 + 'px';
  }, v);
  await page.waitForTimeout(120);
  const el = await page.$('.poster');
  await el.screenshot({ path: `seeker-${v.id}.png` });
  console.log('rendered', v.id);
}
await browser.close();
