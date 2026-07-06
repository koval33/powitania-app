/**
 * Pakiety nagrań (Sklep v2) - dane 10 pakietów wg briefu pakiety-sklep-brief.md
 * (zatwierdzone w wątku Optimum_SEO 06.07.2026).
 *
 * ŻELAZNE ZASADY:
 * - Ceny NETTO z tabeli briefu - NIE ZMIENIAĆ (walidacja feedem Merchant Center).
 * - Brutto liczone tak samo jak w P24: round(netto * 1.23 * 100) / 100.
 * - Głosy w próbkach: wyłącznie niższa grupa cenowa (premium poza pakietami).
 * - Title/H1 celują we frazy cenowo-zakupowe, NIE w head-terms stron usługowych.
 * - IVR: jednorodny format limitów (liczba komunikatów + łączny limit słów).
 */

const VAT = 0.23;
const brutto = (netto) => (Math.round(netto * (1 + VAT) * 100) / 100).toFixed(2);

// Kategoria -> regex dopasowania próbek lektora (samples[].name w voices.json)
const SAMPLE_MATCH = {
  ivr: /zapowied|ivr|centrala|telefon/i,
  spot: /spot|reklam/i,
  narracja: /narracja|film|audiobook|prezentac|e-?learning|lektorsk/i
};

