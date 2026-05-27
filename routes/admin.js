const express = require('express');
const router = express.Router();
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const DATA_PATH = path.join(__dirname, '..', 'data', 'voices.json');
const SEED_PATH = path.join(__dirname, '..', 'data-seed', 'voices.json');
const IMG_DIR = path.join(__dirname, '..', 'public', 'img', 'lektorzy');
const AUDIO_DIR = path.join(__dirname, '..', 'public', 'audio', 'lektorzy');

// Multer - temp upload
const upload = multer({
  dest: '/tmp/uploads/',
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'photo') {
      const ok = /\.(jpg|jpeg|png|gif|webp)$/i.test(file.originalname);
      cb(null, ok);
    } else if (file.fieldname === 'audio' || file.fieldname === 'new_sample_file' || file.fieldname === 'new_sample_file[]') {
      const ok = /\.(mp3|wav|ogg)$/i.test(file.originalname);
      cb(null, ok);
    } else {
      cb(null, false);
    }
  }
});

// --- Helpers ---
function loadVoices() {
  return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
}

function saveVoices(voices) {
  // Zapis atomowy do obydwu plikow (data/ i data-seed/) tak, zeby
  // zmiana przezyla restart serwera (alwaysOverwrite kopiuje data-seed/ -> data/).
  // User commituje oba pliki razem - spojne z istniejacym workflow w repo.
  const json = JSON.stringify(voices, null, 2);
  fs.writeFileSync(DATA_PATH, json, 'utf8');
  try {
    fs.writeFileSync(SEED_PATH, json, 'utf8');
  } catch (err) {
    // Brak data-seed/ na produkcji (Railway) jest OK - tam tylko data/ jest zapisywalny.
    // Loguj, ale nie wyrzucaj bledu - zmiana jest juz w data/.
    if (err.code !== 'ENOENT' && err.code !== 'EACCES') {
      console.warn('[admin] data-seed/voices.json sync skipped:', err.code, err.message);
    }
  }
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/ą/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e')
    .replace(/ł/g, 'l').replace(/ń/g, 'n').replace(/ó/g, 'o')
    .replace(/ś/g, 's').replace(/ź/g, 'z').replace(/ż/g, 'z')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// --- Auth middleware (prosty basic auth) ---
function requireAuth(req, res, next) {
  const adminPass = process.env.ADMIN_PASSWORD || 'powitania2024';

  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic realm="Admin Panel"');
    return res.status(401).send('Wymagane logowanie');
  }

  const decoded = Buffer.from(auth.split(' ')[1], 'base64').toString();
  const [user, pass] = decoded.split(':');

  if (user === 'admin' && pass === adminPass) {
    return next();
  }

  res.set('WWW-Authenticate', 'Basic realm="Admin Panel"');
  return res.status(401).send('Nieprawidłowe hasło');
}

router.use(requireAuth);

// --- Export voices.json (do synchronizacji local <- prod) ---
router.get('/export/', (req, res) => {
  res.set('Content-Type', 'application/json; charset=utf-8');
  res.set('Content-Disposition', 'inline; filename="voices.json"');
  res.send(fs.readFileSync(DATA_PATH, 'utf8'));
});

