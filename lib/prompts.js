// Tempo czytania: IVR/e-learning = spokojne, spoty/narracja = szybsze
const WPM_SLOW = { pl: 130, en: 150, de: 125, fr: 140, cs: 130, uk: 135 };
const WPM_FAST = { pl: 165, en: 180, de: 155, fr: 170, cs: 160, uk: 165 };

const SLOW_TYPES = ['ivr', 'elearning', 'audiobook', 'film'];

const WPM = WPM_SLOW; // alias dla kompatybilności

function calcWords(durationSec, lang, serviceType) {
  // Default to fast (165 WPM) — slow only for explicitly listed types
  const slow = serviceType && SLOW_TYPES.includes(serviceType);
  const table = slow ? WPM_SLOW : WPM_FAST;
  return Math.round((table[lang] || (slow ? 130 : 165)) * (durationSec / 60));
}

const LANG_NAMES = {
  pl: 'polskim', en: 'angielskim', de: 'niemieckim',
  fr: 'francuskim', cs: 'czeskim', uk: 'ukraińskim'
};

const LANG_NAMES_EN = {
  pl: 'Polish', en: 'English', de: 'German',
  fr: 'French', cs: 'Czech', uk: 'Ukrainian'
};

const LANG_SWITCHES = {
  en: 'For English please press 9',
  de: 'Für Deutsch drücken Sie bitte die 9',
  fr: 'Pour le français, appuyez sur 9',
  cs: 'Pro češtinu stiskněte 9',
  uk: 'Для української мови натисніть 9'
};

const IVR_MENUS = {
  logistics: 'Naciśnij 1 - śledzenie przesyłki, 2 - zamówienie transportu, 3 - reklamacje, 4 - oferta, 5 - kontakt',
  automotive: 'Naciśnij 1 - umówienie na serwis, 2 - części zamienne, 3 - assistance drogowe, 4 - sprzedaż, 5 - kontakt',
  public: 'Naciśnij 1 - informacje o dokumentach, 2 - godziny otwarcia, 3 - umówienie wizyty, 4 - kontakt, 5 - inne',
  hotel: 'Naciśnij 1 - rezerwacja pokoju, 2 - informacje o obiekcie, 3 - anulowanie, 4 - recepcja, 5 - inne',
  medical: 'Naciśnij 1 - rejestracja na wizytę, 2 - wyniki badań, 3 - anulowanie wizyty, 4 - recepta, 5 - kontakt',
  finance: 'Naciśnij 1 - informacje o produkcie, 2 - reklamacja, 3 - zmiana danych, 4 - konsultant, 5 - inne',
  retail: 'Naciśnij 1 - status zamówienia, 2 - zwroty i reklamacje, 3 - informacje o produktach, 4 - obsługa, 5 - inne',
  telecom: 'Naciśnij 1 - wsparcie techniczne, 2 - faktura i płatności, 3 - zmiana pakietu, 4 - reklamacja, 5 - kontakt',
  education: 'Naciśnij 1 - rekrutacja, 2 - dziekanat, 3 - informacje o kursach, 4 - kontakt, 5 - inne',
  realestate: 'Naciśnij 1 - oferty sprzedaży, 2 - wynajem, 3 - umówienie oględzin, 4 - kontakt, 5 - inne',
  law: 'Naciśnij 1 - umówienie konsultacji, 2 - status sprawy, 3 - dokumenty, 4 - kontakt, 5 - inne',
  other: 'Naciśnij 1 - sprzedaż, 2 - wsparcie, 3 - reklamacje, 4 - informacje, 5 - inne'
};

