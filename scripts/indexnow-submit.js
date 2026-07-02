/**
 * IndexNow - zglaszanie URL-i do Bing (i partnerow: Seznam, Yandex, Naver).
 *
 * PO CO: ChatGPT z przegladaniem korzysta z indeksu BINGA, nie Google.
 * IndexNow indeksuje zmiany w Bing niemal natychmiast (zamiast czekac na crawl).
 * Czesc planu GEO (cytowalnosc w LLM-ach).
 *
 * Uzycie:
 *   node scripts/indexnow-submit.js              -> pobiera sitemap.xml z prod i zglasza WSZYSTKIE URL-e
 *   node scripts/indexnow-submit.js <url> [...]  -> zglasza tylko podane URL-e (np. nowy wpis bloga)
 *
 * Wymagania: plik klucza public/<KEY>.txt musi byc live na prod (deploy przed pierwszym uzyciem).
 * Limit API: do 10 000 URL-i na request - caly sitemap (~630) miesci sie w jednym.
 *
 * Po dodaniu nowej strony/wpisu: push -> deploy -> `npm run indexnow` (albo z konkretnym URL-em).
 */

const KEY = '21eda418cd15de0a38b8dbf8a704e766';
const HOST = 'www.powitania.pl';
const SITEMAP = `https://${HOST}/sitemap.xml`;

async function getSitemapUrls() {
  const res = await fetch(SITEMAP);
  if (!res.ok) throw new Error(`sitemap HTTP ${res.status}`);
  const xml = await res.text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].trim());
  if (!urls.length) throw new Error('sitemap bez <loc> - nic do zgloszenia');
  return urls;
}

async function main() {
  const args = process.argv.slice(2).filter(a => a.startsWith('http'));
  const urls = args.length ? args : await getSitemapUrls();

  // sanity: zglaszamy wylacznie wlasny host (wymog IndexNow: key file na tym samym hoscie)
  const foreign = urls.filter(u => !u.startsWith(`https://${HOST}/`) && u !== `https://${HOST}`);
  if (foreign.length) throw new Error(`URL spoza ${HOST}: ${foreign[0]}`);

  // sanity: klucz musi byc live, inaczej Bing odrzuci submission
  const keyRes = await fetch(`https://${HOST}/${KEY}.txt`);
  if (!keyRes.ok) throw new Error(`Plik klucza nie jest live (HTTP ${keyRes.status}) - najpierw deploy public/${KEY}.txt`);

  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: HOST, key: KEY, urlList: urls })
  });

  // 200 = przyjete; 202 = przyjete, klucz zweryfikowany pozniej; inne = blad
  console.log(`IndexNow: HTTP ${res.status} | zgloszono ${urls.length} URL-i`);
  if (res.status !== 200 && res.status !== 202) {
    const body = await res.text();
    console.error('Odpowiedz API:', body.slice(0, 300));
    process.exit(1);
  }
}

main().catch(err => { console.error('Blad:', err.message); process.exit(1); });