const PAKIETY = [
  {
    id: 'zapowiedzi-telefoniczne-start',
    slugEn: 'phone-announcements-start',
    category: 'ivr',
    name: 'Zapowiedzi telefoniczne START',
    nameEn: 'Phone announcements START',
    netto: 380,
    title: 'Zapowiedź telefoniczna cena: pakiet START 380 zł netto | Powitania',
    titleEn: 'Phone greeting recording price: START package | Powitania',
    metaDescription: 'Ile kosztuje nagranie zapowiedzi telefonicznej? Pakiet START: do 3 komunikatów IVR, łącznie do 100 słów, głos z banku, licencja bezterminowa, realizacja 48h. Cena 380 zł netto (467,40 zł brutto), płatność online.',
    metaDescriptionEn: 'Phone announcement recording package: up to 3 IVR messages, up to 100 words in total, voice from our bank, perpetual licence, 48h delivery. PLN 380 net, online payment.',
    h1: 'Pakiet Zapowiedzi telefoniczne START',
    h1En: 'Phone announcements START package',
    short: 'Do 3 komunikatów IVR, łącznie do 100 słów. Nagranie na centralę w 48h, licencja bezterminowa.',
    shortEn: 'Up to 3 IVR messages, up to 100 words in total. PBX-ready recording in 48h, perpetual licence.',
    scope: [
      'do 3 komunikatów (np. powitanie, menu, komunikat poza godzinami)',
      'łącznie do 100 słów',
      'głos z banku głosów (niższa grupa cenowa)',
      'plik w formacie pod Twoją centralę (m.in. Slican, Platan, NFON, 3CX, Asterisk)',
      'licencja bezterminowa',
      'realizacja do 48h roboczych'
    ],
    scopeEn: [
      'up to 3 messages (e.g. greeting, menu, after-hours announcement)',
      'up to 100 words in total',
      'voice from our voice bank (standard price group)',
      'file format matched to your PBX (incl. Slican, Platan, NFON, 3CX, Asterisk)',
      'perpetual licence',
      'delivery within 48 business hours'
    ],
    notIncluded: [
      'podkład muzyczny (dostępny w pakiecie PRO albo jako dopłata)',
      'głosy premium i znane z nazwiska',
      'więcej komunikatów lub słów niż limit pakietu'
    ],
    notIncludedEn: [
      'background music (available in the PRO package or as an add-on)',
      'premium and celebrity voices',
      'more messages or words than the package limit'
    ],
    faq: [
      { q: 'Co dokładnie dostanę w pakiecie START?', a: 'Do 3 nagranych komunikatów o łącznej długości do 100 słów, w formacie dopasowanym do Twojej centrali telefonicznej. Cena 380 zł netto obejmuje pracę lektora, obróbkę i bezterminową licencję.' },
      { q: 'Czy mogę wybrać głos?', a: 'Tak. Po zamówieniu prosimy o wskazanie głosu z banku głosów (grupa standardowa). Jeśli nie wskażesz, zaproponujemy 2-3 głosy pasujące do Twojej branży.' },
      { q: 'Nie mam jeszcze tekstu. Co teraz?', a: 'Skorzystaj z gotowych wzorów w naszym artykule z przykładami tekstów zapowiedzi albo z kreatora treści. Tekst możesz też dosłać po zamówieniu.' },
      { q: 'Co jeśli potrzebuję więcej niż 3 komunikaty?', a: 'Wybierz pakiet PRO (do 5 komunikatów, do 200 słów) albo MAX PL+EN (do 10 komunikatów). Przy nietypowych potrzebach wypełnij formularz wyceny - odpowiadamy w 2 godziny w dni robocze.' }
    ],
    faqEn: [
      { q: 'What exactly do I get in the START package?', a: 'Up to 3 recorded messages, up to 100 words in total, delivered in a format matched to your PBX. The price covers the voice talent, post-production and a perpetual licence.' },
      { q: 'Can I choose the voice?', a: 'Yes. After ordering, pick a voice from our voice bank (standard group). If you do not, we will suggest 2-3 voices that fit your industry.' },
      { q: 'What if I need more than 3 messages?', a: 'Choose the PRO package (up to 5 messages, 200 words) or MAX PL+EN (up to 10 messages). For non-standard needs, use the quote form - we reply within 2 business hours.' }
    ]
  },
  {
    id: 'zapowiedzi-telefoniczne-pro',
    slugEn: 'phone-announcements-pro',
    category: 'ivr',
    name: 'Zapowiedzi telefoniczne PRO',
    nameEn: 'Phone announcements PRO',
    netto: 590,
    title: 'Nagranie komunikatów IVR z muzyką: pakiet PRO 590 zł netto | Powitania',
    titleEn: 'IVR messages with music: PRO package | Powitania',
    metaDescription: 'Pakiet PRO: do 5 komunikatów IVR, łącznie do 200 słów, podkład muzyczny w cenie, realizacja 72h. Cena 590 zł netto (725,70 zł brutto). Zamów i zapłać online.',
    metaDescriptionEn: 'PRO package: up to 5 IVR messages, up to 200 words in total, background music included, 72h delivery. PLN 590 net, online payment.',
    h1: 'Pakiet Zapowiedzi telefoniczne PRO',
    h1En: 'Phone announcements PRO package',
    short: 'Do 5 komunikatów IVR, łącznie do 200 słów, podkład muzyczny w cenie. Realizacja 72h.',
    shortEn: 'Up to 5 IVR messages, up to 200 words in total, background music included. 72h delivery.',
    scope: [
      'do 5 komunikatów (pełna obsługa centrali: powitanie, menu, kolejka, poza godzinami, poczta)',
      'łącznie do 200 słów',
      'podkład muzyczny z naszej oferty w cenie',
      'głos z banku głosów (niższa grupa cenowa)',
      'plik w formacie pod Twoją centralę',
      'licencja bezterminowa',
      'realizacja do 72h roboczych'
    ],
    scopeEn: [
      'up to 5 messages (full PBX set: greeting, menu, queue, after-hours, voicemail)',
      'up to 200 words in total',
      'background music from our library included',
      'voice from our voice bank (standard price group)',
      'file format matched to your PBX',
      'perpetual licence',
      'delivery within 72 business hours'
    ],
    notIncluded: [
      'wersje w drugim języku (zobacz pakiety PL+EN)',
      'głosy premium i znane z nazwiska',
      'muzyka spoza naszej oferty (licencję klienta podłączamy po weryfikacji)'
    ],
    notIncludedEn: [
      'second-language versions (see the PL+EN packages)',
      'premium and celebrity voices',
      'music from outside our library (client licences verified case by case)'
    ],
    faq: [
      { q: 'Jaka muzyka jest w cenie?', a: 'Podkład wybierasz z naszej oferty melodii - są sprawdzone pod centrale (bez praw ZAiKS po stronie klienta). Przy zamówieniu podeślemy listę do odsłuchu.' },
      { q: 'Czy 5 komunikatów wystarczy na całą centralę?', a: 'W większości firm tak: powitanie, menu, komunikat kolejki, poza godzinami i poczta głosowa to właśnie 5 komunikatów. Przy rozbudowanych drzewach IVR wybierz pakiet MAX albo formularz wyceny.' },
      { q: 'Czy mogę zmienić treść po nagraniu?', a: 'Drobne poprawki błędów po naszej stronie są bezpłatne. Zmiany treści po akceptacji realizujemy pakietem Dogrywka 24h za 290 zł netto.' }
    ],
    faqEn: [
      { q: 'What music is included?', a: 'You pick the background track from our library - all tracks are cleared for PBX use. We send the list after ordering.' },
      { q: 'Are 5 messages enough for a whole PBX?', a: 'For most companies yes: greeting, menu, queue message, after-hours and voicemail are exactly 5 messages. For complex IVR trees choose the MAX package or the quote form.' },
      { q: 'Can I change the script after recording?', a: 'Minor fixes of our mistakes are free. Content changes after approval are handled by the 24h Update package at PLN 290 net.' }
    ]
  },
  {
    id: 'zapowiedzi-telefoniczne-pl-en',
    slugEn: 'phone-announcements-pl-en',
    category: 'ivr',
    name: 'Zapowiedzi telefoniczne PL+EN',
    nameEn: 'Phone announcements PL+EN',
    netto: 530,
    title: 'Dwujęzyczna zapowiedź telefoniczna cena: pakiet PL+EN 530 zł | Powitania',
    titleEn: 'Bilingual phone announcements: PL+EN package | Powitania',
    metaDescription: 'Zapowiedzi telefoniczne po polsku i angielsku: do 3 komunikatów, łącznie do 100 słów, każdy w dwóch wersjach językowych. Cena 530 zł netto (651,90 zł brutto).',
    metaDescriptionEn: 'Phone announcements in Polish and English: up to 3 messages, up to 100 words in total, each in two language versions. PLN 530 net.',
    h1: 'Pakiet Zapowiedzi telefoniczne PL+EN',
    h1En: 'Phone announcements PL+EN package',
    short: 'Do 3 komunikatów, łącznie do 100 słów, każdy po polsku i angielsku. Dla firm z klientami zagranicznymi.',
    shortEn: 'Up to 3 messages, up to 100 words in total, each in Polish and English. For companies with international callers.',
    scope: [
      'do 3 komunikatów, każdy w dwóch wersjach: polskiej i angielskiej',
      'łącznie do 100 słów (limit liczony dla wersji polskiej)',
      'lektor polski + lektor anglojęzyczny z banku głosów (niższa grupa cenowa)',
      'plik w formacie pod Twoją centralę',
      'licencja bezterminowa'
    ],
    scopeEn: [
      'up to 3 messages, each in two versions: Polish and English',
      'up to 100 words in total (limit counted for the Polish version)',
      'Polish voice + English voice from our bank (standard price group)',
      'file format matched to your PBX',
      'perpetual licence'
    ],
    notIncluded: [
      'tłumaczenie tekstu (przyjmujemy gotowy tekst w obu językach; tłumaczenie możemy wycenić osobno)',
      'języki inne niż polski i angielski (formularz wyceny)',
      'podkład muzyczny (zobacz pakiet MAX PL+EN)'
    ],
    notIncludedEn: [
      'script translation (we record ready scripts in both languages; translation can be quoted separately)',
      'languages other than Polish and English (quote form)',
      'background music (see the MAX PL+EN package)'
    ],
    faq: [
      { q: 'Czy oba języki nagrywa ten sam lektor?', a: 'Zwykle nie - polską wersję nagrywa polski lektor, angielską lektor anglojęzyczny (w tym native speakerzy z grupy standardowej). Dzięki temu obie wersje brzmią naturalnie.' },
      { q: 'Czy musicie dostać tekst po angielsku?', a: 'Tak, nagrywamy dostarczony tekst w obu językach. Jeśli masz tylko polski, możemy zamówić tłumaczenie - wycenimy je osobno przed startem.' },
      { q: 'Jak działa zapowiedź dwujęzyczna na centrali?', a: 'Najczęściej jako jeden komunikat: najpierw wersja polska, po niej angielska, albo z wyborem języka klawiszem. Doradzimy wariant pod Twoją centralę.' }
    ],
    faqEn: [
      { q: 'Does the same talent record both languages?', a: 'Usually not - the Polish version is recorded by a Polish talent and the English one by an English-speaking talent, including native speakers from the standard group.' },
      { q: 'Do you need the script in English?', a: 'Yes, we record the scripts you provide in both languages. If you only have Polish, we can arrange a translation quoted separately.' },
      { q: 'How does a bilingual announcement work on a PBX?', a: 'Most often as one message: Polish first, then English, or with a language-selection key. We will advise the best variant for your system.' }
    ]
  },
  {
    id: 'zapowiedzi-telefoniczne-max-pl-en',
    slugEn: 'phone-announcements-max-pl-en',
    category: 'ivr',
    name: 'Zapowiedzi telefoniczne MAX PL+EN',
    nameEn: 'Phone announcements MAX PL+EN',
    netto: 1500,
    title: 'Komunikaty IVR dla firmy, komplet PL+EN: pakiet MAX 1500 zł | Powitania',
    titleEn: 'Complete bilingual IVR set: MAX package | Powitania',
    metaDescription: 'Kompletna obsługa centrali w dwóch językach: do 10 komunikatów IVR, łącznie do 500 słów, wersje polska i angielska, muzyka w cenie. 1500 zł netto (1845,00 zł brutto).',
    metaDescriptionEn: 'Complete bilingual PBX set: up to 10 IVR messages, up to 500 words in total, Polish and English versions, music included. PLN 1500 net.',
    h1: 'Pakiet Zapowiedzi telefoniczne MAX PL+EN',
    h1En: 'Phone announcements MAX PL+EN package',
    short: 'Do 10 komunikatów, łącznie do 500 słów, dwie wersje językowe, muzyka w cenie. Komplet dla rozbudowanej centrali.',
    shortEn: 'Up to 10 messages, up to 500 words in total, two language versions, music included. Full set for a complex PBX.',
    scope: [
      'do 10 komunikatów, każdy w dwóch wersjach: polskiej i angielskiej',
      'łącznie do 500 słów (limit liczony dla wersji polskiej)',
      'podkład muzyczny z naszej oferty w cenie',
      'lektor polski + lektor anglojęzyczny z banku głosów (niższa grupa cenowa)',
      'pliki w formatach pod Twoją centralę',
      'licencja bezterminowa'
    ],
    scopeEn: [
      'up to 10 messages, each in two versions: Polish and English',
      'up to 500 words in total (limit counted for the Polish version)',
      'background music from our library included',
      'Polish voice + English voice from our bank (standard price group)',
      'file formats matched to your PBX',
      'perpetual licence'
    ],
    notIncluded: [
      'trzeci i kolejne języki (formularz wyceny)',
      'głosy premium i znane z nazwiska',
      'nagrania wykraczające poza limity pakietu'
    ],
    notIncludedEn: [
      'third and further languages (quote form)',
      'premium and celebrity voices',
      'recordings beyond the package limits'
    ],
    faq: [
      { q: 'Dla kogo jest pakiet MAX?', a: 'Dla firm z rozbudowanym drzewem IVR: kilka działów, kolejki, komunikaty sezonowe, wersje językowe. 10 komunikatów w dwóch językach pokrywa centralę średniej firmy z zapasem.' },
      { q: 'Czy mogę wykorzystać limity na raty?', a: 'Tak - możesz zamówić np. 7 komunikatów teraz i 3 w ciągu 3 miesięcy, w ramach limitu słów pakietu.' },
      { q: 'Co przy zmianach treści za pół roku?', a: 'Aktualizacje istniejących komunikatów realizujemy pakietem Dogrywka 24h (290 zł netto za zmianę) - z tym samym lektorem, żeby całość brzmiała spójnie.' }
    ],
    faqEn: [
      { q: 'Who is the MAX package for?', a: 'Companies with a complex IVR tree: several departments, queues, seasonal messages, language versions. Ten messages in two languages cover a mid-size company PBX with headroom.' },
      { q: 'Can I use the limits in parts?', a: 'Yes - you can order e.g. 7 messages now and 3 within 3 months, within the package word limit.' },
      { q: 'What about content changes in six months?', a: 'Updates of existing messages are handled by the 24h Update package (PLN 290 net per change) - with the same voice talent for consistency.' }
    ]
  },
  {
    id: 'spot-radiowy-30s-stacja-lokalna',
    slugEn: 'radio-spot-30s-local',
    category: 'spot',
    name: 'Spot radiowy 30 sekund - stacja lokalna',
    nameEn: 'Radio spot 30 seconds - local station',
    netto: 300,
    title: 'Spot radiowy cena: nagranie 30 s ze stacją lokalną od 300 zł | Powitania',
    titleEn: 'Radio spot recording price: 30s local station | Powitania',
    metaDescription: 'Ile kosztuje nagranie spotu radiowego? 30-sekundowy spot z lektorem + licencja emisyjna 12 miesięcy na stację lokalną: 300 zł netto (369,00 zł brutto). Zamów online.',
    metaDescriptionEn: 'Radio spot recording: 30-second voice-over with a 12-month broadcast licence for a local station. PLN 300 net, order online.',
    h1: 'Spot radiowy 30 s - stacja lokalna',
    h1En: 'Radio spot 30 s - local station',
    short: 'Nagranie lektorskie spotu do 30 s + licencja emisyjna 12 miesięcy na stację o zasięgu lokalnym.',
    shortEn: '30-second voice-over recording with a 12-month broadcast licence for a local station.',
    scope: [
      'nagranie lektorskie spotu do 30 sekund',
      'głos z banku głosów (niższa grupa cenowa)',
      'licencja emisyjna 12 miesięcy, stacja o zasięgu lokalnym',
      'plik emisyjny w standardzie stacji'
    ],
    scopeEn: [
      'voice-over recording of a spot up to 30 seconds',
      'voice from our bank (standard price group)',
      '12-month broadcast licence, local-reach station',
      'broadcast-ready file to the station standard'
    ],
    notIncluded: [
      'montaż z muzyką i efektami (dopłata wyceniana do projektu)',
      'emisja ogólnopolska (zobacz pakiet ogólnopolski)',
      'scenariusz spotu (pomożemy bezpłatnie w kreatorze treści)'
    ],
    notIncludedEn: [
      'mixing with music and effects (quoted per project)',
      'nationwide broadcast (see the nationwide package)',
      'spot script (our free script creator can help)'
    ],
    faq: [
      { q: 'Co oznacza licencja na stację lokalną?', a: 'Prawo do emisji spotu przez 12 miesięcy w stacji radiowej o zasięgu lokalnym lub regionalnym. Po tym okresie licencję można przedłużyć.' },
      { q: 'Czy w cenie jest muzyka i montaż?', a: 'Pakiet obejmuje czyste nagranie lektorskie. Pełną produkcję spotu (muzyka, montaż, mastering) wyceniamy do projektu - opisz potrzeby w formularzu wyceny.' },
      { q: 'Nie mam scenariusza. Pomożecie?', a: 'Tak - kreator treści na naszej stronie przygotuje tekst spotu pod zadany czas emisji w kilka minut, bezpłatnie.' }
    ],
    faqEn: [
      { q: 'What does the local-station licence mean?', a: 'The right to broadcast the spot for 12 months on a local or regional radio station. The licence can be extended afterwards.' },
      { q: 'Are music and mixing included?', a: 'The package covers a clean voice-over recording. Full spot production (music, mix, mastering) is quoted per project.' },
      { q: 'I have no script. Can you help?', a: 'Yes - the free script creator on our site drafts a spot script for your target duration in minutes.' }
    ]
  },
  {
    id: 'spot-radiowy-30s-ogolnopolski',
    slugEn: 'radio-spot-30s-national',
    category: 'spot',
    name: 'Spot radiowy 30 sekund - stacja ogólnopolska',
    nameEn: 'Radio spot 30 seconds - national station',
    netto: 900,
    title: 'Nagranie spotu radiowego na antenę ogólnopolską: 900 zł netto | Powitania',
    titleEn: 'Radio spot for nationwide broadcast: PLN 900 net | Powitania',
    metaDescription: 'Spot radiowy 30 s z lektorem + licencja emisyjna 12 miesięcy na stację ogólnopolską: 900 zł netto (1107,00 zł brutto). Głos z banku, płatność online.',
    metaDescriptionEn: '30-second radio spot with a 12-month broadcast licence for a nationwide station. PLN 900 net, online payment.',
    h1: 'Spot radiowy 30 s - stacja ogólnopolska',
    h1En: 'Radio spot 30 s - national station',
    short: 'Nagranie lektorskie spotu do 30 s + licencja emisyjna 12 miesięcy na stację o zasięgu ogólnopolskim.',
    shortEn: '30-second voice-over recording with a 12-month licence for a nationwide station.',
    scope: [
      'nagranie lektorskie spotu do 30 sekund',
      'głos z banku głosów (niższa grupa cenowa)',
      'licencja emisyjna 12 miesięcy, stacja o zasięgu ogólnopolskim',
      'plik emisyjny w standardzie stacji'
    ],
    scopeEn: [
      'voice-over recording of a spot up to 30 seconds',
      'voice from our bank (standard price group)',
      '12-month broadcast licence, nationwide station',
      'broadcast-ready file to the station standard'
    ],
    notIncluded: [
      'montaż z muzyką i efektami (dopłata wyceniana do projektu)',
      'kampanie wielospotowe i sieci stacji (formularz wyceny)',
      'scenariusz spotu (pomożemy bezpłatnie w kreatorze treści)'
    ],
    notIncludedEn: [
      'mixing with music and effects (quoted per project)',
      'multi-spot campaigns and station networks (quote form)',
      'spot script (our free script creator can help)'
    ],
    faq: [
      { q: 'Czym różni się licencja ogólnopolska od lokalnej?', a: 'Zasięgiem emisji: obejmuje stacje nadające na cały kraj. Stawka lektora jest wyższa, bo wynagrodzenie zależy od pola eksploatacji nagrania - to standard rynkowy.' },
      { q: 'Czy jedna licencja obejmuje kilka stacji?', a: 'Licencja dotyczy jednej stacji. Przy kampanii w kilku stacjach lub sieci opisz plan emisji w formularzu wyceny - przygotujemy stawkę łączną.' },
      { q: 'Jak szybko powstanie nagranie?', a: 'Standardowo 24-48h roboczych od akceptacji tekstu. Tryb ekspresowy tego samego dnia jest możliwy po potwierdzeniu dostępności lektora.' }
    ],
    faqEn: [
      { q: 'How does the national licence differ from the local one?', a: 'By broadcast reach: it covers stations transmitting nationwide. The talent fee is higher because voice-over pay depends on the usage scope - a market standard.' },
      { q: 'Does one licence cover several stations?', a: 'The licence covers one station. For multi-station campaigns describe your media plan in the quote form.' },
      { q: 'How fast is the recording ready?', a: 'Typically 24-48 business hours after script approval. Same-day express is possible subject to talent availability.' }
    ]
  },
  {
    id: 'spot-do-kampanii-internetowej',
    slugEn: 'online-campaign-spot',
    category: 'spot',
    name: 'Spot do kampanii internetowej',
    nameEn: 'Online campaign spot',
    netto: 950,
    title: 'Spot reklamowy do internetu: nagranie do 2 min za 950 zł netto | Powitania',
    titleEn: 'Online ad spot: recording up to 2 min | Powitania',
    metaDescription: 'Nagranie lektorskie do kampanii online i social media: do 2 minut, licencja emisyjna internet/social 12 miesięcy. 950 zł netto (1168,50 zł brutto).',
    metaDescriptionEn: 'Voice-over for online and social campaigns: up to 2 minutes, 12-month online/social licence. PLN 950 net.',
    h1: 'Spot do kampanii internetowej',
    h1En: 'Online campaign spot',
    short: 'Nagranie do 2 minut + licencja emisyjna online/social 12 miesięcy. Pod YouTube, Meta, TikTok i podcasty.',
    shortEn: 'Recording up to 2 minutes with a 12-month online/social licence. For YouTube, Meta, TikTok and podcasts.',
    scope: [
      'nagranie lektorskie do 2 minut',
      'głos z banku głosów (niższa grupa cenowa)',
      'licencja emisyjna 12 miesięcy: internet i social media (YouTube, Meta, TikTok, podcasty)',
      'plik w formacie pod platformę emisji'
    ],
    scopeEn: [
      'voice-over recording up to 2 minutes',
      'voice from our bank (standard price group)',
      '12-month licence: internet and social media (YouTube, Meta, TikTok, podcasts)',
      'file format matched to the platform'
    ],
    notIncluded: [
      'emisja radiowa i telewizyjna (osobne pakiety i licencje)',
      'montaż z muzyką i mastering pod platformy (dopłata wyceniana do projektu)',
      'wersje językowe inne niż nagrywana (formularz wyceny)'
    ],
    notIncludedEn: [
      'radio and TV broadcast (separate packages and licences)',
      'music mix and platform mastering (quoted per project)',
      'additional language versions (quote form)'
    ],
    faq: [
      { q: 'Do jakich kanałów mogę użyć nagrania?', a: 'Licencja obejmuje emisję w internecie: kampanie wideo i audio na YouTube, Meta, TikToku, w podcastach i na Twoich stronach - przez 12 miesięcy.' },
      { q: 'Czemu 2 minuty, skoro spoty są krótsze?', a: 'Limit 2 minut pozwala nagrać kilka wariantów długości z jednego tekstu (np. 15, 30 i 60 sekund) albo dłuższy materiał produktowy - bez dopłat.' },
      { q: 'Czy dostanę wersje pod różne platformy?', a: 'Dostajesz nagranie w formacie pod wskazaną platformę. Dodatkowe konfekcje (np. osobne pliki 15/30/60 s z montażem) wyceniamy drobną dopłatą.' }
    ],
    faqEn: [
      { q: 'Which channels does the licence cover?', a: 'Online use: video and audio campaigns on YouTube, Meta, TikTok, podcasts and your own sites - for 12 months.' },
      { q: 'Why 2 minutes if spots are shorter?', a: 'The 2-minute limit lets us record several duration variants from one script (e.g. 15, 30 and 60 seconds) or a longer product piece at no extra cost.' },
      { q: 'Will I get versions for different platforms?', a: 'You get the recording formatted for the platform you indicate. Extra deliverables with editing are quoted as a small add-on.' }
    ]
  },
  {
    id: 'narracja-do-filmu-1-strona',
    slugEn: 'film-narration-1-page',
    category: 'narracja',
    name: 'Narracja do filmu / prezentacji - 1 strona',
    nameEn: 'Film / presentation narration - 1 page',
    netto: 450,
    title: 'Lektor do filmu cena: narracja 1 strona (ok. 2 min) 450 zł | Powitania',
    titleEn: 'Film narration price: 1 page (approx. 2 min) | Powitania',
    metaDescription: 'Ile kosztuje lektor do filmu? Narracja do filmu lub prezentacji: 1 strona znormalizowana (ok. 2 minuty nagrania), plik audio lub synchronizacja z obrazem. 450 zł netto (553,50 zł brutto).',
    metaDescriptionEn: 'Narration for a film or presentation: 1 standard page (approx. 2 minutes), audio file or picture sync. PLN 450 net.',
    h1: 'Narracja do filmu / prezentacji - 1 strona',
    h1En: 'Film / presentation narration - 1 page',
    short: '1 strona znormalizowana tekstu (ok. 2 min nagrania). Plik audio albo synchronizacja z obrazem.',
    shortEn: '1 standard page of script (approx. 2 minutes). Audio file or picture sync.',
    scope: [
      '1 strona znormalizowana (1800 znaków ze spacjami, ok. 2 minuty nagrania)',
      'głos z banku głosów (niższa grupa cenowa)',
      'plik audio (WAV/MP3) albo synchronizacja nagrania z dostarczonym obrazem',
      'licencja: film korporacyjny, prezentacja, e-learning, materiały wewnętrzne i online'
    ],
    scopeEn: [
      '1 standard page (1800 characters incl. spaces, approx. 2 minutes of recording)',
      'voice from our bank (standard price group)',
      'audio file (WAV/MP3) or narration synced to your video',
      'licence: corporate film, presentation, e-learning, internal and online use'
    ],
    notIncluded: [
      'emisja reklamowa w radiu i TV (osobne pakiety spotowe)',
      'montaż filmu i grafika (dostarczamy dźwięk)',
      'teksty dłuższe niż 1 strona (zobacz pakiet 2 strony albo formularz wyceny)'
    ],
    notIncludedEn: [
      'radio and TV advertising broadcast (see the spot packages)',
      'video editing and graphics (we deliver the audio)',
      'scripts longer than 1 page (see the 2-page package or the quote form)'
    ],
    faq: [
      { q: 'Ile tekstu mieści się na 1 stronie znormalizowanej?', a: '1800 znaków ze spacjami, czyli około 250-280 słów - w spokojnym tempie lektorskim daje to około 2 minuty nagrania.' },
      { q: 'Co znaczy synchronizacja z obrazem?', a: 'Jeśli dostarczysz zmontowany film, lektor nagra narrację zgodnie z timingiem scen, a my dopasujemy ją do obrazu. Bez filmu dostajesz czysty plik audio.' },
      { q: 'Do czego mogę użyć nagrania?', a: 'Film korporacyjny, prezentacja, e-learning, materiały na stronę i social media firmy. Emisja reklamowa w radiu lub TV wymaga osobnej licencji ze spotowych pakietów.' }
    ],
    faqEn: [
      { q: 'How much text fits on 1 standard page?', a: '1800 characters including spaces, around 250-280 words - roughly 2 minutes of narration at a calm pace.' },
      { q: 'What does picture sync mean?', a: 'If you provide an edited video, the narration is recorded and fitted to the scene timing. Without a video you receive a clean audio file.' },
      { q: 'What can I use the recording for?', a: 'Corporate films, presentations, e-learning, website and social content. Radio or TV advertising requires a separate licence from the spot packages.' }
    ]
  },
  {
    id: 'narracja-do-filmu-2-strony',
    slugEn: 'film-narration-2-pages',
    category: 'narracja',
    name: 'Narracja do filmu / prezentacji - 2 strony',
    nameEn: 'Film / presentation narration - 2 pages',
    netto: 550,
    title: 'Narracja do prezentacji cennik: 2 strony (ok. 4 min) 550 zł | Powitania',
    titleEn: 'Presentation narration: 2 pages (approx. 4 min) | Powitania',
    metaDescription: 'Narracja do filmu lub prezentacji: 2 strony znormalizowane (ok. 4 minuty nagrania), plik audio lub synchronizacja z obrazem. 550 zł netto (676,50 zł brutto).',
    metaDescriptionEn: 'Narration for a film or presentation: 2 standard pages (approx. 4 minutes), audio file or picture sync. PLN 550 net.',
    h1: 'Narracja do filmu / prezentacji - 2 strony',
    h1En: 'Film / presentation narration - 2 pages',
    short: '2 strony znormalizowane tekstu (ok. 4 min nagrania). Plik audio albo synchronizacja z obrazem.',
    shortEn: '2 standard pages of script (approx. 4 minutes). Audio file or picture sync.',
    scope: [
      '2 strony znormalizowane (3600 znaków ze spacjami, ok. 4 minuty nagrania)',
      'głos z banku głosów (niższa grupa cenowa)',
      'plik audio (WAV/MP3) albo synchronizacja nagrania z dostarczonym obrazem',
      'licencja: film korporacyjny, prezentacja, e-learning, materiały wewnętrzne i online'
    ],
    scopeEn: [
      '2 standard pages (3600 characters incl. spaces, approx. 4 minutes of recording)',
      'voice from our bank (standard price group)',
      'audio file (WAV/MP3) or narration synced to your video',
      'licence: corporate film, presentation, e-learning, internal and online use'
    ],
    notIncluded: [
      'emisja reklamowa w radiu i TV (osobne pakiety spotowe)',
      'montaż filmu i grafika (dostarczamy dźwięk)',
      'teksty dłuższe niż 2 strony (formularz wyceny - stawka maleje z objętością)'
    ],
    notIncludedEn: [
      'radio and TV advertising broadcast (see the spot packages)',
      'video editing and graphics (we deliver the audio)',
      'scripts longer than 2 pages (quote form - the per-page rate decreases with volume)'
    ],
    faq: [
      { q: 'Mam 3 strony tekstu. Który pakiet wybrać?', a: 'Żaden - przy dłuższych tekstach stawka za stronę maleje, więc korzystniej wypełnić formularz wyceny. Odpowiadamy w 2 godziny w dni robocze.' },
      { q: 'Czy mogę podzielić 2 strony na dwa osobne filmy?', a: 'Tak, w ramach limitu znaków możesz nagrać dwa krótsze materiały z tym samym lektorem w jednej sesji.' },
      { q: 'W jakim formacie dostanę nagranie?', a: 'Standardowo WAV i MP3. Przy synchronizacji z obrazem zwracamy plik audio dopasowany do Twojego montażu, gotowy do podłożenia.' }
    ],
    faqEn: [
      { q: 'I have 3 pages of script. Which package?', a: 'Neither - for longer scripts the per-page rate decreases, so the quote form will get you a better price. We reply within 2 business hours.' },
      { q: 'Can I split the 2 pages into two separate videos?', a: 'Yes, within the character limit you can record two shorter pieces with the same voice in one session.' },
      { q: 'What format will I receive?', a: 'WAV and MP3 as standard. With picture sync you receive an audio file fitted to your edit, ready to drop in.' }
    ]
  },
  {
    id: 'dogrywka-aktualizacja-nagrania-24h',
    slugEn: 'recording-update-24h',
    category: 'dogrywka',
    name: 'Dogrywka / aktualizacja nagrania 24h',
    nameEn: 'Recording update 24h',
    netto: 290,
    title: 'Aktualizacja nagrania lektorskiego w 24h za 290 zł netto | Powitania',
    titleEn: 'Voice-over update in 24h for PLN 290 net | Powitania',
    metaDescription: 'Zmiana treści istniejącego nagrania z tym samym lektorem, gotowa w 24h robocze: 290 zł netto (356,70 zł brutto). Dla klientów wracających z aktualizacją zapowiedzi, spotu lub narracji.',
    metaDescriptionEn: 'Content change of an existing recording with the same voice talent, ready in 24 business hours. PLN 290 net.',
    h1: 'Dogrywka / aktualizacja nagrania w 24h',
    h1En: 'Recording update in 24 hours',
    short: 'Zmiana treści istniejącego nagrania, ten sam lektor, gotowe w 24h robocze. Dla wracających klientów.',
    shortEn: 'Content change of an existing recording, same voice talent, ready in 24 business hours.',
    scope: [
      'zmiana treści istniejącego nagrania zrealizowanego w Powitania.pl',
      'ten sam lektor co w oryginale (spójne brzmienie)',
      'do 100 słów nowej treści',
      'realizacja do 24h roboczych od akceptacji tekstu',
      'plik w formacie oryginału'
    ],
    scopeEn: [
      'content change of an existing recording made at Powitania.pl',
      'the same voice talent as the original (consistent sound)',
      'up to 100 words of new content',
      'delivery within 24 business hours of script approval',
      'file in the original format'
    ],
    notIncluded: [
      'nagrania zrealizowane poza Powitania.pl (formularz wyceny - zaproponujemy zbliżony głos)',
      'zmiana lektora (to nowe nagranie, nie dogrywka)',
      'nowe pola eksploatacji (np. rozszerzenie licencji spotu na inną stację)'
    ],
    notIncludedEn: [
      'recordings made outside Powitania.pl (quote form - we will suggest a similar voice)',
      'a different voice talent (that is a new recording, not an update)',
      'new usage scopes (e.g. extending a spot licence to another station)'
    ],
    faq: [
      { q: 'Kiedy dogrywka ma sens?', a: 'Gdy w istniejącym nagraniu zmienia się fragment treści: godziny pracy, promocja, adres, nazwisko. Ten sam lektor dogrywa nową wersję, a całość brzmi jak jedno nagranie.' },
      { q: 'Co jeśli oryginalny lektor jest niedostępny?', a: 'Przy dłuższej niedostępności zaproponujemy termin albo zbliżony głos z banku - decyzja należy do Ciebie, bez kosztów do momentu akceptacji.' },
      { q: 'Czy 24h liczy się od zamówienia?', a: 'Od akceptacji finalnego tekstu w dzień roboczy. Zamówienie złożone w piątek po południu z akceptacją tekstu w poniedziałek będzie gotowe we wtorek.' }
    ],
    faqEn: [
      { q: 'When is an update the right choice?', a: 'When part of an existing recording changes: opening hours, a promotion, an address, a name. The same talent records the new version and the whole thing sounds like one recording.' },
      { q: 'What if the original talent is unavailable?', a: 'For longer unavailability we will propose a date or a similar voice from the bank - your call, no cost until approval.' },
      { q: 'Does 24h count from the order?', a: 'From final script approval on a business day. An order placed Friday afternoon with script approval on Monday is ready on Tuesday.' }
    ]
  }
];