const IVR_MENUS_EN = {
  logistics: 'Press 1 - shipment tracking, 2 - order transport, 3 - complaints, 4 - offer, 5 - contact',
  automotive: 'Press 1 - schedule service, 2 - spare parts, 3 - roadside assistance, 4 - sales, 5 - contact',
  public: 'Press 1 - document information, 2 - opening hours, 3 - schedule appointment, 4 - contact, 5 - other',
  hotel: 'Press 1 - room reservation, 2 - property information, 3 - cancellation, 4 - reception, 5 - other',
  medical: 'Press 1 - schedule appointment, 2 - test results, 3 - cancel appointment, 4 - prescription, 5 - contact',
  finance: 'Press 1 - product information, 2 - complaints, 3 - update details, 4 - advisor, 5 - other',
  retail: 'Press 1 - order status, 2 - returns and complaints, 3 - product information, 4 - support, 5 - other',
  telecom: 'Press 1 - technical support, 2 - billing and payments, 3 - change plan, 4 - complaints, 5 - contact',
  education: 'Press 1 - admissions, 2 - student office, 3 - course information, 4 - contact, 5 - other',
  realestate: 'Press 1 - sales listings, 2 - rentals, 3 - schedule viewing, 4 - contact, 5 - other',
  law: 'Press 1 - schedule consultation, 2 - case status, 3 - documents, 4 - contact, 5 - other',
  other: 'Press 1 - sales, 2 - support, 3 - complaints, 4 - information, 5 - other'
};

function buildPrompt(params) {
  const { action, serviceType, industry, company, offering, audience, tone, goal, languages, duration, textInput, targetDur, lang } = params;
  const isEN = lang === 'en';

  if (action === 'optimize') {
    const words = countSpeakableWords(textInput);
    const target = calcWords(parseInt(targetDur), lang || 'pl', serviceType);

    if (isEN) {
      return `You are an experienced copywriter specializing in voiceover scripts.

Optimize the following text to fit within ${targetDur} seconds of recording. The text MUST have ${target} words (±5 words). It currently has ${words} words.

Rules:
- Preserve the key message and tone
- Keep as many original words and phrases as possible — only change what is necessary
- Adjust the length to the specified duration
- The text should sound natural when read aloud
- Return ONLY the optimized text, without any comments

Text to optimize:
${textInput}`;
    }

    return `Jesteś doświadczonym copywriterem specjalizującym się w tekstach do nagrań lektorskich.

Zoptymalizuj poniższy tekst tak, aby mieścił się w ${targetDur} sekundach nagrania. Tekst MUSI mieć ${target} słów (±5 słów). Obecnie ma ${words} słów.

Zasady:
- Zachowaj kluczowy przekaz i ton
- Zachowaj jak najwięcej oryginalnych słów i fraz — zmieniaj tylko to, co konieczne
- Dostosuj długość do podanego czasu
- Tekst ma brzmieć naturalnie przy czytaniu na głos
- Zwróć TYLKO zoptymalizowany tekst, bez komentarzy

Tekst do optymalizacji:
${textInput}`;
  }

  if (serviceType === 'ivr') {
    return isEN ? buildIVRPromptEN(params) : buildIVRPrompt(params);
  }

  return isEN ? buildGeneralPromptEN(params) : buildGeneralPrompt(params);
}

function buildIVRPrompt({ industry, company, audience, tone, languages }) {
  const menu = IVR_MENUS[industry] || IVR_MENUS.other;
  const langList = (languages || ['pl']).map(l => LANG_NAMES[l]).join(' i ');
  const langCount = (languages || ['pl']).length;
  const wordLimit = langCount >= 2 ? 200 : 100;

  const secondLang = (languages || []).find(l => l !== 'pl');
  let switcherLine = '';
  if (secondLang && languages.includes('pl')) {
    switcherLine = `\n\nWAŻNE: W POLSKIEJ wersji, zaraz po powitaniu, dodaj: "${LANG_SWITCHES[secondLang]}"`;
  }

  const lang1Name = LANG_NAMES[(languages || ['pl'])[0]] || 'polskim';
  const lang2Part = languages && languages[1]
    ? `\n\n[JĘZYK 2 — ${LANG_NAMES[languages[1]] || ''}]\n[tekst...]`
    : '';

  return `Jesteś doświadczonym copywriterem specjalizującym się w zapowiedziach telefonicznych (IVR) dla firm.

Stwórz profesjonalne zapowiedzi IVR dla firmy: ${company}

KONTEKST:
- Branża: ${industry}
- Grupa docelowa: ${audience}
- Ton komunikacji: ${tone}

SUGEROWANE MENU:
${menu}

WYMAGANIA:
Przygotuj teksty w ${langCount} językach: ${langList}.

Dla KAŻDEGO języka przygotuj:
1. Powitanie${switcherLine}
2. OBOWIĄZKOWA informacja o nagrywaniu rozmów (wymóg RODO)
3. Menu opcji (5-6 opcji dostosowanych do branży)
4. Komunikat o oczekiwaniu na połączenie
5. Komunikat poza godzinami pracy
6. Zakończenie

Format odpowiedzi — używaj PROSTYCH etykiet sekcji (np. "Powitanie:", "Menu:"), NIE używaj formatowania ** **:
[JĘZYK 1 — ${lang1Name}]
[tekst...]${lang2Part}

Teksty muszą być:
- Naturalne i profesjonalne
- Dostosowane do kultury danego języka
- Gotowe do odczytania przez lektora (bez skrótów, z pełnymi formami)

LIMIT SŁÓW — BEZWZGLĘDNIE PRZESTRZEGAJ:
Łączna długość wszystkich tekstów (${langCount >= 2 ? 'obu wersji językowych łącznie' : 'jednej wersji językowej'}) MUSI zmieścić się w ${wordLimit} słowach.
Każda sekcja powinna mieć 1-2 krótkie zdania. Bądź zwięzły i konkretny.
Policz słowa przed odpowiedzią i upewnij się, że nie przekraczasz limitu ${wordLimit} słów.`;
}

