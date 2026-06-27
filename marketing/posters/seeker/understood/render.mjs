import { chromium } from 'playwright';

// Three headlines on the same feeling: being understood, then the ease of it.
// l1 = the emotional turn (big); l2 = the quieter clarifier. <em> = marker highlight.
const variants = [
  { id: 'a-gets-you', l1: 'Work that <em>gets</em> you.',  s1: 84, l2: 'Not just work that&rsquo;ll have you.' },
  { id: 'b-tell-once', l1: 'Tell us <em>once.</em>',        s1: 90, l2: 'We&rsquo;ll bring you the rest &mdash; fitted to you.' },
  { id: 'c-seen',      l1: 'Finally, <em>understood.</em>', s1: 78, l2: 'Then matched to the work that actually fits.' },
];

const PORT = process.env.PORT || 8123;
const url = `http://localhost:${PORT}/poster.html`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);

for (const v of variants) {
  await page.evaluate((v) => {
    const l1 = document.getElementById('l1'), l2 = document.getElementById('l2');
    l1.innerHTML = v.l1; l2.innerHTML = v.l2;
    l1.style.fontSize = v.s1 + 'px';
  }, v);
  await page.waitForTimeout(150);
  const el = await page.$('.poster');
  await el.screenshot({ path: `seeker-understood-${v.id}.png` });
  console.log('rendered', v.id);
}
await browser.close();
