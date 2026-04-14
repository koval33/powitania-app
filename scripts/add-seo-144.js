#!/usr/bin/env node
// Dodaje seoTitle + seoDescription dla 144 lektorów bez tych pól
const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, '../data-seed/voices.json');
const voices = JSON.parse(fs.readFileSync(filePath, 'utf8'));

const seoData = {
  'anka': {
    seoTitle: 'Anka — mocny alt, lektorka i redaktorka | powitania.pl',
    seoDescription: 'Anka — 30–50 lat, mocny stonowany alt o szerokich możliwościach interpretacyjnych. IVR, reklama, audiobook. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'pawel-3': {
    seoTitle: 'Paweł 3 — piaskowy tembr, aktor i lektor | powitania.pl',
    seoDescription: 'Paweł 3 — 30–50 lat, niski piaskowy tembr głosu, aktor i wszechstronny lektor. IVR, reklama, audiobook. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'przemyslaw-2': {
    seoTitle: 'Przemysław 2 — niski dźwięczny głos, lektor | powitania.pl',
    seoDescription: 'Przemysław 2 — 20–30 lat, niski dźwięczny głos z wyraźną interpretacją. Reklama, narracja, audiobook. Próbka + wycena w 24h. powitania.pl od 2001 roku.'
  },
  'tomasz-2': {
    seoTitle: 'Tomasz 2 — aktor teatralny i radiowy, lektor | powitania.pl',
    seoDescription: 'Tomasz 2 — 30–50 lat, dojrzała barwa aktora teatralnego i radiowego. IVR, reklama, audiobook. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'emilia': {
    seoTitle: 'Emilia — ekspresyjna dykcja, lektorka | powitania.pl',
    seoDescription: 'Emilia — 20–30 lat, perfekcyjna dykcja i bogaty warsztat interpretacyjny. IVR, reklama, narracja. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'miroslaw-utta': {
    seoTitle: 'Mirosław Utta — 45 lat w zawodzie, lektor | powitania.pl',
    seoDescription: 'Mirosław Utta — 50+ lat, autorytatywny głos z 45-letnim stażem lektorskim. IVR, reklama, narracja. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'tomasz': {
    seoTitle: 'Tomasz — charyzmatyczna barwa, trener głosu | powitania.pl',
    seoDescription: 'Tomasz — 30–50 lat, charyzmatyczna i młoda barwa głosu, trener autoprezentacji. IVR, reklama, narracja. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'piotr-3': {
    seoTitle: 'Piotr 3 — aktor teatralny, lektor i dubbing | powitania.pl',
    seoDescription: 'Piotr 3 — 30–50 lat, wszechstronny głos aktora teatralnego i dubbingowego. IVR, reklama, narracja. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'miguel': {
    seoTitle: 'Miguel — natywny głos, język portugalski | powitania.pl',
    seoDescription: 'Miguel — 30–50 lat, natywny lektor języka portugalskiego, nagrania PT. IVR, reklama, narracja, audiobook. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'aga': {
    seoTitle: 'Aga — lektorka PL i EN, reklama i narracja | powitania.pl',
    seoDescription: 'Aga — 30–50 lat, doświadczona lektorka nagrywająca w języku polskim i angielskim. IVR, narracja. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'iwona': {
    seoTitle: 'Iwona — ciepły niski kobiecy głos, lektorka | powitania.pl',
    seoDescription: 'Iwona — 20–30 lat, ciepły i niski kobiecy głos o szerokich możliwościach. IVR, reklama, audiobook. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'catarina': {
    seoTitle: 'Catarina — natywny głos, język portugalski | powitania.pl',
    seoDescription: 'Catarina — 30–50 lat, natywna lektorka języka portugalskiego, nagrania PT. IVR, reklama, narracja, audiobook. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'vishal': {
    seoTitle: 'Vishal — dojrzała barwa, natywny głos włoski | powitania.pl',
    seoDescription: 'Vishal — 30–50 lat, dojrzała i przyjemna barwa natywnego głosu włoskiego. IVR, reklama, audiobook. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'sebastian': {
    seoTitle: 'Sebastian — dojrzały głos, lektor | powitania.pl',
    seoDescription: 'Sebastian — 30–50 lat, młody lecz dojrzały głos o wszechstronnej barwie. IVR, reklama, narracja. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'diana': {
    seoTitle: 'Diana — głęboki alt, lektorka PL i EN | powitania.pl',
    seoDescription: 'Diana — 30–50 lat, głęboki alt z 10-letnim doświadczeniem, nagrania w PL i EN. IVR, reklama, narracja. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'jakub-3': {
    seoTitle: 'Jakub 3 — konferansjer, muzyk i lektor | powitania.pl',
    seoDescription: 'Jakub 3 — 20–30 lat, głos konferansjera i muzyka z 11-letnim stażem. IVR, reklama, narracja. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'lea': {
    seoTitle: 'Lea — utalentowana dziecięca lektorka | powitania.pl',
    seoDescription: 'Lea — 5–20 lat, wyjątkowa barwa dziecięcego głosu znana z radia i telewizji. IVR, reklama, narracja. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'malgorzata-2': {
    seoTitle: 'Małgorzata 2 — miękki ciepły głos, lektorka | powitania.pl',
    seoDescription: 'Małgorzata 2 — 30–50 lat, miękki i ciepły kobiecy głos, bogata gama interpretacyjna. IVR, reklama, audiobook. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'basia': {
    seoTitle: 'Basia — ciekawy niski kobiecy głos, lektorka | powitania.pl',
    seoDescription: 'Basia — 30–50 lat, ciekawy niski kobiecy głos, idealny do reklam i audiobooków. IVR, reklama, narracja. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'marcin-4': {
    seoTitle: 'Marcin 4 — barwny energetyczny głos, lektor | powitania.pl',
    seoDescription: 'Marcin 4 — 20–30 lat, przyjemny, barwny głos pełen energii. IVR, reklama, narracja, audiobook. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'witalij': {
    seoTitle: 'Witalij — dynamiczny głos, RU i UA | powitania.pl',
    seoDescription: 'Witalij — 30–50 lat, aktywny i dynamiczny głos, nagrania w języku rosyjskim i ukraińskim. IVR, reklama, narracja. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'eri': {
    seoTitle: 'Eri — natywny głos, język hebrajski | powitania.pl',
    seoDescription: 'Eri — 20–30 lat, rozpoznawalny hebrajski głos znany z programów TV i reklam. IVR, reklama, narracja. Próbka + wycena. powitania.pl od 2001 roku.'
  },
  'yurika': {
    seoTitle: 'Yurika — natywna lektorka, języki azjatyckie | powitania.pl',
    seoDescription: 'Yurika — 20–30 lat, natywna lektorka nagrywająca w języku japońskim i chińskim. IVR, reklama, audiobook. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'marta-2': {
    seoTitle: 'Marta 2 — lektorka PL i FR, dziennikarka | powitania.pl',
    seoDescription: 'Marta 2 — 30–50 lat, doświadczona lektorka nagrywająca w języku polskim i francuskim. IVR, reklama, audiobook. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'marzena-2': {
    seoTitle: 'Marzena 2 — stonowany głos, lektorka radiowa | powitania.pl',
    seoDescription: 'Marzena 2 — 20–30 lat, dojrzały i stonowany głos z doświadczeniem radiowym. IVR, reklama, audiobook. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'erwin': {
    seoTitle: 'Erwin — radiowiec, lektor i konferansjer | powitania.pl',
    seoDescription: 'Erwin — 30–50 lat, doświadczony radiowiec i konferansjer. IVR, reklama, narracja, audiobook. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'bartek-ignacik': {
    seoTitle: 'Bartek Ignacik — dziennikarz sportowy | powitania.pl',
    seoDescription: 'Bartek Ignacik — 30–50 lat, charakterystyczny głos dziennikarza sportowego. IVR, reklama, narracja. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'jaroslav': {
    seoTitle: 'Jaroslav — natywny głos, czeski i słowacki | powitania.pl',
    seoDescription: 'Jaroslav — 20–30 lat, natywny lektor nagrywający w języku czeskim i słowackim. IVR, reklama, audiobook. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'lukasz': {
    seoTitle: 'Łukasz — głos Eska Rock i Eurosport, lektor | powitania.pl',
    seoDescription: 'Łukasz — 30–50 lat, ciepły głos znany ze stacji Eska Rock i kanału Eurosport. Reklama. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'wiktor': {
    seoTitle: 'Wiktor — dynamiczny głos, VIVA i Nickelodeon | powitania.pl',
    seoDescription: 'Wiktor — 20–30 lat, młody i witalny głos znany z VIVA Polska i Nickelodeon. IVR, reklama, narracja. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'ula': {
    seoTitle: 'Ula — uspokajający kobiecy głos, lektorka | powitania.pl',
    seoDescription: 'Ula — 20–30 lat, łagodny i uspokajający kobiecy głos. IVR, reklama, narracja. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'bartek': {
    seoTitle: 'Bartek — nienaganna dykcja, lektor i aktor | powitania.pl',
    seoDescription: 'Bartek — 30–50 lat, nienaganna dykcja i znakomite zdolności interpretacyjne aktora. IVR, reklama, narracja. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'alan': {
    seoTitle: 'Alan — młody witalny głos do reklam | powitania.pl',
    seoDescription: 'Alan — 20–30 lat, młody i witalny głos o świeżym brzmieniu. IVR, reklama, narracja. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'arminas': {
    seoTitle: 'Arminas — natywny głos, język litewski | powitania.pl',
    seoDescription: 'Arminas — 20–30 lat, natywny lektor języka litewskiego. IVR, reklama, narracja. Próbka + wycena. powitania.pl od 2001 roku.'
  },
  'vladimir-2': {
    seoTitle: 'Vladimir 2 — natywny głos, język słowacki | powitania.pl',
    seoDescription: 'Vladimir 2 — 20–30 lat, natywny lektor języka słowackiego. IVR, reklama, narracja. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'mikolaj-krawczyk': {
    seoTitle: 'Mikołaj Krawczyk — aktor filmowy i teatralny | powitania.pl',
    seoDescription: 'Mikołaj Krawczyk — 20–30 lat, rozpoznawalny głos aktora filmowego i teatralnego. Reklama, narracja, audiobook. Próbka + wycena. powitania.pl od 2001 roku.'
  },
  'daria': {
    seoTitle: 'Daria — ciepły głos, intrygujący niski ton | powitania.pl',
    seoDescription: 'Daria — 20–30 lat, ciepły kobiecy głos z umiejętnością obniżonego, intrygującego tonu. IVR, reklama, narracja. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'anna-3': {
    seoTitle: 'Anna 3 — natywna lektorka EN i RU | powitania.pl',
    seoDescription: 'Anna 3 — 30–50 lat, natywna lektorka nagrywająca w języku angielskim i rosyjskim. IVR, reklama, audiobook. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'julien': {
    seoTitle: 'Julien — dojrzały energiczny głos, natywny FR | powitania.pl',
    seoDescription: 'Julien — 30–50 lat, dojrzały i energiczny głos natywnego lektora języka francuskiego. IVR, reklama, audiobook. Próbka + wycena. powitania.pl od 2001 roku.'
  },
  'krzysiek': {
    seoTitle: 'Krzysiek — niski tembr, lektor radiowy i TV | powitania.pl',
    seoDescription: 'Krzysiek — 20–30 lat, niski tembr głosu lektora radiowego i telewizyjnego. IVR, reklama, narracja. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'nikolay': {
    seoTitle: 'Nikolay — ciepły głos, natywny lektor | powitania.pl',
    seoDescription: 'Nikolay — 30–50 lat, głęboka i ciepła barwa głosu, natywny aktor głosowy EN i BG. IVR, reklama, audiobook. Próbka + wycena. powitania.pl od 2001 roku.'
  },
  'maciej': {
    seoTitle: 'Maciej — lektor PL i EN, dubbing i produkcja | powitania.pl',
    seoDescription: 'Maciej — 20–30 lat, wszechstronny głos do dubbingu, reklam i produkcji wideo, nagrania PL i EN. IVR, reklama, audiobook. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'norbert': {
    seoTitle: 'Norbert — dojrzały głos, lektor PL, EN i DE | powitania.pl',
    seoDescription: 'Norbert — 20–30 lat, dojrzały głęboki głos, nagrania w języku polskim, angielskim i niemieckim. IVR, reklama, narracja. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'ofer': {
    seoTitle: 'Ofer — natywny lektor hebrajski, media i TV | powitania.pl',
    seoDescription: 'Ofer — 30–50 lat, natywny lektor z 12-letnim doświadczeniem, specjalizacja: media. IVR, reklama, narracja. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'noa': {
    seoTitle: 'Noa — natywna lektorka, język hebrajski | powitania.pl',
    seoDescription: 'Noa — 20–30 lat, natywna hebrajska lektorka z 8-letnim doświadczeniem w reklamie i grach. IVR, reklama, narracja. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'eyal': {
    seoTitle: 'Eyal — natywny lektor hebrajski, radio i TV | powitania.pl',
    seoDescription: 'Eyal — 30–50 lat, natywny lektor z 13-letnim doświadczeniem w radiu i telewizji. IVR, reklama, narracja. Próbka + wycena. powitania.pl od 2001 roku.'
  },
  'uriel': {
    seoTitle: 'Uriel — natywny głos, język hebrajski | powitania.pl',
    seoDescription: 'Uriel — 30–50 lat, natywny lektor języka hebrajskiego. IVR, reklama, narracja. Próbka + wycena. powitania.pl od 2001 roku.'
  },
  'vita': {
    seoTitle: 'Vita — ciepła barwa, lektorka LV i RU | powitania.pl',
    seoDescription: 'Vita — 20–30 lat, niski i ciepły kobiecy głos, nagrania w języku łotewskim i rosyjskim. IVR, reklama, narracja. Próbka + wycena. powitania.pl od 2001 roku.'
  },
  'goran': {
    seoTitle: 'Goran — przyjemny głos, lektor HR i EN | powitania.pl',
    seoDescription: 'Goran — 30–50 lat, pozytywny i przyjemny głos z neutralnym akcentem, nagrania HR i EN. IVR, reklama, audiobook. Próbka + wycena. powitania.pl od 2001 roku.'
  },
  'mark': {
    seoTitle: 'Mark — natywny lektor, język węgierski | powitania.pl',
    seoDescription: 'Mark — 20–30 lat, natywny lektor z wieloletnim doświadczeniem w dubbingu i narracji. IVR, reklama, audiobook. Próbka + wycena. powitania.pl od 2001 roku.'
  },
  'humberto': {
    seoTitle: 'Humberto — głęboki baryton, natywny lektor | powitania.pl',
    seoDescription: 'Humberto — 30–50 lat, dojrzały barytonowy głos aktora głosowego, nagrania EN, ES i PT. IVR, reklama, audiobook. Próbka + wycena. powitania.pl od 2001 roku.'
  },
  'przemyslaw-skowron': {
    seoTitle: 'Przemysław Skowron — głos RMF FM, lektor | powitania.pl',
    seoDescription: 'Przemysław Skowron — 20–30 lat, charakterystyczny głos dziennikarza RMF FM z 20-letnim stażem. Narracja. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'virginie': {
    seoTitle: 'Virginie — świeży głos, natywna lektorka FR | powitania.pl',
    seoDescription: 'Virginie — 30–50 lat, świeży i żywy kobiecy głos, idealny do reklam, natywna lektorka FR. IVR, reklama, audiobook. Próbka + wycena. powitania.pl od 2001 roku.'
  },
  'tomek': {
    seoTitle: 'Tomek — miękki ciepły głos, lektor PL i EN | powitania.pl',
    seoDescription: 'Tomek — 30–50 lat, miękki i ciepły tembr głosu, nagrania w języku polskim i angielskim. IVR, reklama. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'piotr-4': {
    seoTitle: 'Piotr 4 — aktor i lektor, reklamy i gry | powitania.pl',
    seoDescription: 'Piotr 4 — 30–50 lat, wszechstronny głos aktora do reklam, gier komputerowych i Teatru PR. IVR, reklama, audiobook. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'edyta': {
    seoTitle: 'Edyta — profesjonalna lektorka | powitania.pl',
    seoDescription: 'Edyta — 30–50 lat, profesjonalna lektorka do wszechstronnych zastosowań. IVR, reklama, narracja, audiobook. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'hubert': {
    seoTitle: 'Hubert — ciepła barwa, dziennikarz radiowy | powitania.pl',
    seoDescription: 'Hubert — 30–50 lat, ciepła barwa i ciekawy tembr głosu wyćwiczone w pracy prezentera i dziennikarza radiowego. IVR, reklama, audiobook. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'dariusz': {
    seoTitle: 'Dariusz — mistrz mowy, lektor radiowy | powitania.pl',
    seoDescription: 'Dariusz — 50+ lat, doświadczony głos mistrza mowy polskiej, aktywny w radiu, reklamie i dubbingu. IVR, reklama, narracja. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'andy': {
    seoTitle: 'Andy — brytyjski natywny lektor angielski | powitania.pl',
    seoDescription: 'Andy — 30–50 lat, brytyjski lektor angielski mieszkający w Polsce, łatwa wymowa polskich nazw. IVR, reklama, audiobook. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'joanna': {
    seoTitle: 'Joanna — charakterystyczna barwa, lektorka | powitania.pl',
    seoDescription: 'Joanna — 30–50 lat, wszechstronna barwa głosu rozpoznawalna z wielu kampanii reklamowych. Reklama, narracja, audiobook. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'roy': {
    seoTitle: 'Roy — ciepły precyzyjny głos, natywny DE | powitania.pl',
    seoDescription: 'Roy — 30–50 lat, ciepły i precyzyjny głos natywnego lektora języka niemieckiego. IVR, reklama, narracja. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'guntis': {
    seoTitle: 'Guntis — natywny głos, język łotewski | powitania.pl',
    seoDescription: 'Guntis — 30–50 lat, natywny lektor języka łotewskiego. IVR, reklama, narracja, audiobook. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'ada': {
    seoTitle: 'Ada — mocny czytelny głos, lektorka | powitania.pl',
    seoDescription: 'Ada — 30–50 lat, mocny i czytelny kobiecy głos. IVR, reklama, narracja. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'adam': {
    seoTitle: 'Adam — niski mocny głos, lektor TOK FM | powitania.pl',
    seoDescription: 'Adam — 30–50 lat, niska mocna barwa głosu lektora radiowego TOK FM. IVR, reklama, narracja. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'silvia': {
    seoTitle: 'Silvia — natywna lektorka, język portugalski | powitania.pl',
    seoDescription: 'Silvia — 30–50 lat, natywna lektorka języka portugalskiego. IVR, reklama, narracja, audiobook. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'marta': {
    seoTitle: 'Marta — natywna lektorka SL i EN | powitania.pl',
    seoDescription: 'Marta — 20–30 lat, natywna lektorka nagrywająca w języku słoweńskim i angielskim. IVR, reklama, narracja. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'nina': {
    seoTitle: 'Nina — szeroka skala, natywna lektorka HR | powitania.pl',
    seoDescription: 'Nina — 20–30 lat, chorwacka piosenkarka i lektorka o bardzo szerokiej skali głosowej. IVR, reklama, narracja. Próbka + wycena. powitania.pl od 2001 roku.'
  },
  'ewelina': {
    seoTitle: 'Ewelina — prezenterka, lektorka PL i EN | powitania.pl',
    seoDescription: 'Ewelina — 20–30 lat, świeży głos prezenterki radiowej, nagrania w języku polskim i angielskim. IVR, reklama, audiobook. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'andrzej': {
    seoTitle: 'Andrzej — miły głos, lektor PL i EN | powitania.pl',
    seoDescription: 'Andrzej — 20–30 lat, sympatyczny i przyjemny w odbiorze głos, nagrania w języku polskim i angielskim. IVR, reklama, audiobook. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'yonca': {
    seoTitle: 'Yonca — natywna lektorka, język turecki | powitania.pl',
    seoDescription: 'Yonca — 30–50 lat, natywna lektorka języka tureckiego. IVR, reklama, narracja, audiobook. Próbka + wycena. powitania.pl od 2001 roku.'
  },
  'juliya': {
    seoTitle: 'Juliya — łagodna barwa, lektorka RU i UA | powitania.pl',
    seoDescription: 'Juliya — 30–50 lat, miękka i łagodna barwa kobiecego głosu, nagrania w języku rosyjskim i ukraińskim. IVR, reklama, narracja. Próbka + wycena. powitania.pl od 2001 roku.'
  },
  'marcin-3': {
    seoTitle: 'Marcin 3 — młody zdecydowany głos, lektor | powitania.pl',
    seoDescription: 'Marcin 3 — 30–50 lat, młody i zdecydowany głos realizatora i lektora. IVR, reklama. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'klaudiusz': {
    seoTitle: 'Klaudiusz — aktor, lektor PL i DE | powitania.pl',
    seoDescription: 'Klaudiusz — 30–50 lat, doświadczony głos aktora reklamowego, nagrania w języku polskim i niemieckim. IVR, reklama. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'karol': {
    seoTitle: 'Karol — mocne czytelne brzmienie, lektor | powitania.pl',
    seoDescription: 'Karol — 20–30 lat, mocne i czytelne brzmienie w średnich rejestrach. IVR, reklama, narracja. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'andrzej-krusiewicz': {
    seoTitle: 'Andrzej Krusiewicz — liryczny głos, lektor | powitania.pl',
    seoDescription: 'Andrzej Krusiewicz — 50+ lat, liryczna, głęboka barwa głosu lektora radiowego i TV. IVR, reklama, narracja. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'jacek-kurowski': {
    seoTitle: 'Jacek Kurowski — lektor, dziennikarz | powitania.pl',
    seoDescription: 'Jacek Kurowski — 30–50 lat, głos doświadczonego dziennikarza sportowego i lektora. IVR, reklama, narracja, audiobook. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'pawel': {
    seoTitle: 'Paweł — głos aktora i lektora, dubbing | powitania.pl',
    seoDescription: 'Paweł — 30–50 lat, wszechstronny głos zawodowego aktora — reklamy TV, audiobooki i dubbing. IVR, reklama, audiobook. Próbka + wycena. powitania.pl od 2001 roku.'
  },
  'joachim': {
    seoTitle: 'Joachim — dwujęzyczny lektor, DE i PL | powitania.pl',
    seoDescription: 'Joachim — 20–30 lat, jeden z niewielu lektorów natywnych w języku polskim i niemieckim. IVR, reklama, narracja, audiobook. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'dorota-2': {
    seoTitle: 'Dorota 2 — charakterystyczna chrypka, lektor | powitania.pl',
    seoDescription: 'Dorota 2 — 30–50 lat, aktorka z ciekawą chrypką i charyzmą w głosie. Reklama, narracja, audiobook. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'laura-samojlowicz': {
    seoTitle: 'Laura Samojłowicz — ciepła wyrazista barwa | powitania.pl',
    seoDescription: 'Laura Samojłowicz — 30–50 lat, ciepła i wyrazista barwa aktorki z nienaganna dykcją. IVR, reklama, narracja. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'ioana': {
    seoTitle: 'Ioana — pozytywna energia, lektorka RO | powitania.pl',
    seoDescription: 'Ioana — 30–50 lat, pozytywny, pełen energii głos natywnej lektorki rumuńskiej. IVR, reklama, audiobook. Próbka + wycena. powitania.pl od 2001 roku.'
  },
  'alfonso': {
    seoTitle: 'Alfonso — natywny głos, język hiszpański | powitania.pl',
    seoDescription: 'Alfonso — 30–50 lat, natywny lektor języka hiszpańskiego. IVR, reklama, narracja, audiobook. Próbka + wycena. powitania.pl od 2001 roku.'
  },
  'joel': {
    seoTitle: 'Joel — dojrzały głos, natywny lektor ES | powitania.pl',
    seoDescription: 'Joel — 50+ lat, dojrzały natywny głos hiszpańskojęzyczny. IVR, reklama, narracja, audiobook. Próbka + wycena. powitania.pl od 2001 roku.'
  },
  'kornelia': {
    seoTitle: 'Kornelia — natywna lektorka, język bułgarski | powitania.pl',
    seoDescription: 'Kornelia — 20–30 lat, natywna lektorka języka bułgarskiego. IVR, reklama, narracja. Próbka + wycena. powitania.pl od 2001 roku.'
  },
  'mona': {
    seoTitle: 'Mona — natywna lektorka, język arabski | powitania.pl',
    seoDescription: 'Mona — 30–50 lat, natywna lektorka języka arabskiego. IVR, reklama, narracja, audiobook. Próbka + wycena. powitania.pl od 2001 roku.'
  },
  'wael': {
    seoTitle: 'Wael — natywny lektor, język arabski | powitania.pl',
    seoDescription: 'Wael — 30–50 lat, natywny lektor języka arabskiego. IVR, reklama, narracja. Próbka + wycena. powitania.pl od 2001 roku.'
  },
  'luis': {
    seoTitle: 'Luis — dojrzały głos, natywny lektor ES | powitania.pl',
    seoDescription: 'Luis — 50+ lat, dojrzały natywny głos hiszpańskojęzyczny. IVR, reklama, narracja, audiobook. Próbka + wycena. powitania.pl od 2001 roku.'
  },
  'linda': {
    seoTitle: 'Linda — elegancki precyzyjny głos, EN i DE | powitania.pl',
    seoDescription: 'Linda — 30–50 lat, elegancki i precyzyjny głos natywnej lektorki angielskiej i niemieckiej. IVR, reklama, narracja. Próbka + wycena. powitania.pl od 2001 roku.'
  },
  'mirek': {
    seoTitle: 'Mirek — profesjonalny lektor | powitania.pl',
    seoDescription: 'Mirek — 30–50 lat, profesjonalny lektor do wszechstronnych zastosowań. IVR, reklama, narracja, audiobook. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'nanna': {
    seoTitle: 'Nanna — natywna lektorka, język islandzki | powitania.pl',
    seoDescription: 'Nanna — 20–30 lat, natywna lektorka języka islandzkiego. IVR, reklama, narracja. Próbka + wycena. powitania.pl od 2001 roku.'
  },
  'liv': {
    seoTitle: 'Liv — natywna lektorka, język norweski | powitania.pl',
    seoDescription: 'Liv — 20–30 lat, natywna lektorka języka norweskiego. IVR, reklama, narracja. Próbka + wycena. powitania.pl od 2001 roku.'
  },
  'anna': {
    seoTitle: 'Anna — natywna lektorka, język fiński | powitania.pl',
    seoDescription: 'Anna — 20–30 lat, natywna lektorka języka fińskiego. IVR, reklama, narracja. Próbka + wycena. powitania.pl od 2001 roku.'
  },
  'smari': {
    seoTitle: 'Smari — natywny lektor, IS i EN | powitania.pl',
    seoDescription: 'Smari — 20–30 lat, natywny lektor nagrywający w języku islandzkim i angielskim. IVR, reklama, audiobook. Próbka + wycena. powitania.pl od 2001 roku.'
  },
  'gianmarco': {
    seoTitle: 'Gianmarco — natywny lektor, język włoski | powitania.pl',
    seoDescription: 'Gianmarco — 20–30 lat, natywny lektor języka włoskiego. IVR, reklama, narracja, audiobook. Próbka + wycena. powitania.pl od 2001 roku.'
  },
  'dorota': {
    seoTitle: 'Dorota — aktorka teatralna i TV, lektorka | powitania.pl',
    seoDescription: 'Dorota — 30–50 lat, głos aktorki teatralnej i telewizyjnej, znakomity do audiobooków i narracji. IVR, narracja, audiobook. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'anne': {
    seoTitle: 'Anne — natywna lektorka EN i DE | powitania.pl',
    seoDescription: 'Anne — 30–50 lat, natywna lektorka nagrywająca w języku angielskim i niemieckim. IVR, reklama, audiobook. Próbka + wycena. powitania.pl od 2001 roku.'
  },
  'jenna': {
    seoTitle: 'Jenna — natywna lektorka, język angielski | powitania.pl',
    seoDescription: 'Jenna — 30–50 lat, natywna lektorka języka angielskiego. IVR, reklama, narracja, audiobook. Próbka + wycena. powitania.pl od 2001 roku.'
  },
  'roy-2': {
    seoTitle: 'Roy 2 — dojrzały natywny głos angielski | powitania.pl',
    seoDescription: 'Roy 2 — 50+ lat, dojrzały natywny głos anglojęzyczny. IVR, reklama, narracja, audiobook. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'jakub': {
    seoTitle: 'Jakub — lektor i aktor, karta mikrofonowa PR | powitania.pl',
    seoDescription: 'Jakub — 30–50 lat, głos aktora z kartą mikrofonową Polskiego Radia. IVR, reklama, narracja, audiobook. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'bozena': {
    seoTitle: 'Bożena — profesjonalna lektorka | powitania.pl',
    seoDescription: 'Bożena — 30–50 lat, profesjonalna lektorka do różnych zastosowań. IVR, reklama, narracja. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'zuzana': {
    seoTitle: 'Zuzana — natywna lektorka, język słowacki | powitania.pl',
    seoDescription: 'Zuzana — 20–30 lat, natywna lektorka języka słowackiego. IVR, reklama, narracja. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'zeno': {
    seoTitle: 'Zeno — natywny lektor, język holenderski | powitania.pl',
    seoDescription: 'Zeno — 30–50 lat, natywny lektor języka holenderskiego. IVR, reklama, narracja. Próbka + wycena. powitania.pl od 2001 roku.'
  },
  'roger': {
    seoTitle: 'Roger — natywny lektor, język norweski | powitania.pl',
    seoDescription: 'Roger — 30–50 lat, natywny lektor języka norweskiego. IVR, reklama, narracja. Próbka + wycena. powitania.pl od 2001 roku.'
  },
  'kristien': {
    seoTitle: 'Kristien — natywna lektorka NL i flamandzki | powitania.pl',
    seoDescription: 'Kristien — 20–30 lat, natywna lektorka nagrywająca w języku holenderskim i flamandzkim. IVR, reklama, narracja. Próbka + wycena. powitania.pl od 2001 roku.'
  },
  'pierre': {
    seoTitle: 'Pierre — ciepła głęboka barwa, lektor FR | powitania.pl',
    seoDescription: 'Pierre — 30–50 lat, ciepła i głęboka barwa natywnego lektora języka francuskiego. IVR, reklama, narracja. Próbka + wycena. powitania.pl od 2001 roku.'
  },
  'vladimir': {
    seoTitle: 'Vladimir — niski miękki głos, lektor SR | powitania.pl',
    seoDescription: 'Vladimir — 30–50 lat, niski i miękki głos natywnego lektora serbskiego. IVR, reklama, narracja. Próbka + wycena. powitania.pl od 2001 roku.'
  },
  'lara': {
    seoTitle: 'Lara — świeży głos, natywna lektorka IT | powitania.pl',
    seoDescription: 'Lara — 20–30 lat, młody i świeży kobiecy głos natywnej lektorki włoskiej. IVR, reklama, narracja. Próbka + wycena. powitania.pl od 2001 roku.'
  },
  'pascale': {
    seoTitle: 'Pascale — delikatna barwa, lektor FR | powitania.pl',
    seoDescription: 'Pascale — 30–50 lat, przyjemna i delikatna barwa natywnej lektorki języka francuskiego. IVR, reklama, narracja. Próbka + wycena. powitania.pl od 2001 roku.'
  },
  'masha': {
    seoTitle: 'Masha — natywna lektorka RU i UA | powitania.pl',
    seoDescription: 'Masha — 30–50 lat, natywna lektorka nagrywająca w języku rosyjskim i ukraińskim. IVR, reklama, narracja. Próbka + wycena. powitania.pl od 2001 roku.'
  },
  'grete': {
    seoTitle: 'Grete — zmysłowy wyrazisty głos, EN i DA | powitania.pl',
    seoDescription: 'Grete — 30–50 lat, dojrzały, zmysłowy i wyrazisty głos natywnej lektorki angielskiej i duńskiej. IVR, reklama, narracja. Próbka + wycena. powitania.pl od 2001 roku.'
  },
  'natalia-2': {
    seoTitle: 'Natalia — argentyńska lektorka ES i EN | powitania.pl',
    seoDescription: 'Natalia — 20–30 lat, argentyńska lektorka z 13-letnim stażem, język hiszpański (AR i ES) i angielski. Reklama, narracja. Próbka + wycena. powitania.pl od 2001 roku.'
  },
  'andrew': {
    seoTitle: 'Andrew — natywny lektor RU i UA | powitania.pl',
    seoDescription: 'Andrew — 30–50 lat, natywny lektor nagrywający w języku rosyjskim i ukraińskim. IVR, reklama, narracja. Próbka + wycena. powitania.pl od 2001 roku.'
  },
  'bill': {
    seoTitle: 'Bill — kultowy głos USA, trailery filmowe | powitania.pl',
    seoDescription: 'Bill — 50+ lat, jeden z najbardziej rozpoznawalnych głosów USA, znany z trailerów filmowych. IVR, reklama, narracja. Próbka + wycena w 72h. powitania.pl od 2001 roku.'
  },
  'david-2': {
    seoTitle: 'David 2 — lektor EN, ES, DE, PT — spec. port. | powitania.pl',
    seoDescription: 'David 2 — 30–50 lat, lektor wielojęzyczny, specjalność: język portugalski iberyjski i brazylijski. IVR, reklama, narracja. Próbka + wycena. powitania.pl od 2001 roku.'
  },
  'judit': {
    seoTitle: 'Judit — natywna lektorka, język węgierski | powitania.pl',
    seoDescription: 'Judit — 20–30 lat, natywna lektorka języka węgierskiego. IVR, reklama, narracja. Próbka + wycena. powitania.pl od 2001 roku.'
  },
  'zoltan': {
    seoTitle: 'Zoltan — młody głos, natywny lektor WE | powitania.pl',
    seoDescription: 'Zoltan — 20–30 lat, świeże i młode brzmienie natywnego lektora języka węgierskiego. IVR, narracja. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'josh': {
    seoTitle: 'Josh — żywy pełny głos, natywny lektor EN | powitania.pl',
    seoDescription: 'Josh — 30–50 lat, żywy i pełny głos w średnich rejestrach, natywny lektor angielski. IVR, reklama, narracja. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'alison': {
    seoTitle: 'Alison — klasyczne brzmienie angielskie | powitania.pl',
    seoDescription: 'Alison — 30–50 lat, czyste i klasyczne angielskie brzmienie, natywna lektorka. IVR, reklama, narracja. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'sandra': {
    seoTitle: 'Sandra — pełna i zmysłowa barwa, natywna DE | powitania.pl',
    seoDescription: 'Sandra — 30–50 lat, pełna, ciepła i zmysłowa barwa natywnej lektorki języka niemieckiego. IVR, reklama, narracja. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'ilja': {
    seoTitle: 'Ilja — głos do reportażu, natywny lektor RU | powitania.pl',
    seoDescription: 'Ilja — 50+ lat, dojrzały głos natywnego lektora rosyjskiego, idealny do reportażu i felietonów. IVR, reklama, narracja. Próbka + wycena. powitania.pl od 2001 roku.'
  },
  'jeroen': {
    seoTitle: 'Jeroen — natywny lektor NL i EN | powitania.pl',
    seoDescription: 'Jeroen — 30–50 lat, natywny lektor nagrywający w języku holenderskim i angielskim. IVR, reklama, narracja. Próbka + wycena. powitania.pl od 2001 roku.'
  },
  'edward': {
    seoTitle: 'Edward — natywny lektor, angielski i polski | powitania.pl',
    seoDescription: 'Edward — 30–50 lat, natywny lektor nagrywający w języku angielskim i polskim. IVR, reklama, narracja. Próbka + wycena. powitania.pl od 2001 roku.'
  },
  'ola': {
    seoTitle: 'Ola — doświadczony natywny lektor szwedzki | powitania.pl',
    seoDescription: 'Ola — 30–50 lat, doświadczony natywny lektor języka szwedzkiego. IVR, reklama, narracja. Próbka + wycena. powitania.pl od 2001 roku.'
  },
  'kim': {
    seoTitle: 'Kim — miła barwa, natywna lektorka SV i EN | powitania.pl',
    seoDescription: 'Kim — 30–50 lat, miły i przyjemny kobiecy głos natywnej lektorki szwedzkiej i angielskiej. IVR, reklama, narracja. Próbka + wycena. powitania.pl od 2001 roku.'
  },
  'david': {
    seoTitle: 'David — pełny czysty głos, natywny lektor EN | powitania.pl',
    seoDescription: 'David — 30–50 lat, pełny i czysty amerykański głos natywnego lektora angielskiego. IVR, reklama, narracja. Próbka + wycena. powitania.pl od 2001 roku.'
  },
  'helena': {
    seoTitle: 'Helena — młody kobiecy głos, natywna CS | powitania.pl',
    seoDescription: 'Helena — 30–50 lat, młody kobiecy głos natywnej lektorki czeskiej, wszechstronne zastosowania. IVR, reklama, narracja. Próbka + wycena. powitania.pl od 2001 roku.'
  },
  'alicja': {
    seoTitle: 'Alicja — wszechstronny głos, lektorka | powitania.pl',
    seoDescription: 'Alicja — 30–50 lat, wszechstronny kobiecy głos pasujący do różnych rodzajów nagrań. IVR, reklama, narracja. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'ela': {
    seoTitle: 'Ela — barwny głos, aktorka i lektorka | powitania.pl',
    seoDescription: 'Ela — 30–50 lat, barwny kobiecy głos aktora i lektora. IVR, reklama, narracja. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'agnieszka': {
    seoTitle: 'Agnieszka — dojrzały głos, reportaż i bajki | powitania.pl',
    seoDescription: 'Agnieszka — 50+ lat, dojrzały i głęboki głos, idealny do reportażu, publicystyki i bajek. IVR, reklama, narracja. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'iza': {
    seoTitle: 'Iza — precyzyjna lektorka PL i DE | powitania.pl',
    seoDescription: 'Iza — 30–50 lat, precyzyjna lektorka specjalizująca się w nagraniach polskich i niemieckich. IVR, reklama, narracja. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'ola-2': {
    seoTitle: 'Ola 2 — lektorka PL i EN, trójjęzyczna | powitania.pl',
    seoDescription: 'Ola 2 — 30–50 lat, wszechstronna lektorka i aktorka posługująca się trzema językami. IVR, reklama, narracja. Próbka + wycena. powitania.pl od 2001 roku.'
  },
  'luigi': {
    seoTitle: 'Luigi — melodyjny radosny głos, natywny IT | powitania.pl',
    seoDescription: 'Luigi — 20–30 lat, melodyjny i radosny głos w wysokich rejestrach, natywny lektor włoski. IVR, reklama, narracja. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'jessica': {
    seoTitle: 'Jessica — wyrazista barwa, natywna EN, FR, DE | powitania.pl',
    seoDescription: 'Jessica — 30–50 lat, wyrazista i pełna barwa głosu, nagrania w języku angielskim, francuskim i niemieckim. IVR, reklama, narracja. Próbka + wycena. powitania.pl od 2001 roku.'
  },
  'mateusz': {
    seoTitle: 'Mateusz — głos TV Orange Sport, lektor | powitania.pl',
    seoDescription: 'Mateusz — 30–50 lat, sprawdzony głos lektora promosów i reportaży, znany z Orange Sport TV. IVR, reklama, narracja. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'minna': {
    seoTitle: 'Minna — natywna lektorka, język estoński | powitania.pl',
    seoDescription: 'Minna — 20–30 lat, natywna lektorka języka estońskiego. IVR, narracja, audiobook. Próbka + wycena. powitania.pl od 2001 roku.'
  },
  'krzysztof': {
    seoTitle: 'Krzysztof — lektor PL i EN, filolog angielski | powitania.pl',
    seoDescription: 'Krzysztof — 30–50 lat, lektor z dyplomem filologii angielskiej, nagrania w języku polskim i angielskim. IVR, reklama, narracja. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'jakub-2': {
    seoTitle: 'Jakub 2 — neutralna barwa, natywny lektor CS | powitania.pl',
    seoDescription: 'Jakub 2 — 30–50 lat, natywny czeski głos o neutralnej, profesjonalnej barwie. IVR, reklama, narracja, audiobook. Próbka + wycena. powitania.pl od 2001 roku.'
  },
  'hoki': {
    seoTitle: 'Hoki — natywny lektor, język koreański | powitania.pl',
    seoDescription: 'Hoki — 30–50 lat, natywny lektor języka koreańskiego. IVR, reklama, narracja. Próbka + wycena. powitania.pl od 2001 roku.'
  },
  'june': {
    seoTitle: 'June — natywna lektorka, język koreański | powitania.pl',
    seoDescription: 'June — 30–50 lat, natywna lektorka języka koreańskiego. IVR, reklama, narracja. Próbka + wycena. powitania.pl od 2001 roku.'
  },
  'kritsada': {
    seoTitle: 'Kritsada — natywny lektor tajski, BBC Thai | powitania.pl',
    seoDescription: 'Kritsada — 30–50 lat, doświadczony natywny lektor tajski, były prezenter BBC World Service Thai. IVR, reklama, narracja. Próbka + wycena. powitania.pl od 2001 roku.'
  },
  'peerapon': {
    seoTitle: 'Peerapon — natywny lektor, język tajski | powitania.pl',
    seoDescription: 'Peerapon — 30–50 lat, natywny lektor języka tajskiego. IVR, reklama, narracja. Próbka + wycena. powitania.pl od 2001 roku.'
  },
  'marek': {
    seoTitle: 'Marek — dojrzały głos, lektor, aktor i muzyk | powitania.pl',
    seoDescription: 'Marek — 50+ lat, doświadczony głos lektora, aktora i muzyka. IVR, reklama, narracja. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'piotr': {
    seoTitle: 'Piotr — ekspresowe czytanie, lektor PL i EN | powitania.pl',
    seoDescription: 'Piotr — 30–50 lat, ekspresowe i czytelne czytanie, nagrania w języku polskim i angielskim. IVR, reklama, narracja. Próbka + wycena w 48h. powitania.pl od 2001 roku.'
  },
  'test-lektor': {
    seoTitle: 'Test Lektor (DO USUNIĘCIA) — lektor | powitania.pl',
    seoDescription: 'Test Lektor — 30–50 lat, lektor testowy do testowania płatności. Reklama. Próbka + wycena w 24h. powitania.pl od 2001 roku.'
  }
};

let updated = 0;
const result = voices.map(v => {
  if (!v.seoDescription && seoData[v.id]) {
    updated++;
    return { ...v, seoTitle: seoData[v.id].seoTitle, seoDescription: seoData[v.id].seoDescription };
  }
  return v;
});

fs.writeFileSync(filePath, JSON.stringify(result, null, 2));
console.log('Zaktualizowano:', updated, 'lektorów');
console.log('Z seoDescription łącznie:', result.filter(x => x.seoDescription).length);

// Sprawdź brakujące
const missing = result.filter(x => !x.seoDescription);
if (missing.length > 0) {
  console.log('BRAKUJE:', missing.map(x => x.id).join(', '));
}