// --- Cleanup duplikatow "Demo glowne" po file size (side-effect migracji audio->samples) ---
// Niektore lektory mialy plik audio: skopiowany z migracji WP - dwa rozne URL-e wskazuja
// na bit-identyczne pliki audio. Po migracji "Demo glowne" sample to czesto duplikat
// innego sample. Endpoint sprawdza: dla kazdego sample o nazwie "Demo glowne", jesli na
// dysku ma identyczny file size jak inny sample tego lektora -> uznajemy za duplikat.
// Dry-run: zwraca tylko liste do usuniecia. ?confirm=1 -> usuwa.
router.get('/cleanup-duplicate-demo/', (req, res) => {
  try {
    const confirm = req.query.confirm === '1';
    const PUBLIC_DIR = path.join(__dirname, '..', 'public');
    const voices = loadVoices();
    const candidates = [];
    voices.forEach(v => {
      if (!Array.isArray(v.samples) || v.samples.length < 2) return;
      const demoIdx = v.samples.findIndex(s => s && s.name === 'Demo główne');
      if (demoIdx === -1) return;
      const demo = v.samples[demoIdx];
      if (!demo.url || demo.url.includes('youtu') || demo.url.includes('vimeo')) return;
      const demoFs = path.join(PUBLIC_DIR, demo.url.split('?')[0]);
      if (!fs.existsSync(demoFs)) return;
      const demoSize = fs.statSync(demoFs).size;
      // Czy inny sample (nie ten Demo glowne) ma identyczny size?
      const otherDup = v.samples.find((s, i) => {
        if (i === demoIdx) return false;
        if (!s || !s.url || s.url.includes('youtu') || s.url.includes('vimeo')) return false;
        const p = path.join(PUBLIC_DIR, s.url.split('?')[0]);
        if (!fs.existsSync(p)) return false;
        return fs.statSync(p).size === demoSize;
      });
      if (otherDup) {
        candidates.push({ id: v.id, name: v.name, demoUrl: demo.url, dupUrl: otherDup.url, size: demoSize });
      }
    });

    if (confirm && candidates.length > 0) {
      const backupPath = DATA_PATH + '.bak-pre-demo-cleanup';
      if (!fs.existsSync(backupPath)) {
        fs.writeFileSync(backupPath, JSON.stringify(voices, null, 2), 'utf8');
      }
      candidates.forEach(c => {
        const v = voices.find(x => x.id === c.id);
        if (!v) return;
        v.samples = v.samples.filter(s => !(s.name === 'Demo główne' && s.url === c.demoUrl));
        // Plik fizyczny zostaje - moze byc shared albo user moze go potrzebowac. Tylko czyscimy JSON.
      });
      saveVoices(voices);
    }

    res.set('Content-Type', 'text/plain; charset=utf-8');
    let out = (confirm ? 'CLEANUP DONE' : 'DRY-RUN (add ?confirm=1 to actually remove)') + '\n';
    out += 'Kandydaci do usuniecia "Demo glowne": ' + candidates.length + '\n\n';
    candidates.forEach(c => {
      out += '  ' + c.id + ' (' + c.name + ')\n';
      out += '    remove: ' + c.demoUrl + '\n';
      out += '    dup-of: ' + c.dupUrl + '  [' + c.size + ' bytes]\n';
    });
    res.send(out);
  } catch (e) {
    res.status(500).send('Cleanup FAILED: ' + e.message + '\n' + e.stack);
  }
});

// --- Migracja: audio: field -> samples[] (jednorazowo na prod, idempotentne) ---
// Przed migracja zrzuca backup do voices.json.bak-pre-audio-merge.
// Po migracji: kazdy lektor ma tylko samples[], audio: pole znika z JSON.
// Bezpieczne do wielokrotnego uruchamiania (sprawdza voice.audio przed dzialaniem).
router.get('/migrate-audio/', (req, res) => {
  try {
    const voices = loadVoices();
    const backupPath = DATA_PATH + '.bak-pre-audio-merge';
    if (!fs.existsSync(backupPath)) {
      fs.writeFileSync(backupPath, JSON.stringify(voices, null, 2), 'utf8');
    }
    let migrated = 0, alreadyInSamples = 0, noAudio = 0, becameFirst = 0, emptyCleaned = 0;
    voices.forEach(v => {
      if (!v.audio) {
        // Pole istnieje ale null/"" (drafty bez nagrania) - usun zeby schema byla czysta
        if (v.audio === null || v.audio === '') { delete v.audio; emptyCleaned++; }
        else noAudio++;
        return;
      }
      v.samples = Array.isArray(v.samples) ? v.samples : [];
      const dup = v.samples.some(s => s.url === v.audio);
      if (dup) {
        alreadyInSamples++;
      } else if (v.samples.length === 0) {
        v.samples.push({ name: 'Demo główne', url: v.audio });
        becameFirst++;
      } else {
        v.samples.push({ name: 'Demo główne', url: v.audio });
        migrated++;
      }
      delete v.audio;
    });
    saveVoices(voices);
    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.send(
      'Migration done.\n' +
      'Backup: ' + backupPath + '\n' +
      'Migrated (audio appended to samples): ' + migrated + '\n' +
      'Already in samples (only audio field dropped): ' + alreadyInSamples + '\n' +
      'Empty samples (audio became samples[0]): ' + becameFirst + '\n' +
      'Empty audio cleaned (null/empty string drafts): ' + emptyCleaned + '\n' +
      'No audio field (untouched): ' + noAudio + '\n' +
      'Total lektorow: ' + voices.length
    );
  } catch (e) {
    res.status(500).send('Migration FAILED: ' + e.message + '\n' + e.stack);
  }
});