// Uzupelnij pola pochodne
PAKIETY.forEach(p => { p.brutto = brutto(p.netto); });

function getAll() { return PAKIETY; }
function getBySlug(slug) { return PAKIETY.find(p => p.id === slug) || null; }
function getBySlugEn(slug) { return PAKIETY.find(p => p.slugEn === slug) || null; }

/**
 * Dobiera do 3 lektorow nizszej grupy cenowej z probka pasujaca do kategorii pakietu.
 * Zwraca [{ id, name, profileUrl, sampleUrl, sampleName }]. Losowo per request.
 */
function pickSamples(voices, category, count) {
  const rx = SAMPLE_MATCH[category] || SAMPLE_MATCH.narracja;
  // Probki w jezykach obcych (poza angielskim) pomijamy - mylace na stronie pakietu PL.
  const foreign = /języku (?!angielskim)|rumuńsk|niemieck|francusk|hiszpańsk|ukraińsk|rosyjsk|czesk|słowack|włosk/i;
  const pool = voices
    .filter(v => v.approved !== false && !v.hidePrice && (v.priceGroup || v.price || '').indexOf('Niższa') > -1)
    .map(v => {
      const sample = (v.samples || []).find(s => s && s.url && rx.test(s.name || '') && !foreign.test(s.name || ''));
      return sample ? { id: v.id, name: v.name, profileUrl: '/lektorzy/' + v.id + '/', sampleUrl: sample.url, sampleName: sample.name } : null;
    })
    .filter(Boolean)
    .sort(() => Math.random() - 0.5);
  return pool.slice(0, count || 3);
}

module.exports = { getAll, getBySlug, getBySlugEn, pickSamples, VAT };
