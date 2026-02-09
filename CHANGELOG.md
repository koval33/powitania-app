# Changelog — powitania.pl

## Faza 2 — Treści i system opinii (2025-02-09)
Commit: `9e4f05f`

### 1. FAQ (`/faq-pl/`)
- 5 pytań z akordeonowym UI (klik → rozwiń/zwiń)
- Schema.org **FAQPage** markup dla Google Rich Results
- Treści zaimportowane z oryginalnego serwisu

### 2. Opinie (`/opinie/`) + system moderacji
- **Strona publiczna** z 147 zaimportowanymi opiniami klientów
- "Pokaż więcej" — domyślnie widać 12, potem ładuje kolejne po 12
- **Formularz dodawania opinii** — klient wpisuje firmę, imię, treść
- **API** `POST /api/reviews/add` — nowa opinia trafia z `approved: false`
- **Panel admin** `/admin/opinie/` (Basic Auth jak lektorzy):
  - Tab "Oczekujące" — zatwierdzanie / usuwanie
  - Tab "Zatwierdzone" — cofanie zatwierdzenia / usuwanie
- Schema.org **Review** + **AggregateRating** markup
- Dane: `data/reviews.json`

### 3. Nagrania lektorskie (`/nagrania-lektorskie/`)
- Hub z 4 kartami usług (zapowiedzi tel., głos do reklamy, lektor do filmów, sesje zdalne)
- Sekcja "Kto tworzy nasze studio" z treścią oryginalnego serwisu
- Statystyki (230+ lektorów, 24 lata, 48h realizacja, 5.0 ocena)
- Schema.org **Service** + **OfferCatalog** markup

### 4. Nagranie ekspresowe (`/nagranie-ekspresowe/`)
- Gwarancja realizacji tego samego dnia (zamów do 14:00 → gotowe do 18:00)
- 4-krokowy proces zamawiania
- Dynamiczna lista dyżurujących lektorów (z `turnaround` zawierającym "24h")
- Cennik orientacyjny i CTA

### 5. Bugfix
- Naprawiony `admin.js` — profileUrl teraz prawidłowo generuje `/lektorzy/` zamiast `/lektor/`

### Nowe pliki
- `views/faq.ejs`
- `views/opinie.ejs`
- `views/nagrania-lektorskie.ejs`
- `views/nagranie-ekspresowe.ejs`
- `views/admin/opinie.ejs`
- `routes/api-reviews.js`
- `routes/admin-opinie.js`
- `data/reviews.json` (147 opinii)

### Zmodyfikowane pliki
- `server.js` — nowe route'y, podpięcie API reviews i admin opinie
- `routes/admin.js` — fix profileUrl `/lektor/` → `/lektorzy/`

---

## Faza 1 — SEO i fundamenty (2025-02-09)
Commit: `3facdcb`

### URL-e dopasowane do starego serwisu (20 lat SEO)
- `/lektorzy/:slug/` — profile lektorów (231 wpisów w voices.json)
- `/faq-pl/` — FAQ
- `/sesje-zdalne-nagrania-lektorskie-online/` — sesje zdalne
- `/nagrania-lektorskie/profesjonalny-lektor-do-filmow/` — lektor do filmów

### 301 Redirecty (stare URL → nowe)
- `/lektor/:slug/` → `/lektorzy/:slug/`
- `/faq/` → `/faq-pl/`
- `/sesje-zdalne/` → `/sesje-zdalne-nagrania-lektorskie-online/`
- `/nagrania-lektorskie/lektor-do-filmow/` → `/nagrania-lektorskie/profesjonalny-lektor-do-filmow/`
- `/lista-lektorow/`, `/szukaj/`, `/twoj-bank-glosow/` → `/bank-glosow/`
- `/ceny-lektora/` → `/cennik/`
- `/voice-over/` → `/`
- `/sitemap.html` → `/sitemap.xml`

### SEO meta tagi
- Canonical URL na każdej stronie
- Open Graph (og:title, og:description, og:image, og:url, og:locale)
- Twitter Card (summary_large_image)
- Favicon (ico, svg, apple-touch-icon)

### JSON-LD Structured Data
- **Organization + LocalBusiness** — dane firmy, telefon, adres, godziny, rating
- **BreadcrumbList** — na podstronach z breadcrumbs
- **WebPage** — na każdej stronie

### Nowe pliki (Faza 1)
- `public/robots.txt`
- `public/favicon.ico`
- `views/404.ejs`

### Infrastruktura
- Dynamiczny `sitemap.xml` (strony statyczne + 231 profili lektorów)
- Strona 404 z linkami do głównych sekcji
- Ujednolicony separator tytułów: `|`

---

## Planowane fazy

### Faza 3 — Kolejne strony
- Portfolio / galeria realizacji
- O firmie
- Blog / Aktualności (65 postów do migracji)

### Faza 4 — Wersja angielska
- Tłumaczenie całego serwisu na EN
- Routing `/en/...`

### Faza 5 — Funkcjonalności
- Newsletter
- Polityka prywatności, Regulamin
- Kalkulator kosztów
- System płatności
- Chatbot