// --- Lista lektorów ---
router.get('/', (req, res) => {
  let voices = loadVoices();
  const filter = req.query.filter || 'all';
  // Sort pending by createdAt DESC (newest first), reszta po order
  if (filter === 'pending') {
    voices = voices
      .filter(v => v.approved === false)
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  } else if (filter === 'approved') {
    voices = voices.filter(v => v.approved !== false);
  }
  // Liczniki dla nawigacji
  const all = loadVoices();
  const counts = {
    all: all.length,
    approved: all.filter(v => v.approved !== false).length,
    pending: all.filter(v => v.approved === false).length
  };
  res.render('admin/lektorzy', {
    title: 'Admin - Lektorzy',
    voices,
    filter,
    counts,
    msg: req.query.msg || null
  });
});

// --- Formularz dodawania ---
router.get('/dodaj/', (req, res) => {
  res.render('admin/lektor-form', {
    title: 'Dodaj lektora',
    voice: null,
    editing: false
  });
});

// --- Formularz edycji ---
router.get('/edytuj/:id/', (req, res) => {
  const voices = loadVoices();
  const voice = voices.find(v => v.id === req.params.id);
  if (!voice) return res.redirect('/admin/lektorzy/?msg=Nie+znaleziono');

  res.render('admin/lektor-form', {
    title: `Edytuj: ${voice.name}`,
    voice,
    editing: true
  });
});

