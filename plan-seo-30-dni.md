# Plan 30-dniowy SEO powitania.pl

**Start:** 14.04.2026
**Review:** 12.05.2026
**Ostatnia aktualizacja:** 19.04.2026 (koniec tygodnia 1)
**Kontekst wykonania:** ten wątek (powitania-app) — implementacja
**Kontekst pomiaru i strategii:** wątek Optimum_SEO — analiza GSC, Ads, Analytics

---

## Dlaczego ten plan

Po analizie 16 miesięcy danych GSC:
- 2739 kliknięć/16 m-cy total — z czego **65% to fluff-traffic** z trzech artykułów blogowych (krzyżówki, "jaki może być głos", "seksowny głos")
- **25% to ruch komercyjny** (nagrania lektorskie, studio, zapowiedzi)
- `/nagrania-lektorskie/` — główna strona usługowa — rankuje pos 17, ma 109 kliknięć/16 m-cy
- 234 lektorów w bazie, z czego **129 (57%) generuje <5 kliknięć rocznie**
- CTR profili 1.4% (benchmark 2-3%)
- Migracja z WP spowodowała utratę gender-specific URLs (`/bank/glosy-meskie/`, `/glosy-zenskie/`) — teraz 301 na `/bank-glosow/`, stracone ~400 kliknięć/rok
- Brak dedykowanych stron na wysokointencyjne frazy: "lektor do reklamy" (2056 imp pos 8)

Plan celuje w to co **wiemy że istnieje w wyszukiwaniu** — nie spekuluje.

---

## Baseline — punkt startu do mierzenia

