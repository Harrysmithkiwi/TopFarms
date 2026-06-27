import { chromium } from 'playwright';

// Each entry: [htmlFile, outPng, width, height] — paths relative to this file
// (marketing/posters/); each poster lives in its audience subfolder.
const jobs = [
  ['seeker/seeker-void.html',          'seeker/seeker-void.png',          1080, 1350],
  ['brand/zero-ever.html',             'brand/zero-ever.png',             1080, 1350],
  ['employer/employer-verified.html',  'employer/employer-verified.png',  1080, 1350],
  ['employer/employer-hero.html',      'employer/employer-hero.png',      1920, 1080],
  ['seeker/seeker-hero.html',          'seeker/seeker-hero.png',          1920, 1080],
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