// --- Zapis (dodaj / edytuj) ---
router.post('/zapisz/', upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'new_sample_file[]', maxCount: 5 },
  { name: 'new_sample_file', maxCount: 5 }
]), async (req, res) => {
  try {
    const voices = loadVoices();
    const b = req.body;
    const isEdit = b.editing === 'true';

    let slug = isEdit ? b.original_id : slugify(b.name);

    // Ensure unique slug
    if (!isEdit) {
      let base = slug;
      let counter = 2;
      while (voices.find(v => v.id === slug)) {
        slug = `${base}-${counter}`;
        counter++;
      }
    }

    // Process photo
    let photoPath = isEdit ? (voices.find(v => v.id === slug)?.photo || null) : null;
    if (req.files && req.files.photo && req.files.photo[0]) {
      const tmpFile = req.files.photo[0].path;
      const outFile = path.join(IMG_DIR, `${slug}.webp`);
      await sharp(tmpFile)
        .resize(400, 400, { fit: 'cover' })
        .webp({ quality: 80 })
        .toFile(outFile);
      fs.unlinkSync(tmpFile);
      photoPath = `/img/lektorzy/${slug}.webp`;
    }

    // audio: field zostal zlikwidowany w refaktorze - wszystkie probki sa w samples[].
    // Stara logika audioPath zachowana jako null zeby dedup samples vs audioPath
    // (linia ~213) dalej dzialal poprawnie - kazdy s.url jest != null.
    const existingVoice = isEdit ? voices.find(v => v.id === slug) : null;
    const audioPath = null;

    // Process samples (dodatkowe probki) - obsluga 3 przypadkow:
    // 1. Istniejace - rename (existing_sample_name_N) lub remove (existing_sample_remove_N=1)
    // 2. Nowe pliki uploadowane (new_sample_file[] + new_sample_name[])
    const samples = [];
    const filesToDelete = []; // pliki ktore trzeba skasowac z dysku po zapisie

    // 1. Istniejace probki (z obsluga reorder przez pos field)
    const existingItems = [];
    if (existingVoice && Array.isArray(existingVoice.samples)) {
      existingVoice.samples.forEach((s, i) => {
        const removeFlag = b[`existing_sample_remove_${i}`];
        if (removeFlag === '1') {
          // Usun probke - jesli plik nie jest wspoldzielony z audioPath, do skasowania
          if (s.url && s.url !== audioPath) filesToDelete.push(s.url);
          return;
        }
        const newName = (b[`existing_sample_name_${i}`] || s.name || '').trim();
        const url = b[`existing_sample_url_${i}`] || s.url;
        // Reorder: pos field z formularza (default = oryginalny indeks i, gdy user nie ruszal)
        const posRaw = b[`existing_sample_pos_${i}`];
        const pos = posRaw !== undefined && posRaw !== '' && !isNaN(parseInt(posRaw, 10)) ? parseInt(posRaw, 10) : i;
        existingItems.push({ pos, sample: { name: newName || `Probka ${i + 1}`, url } });
      });
    }
    // Sortuj po pos (zachowuje oryginalna kolejnosc jesli nikt nie ruszal strzalek;
    // odzwierciedla nowa kolejnosc gdy user kliknal moveSample(↑/↓) w panelu)
    existingItems.sort((a, b) => a.pos - b.pos);
    existingItems.forEach(x => samples.push(x.sample));

    // 2. Nowe pliki
    const newFiles = (req.files && (req.files['new_sample_file[]'] || req.files['new_sample_file'])) || [];
    const newNames = Array.isArray(b['new_sample_name[]']) ? b['new_sample_name[]'] : (b['new_sample_name[]'] ? [b['new_sample_name[]']] : []);
    if (newFiles.length > 0) {
      // Znajdz nastepny wolny indeks pliku ({slug}-N.ext) - skanujemy istniejace samples i audioPath
      const usedNumbers = new Set();
      const allUrls = [audioPath, ...samples.map(s => s.url)].filter(Boolean);
      allUrls.forEach(u => {
        const m = u.match(new RegExp(`/${slug}(?:-(\\d+))?\\.(?:mp3|wav|ogg)$`));
        if (m) usedNumbers.add(m[1] ? parseInt(m[1]) : 1);
      });
      let nextNum = 2;
      while (usedNumbers.has(nextNum)) nextNum++;

      for (let i = 0; i < newFiles.length; i++) {
        const f = newFiles[i];
        const ext = path.extname(f.originalname).toLowerCase() || '.mp3';
        const fname = nextNum === 1 ? `${slug}${ext}` : `${slug}-${nextNum}${ext}`;
        const outFile = path.join(AUDIO_DIR, fname);
        fs.renameSync(f.path, outFile);
        const url = `/audio/lektorzy/${fname}`;
        const name = (newNames[i] || '').trim() || `Probka ${samples.length + 1}`;
        samples.push({ name, url });
        usedNumbers.add(nextNum);
        while (usedNumbers.has(nextNum)) nextNum++;
      }
    }

    // Auto-fix: jesli audioPath jest pusty, ustaw na pierwsza probke
    if (!audioPath && samples.length > 0) audioPath = samples[0].url;

    // Parse languages
    const languages = (b.languages || '').split(',').map(l => l.trim()).filter(l => l);

    // Parse applications
    const applications = [];
    if (b.app_ivr) applications.push('Powitanie tel.');
    if (b.app_reklama) applications.push('Reklama');
    if (b.app_narracja) applications.push('Narracja do filmu');
    if (b.app_audiobook) applications.push('Audiobook');

    // Parse prices
    const priceFields = [
      'ivr_100', 'ivr_200', 'ivr_200plus',
      'ivr_guarantee_100', 'ivr_guarantee_100plus',
      'ivr_melody', 'ivr_bilingual',
      'spot_radio_local', 'spot_radio_national',
      'spot_tv_local', 'spot_tv_national',
      'spot_social_1min', 'spot_social_2min',
      'narration_1page', 'narration_2pages', 'narration_3pages'
    ];
    const prices = {};
    for (const field of priceFields) {
      const val = (b[field] || '').trim();
      if (!val) continue;
      if (val.toLowerCase() === 'wycena') {
        prices[field] = 'wycena';
      } else {
        const num = parseFloat(val);
        if (!isNaN(num)) prices[field] = num;
        else prices[field] = val;
      }
    }
    // Auto-set 3plus as wycena
    prices['narration_3plus'] = 'wycena';
    prices['ivr_200plus'] = prices['ivr_200plus'] || 'wycena';

    // Zachowaj order (przy edycji) lub przypisz nowy (na koniec listy) przy dodawaniu
    let nextOrder;
    if (existingVoice && typeof existingVoice.order === 'number') {
      nextOrder = existingVoice.order;
    } else {
      const maxOrder = voices.reduce((m, v) => Math.max(m, typeof v.order === 'number' ? v.order : 0), 0);
      nextOrder = maxOrder + 10;
    }

    // Zachowaj seoTitle/seoDescription i ich warianty EN (jesli istniejace)
    const seoFields = existingVoice
      ? { seoTitle: existingVoice.seoTitle, seoDescription: existingVoice.seoDescription, seoTitleEn: existingVoice.seoTitleEn, seoDescriptionEn: existingVoice.seoDescriptionEn, descriptionEn: existingVoice.descriptionEn }
      : {};

    const voiceData = {
      id: slug,
      name: b.name,
      gender: b.gender || 'm',
      age: b.age || null,
      languages,
      description: b.description || null,
      ...(seoFields.descriptionEn !== undefined ? { descriptionEn: seoFields.descriptionEn } : {}),
      // Dane administracyjne - niewidoczne publicznie
      realName: (b.realName || '').trim() || null,
      contactEmail: (b.contactEmail || '').trim() || null,
      contactPhone: (b.contactPhone || '').trim() || null,
      photo: photoPath,
      samples: samples.length > 0 ? samples.slice(0, 5) : null,
      turnaround: b.turnaround || null,
      famous: b.famous === 'on',
      native: b.native === 'on',
      nativeLanguage: b.nativeLanguage || null,
      applications,
      priceGroup: b.priceGroup || null,
      hidePrice: b.hidePrice === 'on',
      prices,
      profileUrl: `/lektorzy/${slug}/`,
      ...(seoFields.seoTitle !== undefined ? { seoTitle: seoFields.seoTitle } : {}),
      ...(seoFields.seoDescription !== undefined ? { seoDescription: seoFields.seoDescription } : {}),
      ...(seoFields.seoTitleEn !== undefined ? { seoTitleEn: seoFields.seoTitleEn } : {}),
      ...(seoFields.seoDescriptionEn !== undefined ? { seoDescriptionEn: seoFields.seoDescriptionEn } : {}),
      order: nextOrder,
      // Zachowaj approved i createdAt (KRYTYCZNE - bez approved=true loadVoices()
      // ukryje lektora przed publicznym widokiem). Nowy lektor utworzony recznie
      // w panelu = od razu zaakceptowany (approved=true), tylko drafty z API
      // /api/voices/draft/ maja approved=false.
      approved: existingVoice && typeof existingVoice.approved === 'boolean'
        ? existingVoice.approved
        : true,
      ...(existingVoice && existingVoice.createdAt !== undefined
        ? { createdAt: existingVoice.createdAt }
        : {})
    };

    if (isEdit) {
      const idx = voices.findIndex(v => v.id === slug);
      if (idx >= 0) {
        voices[idx] = voiceData;
      }
    } else {
      voices.push(voiceData);
    }

    saveVoices(voices);

    // Skasuj fizyczne pliki probek oznaczone do usuniecia (po udanym zapisie JSON)
    filesToDelete.forEach(url => {
      const fname = path.basename(url);
      const fpath = path.join(AUDIO_DIR, fname);
      if (fs.existsSync(fpath)) {
        try { fs.unlinkSync(fpath); }
        catch (e) { console.warn('[admin] Could not delete sample file:', fpath, e.message); }
      }
    });

    const action = isEdit ? 'Zaktualizowano' : 'Dodano';
    res.redirect(`/admin/lektorzy/?msg=${action}+${encodeURIComponent(b.name)}`);

  } catch (err) {
    console.error('Admin save error:', err);
    res.redirect('/admin/lektorzy/?msg=Blad:+' + encodeURIComponent(err.message));
  }
});