function buildIVRPromptEN({ industry, company, audience, tone, languages }) {
  const menu = IVR_MENUS_EN[industry] || IVR_MENUS_EN.other;
  const langList = (languages || ['en']).map(l => LANG_NAMES_EN[l]).join(' and ');
  const langCount = (languages || ['en']).length;
  const wordLimit = langCount >= 2 ? 200 : 100;

  const secondLang = (languages || []).find(l => l !== (languages || [])[0]);
  let switcherLine = '';
  if (secondLang && langCount >= 2) {
    const switchLang = LANG_SWITCHES[secondLang] || LANG_SWITCHES[(languages || [])[0]];
    if (switchLang) {
      switcherLine = `\n\nIMPORTANT: In the FIRST language version, right after the greeting, add a language switch prompt: "${switchLang}"`;
    }
  }

  const lang1Name = LANG_NAMES_EN[(languages || ['en'])[0]] || 'English';
  const lang2Part = languages && languages[1]
    ? `\n\n[LANGUAGE 2 — ${LANG_NAMES_EN[languages[1]] || ''}]\n[text...]`
    : '';

  return `You are an experienced copywriter specializing in telephone announcements (IVR) for businesses.

Create professional IVR announcements for the company: ${company}

CONTEXT:
- Industry: ${industry}
- Target audience: ${audience}
- Communication tone: ${tone}

SUGGESTED MENU:
${menu}

REQUIREMENTS:
Prepare scripts in ${langCount} language(s): ${langList}.

For EACH language, prepare:
1. Greeting${switcherLine}
2. MANDATORY call recording notice (GDPR requirement)
3. Menu options (5-6 options tailored to the industry)
4. On-hold message
5. After-hours message
6. Closing

Response format — use SIMPLE section labels (e.g. "Greeting:", "Menu:"), do NOT use ** ** formatting:
[LANGUAGE 1 — ${lang1Name}]
[text...]${lang2Part}

Scripts must be:
- Natural and professional
- Adapted to the culture of each language
- Ready to be read by a voice artist (no abbreviations, full forms)

WORD LIMIT — STRICTLY FOLLOW:
Total length of all scripts (${langCount >= 2 ? 'both language versions combined' : 'single language version'}) MUST fit within ${wordLimit} words.
Each section should have 1-2 short sentences. Be concise and specific.
Count words before responding and make sure you do not exceed the ${wordLimit} word limit.`;
}

