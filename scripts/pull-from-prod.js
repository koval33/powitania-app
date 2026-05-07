#!/usr/bin/env node
// Synchronizuje lokalna kopie z produkcja.
//
// Co robi:
//   1. Pobiera voices.json z https://www.powitania.pl/admin/lektorzy/export/ (basic auth)
//   2. Zapisuje do data/voices.json + data-seed/voices.json
//   3. Pobiera brakujace lokalnie zdjecia i audio z publicznych URL produkcji
//
// Uzycie:
//   PROD_ADMIN_PASSWORD=twoje_haslo npm run pull-prod
//   (albo ustaw PROD_ADMIN_PASSWORD w ~/.zshrc / ~/.bashrc)
//
// Opcjonalnie:
//   --full   = pobiera wszystkie binarne (force redownload, nie tylko brakujace)
//   --dry    = tylko pokazuje co by zostalo pobrane, bez zapisu

const fs = require('fs');
const path = require('path');

const PROD_URL = 'https://www.powitania.pl';
const DATA_PATH = path.join(__dirname, '..', 'data', 'voices.json');
const SEED_PATH = path.join(__dirname, '..', 'data-seed', 'voices.json');
const IMG_DIR = path.join(__dirname, '..', 'public', 'img', 'lektorzy');
const AUDIO_DIR = path.join(__dirname, '..', 'public', 'audio', 'lektorzy');

const FULL = process.argv.includes('--full');
const DRY = process.argv.includes('--dry');

const password = process.env.PROD_ADMIN_PASSWORD;
if (!password) {
  console.error('Brak PROD_ADMIN_PASSWORD w env.');
  console.error('Uzycie: PROD_ADMIN_PASSWORD=haslo npm run pull-prod');
  process.exit(1);
}

const authHeader = 'Basic ' + Buffer.from('admin:' + password).toString('base64');

async function fetchVoicesJson() {
  const url = PROD_URL + '/admin/lektorzy/export/';
  const r = await fetch(url, { headers: { Authorization: authHeader } });
  if (!r.ok) {
    throw new Error('Nie udalo sie pobrac ' + url + ': HTTP ' + r.status);
  }
  return await r.text();
}

async function fetchBinary(relUrl, destPath) {
  const r = await fetch(PROD_URL + relUrl);
  if (!r.ok) {
    return { ok: false, status: r.status };
  }
  const buf = Buffer.from(await r.arrayBuffer());
  if (!DRY) {
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.writeFileSync(destPath, buf);
  }
  return { ok: true, bytes: buf.length };
}

(async () => {
  console.log((DRY ? '[DRY RUN] ' : '') + 'Pobieranie voices.json z ' + PROD_URL + ' ...');

  let json;
  try {
    json = await fetchVoicesJson();
  } catch (e) {
    console.error('Blad:', e.message);
    process.exit(1);
  }

  let voices;
  try {
    voices = JSON.parse(json);
  } catch (e) {
    console.error('Pobrany plik nie jest poprawnym JSON:', e.message);
    process.exit(1);
  }

  console.log('Pobrano ' + voices.length + ' lektorow (' +
    voices.filter(v => v.approved === true).length + ' approved, ' +
    voices.filter(v => v.approved === false).length + ' pending).');

  // Diff vs lokalny
  let local = [];
  try {
    local = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  } catch {}
  const localIds = new Set(local.map(v => v.id));
  const prodIds = new Set(voices.map(v => v.id));
  const newLocally = voices.filter(v => !localIds.has(v.id));
  const removedFromProd = local.filter(v => !prodIds.has(v.id));

  if (newLocally.length > 0) {
    console.log('Nowi lektorzy (na prod, brak lokalnie): ' + newLocally.map(v => v.id).join(', '));
  }
  if (removedFromProd.length > 0) {
    console.log('Usunieci na prod (byli lokalnie): ' + removedFromProd.map(v => v.id).join(', '));
  }

  // Zapisz voices.json do obu plikow
  if (!DRY) {
    const formatted = JSON.stringify(voices, null, 2);
    fs.writeFileSync(DATA_PATH, formatted, 'utf8');
    fs.writeFileSync(SEED_PATH, formatted, 'utf8');
    console.log('Zapisano: data/voices.json + data-seed/voices.json');
  }

  // Sciaganie binarnych
  let imgDownloaded = 0, imgSkipped = 0, imgFailed = 0;
  let audDownloaded = 0, audSkipped = 0, audFailed = 0;
  const audioFiles = new Set(); // unique URL list (audio + samples)

  for (const v of voices) {
    // Photo
    if (v.photo) {
      const photoFile = path.join(__dirname, '..', 'public', v.photo.replace(/^\//, ''));
      if (FULL || !fs.existsSync(photoFile)) {
        const res = await fetchBinary(v.photo, photoFile);
        if (res.ok) { imgDownloaded++; console.log('  + IMG ' + v.photo + ' (' + res.bytes + 'B)'); }
        else { imgFailed++; console.log('  ! IMG ' + v.photo + ' HTTP ' + res.status); }
      } else {
        imgSkipped++;
      }
    }
    // Audio (glowny + samples)
    if (v.audio) audioFiles.add(v.audio);
    if (Array.isArray(v.samples)) {
      v.samples.forEach(s => { if (s && s.url) audioFiles.add(s.url); });
    }
  }

  for (const audUrl of audioFiles) {
    const audFile = path.join(__dirname, '..', 'public', audUrl.replace(/^\//, ''));
    if (FULL || !fs.existsSync(audFile)) {
      const res = await fetchBinary(audUrl, audFile);
      if (res.ok) { audDownloaded++; console.log('  + AUD ' + audUrl + ' (' + res.bytes + 'B)'); }
      else { audFailed++; console.log('  ! AUD ' + audUrl + ' HTTP ' + res.status); }
    } else {
      audSkipped++;
    }
  }

  console.log('---');
  console.log('Zdjecia: ' + imgDownloaded + ' pobrane, ' + imgSkipped + ' juz mialem, ' + imgFailed + ' nieudane');
  console.log('Audio  : ' + audDownloaded + ' pobrane, ' + audSkipped + ' juz mialem, ' + audFailed + ' nieudane');

  if (DRY) {
    console.log('(DRY RUN - zadne pliki nie zostaly zapisane)');
  } else {
    console.log('Sync zakonczony.');
  }
})();
