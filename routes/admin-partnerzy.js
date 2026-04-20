const express = require('express');
const router = express.Router();
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const DATA_PATH = path.join(__dirname, '..', 'data', 'partners.json');
const IMG_DIR = path.join(__dirname, '..', 'public', 'img', 'partners');

// Multer - temp upload (logo only)
const upload = multer({
  dest: '/tmp/uploads/',
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const ok = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.originalname);
    cb(null, ok);
  }
});

// --- Helpers ---
function loadPartners() {
  try {
    return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  } catch {
    return [];
  }
}

function savePartners(partners) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(partners, null, 2), 'utf8');
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

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
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

// --- Lista partnerów ---
router.get('/', (req, res) => {
  const partners = loadPartners();
  res.render('admin/partnerzy', {
    title: 'Admin - Partnerzy',
    partners,
    msg: req.query.msg || null
  });
});

// --- Formularz dodawania ---
router.get('/dodaj/', (req, res) => {
  res.render('admin/partner-form', {
    title: 'Dodaj partnera',
    partner: null,
    editing: false
  });
});

// --- Formularz edycji ---
router.get('/edytuj/:id/', (req, res) => {
  const partners = loadPartners();
  const partner = partners.find(p => p.id === req.params.id);
  if (!partner) return res.redirect('/admin/partnerzy/?msg=Nie+znaleziono');

  res.render('admin/partner-form', {
    title: `Edytuj: ${partner.name}`,
    partner,
    editing: true
  });
});

// --- Zapis (dodaj / edytuj) ---
router.post('/zapisz/', upload.single('logo'), async (req, res) => {
  try {
    const partners = loadPartners();
    const b = req.body;
    const isEdit = b.editing === 'true';

    let id = isEdit ? b.original_id : generateId();
    let slug = b.slug ? slugify(b.slug) : slugify(b.name);

    // Ensure unique slug
    if (!isEdit || slug !== (partners.find(p => p.id === id)?.slug)) {
      let base = slug;
      let counter = 2;
      while (partners.find(p => p.slug === slug && p.id !== id)) {
        slug = `${base}-${counter}`;
        counter++;
      }
    }

    // Process logo
    let logoPath = isEdit ? (partners.find(p => p.id === id)?.logo || null) : null;
    if (req.file) {
      const tmpFile = req.file.path;
      const outFile = path.join(IMG_DIR, `${slug}.webp`);
      await sharp(tmpFile)
        .resize(200, 200, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
        .webp({ quality: 85 })
        .toFile(outFile);
      fs.unlinkSync(tmpFile);
      logoPath = `/img/partners/${slug}.webp`;
    }

    // Parse filter languages (checkboxes)
    let filterLanguages = [];
    if (b.filter_languages) {
      filterLanguages = Array.isArray(b.filter_languages) ? b.filter_languages : [b.filter_languages];
    }

    const partnerData = {
      id,
      slug,
      name: b.name,
      logo: logoPath,
      accentColor: b.accentColor || '#c2410c',
      heading: b.heading || 'Wybierz lektora',
      description: b.description || '',
      filters: {
        gender: b.filter_gender || '',
        languages: filterLanguages,
        famous: b.filter_famous === 'on',
        native: b.filter_native === 'on',
        hidePrice: b.filter_hidePrice !== 'off'  // default: true (hide)
      },
      orderMode: b.orderMode || 'owner',
      partnerEmail: b.partnerEmail || '',
      partnerPhone: b.partnerPhone || '',
      active: b.active === 'on',
      createdAt: isEdit ? (partners.find(p => p.id === id)?.createdAt || new Date().toISOString()) : new Date().toISOString()
    };

    if (isEdit) {
      const idx = partners.findIndex(p => p.id === id);
      if (idx >= 0) {
        partners[idx] = partnerData;
      }
    } else {
      partners.push(partnerData);
    }

    savePartners(partners);

    const action = isEdit ? 'Zaktualizowano' : 'Dodano';
    res.redirect(`/admin/partnerzy/?msg=${action}+${encodeURIComponent(b.name)}`);

  } catch (err) {
    console.error('Admin partner save error:', err);
    res.redirect('/admin/partnerzy/?msg=Blad:+' + encodeURIComponent(err.message));
  }
});

// --- Usuwanie ---
router.post('/usun/:id/', (req, res) => {
  const partners = loadPartners();
  const partner = partners.find(p => p.id === req.params.id);
  if (!partner) return res.redirect('/admin/partnerzy/?msg=Nie+znaleziono');

  const name = partner.name;
  const filtered = partners.filter(p => p.id !== req.params.id);
  savePartners(filtered);

  // Delete logo
  if (partner.logo) {
    const logoFile = path.join(__dirname, '..', 'public', partner.logo);
    if (fs.existsSync(logoFile)) fs.unlinkSync(logoFile);
  }

  res.redirect(`/admin/partnerzy/?msg=Usunięto+${encodeURIComponent(name)}`);
});

module.exports = router;
