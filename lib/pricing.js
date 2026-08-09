/**
 * Wycena nagrania - reguły cennika w jednym miejscu, do użytku automatyzacji.
 *
 * WAŻNE: ten moduł jest DODATKIEM. Strona (views/lektor.ejs) liczy po staremu
 * i nie importuje niczego stąd - dołożenie tego pliku nie zmienia zachowania
 * serwisu ani o jotę. To świadoma decyzja: kalkulator na produkcji działa,
 * więc go nie ruszamy.
 *
 * Ceną tego bezpieczeństwa jest kopia tabeli PRICING_MAP w dwóch miejscach.
 * Żeby kopia nie rozjechała się po cichu, `npm run check-pricing`
 * (scripts/check-pricing-parity.js) porównuje ten plik z szablonem i krzyczy,
 * gdy ktoś zmieni jedno bez drugiego.
 *
 * Źródłem stawek pozostaje data/voices.json, czyli panel produkcyjny.
 */

const path = require('path');
const fs = require('fs');

const VOICES_PATH = path.join(__dirname, '..', 'data', 'voices.json');

// Dodatki o cenie stałej, niezależnej od lektora (z PRICING_MAP w lektor.ejs)
const FIXED_ADDONS = {
  addon_av_montage: { label: 'Montaż audio-video', price: 200 },
  addon_remote_session: { label: 'Zdalny udział w nagraniu', price: 150 },
  addon_archiving: { label: 'Archiwizacja nagrań Klienta na okres 2 lat', price: 50 }
};

// Mapa usług - odwzorowanie PRICING_MAP z views/lektor.ejs
const PRICING_MAP = {
  ivr: {
    label: 'Zapowiedzi telefoniczne (IVR)',
    method: 'wordcount',
    unit: 'słów',
    tiers: [
      { max: 100, field: 'ivr_100', label: 'do 100 słów' },
      { max: 200, field: 'ivr_200', label: '101-200 słów' },
      { max: Infinity, field: 'ivr_200plus', label: 'pow. 200 słów' }
    ],
    addons: ['ivr_guarantee_100', 'ivr_guarantee_100plus', 'ivr_melody', 'addon_archiving'],
    note: null
  },
  radio: {
    label: 'Spot radiowy',
    method: 'choice',
    options: [
      { field: 'spot_radio_local', label: 'Lokalne' },
      { field: 'spot_radio_national', label: 'Krajowe' }
    ],
    addons: ['addon_av_montage', 'addon_remote_session', 'addon_archiving'],
    note: 'Stawka uwzgl. licencję na kampanie reklamowe na okres do 12 mies.'
  },
  tv: {
    label: 'Spot telewizyjny',
    method: 'choice',
    options: [
      { field: 'spot_tv_local', label: 'Lokalna' },
      { field: 'spot_tv_national', label: 'Krajowa' }
    ],
    addons: ['addon_av_montage', 'addon_remote_session', 'addon_archiving'],
    note: 'Stawka uwzgl. licencję na kampanie reklamowe na okres do 12 mies.'
  },
  social: {
    label: 'Spot kampania social media',
    method: 'choice',
    options: [
      { field: 'spot_social_1min', label: 'Do 1 minuty' },
      { field: 'spot_social_2min', label: 'Do 2 minut' }
    ],
    addons: ['addon_av_montage', 'addon_remote_session', 'addon_archiving'],
    note: 'Stawka uwzgl. licencję na kampanie reklamowe na okres do 12 mies.'
  },
  elearning: {
    label: 'E-learning / szkolenia',
    method: 'pages',
    unit: 'stron A4',
    tiers: NARRATION_TIERS(),
    addons: ['addon_av_montage', 'addon_remote_session', 'addon_archiving'],
    note: null
  },
  film: {
    label: 'Narracja filmowa',
    method: 'pages',
    unit: 'stron A4',
    tiers: NARRATION_TIERS(),
    addons: ['addon_av_montage', 'addon_remote_session', 'addon_archiving'],
    note: 'Licencja nie obejmuje płatnych kampanii reklamowych.'
  },
  audiobook: {
    label: 'Audiobook',
    method: 'pages',
    unit: 'stron A4',
    tiers: NARRATION_TIERS(),
    addons: ['addon_remote_session', 'addon_archiving'],
    note: null
  },
  podcast: {
    label: 'Podcast (intro/outro)',
    method: 'pages',
    unit: 'stron A4',
    tiers: NARRATION_TIERS(),
    addons: ['addon_remote_session', 'addon_archiving'],
    note: null
  }
};

// Narracja ma ten sam próg dla wszystkich czterech usług
function NARRATION_TIERS() {
  return [
    { max: 1, field: 'narration_1page', label: '1 strona A4' },
    { max: 2, field: 'narration_2pages', label: '2 strony A4' },
    { max: 3, field: 'narration_3pages', label: '3 strony A4' },
    { max: Infinity, field: 'narration_3plus', label: 'pow. 3 stron A4' }
  ];
}

let cache = { mtime: 0, voices: null };

