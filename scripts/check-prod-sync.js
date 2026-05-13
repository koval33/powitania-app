#!/usr/bin/env node
// Sprawdza czy lokalny data/voices.json jest zsynchronizowany z produkcja.
// Wywolywane przez pre-push git hook (.githooks/pre-push).
//
// Wykrywa scenariusz w ktorym produkcja ma lektorow ktorych nie ma lokalnie
// (n8n stworzyl drafty miedzy pullami) - push wtedy by je nadpisal.
//
// Exit codes:
//   0 = bezpieczny push (lub nie da sie sprawdzic, np. brak hasla)
//   1 = STOP - sa rozbieznosci, push by zniszczyl dane na prod

const fs = require('fs');
const path = require('path');

const PROD_URL = 'https://www.powitania.pl';
const password = process.env.PROD_ADMIN_PASSWORD;

if (!password) {
  // Nie blokujemy - user moze pracowac offline lub bez hasla
  console.error('[check-prod-sync] PROD_ADMIN_PASSWORD nie ustawione - skip checku.');
  console.error('[check-prod-sync] Ustaw w ~/.zshrc zeby pre-push automatycznie chronil przed utrata draftow.');
  process.exit(0);
}

const localPath = path.join(__dirname, '..', 'data', 'voices.json');
let local;
try {
  local = JSON.parse(fs.readFileSync(localPath, 'utf8'));
} catch (e) {
  console.error('[check-prod-sync] Nie moge odczytac local voices.json:', e.message);
  process.exit(0);
}

(async () => {
  const auth = 'Basic ' + Buffer.from('admin:' + password).toString('base64');

  let prodVoices;
  try {
    const r = await fetch(PROD_URL + '/admin/lektorzy/export/', {
      headers: { Authorization: auth },
      // 5s timeout zeby nie blokowac push'a w nieskonczonosc gdy prod nie odpowiada
      signal: AbortSignal.timeout(5000)
    });
    if (!r.ok) {
      console.error('[check-prod-sync] Prod export HTTP ' + r.status + ' - skip checku.');
      process.exit(0);
    }
    prodVoices = JSON.parse(await r.text());
  } catch (e) {
    console.error('[check-prod-sync] Nie moge pobrac prod voices.json:', e.message + ' - skip checku.');
    process.exit(0);
  }

  const localIds = new Set(local.map(v => v.id));
  const onProdNotLocal = prodVoices.filter(v => !localIds.has(v.id));

  if (onProdNotLocal.length > 0) {
    console.error();
    console.error('============================================================');
    console.error('Push zatrzymany - rozsynchronizowanie z produkcja');
    console.error('============================================================');
    console.error();
    console.error('Produkcja ma ' + onProdNotLocal.length + ' lektora(ow) ktorych NIE MA lokalnie:');
    onProdNotLocal.forEach(v => {
      const status = v.approved === false ? '[DRAFT]    ' : '[approved] ';
      console.error('  ' + status + v.id + ' - ' + v.name);
    });
    console.error();
    console.error('Automatyczna synchronizacja (npm run pull-prod)...');
    console.error();
    try {
      require('child_process').execSync('npm run pull-prod', {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
      });
    } catch (e) {
      console.error();
      console.error('Pull-prod nie udal sie. Uruchom recznie:');
      console.error('  npm run pull-prod');
      console.error('  git add data/voices.json data-seed/voices.json public/img/lektorzy/ public/audio/samples/');
      console.error('  git commit -m "voices: sync z prod"');
      console.error('  git push');
      console.error();
      process.exit(1);
    }
    console.error();
    console.error('============================================================');
    console.error('Synced! Teraz zacommituj zmiany i powtorz push:');
    console.error('============================================================');
    console.error('  git add data/voices.json data-seed/voices.json public/img/lektorzy/ public/audio/samples/');
    console.error('  git commit -m "voices: sync z prod"');
    console.error('  git push');
    console.error();
    console.error('Jesli swiadomie chcesz nadpisac (np. cofniecie zmian):');
    console.error('  git push --no-verify');
    console.error();
    process.exit(1);
  }

  // Wszystko OK - push bezpieczny
  const localCount = local.length;
  const prodCount = prodVoices.length;
  if (localCount > prodCount) {
    console.log('[check-prod-sync] Push wniesie ' + (localCount - prodCount) + ' nowych lektorow na prod.');
  }
  console.log('[check-prod-sync] OK - voices.json zsynchronizowane z prod.');
})();
