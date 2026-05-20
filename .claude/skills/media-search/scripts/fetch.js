import { chromium } from 'playwright';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

// URLから媒体を判定
function detectMedia(url) {
  if (url.includes('business.nikkei.com')) return 'nikkei-business';
  if (url.includes('nikkei.com')) return 'nikkei';
  if (url.includes('toyokeizai.net')) return 'toyokeizai';
  throw new Error(`未対応のドメイン: ${url}`);
}

// CLI引数パース（--key value 形式）
function parseArgs() {
  const args = {};
  for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a.startsWith('--')) {
      args[a.slice(2)] = process.argv[++i];
    }
  }
  return args;
}

// ファイル名に使えない文字を置換
function sanitize(s) {
  return s.replace(/[\/\\:*?"<>|]/g, '_').slice(0, 100);
}

// 今日の日付（YYYY-MM-DD）
function today() {
  return new Date().toISOString().slice(0, 10);
}

// 記事ページから情報抽出（JSON-LD優先、なければセレクタ）
async function extractArticle(page, media) {
  return await page.evaluate(() => {
    // JSON-LD から抽出を試みる
    const ldScripts = document.querySelectorAll('script[type="application/ld+json"]');
    let ld = null;
    for (const s of ldScripts) {
      try {
        const data = JSON.parse(s.textContent);
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
          if (item['@type'] === 'NewsArticle' || item['@type'] === 'Article') {
            ld = item;
            break;
          }
        }
        if (ld) break;
      } catch (e) {}
    }

    const title = ld?.headline 
      || document.querySelector('h1')?.textContent?.trim() 
      || document.title;

    const published = ld?.datePublished 
      || document.querySelector('time')?.getAttribute('datetime')
      || document.querySelector('time')?.textContent?.trim()
      || '';

    const author = (Array.isArray(ld?.author) ? ld.author[0]?.name : ld?.author?.name) 
      || document.querySelector('[class*="author"]')?.textContent?.trim() 
      || '';

    let body = ld?.articleBody || '';
    if (!body || body.length < 200) {
      const selectors = [
        'article',
        '[class*="article-body"]',
        '[class*="articleBody"]', 
        '[class*="article_body"]',
        'main',
      ];
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && el.innerText.length > body.length) {
          body = el.innerText;
        }
      }
    }

    return { title, published, author, body };
  });
}

async function main() {
  const args = parseArgs();
  const url = args.url;
  const keyword = args.keyword || 'untagged';

  if (!url) {
    console.error('Usage: node fetch.js --url <URL> [--keyword <keyword>]');
    process.exit(1);
  }

  const media = detectMedia(url);
  const sessionPath = `workspace/sessions/${media}.json`;

  console.log(`[${media}] ${url}`);

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ storageState: sessionPath });
  const page = await ctx.newPage();

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    if (currentUrl.includes('login') || currentUrl.includes('signin')) {
      throw new Error(`セッション失効。${media} を再ログインしてください: node login.js ${media}`);
    }

    const article = await extractArticle(page, media);

    if (!article.body || article.body.length < 100) {
      throw new Error('本文が取得できませんでした（HTMLパース失敗 or 有料壁未突破）');
    }

    const dir = path.join('workspace/research', sanitize(keyword), today(), media);
    await mkdir(dir, { recursive: true });

    const slug = sanitize(article.title || 'untitled');
    const filepath = path.join(dir, `${slug}.md`);

    const frontmatter = [
      '---',
      `media: ${media}`,
      `url: ${url}`,
      `title: ${JSON.stringify(article.title)}`,
      `author: ${JSON.stringify(article.author)}`,
      `published_at: ${article.published}`,
      `fetched_at: ${new Date().toISOString()}`,
      `keyword: ${keyword}`,
      '---',
      '',
      `# ${article.title}`,
      '',
      article.body,
      ''
    ].join('\n');

    await writeFile(filepath, frontmatter, 'utf8');
    console.log(`✓ ${filepath} (${article.body.length} chars)`);
    
  } catch (err) {
    console.error(`✗ ${url}`);
    console.error(`  ${err.message}`);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
