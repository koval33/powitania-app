const express = require('express');
const router = express.Router();
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const DATA_PATH = path.join(__dirname, '..', 'data', 'voices.json');
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
    } else if (file.fieldname === 'audio') {
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
  fs.writeFileSync(DATA_PATH, JSON.stringify(voices, null, 2), 'utf8');
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

// --- Lista lektorów ---
router.get('/', (req, res) => {
  const voices = loadVoices();
  res.render('admin/lektorzy', {
    title: 'Admin — Lektorzy',
    voices,
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
  { name: 'audio', maxCount: 1 }
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

    // Process audio
    let audioPath = isEdit ? (voices.find(v => v.id === slug)?.audio || null) : null;
    if (req.files && req.files.audio && req.files.audio[0]) {
      const tmpFile = req.files.audio[0].path;
      const ext = path.extname(req.files.audio[0].originalname).toLowerCase() || '.mp3';
      const outFile = path.join(AUDIO_DIR, `${slug}${ext}`);
      fs.renameSync(tmpFile, outFile);
      audioPath = `/audio/lektorzy/${slug}${ext}`;
    }

    // Parse languages
    const languages = (b.languages || '').split(',').map(l => l.trim()).filter(l => l);

    // Parse applications
    const applications = [];
    if (b.app_ivr) applications.push('Powitanie tel.');
    if (b.app_reklama) applications.push('Reklama');
    if (b.app_narracja) applications.push('Narracja do filmu');
    if (b.app_audiobook) applications.push('Audiobook');

    const voiceData = {
      id: slug,
      name: b.name,
      gender: b.gender || 'm',
      age: b.age || null,
      languages,
      description: b.description || null,
      photo: photoPath,
      audio: audioPath,
      samples: null,
      turnaround: b.turnaround || null,
      famous: b.famous === 'on',
      native: b.native === 'on',
      nativeLanguage: b.nativeLanguage || null,
      applications,
      priceGroup: b.priceGroup || null,
      hidePrice: b.hidePrice === 'on',
      profileUrl: `/lektor/${slug}/`
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

    const action = isEdit ? 'Zaktualizowano' : 'Dodano';
    res.redirect(`/admin/lektorzy/?msg=${action}+${encodeURIComponent(b.name)}`);

  } catch (err) {
    console.error('Admin save error:', err);
    res.redirect('/admin/lektorzy/?msg=Blad:+' + encodeURIComponent(err.message));
  }
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