| Metryka | Baseline | Target 30 dni | Target 90 dni |
|---------|----------|---------------|---------------|
| Organic clicks/mies (28 dni) | ~170 | 250 (+47%) | 400 (+135%) |
| `/nagrania-lektorskie/` pozycja | 17.1 | 12 | 7 |
| `/nagrania-lektorskie/` clicks/mies | 6-8 | 15 | 40 |
| ~~`/studio-lektorskie/`~~ | ~~nie istnieje~~ | ~~top 15~~ | ~~usunięte z planu (patrz korekta 2.1)~~ |
| CTR profili /lektorzy/* | 1.4% | 1.8% | 2.5% |
| Profile z 0 kliknięć | 60 | 45 | 25 |
| Organic orders + inquiries/mies | ~2 | 5 | 12 |

---

## TYDZIEŃ 1 (14-20.04) — Fundamenty techniczne + quick wins

**Cel:** Napraw to co krwawi. Zero contentu — tylko technika.

### ✅ 1.1 Zombie URL-e — ZROBIONE

301 redirecty dla `.webp` plików (→ profil lektora) + 410 Gone dla usuniętych (`slawek-2`, `zosia`, `barbara`, `mikolaj`). Na produkcji.

### ✅ 1.2 Gender-specific URLs — ZROBIONE

Strony server-rendered:
- `GET /bank-glosow/meskie/` — 143 lektorów, unikalny title/h1/meta
- `GET /bank-glosow/zenskie/` — 91 lektorek, unikalny title/h1/meta
- 301: `/bank/glosy-meskie/` → `/bank-glosow/meskie/` (i żeńskie analogicznie)
- W sitemap.xml ✅

### ✅ 1.3 Title/meta profili lektorów — ZROBIONE

Wszystkie **234/234 profile** mają unikalne `seoTitle` i `seoDescription` w voices.json.
Format: `[Imię Nazwisko] — [USP: aktor/prezenter/lektor dubbingowy] | powitania.pl`
Renderowane w server.js: `title: lektor.seoTitle || (lektor.name + ' — Lektor | powitania.pl')`

### ✅ 1.4 Submit 8 niezindeksowanych lektorów — ZROBIONE

Request Indexing w GSC URL Inspection dla:
- `tomasz-raczek`, `magda`, `luis`, `joel`, `nanna`, `pascale`, `virginie`, `wael`

### ✅ 1.5 (dodatkowe) Redirect fix — ZROBIONE

Accept-Language redirect wyłączony w server.js — boty AI i Googlebot widzą PL jako domyślną wersję. Efekt widoczny w GSC po 2-3 tygodniach.

### ✅ 1.6 (dodatkowe) Meta title/description strony głównej — ZROBIONE

`Profesjonalne Studio Lektorskie Powitania.pl — od 2001 roku | 234 lektorów`

### ✅ 1.7 (dodatkowe) Atomic facts + Organization schema — ZROBIONE

Sekcja atomic facts na PL i EN + foundingDate, knowsAbout, slogan w schema.org.

### Pomiar tygodnia 1 (piątek 18.04)
Raport do wątku Optimum_SEO:
- Indexed pages count w GSC Coverage
- Screenshot pozycji 5 target keywords (incognito)
- Liczba submitted URLs

> **Status (19.04):** ⬜ Raport piątkowy jeszcze do zrobienia

---

## TYDZIEŃ 2 (21-27.04) — Wzmocnienie istniejących stron + nowe niszowe

**Cel:** Wzmocnić strony które JUŻ istnieją (i mają historię w Google), stworzyć 2-3 niszowe landing pages.

### ❌ ~~2.1 `/studio-lektorskie/`~~ — USUNIĘTE Z PLANU

> **Korekta (19.04):** Strona główna już rankuje na frazę "studio lektorskie" (2394 imp). Tworzenie osobnej strony `/studio-lektorskie/` = kanibalizacja — dwie strony walczą o tę samą frazę, obie tracą. Zamiast tego wzmacniamy stronę główną (atomic facts, meta, schema — już zrobione) i `/nagrania-lektorskie/` (punkt 2.4). Budget godzinowy z tego punktu przechodzi na 2.5 (niszowe landing pages).

### 🔄 2.2 Wzmocnienie `/uslugi/glos-do-reklamy/` (3-4h)

**Dane GSC:** 2056 wyświetleń "lektor do reklamy" pos 8.4 + "lektor reklamowy" (pos 8.2). Łącznie ~4000 imp/rok.

**Strona ISTNIEJE** pod `/uslugi/glos-do-reklamy/` (hreflang → `/en/voiceover-services/voice-for-advertising/`). Ma Service schema. Ale jest zbyt skąpa w treść.

**Akcja — rozbudowa (nie tworzenie od zera):**
- Rozbudować content do 1000-1500 słów:
  - Typy reklam (TV, radio, online, podcast)
  - Portfolio: 5-6 spotów z embed audio
  - 5-6 profili lektorów z `applications: 'Reklama'`
  - Case studies (TVN, Orange, Play)
  - Cennik orientacyjny (spot radiowy od 300 zł)
- Dodać mini-FAQ (5 pytań) + FAQPage schema
- Poprawić title/meta z konkretnymi liczbami
- Inline formularz (`serviceType: 'reklama'`)

### 🔄 2.3 Wzmocnienie `/uslugi/lektor-do-filmow/` (3h)

**Dane GSC:** "lektor do filmów" 2053 imp pos 5.1 + "lektor do filmu" 1558 imp pos 8.4 = ~3600 imp/rok.

**Strona ISTNIEJE** pod `/nagrania-lektorskie/profesjonalny-lektor-do-filmow/` z routerem w `/uslugi/lektor-do-filmow.ejs`. Ma Service schema.

**Akcja — rozbudowa:**
- Rozbudować content do 1000-1500 słów
- Narracja filmowa, voice-over dokumentalny, dubbing
- Portfolio filmów z embed audio
- Mini-FAQ + FAQPage schema
- Poprawić title/meta

> **Uwaga URL:** Rozważyć czy docelowy URL nie powinien być krótszy (`/lektor-do-filmow/`) z 301 z obecnego długiego URL. Decyzja po sprawdzeniu w GSC który URL ma więcej historii.

### 2.4 Rewrite `/nagrania-lektorskie/` (4h)

**Problem:** 3943 wyświetleń/rok, pos 8, TYLKO 24 kliknięcia. CTR = 0.6%. Strona istnieje ale nie sprzedaje w SERP.

**Akcja:**
- Nowy title: "Nagrania lektorskie — 234 lektorów, studio od 2001 | powitania.pl"
- Nowy opis: konkret (liczby, czas realizacji, cena od)
- Treść (1500+ słów):
  - Proces zamówienia (3 kroki)
  - Rodzaje nagrań (reklama, dokument, IVR, audiobook, e-learning)
  - Cennik — widoczny, z "od [cena]"
  - 8-10 próbek audio z różnych typów
  - Case studies
  - FAQ (10-15 pytań)
- Schema markup: `Service`
- Hero z CTA: "Wyceń nagranie" → inline kalkulator
- Przelinkowanie do stron usługowych i niszowych

### 🆕 2.5 Niszowe landing pages — 2-3 nowe (4-6h łącznie)

**Dlaczego niszowe a nie head-term:** na niszach (`audioprzewodniki`, `e-learning`, `spot radiowy`) konkurencja jest słaba. Na head-terms (`studio lektorskie`) strona główna już rankuje.

Stworzyć:
- `/uslugi/e-learning/` — narracje do kursów online, szkoleń korporacyjnych
- `/uslugi/audioprzewodniki/` — wielojęzyczne audioprzewodniki (unikalna specjalizacja!)
- `/uslugi/spot-radiowy/` — nagrania spotów do radia lokalnego (od 300 zł)

Każda strona:
- 500-800 słów, Service schema, mini-FAQ (3-5 pytań)
- Cennik orientacyjny, embed próbek audio
- CTA + formularz wyceny
- Wersja EN (parytet PL/EN)

### Pomiar tygodnia 2 (piątek 25.04)
- Nowe/rozbudowane strony submitted w GSC
- Pozycje na target keywords
- Pierwsze impresje na nowych/rozbudowanych URL-ach

---

## TYDZIEŃ 3 (28.04-4.05) — Profile + linkowanie wewnętrzne

**Cel:** Podnieść CTR profili z 1.4% → 1.8%+, skonwertować ruch z fluff-artykułów.

### ✅ 3.1 Schema markup na profilach lektorów — ZROBIONE

Każdy profil `/lektorzy/:slug/` ma pełne schema w lektor.ejs:
- ✅ `Person` (name, jobTitle: "Lektor", image, url, description, knowsAbout)
- ✅ `Service` (serviceType: "Voice Over Recording", provider: Organization)
- ✅ `FAQPage` (5 pytań: czas realizacji, jak zamówić, próbki, języki, specjalizacja)
- ✅ `AudioObject` per próbka (contentUrl, encodingFormat)

Template renderuje schema z danych voices.json — działa na wszystkich 234 profilach.

### 3.2 Linkowanie wewnętrzne (3h)

**Z każdego profilu lektora (234 stron):**
- Link do `/bank-glosow/meskie/` lub `/zenskie/` (wg gender)
- Link do `/nagrania-lektorskie/` (główna strona usługowa)
- Link do `/uslugi/glos-do-reklamy/` LUB `/uslugi/lektor-do-filmow/` (wg applications)
- Link do `/cennik/`

**Z `/bank-glosow/`:**
- Sekcja "Polecani lektorzy" — 14 lektorów z 50+ kliknięciami rocznie
- Linkowanie do profili

**Z 3 głównych artykułów blogowych** (1783 kliknięć/rok dziś idą w pustkę):
- `/aktualnosci-pl/jaki-moze-byc-glos/` → link do `/bank-glosow/`
- `/aktualnosci-pl/seksowny-damski-glos-w-powitania-pl/` → link do `/bank-glosow/zenskie/`
- `/aktualnosci-pl/jaki-jest-najnizszy-glos-meski/` → link do `/bank-glosow/meskie/`

### 3.3 CTA na artykułach blogowych (2h)

Na trzech fluff-postach z punktu 3.2 dodać:
- **Top banner** (sticky albo inline pod H1): "Szukasz głosu do nagrania? Zobacz 234 lektorów →"
- **Mid-content CTA box** — wizualnie wyróżniony, po 2-3 akapicie
- **End-of-article CTA** — wyraźny, z formularzem lub linkiem do kalkulatora

**Cel:** konwertować choć 1% z 1783 kliknięć = 18 klientów/rok których dziś tracisz.

### ⬜ 3.4 Profile lektorów — unique content audit (3h)

**Problem:** niektóre profile mogą mieć generyczny albo zbyt krótki content — Google traktuje jako thin content.

**Akcja:**
- Spot-check 10 losowych profili — zliczyć unikalne słowa w description
- Jeśli <150 słów unikalnego tekstu — rozbudować (korzystając z `applications`, `description`, informacji o próbkach, turnaround)
- Target: **300+ słów** unique content per profile (podniesione z 200+ po feedbacku zewnętrznego LLM)

### 🔄 3.4a Unikalne zdanie studyjne na profilach famous / top-tier (2h) — TEMPLATE GOTOWY, DANE NIE

**Problem:** Profile famous / top-tier (top 30-50 z największym ruchem) mają bardzo podobną strukturę treści. Dodajemy jedno unikalne zdanie dotyczące studia/warsztatu — różnicuje template content w oczach Google, buduje wiarygodność u użytkownika, **bez fabrykowania konkretnego sprzętu** (profile są zanonimizowane — tylko imię — więc nie sposób zweryfikować ani osoby ani sprzętu; trzymamy się opcji prawdziwej i bezpiecznej).

**Gdzie wpisujemy:** nowe pole `studioNote` w `voices.json` (nie mieszać z `description` ani `seoDescription`). W template EJS renderujemy jako osobny krótki akapit na profilu.

**Pula zdań do rotacji** (kolega wybiera jedno na profil, nie używa tego samego częściej niż co ~10 profili; dopasowuje wariant do specjalizacji lektora z pola `applications`):

**Lokalizacyjne (max 2-3 użycia w całej bazie):**
1. "Nagrywa w profesjonalnym studiu lektorskim w Warszawie."
2. "Sesje nagraniowe realizowane w warszawskim studiu lektorskim."

**Studyjne / akustyczne:**
3. "Nagrania w akustycznie adaptowanym studiu z profesjonalnym torem mikrofonowym."
4. "Dysponuje studiem z izolacją akustyczną klasy broadcast."
5. "Nagrywa w booth'u bezodbiciowym, gotowym do emisji bez dodatkowej obróbki."
6. "Studio przystosowane do pracy live session (Source-Connect, ipDTL)."

**Reklama / radio** (gdy `applications` zawiera "Reklama"):
7. "Studio dostosowane do krótkich form reklamowych — szybka realizacja, gotowe master."
8. "Nagrania w jakości broadcast — plik gotowy do emisji radiowej."

**Dubbing / film** (gdy `applications` zawiera "Film" / "Dubbing"):
9. "Studio przygotowane do nagrań dubbingowych z synchronizacją do obrazu."
10. "Realizuje nagrania w standardzie filmowym — lipsync, post-produkcja."

**Audiobook / narracja** (gdy `applications` zawiera "Audiobook" / "Narracja"):
11. "Studio zoptymalizowane pod długie sesje audiobookowe — niskie tło, stabilna akustyka."
12. "Nagrywa audiobooki w pełnej jakości studyjnej, bez konieczności dodatkowej obróbki."

**E-learning / korporacyjne:**
13. "Studio gotowe do produkcji e-learningowej — moduły, intro/outro, spójny ton."

**Doświadczenie / warsztat:**
14. "Wieloletnie doświadczenie studyjne — setki zrealizowanych projektów komercyjnych."
15. "Praca mikrofonowa na poziomie profesjonalnym — codzienna praktyka studyjna."

**Wytyczne:**
- **Rotacja:** jedno zdanie ≤ 1× na ~10 profili.
- **Dopasowanie:** wariant do `applications` lektora (reklama → 7/8, film → 9/10, audiobook → 11/12).
- **Bez konkretnych marek sprzętu** (Neumann, Rode, Apollo itd.) — byłaby to nieweryfikowalna fabryka, trzymamy opcję B = prawdziwe, ogólne, profesjonalne.

**Zakres — konkretna lista 30 profili (wg GSC impressions, 7 dni kończące 2026-04-11):**

Nie używamy `famous: true` jako proxy — niektórzy famous mają 0 impresji, a niefamous mają 400+. Bierzemy twarde dane. Lista (slug / impressions):

1. `jacek-kurowski` — 496 imp
2. `przemyslaw-skowron` — 418
3. `andrzej-ferenc` — 417
4. `stanislaw-olejniczak` — 381
5. `kuba-bielak` — 262
6. `jacek-brzostynski` — 232
7. `miroslaw-utta` — 164
8. `pawel-szwajgier` — 123
9. `katarzyna-skolimowska` — 66
10. `maciej` — 65
11. `alicja-2` — 57
12. `hubert` — 53
13. `jacek-rozenek` — 53
14. `wiktor-zborowski` — 47
15. `mikolaj-krawczyk` — 42
16. `bartek-ignacik` — 39
17. `beata-tadla` — 36
18. `laura-samojlowicz` — 32
19. `david` — 23
20. `alicja` — 22
21. `zbigniew-moskal` — 19
22. `anita` — 18
23. `andrzej-krusiewicz` — 17
24. `adam` — 15
25. `basia` — 14
26. `lukasz-nowicki` — 14
27. `michal` — 13
28. `konstancja` — 12
29. `noa` — 12
30. `krzysztof` — 12

Lista wygenerowana z `Optimum_SEO/data/seo_weekly/pages_2026-04-11.csv`. Aktualizowana co tydzień po piątkowym raporcie — jeśli profil wypadnie z top-30 to nie musimy usuwać `studioNote`, ale nowe dodajemy do tych z listy.

### 3.4b Schema Service + FAQ na profilach (dodatkowe, z feedbacku LLM)

Uzupełnienie do 3.1:
- Dodać schema `Service` (nie tylko `Person` + `AudioObject`) — typ usługi: "Voice Over Recording"
- Dodać sekcję FAQ na profilu (3-5 pytań) + schema `FAQPage`
- FAQ to content + szansa na rich snippet

**Strategia: hybryda (częściowo personalizowane z danych lektora, częściowo wspólne)**

Generyczne FAQ identyczne na 234 profilach = template content → Google to deduplikuje i nie da rich snippet. Ale w pełni personalizowane = dużo pracy i niektóre odpowiedzi i tak byłyby takie same. Robimy hybrydę: pytania wspólne, odpowiedzi **z placeholderami z `voices.json`**.

**Zestaw 5 pytań (to samo na każdym profilu, żeby FAQPage schema była spójna):**

1. **"W jakim czasie otrzymam nagranie z głosem [Imię]?"**
   → Personalizowane z pola `turnaround`:
   *"Standardowa realizacja u [Imię] to [turnaround]. Krótkie formy reklamowe (do 30 sekund) często gotowe tego samego dnia. Dłuższe projekty — wycena indywidualna z terminem do ustalenia."*

2. **"Jak zamówić nagranie u lektora [Imię]?"**
   → Wspólne:
   *"Prześlij tekst przez formularz na profilu lub napisz na kontakt@powitania.pl. Otrzymasz wycenę w ciągu kilku godzin (w dni robocze) wraz z terminem realizacji."*

3. **"Czy mogę zamówić próbkę przed zleceniem pełnego nagrania?"**
   → Wspólne:
   *"Na życzenie Klienta przesyłamy bezpłatną dedykowaną próbkę nagrania. Na profilu dostępne są też gotowe próbki audio do odsłuchania."*

4. **"W jakich językach nagrywa [Imię]?"**
   → Personalizowane z pola `languages` + `native`/`nativeLanguage`:
   *"[Imię] nagrywa w języku [lista z languages]. Język natywny: [native ? nativeLanguage : 'polski']."*

5. **"Do jakich typów nagrań najlepiej pasuje głos [Imię]?"**
   → Personalizowane z pola `applications`:
   *"Głos [Imię] sprawdza się najlepiej w: [lista z applications]. Szczegóły i próbki audio powyżej."*

**Implementacja:**
- Template EJS renderuje FAQ z podstawieniem `<%= voice.turnaround %>` itd.
- `FAQPage` schema generowana z tych samych danych (JSON-LD w `<head>`)
- Fallback: jeśli pole puste → pytanie pomijamy (lepsze niż "Nagrywa w: undefined")

**Zakres:**
- ✅ FAQ + schema Service: **wszystkie 234 profile** — ZROBIONE w template lektor.ejs (Person + Service + FAQPage + AudioObject)
- ⬜ Unikalne zdanie `studioNote` (3.4a): template renderuje pole, ale **0/30 profili ma wypełnione** `studioNote` w voices.json. Do zrobienia ręcznie.

### ⬜ 3.4c Noindex filter queries (15 min, z feedbacku LLM)

Sprawdzić czy strony z filtrami (`/bank-glosow/?gender=m&age=30`) są zindeksowane. Jeśli tak — dodać `<meta name="robots" content="noindex,follow">` dla URL-i z query params (oprócz czystego `/bank-glosow/meskie/` i `/zenskie/`). Zapobiega duplicate content i index bloat.

### Pomiar tygodnia 3 (piątek 2.05)
- CTR profili /lektorzy/* (GSC, 7-day)
- Clicks z fluff-artykułów → strony komercyjne (GA4 event tracking)
- Ręczne pozycje target keywords

---

## TYDZIEŃ 4 (5-11.05) — Pomiar, korekty, pierwsze backlinki

**Cel:** Zmierzyć co zadziałało, podwoić to, zacząć linkbuilding.

### 4.1 Pełna analiza 4-tygodniowa (2h) — zrobię w wątku Optimum_SEO

- GSC: porównanie 28-dni przed vs po (odfiltrować brand)
- Które strony rosną, które nie
- CTR per cluster
- Wnioski → korekty

### 4.2 Korekty (czas zmienny, wg wyników)

Decyzje na podstawie danych:
- Strony wygrzewające się (impresje rosną, pos 15→10) → dodać content, pogłębić
- Strony martwe (brak impresji po 2 tygodniach) → zmienić title, wzmocnić internal links

### 4.3 Pierwsze backlinki + obecność zewnętrzna (4h) — samodzielnie

**Cel: 3 dobre linki/miesiąc + fundament pod GEO (widoczność w AI).**

> **Korekta (19.04):** Po analizie GEO okazało się, że powitania.pl ma prawie ZERO zewnętrznej obecności w sieci. To jest główna przyczyna, dla której LLM-y nie polecają firmy. Katalogi i backlinki to nie tylko SEO — to fundament pod widoczność w AI.

- **1 PR/social:** LinkedIn post z case study (klient TVN/Orange/Play) → link do strony głównej
- **1 gościnny wpis:** artykuł w serwisie branżowym (marketing, film, reklama) — "Jak wybrać lektora do reklamy" z linkiem do `/uslugi/glos-do-reklamy/`
- **Katalogi (PRIORYTET):**
  - 🔄 Google Business Profile — zawieszony, odwołanie w toku (zdjęcia CEIDG + studia)
  - ⬜ Oferteo.pl — pełny profil w kategorii "Usługi nagraniowe"
  - ⬜ Panorama Firm — weryfikacja i aktualizacja istniejącego wpisu
  - ⬜ Clutch.co — profil EN z portfolio i recenzjami klientów
  - ⬜ pkt.pl, firmy.net — basic wpisy z NAP + link

### 4.4 Content week — 1 sprzedażowo-edukacyjny artykuł (4h)

Temat: **"Jak zamówić nagranie lektorskie — przewodnik 2026 dla marketerów"**
- Cel frazy: "jak zamówić nagranie lektorskie", "proces nagrania lektora", "cennik lektor"
- 1500 słów, własna wiedza (25 lat branży)
- Linkuje do `/nagrania-lektorskie/`, `/cennik/`, `/bank-glosow/`
- To NIE jest fluff — to lead magnet dla B2B

### Pomiar tygodnia 4 + finalny review (12.05)

Konsultacja w wątku Optimum_SEO — analiza metryk vs baseline, decyzja go/no-go na miesiąc 2.

---

## Cotygodniowy rytuał pomiaru (piątek, 15 min)

**W każdy piątek raport do wątku Optimum_SEO:**

1. **GSC → Performance** → ostatnie 7 dni vs poprzednie 7:
   - Total clicks (odfiltrowany brand — query does NOT contain "powitania")
   - Clicks na target URLs:
     - `/nagrania-lektorskie/`
     - `/studio-lektorskie/`
     - `/lektor-do-reklamy/`
     - `/lektor-do-filmow/`
     - `/bank-glosow/meskie/`
     - `/bank-glosow/zenskie/`
     - `/cennik/`
   - Average CTR (total + per cluster profili)

2. **Ręczny check pozycji incognito** (5 fraz):
   - "nagrania lektorskie"
   - "studio lektorskie"
   - "lektor do reklamy"
   - "lektor do filmów"
   - "bank głosów" (kontrola — nie stracić)

3. **Analytics:**
   - Organic users
   - Goals: orders + inquiries z organic channel

4. **Zapis do arkusza pomiarów** (tworzę osobno)

---

## Kryteria decyzji po 30 dniach (12.05)

### 🟢 Zielone światło — kontynuujemy 60-90 dni
- +20% organic clicks na target URLs
- CTR profili >1.6%
- ≥2 nowe strony w top 10
- ≥3 organic leady (vs 2 baseline)

### 🟡 Żółte światło — korekty
- 0-20% wzrost, ALE impresje rosną na nowych stronach (Google przetrawia)
- Rozważamy: dodać agencyjne wsparcie tylko techniczne (linkbuilding)

### 🔴 Czerwone światło — wracasz do agencji
- 0 progresu, 0 impresji na nowych stronach, żadnych sygnałów po 4 tyg.
- Strata: 1 miesiąc bez agencji = 1700 zł oszczędności minus 0 efektu

**Prognoza:** 🟢 70%, 🟡 25%, 🔴 5%. Zadania oparte na twardych danych GSC, nie spekulacji.

---

## Struktura pracy między wątkami

- **Ten wątek (powitania-app):** implementacja wszystkich zadań 1.1-4.4 — kod, widoki, redirecty, content, sitemap.
- **Wątek Optimum_SEO:** analiza GSC/Ads/Analytics, pomiar tygodniowy, korekty strategii, decyzje go/no-go, pomoc przy content briefach.

Po każdym tygodniu: krótki raport w Optimum_SEO → ewentualne korekty → tu wykonujemy.

---

## Status aktualizacji (19.04.2026 — koniec tygodnia 1)

### Co zrobione (nie było w oryginalnym planie, ale zrealizowane równolegle):
- ✅ Accept-Language redirect wyłączony (boty AI + Googlebot widzą PL)
- ✅ Meta title/description strony głównej (od 2001, 234 lektorów, 11 000+ nagrań)
- ✅ Atomic facts (sekcja PL + EN na stronie głównej)
- ✅ Organization schema (foundingDate, knowsAbout, slogan)
- ✅ Robots.txt — wszystkie crawlery AI dozwolone
- ✅ Hreflang dynamiczny dla bloga PL↔EN
- ✅ Tłumaczenia EN bloga (61/61 postów)
- ✅ 301 redirecty EN: /en/price-list/ → /en/pricing/, /en/voice-recordings/ → /en/voiceover-services/

### Kluczowe korekty planu:
1. **`/studio-lektorskie/` usunięte** — kanibalizuje stronę główną. Zamiast tego wzmacniamy to co mamy.
2. **Istniejące strony usługowe wzmacniamy zamiast tworzyć od zera** — `/uslugi/glos-do-reklamy/` i `/uslugi/lektor-do-filmow/` mają historię w Google.
3. **Niszowe landing pages dodane** — `/uslugi/e-learning/`, `/uslugi/audioprzewodniki/`, `/uslugi/spot-radiowy/` (niska konkurencja).
4. **GBP i katalogi podniesione w priorytecie** — brak zewnętrznej obecności = główna przyczyna niewidoczności w AI. Patrz Plan_GEO_v3 w Optimum_SEO.
5. **Schema na profilach — już zrobione** (Person + Service + FAQPage + AudioObject). Przesunięcie wysiłku z tygodnia 3 na content audit i studioNote.

### Następne kroki (tydzień 2: 21-27.04):
1. Rozbudowa `/uslugi/glos-do-reklamy/` (content + FAQ)
2. Rozbudowa `/uslugi/lektor-do-filmow/` (content + FAQ)
3. Rewrite `/nagrania-lektorskie/` (title, meta, content 1500+ słów)
4. Stworzenie 2-3 niszowych landing pages
5. Ręczne Request Indexing 8 profili w GSC (punkt 1.4)
