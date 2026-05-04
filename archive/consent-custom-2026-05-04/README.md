# Backup: Custom Cookie Consent Banner (2026-05-04)

Archiwum własnego rozwiązania consent banner zastąpionego przez **CookieYes** w dniu 2026-05-04.

## Co tu jest

4 pliki — kopia `views/partials/*.ejs` z dnia 2026-05-04 przed migracją na CookieYes:

- `head.ejs` — zawiera `gtag('consent', 'default', {...})` + Microsoft Clarity z consent sync
- `head-en.ejs` — analogicznie dla wersji EN
- `foot.ejs` — zawiera całą logikę custom banner (HTML modal + floating cookie button + JS handlers)
- `foot-en.ejs` — analogicznie dla EN

## Co miało custom rozwiązanie

- Google Consent Mode v2 (default = denied dla wszystkich 4 sygnałów ad/analytics, granted dla functionality/security)
- Banner cookie (3 opcje: Akceptuj wszystkie / Tylko niezbędne / Ustawienia z granular checkboxes)
- Floating cookie button (lewy dolny róg) widoczny po akceptacji - re-open banner
- Double-storage check (localStorage + first-party cookie) - banner re-show jeśli któreś brak
- Microsoft Clarity consent sync
- DataLayer push `consent_update` event dla GTM

GA4 Consent settings na produkcji (przed migracją): **"Świetna jakość", 4/4 sygnały aktywne**.

## Powód migracji na CookieYes

Freelancer Google Ads zalecał certyfikowany CMP (Google CMP Partner Program) dla "świętego spokoju" mimo że custom rozwiązanie technicznie działało poprawnie. Custom code był sprawny, ale opinia zewnętrzna pchała w stronę "Google-recommended CMP".

CookieYes wybrane jako tańsza alternatywa Cookiebot (też w Google CMP Partner Program).

## Jak wrócić do tego rozwiązania (rollback)

Jeśli CookieYes okaże się problemem (cena, performance, customization, support):

```bash
# Przywróć pliki z archive
cp archive/consent-custom-2026-05-04/head.ejs views/partials/head.ejs
cp archive/consent-custom-2026-05-04/head-en.ejs views/partials/head-en.ejs
cp archive/consent-custom-2026-05-04/foot.ejs views/partials/foot.ejs
cp archive/consent-custom-2026-05-04/foot-en.ejs views/partials/foot-en.ejs

# Zweryfikuj EJS
node -e "const ejs=require('ejs'); ['head','head-en','foot','foot-en'].forEach(f => ejs.compile(require('fs').readFileSync('views/partials/'+f+'.ejs','utf8'),{filename:f}))"

# Commit + push
git add views/partials/*.ejs
git commit -m "rollback: powrot do custom consent banner (CookieYes nie spelnial wymagan)"
git push
```

Plus: anuluj subscription CookieYes w dashboard https://cookieyes.com (żeby nie ładował się ich script po deploy rollbacku).

## Git history reference

Ostatni commit z custom rozwiązaniem przed migracją na CookieYes: sprawdź `git log views/partials/foot.ejs` z datą 2026-05-04 lub wcześniej (commit hash zostanie zapisany w commit message migracji).
