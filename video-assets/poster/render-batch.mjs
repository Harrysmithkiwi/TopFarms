import { chromium } from 'playwright';

// Each entry: [htmlFile, outPng, width, height]
const jobs = [
  ['seeker-void.html',      'seeker-void.png',      1080, 1350],
  ['zero-ever.html',        'zero-ever.png',        1080, 1350],
  ['employer-verified.html','employer-verified.png',1080, 1350],
  ['employer-hero.html',    'employer-hero.png',    1920, 1080],
  ['seeker-hero.html',      'seeker-hero.png',      1920, 1080],
];

const only = process.argv.slice(2);                      // optional: render only these html files
const browser = await chromium.launch();
for (const [file, out, w, h] of jobs) {
  if (only.length && !only.includes(file)) continue;
  try {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
    await page.goto('file://' + new URL('./' + file, import.meta.url).pathname, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(150);
    const el = await page.$('.poster');
    await (el || page).screenshot({ path: out });
    await page.close();
    console.log('rendered', out);
  } catch (e) { console.log('SKIP', file, '—', e.message); }
}
await browser.close();