// --- Reorder (drag&drop / inline order edit) ---
router.post('/reorder/', express.json(), (req, res) => {
  try {
    const incoming = req.body && Array.isArray(req.body.order) ? req.body.order : null;
    if (!incoming) return res.status(400).json({ error: 'Brak pola order (array of ids)' });

    const voices = loadVoices();
    const byId = new Map(voices.map(v => [v.id, v]));
    const seen = new Set();
    const ordered = [];

    // 1. Wpisy z incoming (w kolejnosci jak przyszly)
    incoming.forEach(id => {
      if (typeof id === 'string' && byId.has(id) && !seen.has(id)) {
        ordered.push(byId.get(id));
        seen.add(id);
      }
    });
    // 2. Reszta (jesli klient nie przyslal wszystkich) - dopisana na koncu w obecnej kolejnosci
    voices.forEach(v => {
      if (!seen.has(v.id)) ordered.push(v);
    });

    // 3. Renumeracja krokiem 10
    ordered.forEach((v, i) => { v.order = (i + 1) * 10; });

    saveVoices(ordered);

    res.json({
      ok: true,
      voices: ordered.map(v => ({ id: v.id, order: v.order }))
    });
  } catch (err) {
    console.error('Reorder error:', err);
    res.status(500).json({ error: err.message });
  }
});

