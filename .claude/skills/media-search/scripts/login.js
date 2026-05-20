import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import path from 'path';

const MEDIA = {
  'nikkei': 'https://www.nikkei.com/',
  'nikkei-business': 'https://business.nikkei.com/',
  'toyokeizai': 'https://toyokeizai.net/',
};

async function main() {
  const media = process.argv[2];
  if (!MEDIA[media]) {
    console.error(`Usage: node login.js <${Object.keys(MEDIA).join('|')}>`);
    process.exit(1);
  }

  const sessionsDir = 'workspace/sessions';
  await mkdir(sessionsDir, { recursive: true });
  const statePath = path.join(sessionsDir, `${media}.json`);

  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  await page.goto(MEDIA[media], {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });

  console.log(`\n[${media}] ブラウザでログインを完了してください`);
  console.log('完了したらこのターミナルでEnter:');
  await new Promise(r => process.stdin.once('data', r));

  await ctx.storageState({ path: statePath });
  console.log(`✓ セッション保存: ${statePath}`);
  await browser.close();
  process.exit(0);
}

main().catch(err => {
  console.error('=== ERROR ===');
  console.error(err);
  process.exit(1);
});