function loadVoices() {
  const stat = fs.statSync(VOICES_PATH);
  if (!cache.voices || stat.mtimeMs !== cache.mtime) {
    cache = { mtime: stat.mtimeMs, voices: JSON.parse(fs.readFileSync(VOICES_PATH, 'utf8')) };
  }
  return cache.voices;
}

function slugFromUrl(url) {
  const m = String(url || '').match(/\/lektorzy\/([^/?#]+)/);
  return m ? m[1] : '';
}

/** Znajdź lektora po nazwie, slugu albo adresie profilu. */
function findVoice(query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return null;
  const voices = loadVoices().filter(v => v.approved !== false);
  const slug = slugFromUrl(q) || q;
  return voices.find(v => String(v.name || '').toLowerCase() === q)
      || voices.find(v => slugFromUrl(v.profileUrl) === slug)
      || voices.find(v => String(v.name || '').toLowerCase().startsWith(q))
      || null;
}

/** Ekspres: +50%, zaokrąglone do 10 zł - dokładnie jak na stronie. */
function expressPrice(value) {
  return Math.round((value * 1.5) / 10) * 10;
}

function pickTier(service, amount) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return null;
  return service.tiers.find(t => n <= t.max) || null;
}

/**
 * Policz wycenę dla jednego lektora.
 *
 * Zwraca {ok, lektor, usluga, pozycje[], razem_netto, uwaga} albo
 * {ok:false, powod} - gdy cennik nie ma stawki, mówimy o tym wprost zamiast
 * podstawiać jakąkolwiek liczbę. Wycena idzie potem do maila do klienta.
 */
function quote({ voice, service, amount, option, addons = [], express = false }) {
  const v = typeof voice === 'object' ? voice : findVoice(voice);
  if (!v) return { ok: false, powod: `Nie znalazłem lektora: ${voice}` };

  const svc = PRICING_MAP[service];
  if (!svc) {
    return { ok: false, powod: `Nieznany rodzaj usługi: ${service}. Dostępne: ` +
      Object.keys(PRICING_MAP).join(', ') };
  }

  const prices = v.prices || {};
  const items = [];
  let base = null;
  let scopeLabel = '';

  if (svc.method === 'choice') {
    const chosen = svc.options.find(o => o.field === option || o.label.toLowerCase() === String(option || '').toLowerCase());
    if (!chosen) {
      return { ok: false, powod: `Dla usługi "${svc.label}" trzeba wskazać zasięg: ` +
        svc.options.map(o => o.label).join(' albo ') };
    }
    base = prices[chosen.field];
    scopeLabel = chosen.label;
  } else {
    const tier = pickTier(svc, amount);
    if (!tier) {
      return { ok: false, powod: `Dla usługi "${svc.label}" podaj liczbę ${svc.unit}` };
    }
    base = prices[tier.field];
    scopeLabel = tier.label;
  }

  if (base === undefined || base === null) {
    return { ok: false, powod: `${v.name} nie ma stawki dla "${svc.label} - ${scopeLabel}"` };
  }
  if (typeof base !== 'number') {
    // "wycena" / "oferta indywidualna" - świadomie nie zgadujemy kwoty
    return { ok: false, powod: `${v.name}, ${svc.label} - ${scopeLabel}: cennik mówi ` +
      `"${base}", czyli wymaga indywidualnej decyzji. Podaj kwotę sam.` };
  }

  const priceOf = (value) => (express ? expressPrice(value) : value);
  items.push({ nazwa: `${svc.label} - ${scopeLabel}`, netto: priceOf(base) });

  for (const key of addons) {
    if (!svc.addons.includes(key)) {
      return { ok: false, powod: `Dodatek "${key}" nie występuje przy usłudze ${svc.label}` };
    }
    const fixed = FIXED_ADDONS[key];
    const value = fixed ? fixed.price : prices[key];
    if (value === undefined || value === null || typeof value !== 'number') {
      return { ok: false, powod: `${v.name} nie ma stawki dla dodatku "${key}"` };
    }
    items.push({
      nazwa: fixed ? fixed.label : addonLabel(key),
      netto: fixed ? value : priceOf(value)
    });
  }

  return {
    ok: true,
    lektor: v.name,
    profil: v.profileUrl || '',
    ceny_ukryte: Boolean(v.hidePrice),
    usluga: svc.label,
    zakres: scopeLabel,
    ekspres: Boolean(express),
    pozycje: items,
    razem_netto: items.reduce((sum, i) => sum + i.netto, 0),
    uwaga: svc.note
  };
}

function addonLabel(key) {
  return {
    ivr_guarantee_100: 'Gwarancja bezpłatnej modyfikacji nagrania (12 m-cy)',
    ivr_guarantee_100plus: 'Gwarancja bezpłatnej modyfikacji nagrania (12 m-cy)',
    ivr_melody: 'Melodia w tle'
  }[key] || key;
}

module.exports = { PRICING_MAP, FIXED_ADDONS, findVoice, quote, loadVoices, expressPrice };
