# Dubrovnik · Quiz i 15 frågor

En klickbar version av PDF-quizet *Dubrovnik — 15 frågor*, byggd som en
presentation: en fråga per sida, svaret dolt tills du väljer att visa det.

## Kör

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # produktionsbygge till dist/
```

## Så fungerar det

- **18 sidor:** omslag → fråga 01–15 → bonusfråga → facit.
- **Presentationsläge:** frågan och de tre alternativen visas, inget fylls i.
  Kör igenom alla frågor först, gå sedan tillbaka och avslöja svaren.
- **Två knappar per sida:** *Visa svar* markerar rätt alternativ och fäller ut
  förklaringen. *Nästa fråga* går vidare utan att avslöja något.
- **Navigering:** klickytorna längs vänster- och högerkanten, eller
  piltangenterna ← / →.
- **Fullskärm:** `F`. Esc lämnar. Genvägen står också nere till vänster, synlig
  när muspekaren rör sig över sidan.
- **Facitsidan** listar alla rätta svar och PDF:ens poängskala — ett poäng per
  fråga, två för bonusen.
- **Länkbart läge:** varje sida har en egen adress (`#/q/7`, `#/bonus`,
  `#/facit`). Vilka svar som är avslöjade lever i minnet och nollställs vid
  omladdning.

## Värdnyckeln

Presentatören öppnar däcket med nyckeln i adressen (`?host=…`). Appen loggar in
anonymt och skriver sin uid till `control/host`; säkerhetsreglerna släpper
igenom den skrivningen bara om nyckeln stämmer mot `control/secret`, en post
ingen klient får läsa. Nyckeln finns aldrig i paketet — den lever i adressfältet
och i `.host-key` lokalt, som git ignorerar.

`control/secret` är stängd i reglerna: `allow create: if false`. Det går alltså
inte att plantera eller byta nyckel från appen, och
`scripts/bootstrap-secret.mjs` misslyckas om det körs rakt av. Att sätta en ny
nyckel görs för hand, i den här ordningen:

1. Firebase Console → Firestore: ta bort `control/secret` om den finns. Ta bort
   `control/host` samtidigt — en nyckelrotation kastar annars inte ut den som
   redan sitter på värdplatsen, eftersom reglerna bara jämför uid:t där.
2. Öppna dörren tillfälligt i `firestore.rules`:
   `match /control/secret { allow create: if true; }` och deploya:
   `npx firebase-tools deploy --only firestore:rules`.
3. `node scripts/bootstrap-secret.mjs` — skriver nyckeln och skriver ut den en
   gång. Spara den direkt; den går inte att läsa tillbaka.
4. Ställ tillbaka regeln till `allow create: if false;` och deploya igen.

Steg 2–4 ska ske i en följd. Så länge dörren står öppen kan vem som helst med
projekt-id:t hinna före och skriva sin egen nyckel.

## Struktur

```
src/
  data/quiz.ts          Frågor, alternativ, facit, bonus och poängskala
  hooks/useSlideNav.ts  Sidposition, hash-adress och piltangenter
  hooks/useFullscreen.ts  Fullskärm på F, med prefixade Safari-anrop
  components/Deck.tsx   Ramen: kantnavigering, progresslinje, sidräknare
  slides/               Cover, QuestionLayout, QuestionSlide, BonusSlide, ResultSlide
  index.css             Hela formgivningen
public/img/             De tre fotona ur PDF:en
```

## Formgivning

Hämtad ur PDF:en: Satoshi som brödtext och rubrik, Roboto Mono för de spärrade
versalerna, vitt papper, hårfina linjer och ljusgrå svarsrutor. Fonterna laddas
från Fontshare respektive Google Fonts.

Fotot bredvid frågan zoomar långsamt ut och driver samtidigt i sidled
(`scale(1.28)` → `scale(1.09)`, 7 % → −3 % horisontellt, 30 s) — bilderna är
landskap i en hög ruta, så den vågräta resan är den längre. Panoreringen håller
sig innanför det överskott skalningen ger, så ingen kant blottas. Fotot byts bara
när quizet går in i en ny del. Animeringen bor i
`QuestionLayout`, ett steg ovanför innehållet, så den löper vidare obruten från
fråga till fråga och hela vägen in i bonusfrågan — bara texten animeras om.