// --- Akceptacja drafta (approved=false -> true) ---
router.post('/zaakceptuj/:id/', (req, res) => {
  const voices = loadVoices();
  const voice = voices.find(v => v.id === req.params.id);
  if (!voice) return res.redirect('/admin/lektorzy/?msg=Nie+znaleziono');

  voice.approved = true;
  saveVoices(voices);

  res.redirect(`/admin/lektorzy/?msg=Zaakceptowano+${encodeURIComponent(voice.name)}`);
});

// --- Odrzucenie drafta (delete) - tylko dla approved=false ---
router.post('/odrzuc/:id/', (req, res) => {
  const voices = loadVoices();
  const voice = voices.find(v => v.id === req.params.id);
  if (!voice) return res.redirect('/admin/lektorzy/?msg=Nie+znaleziono');

  // Bezpiecznik: odrzuc tylko drafty (approved=false). Approved lektory uzywaj /usun/.
  if (voice.approved === true) {
    return res.redirect('/admin/lektorzy/?msg=' + encodeURIComponent('Lektor jest zaakceptowany - uzyj Usun'));
  }

  const name = voice.name;
  const filtered = voices.filter(v => v.id !== req.params.id);
  saveVoices(filtered);

  // Pliki photo/audio nie istnieja dla draftow (n8n nie wgrywa), ale defensive cleanup:
  const webpFile = path.join(IMG_DIR, `${req.params.id}.webp`);
  if (fs.existsSync(webpFile)) fs.unlinkSync(webpFile);

  res.redirect(`/admin/lektorzy/?filter=pending&msg=Odrzucono+${encodeURIComponent(name)}`);
});

// --- Usuwanie ---
router.post('/usun/:id/', (req, res) => {
  const voices = loadVoices();
  const voice = voices.find(v => v.id === req.params.id);
  if (!voice) return res.redirect('/admin/lektorzy/?msg=Nie+znaleziono');

  const name = voice.name;
  const filtered = voices.filter(v => v.id !== req.params.id);
  saveVoices(filtered);

  // Delete files
  const webpFile = path.join(IMG_DIR, `${req.params.id}.webp`);
  if (fs.existsSync(webpFile)) fs.unlinkSync(webpFile);

  const mp3File = path.join(AUDIO_DIR, `${req.params.id}.mp3`);
  if (fs.existsSync(mp3File)) fs.unlinkSync(mp3File);

  res.redirect(`/admin/lektorzy/?msg=Usunięto+${encodeURIComponent(name)}`);
});

module.exports = router;
