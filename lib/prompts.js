const WPM = { pl: 130, en: 150, de: 125, fr: 140, cs: 130, uk: 135 };

function calcWords(durationSec, lang) {
  return Math.round((WPM[lang] || 130) * (durationSec / 60));
}

const LANG_NAMES = {
  pl: 'polskim', en: 'angielskim', de: 'niemieckim',
  fr: 'francuskim', cs: 'czeskim', uk: 'ukraińskim'
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

function buildPrompt(params) {
  const { action, serviceType, industry, company, offering, audience, tone, goal, languages, duration, textInput, targetDur } = params;

  if (action === 'optimize') {
    const words = textInput.trim().split(/\s+/).length;
    const target = calcWords(parseInt(targetDur), 'pl');
    return `Jesteś doświadczonym copywriterem specjalizującym się w tekstach do nagrań lektorskich.

Zoptymalizuj poniższy tekst tak, aby mieścił się w ${targetDur} sekundach nagrania (cel: około ${target} słów, obecnie: ${words} słów).

Zasady:
- Zachowaj kluczowy przekaz i ton
- Dostosuj długość do podanego czasu
- Tekst ma brzmieć naturalnie przy czytaniu na głos
- Zwróć TYLKO zoptymalizowany tekst, bez komentarzy

Tekst do optymalizacji:
${textInput}`;
  }

  if (serviceType === 'ivr') {
    return buildIVRPrompt(params);
  }

  return buildGeneralPrompt(params);
}

function buildIVRPrompt({ industry, company, audience, tone, languages }) {
  const menu = IVR_MENUS[industry] || IVR_MENUS.other;
  const langList = (languages || ['pl']).map(l => LANG_NAMES[l]).join(' i ');

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
Przygotuj teksty w ${(languages || ['pl']).length} językach: ${langList}.

Dla KAŻDEGO języka przygotuj:
1. Powitanie${switcherLine}
2. OBOWIĄZKOWA informacja o nagrywaniu rozmów (wymóg RODO)
3. Menu opcji (5-6 opcji dostosowanych do branży)
4. Komunikat o oczekiwaniu na połączenie
5. Komunikat poza godzinami pracy
6. Zakończenie

Format odpowiedzi:
[JĘZYK 1 — ${lang1Name}]
[tekst...]${lang2Part}

Teksty muszą być:
- Naturalne i profesjonalne
- Dostosowane do kultury danego języka
- Gotowe do odczytania przez lektora (bez skrótów, z pełnymi formami)`;
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
  const words = calcWords(dur, 'pl');

  const durationLine = duration
    ? `- Docelowa długość: ${dur} sekund (około ${words} słów)`
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

Tekst:`;
}

module.exports = { buildPrompt, calcWords, WPM };
