# Instrukcje dla AI — projekt powitania.pl

## Stack technologiczny
- Express.js 4.21 + EJS (server-side rendering)
- Tailwind CSS (statyczny build 36KB)
- Vanilla JS (kreator, bank głosów)
- Node.js, deploy: produkcja (ostrożność!)

## Zasady pracy
- Tryb **mega bezpieczny** — jesteśmy na produkcji
- Osobne pliki dla wersji PL i EN (nie modyfikować PL przy zmianach EN)
- Sprawdzać składnię (`node -c`) przed każdym commitem
- Nie pushować — użytkownik robi push samodzielnie

## SEO & GEO — checklist przy istotnych zmianach

Przy każdej istotnej zmianie w serwisie (nowa strona, zmiana URL, nowa sekcja) pamiętaj o:

### SEO
1. **Sitemap** (`server.js`, sekcja `/sitemap.xml`) — dodać nowy URL do `staticPages`
2. **Hreflang** (`server.js`, obiekt `hreflangMap`) — jeśli strona ma wersję PL↔EN, dodać parę do mapy
3. **Canonical URL** — automatyczny przez `head.ejs` / `head-en.ejs` (bez zmian)
4. **Meta title + description** — ustawić w route renderującym stronę
5. **JSON-LD / Schema.org** — dodać jeśli strona tego wymaga (usługi, artykuły)
6. **Nawigacja** — zaktualizować `head-en.ejs` / `head.ejs` i `foot-en.ejs` / `foot.ejs`

### GEO (Generative Engine Optimization)
7. **llms.txt** (`public/llms.txt`) — dodać nową stronę do odpowiedniej sekcji (PL lub EN)
8. Upewnić się, że opisy w llms.txt są zwięzłe i informacyjne dla LLM

### Pliki kluczowe
- `server.js` — routing, middleware, sitemap, hreflang mapa
- `views/partials/head.ejs` / `head-en.ejs` — meta tagi, hreflang, JSON-LD
- `views/partials/foot.ejs` / `foot-en.ejs` — linki w stopce
- `public/llms.txt` — plik GEO dla modeli językowych
- `public/robots.txt` — reguły crawlowania
- `lib/prompts.js` — prompty kreatora (PL + EN warianty)
- `public/js/kreator.js` (PL) / `kreator-en.js` (EN) — kreator tekstów