function buildGeneralPromptEN({ serviceType, industry, company, offering, audience, tone, goal, duration }) {
  const typeLabels = {
    radio: 'a radio commercial',
    tv: 'a TV commercial',
    social: 'social media content',
    elearning: 'an e-learning narration',
    audiobook: 'audiobook narration',
    film: 'a film narration',
    podcast: 'a podcast intro/outro'
  };

  const typeLabel = typeLabels[serviceType] || 'a voiceover script';
  const dur = parseInt(duration) || 30;
  const words = calcWords(dur, 'en', serviceType);

  const durationLine = duration
    ? `- Target length: ${dur} seconds — the text MUST have ${words} words (±5 words). This is a technical requirement based on voice artist reading pace.`
    : '';

  const offeringLine = offering
    ? `- Product / service: ${offering}`
    : '';

  const goalLine = goal
    ? `- Communication goal: ${goal}`
    : '';

  return `You are an experienced copywriter specializing in advertising and narrative scripts for voiceover recordings.

Create ${typeLabel} for the company: ${company}

CONTEXT:
- Industry: ${industry}
${offeringLine}
- Target audience: ${audience}
- Communication tone: ${tone}
${goalLine}
${durationLine}

REQUIREMENTS:
- Text ready to be read by a professional voice artist
- Dynamic, engaging opening
- Natural language, no artificial phrases
${serviceType === 'radio' || serviceType === 'tv' || serviceType === 'social' ? '- Strong call to action (CTA) at the end' : ''}
${serviceType === 'elearning' ? '- Educational tone, clear and accessible' : ''}
${serviceType === 'podcast' ? '- Energetic, memorable, with character' : ''}
- Return ONLY the recording script, without any comments or labels
${duration ? `\nREMINDER: The text must have approximately ${words} words. Count words before responding.` : ''}

- Write the script in English

Script:`;
}

function buildGeneralPrompt({ serviceType, industry, company, offering, audience, tone, goal, duration }) {
  const typeLabels = {
    radio: 'spot radiowy',
    tv: 'spot telewizyjny',
    social: 'materiał do social media',
    elearning: 'narrację do materiału e-learningowego',
    audiobook: 'narrację / tekst do audiobooka',
    film: 'narrację filmową',
    podcast: 'intro/outro do podcastu'
  };

  const typeLabel = typeLabels[serviceType] || 'tekst do nagrania lektorskiego';
  const dur = parseInt(duration) || 30;
  const words = calcWords(dur, 'pl', serviceType);

  const durationLine = duration
    ? `- Docelowa długość: ${dur} sekund — tekst MUSI mieć ${words} słów (±5 słów). To wymóg techniczny wynikający z tempa czytania lektora.`
    : '';

  const offeringLine = offering
    ? `- Oferta / produkt: ${offering}`
    : '';

  const goalLine = goal
    ? `- Cel komunikacji: ${goal}`
    : '';

  return `Jesteś doświadczonym copywriterem specjalizującym się w tekstach reklamowych i narracyjnych do nagrań lektorskich.

Stwórz profesjonalny ${typeLabel} dla firmy: ${company}

KONTEKST:
- Branża: ${industry}
${offeringLine}
- Grupa docelowa: ${audience}
- Ton komunikacji: ${tone}
${goalLine}
${durationLine}

WYMAGANIA:
- Tekst gotowy do odczytania przez profesjonalnego lektora
- Dynamiczny, angażujący początek
- Naturalny język, bez sztucznych zwrotów
${serviceType === 'radio' || serviceType === 'tv' || serviceType === 'social' ? '- Mocne wezwanie do działania (CTA) na końcu' : ''}
${serviceType === 'elearning' ? '- Ton edukacyjny, jasny i przystępny' : ''}
${serviceType === 'podcast' ? '- Energiczny, zapamiętywalny, z charakterem' : ''}
- Zwróć TYLKO tekst do nagrania, bez komentarzy ani oznaczeń
${duration ? `\nPRZYPOMNIENIE: Tekst musi mieć dokładnie około ${words} słów. Policz słowa przed odpowiedzią.` : ''}

Tekst:`;
}

// Strip IVR section labels / formatting before counting speakable words
function countSpeakableWords(text) {
  const cleaned = text
    .replace(/\[JĘZYK\s+\d+\s*[—–-]\s*[^\]]*\]/gi, '')
    .replace(/^[ \t]*(Powitanie|Menu|Zakończenie|Komunikat[^:\n]*|Informacja[^:\n]*|Oczekiwanie[^:\n]*):/gmi, '')
    .replace(/^[ \t]*\d+\.\s*/gm, '')
    .trim();
  return cleaned.split(/\s+/).filter(w => w.length > 0).length;
}

module.exports = { buildPrompt, calcWords, countSpeakableWords, WPM };
