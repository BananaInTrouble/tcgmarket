#!/usr/bin/env bash
# Exploration ponctuelle : pages CardTrader ouvertes dans un vrai navigateur (M5 qui marche, M6 / M6a qui non).
set -u
cd /tmp && npm init -y >/dev/null && npm i playwright@1.48.2 >/dev/null 2>&1 && npx playwright install --with-deps chromium >/dev/null 2>&1
cat > /tmp/p.cjs <<'JS'
const { chromium } = require('/tmp/node_modules/playwright');
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1', locale: 'fr-FR' })).newPage();
  for (const u of ['https://www.cardtrader.com/fr/cards/391089', 'https://www.cardtrader.com/fr/cards/403029', 'https://www.cardtrader.com/fr/cards/412352', 'https://www.cardtrader.com/fr/cards/403029-heracross-001-076-storm-emeralda', 'https://www.cardtrader.com/en/cards/403029']) {
    try {
      const r = await p.goto(u, { waitUntil: 'domcontentloaded', timeout: 45000 }); await p.waitForTimeout(6000);
      const t = await p.title(); const h1 = await p.locator('h1').first().textContent().catch(() => '');
      console.log(r?.status(), u, '→', p.url(), '|', t, '|', (h1 || '').trim().slice(0, 80));
    } catch (e) { console.log('ERR', u, e.message.slice(0, 120)); }
  }
  await b.close();
})();
JS
node /tmp/p.cjs
