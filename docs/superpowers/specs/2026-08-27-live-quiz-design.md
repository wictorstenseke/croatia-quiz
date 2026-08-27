# Live-quiz med publik — design

2026-08-27

## Vad som ska byggas

Dubrovnik-quizet körs idag som en ensam presentation. Den här designen lägger
till en publik: presentatören styr vilken fråga som visas, åhörarna svarar i
sina telefoner, och när alla frågor är genomgångna visas en topplista.

Presentatören behåller sitt nuvarande däck. Publiken får en egen, mobilanpassad
vy som speglar den fråga presentatören står på.

## Roller och adresser

| Roll | Adress | Ser |
| --- | --- | --- |
| Presentatör | `…/croatia-quiz/?host=NYCKEL` | Dagens däck. Varje sidbyte publiceras till sessionen. |
| Publik | `…/croatia-quiz/#/spela` | Namnruta, sedan den fråga presentatören står på. |

Sessionen är global — en omgång i taget, ingen rumskod. Publikens adress är
därför konstant och visas som QR-kod på omslagssidan, men bara i värdläge.

Värdnyckeln lever bara i presentatörens adressfält. Den byggs aldrig in i
paketet och skrivs aldrig till en post som en klient kan läsa.

## Arkitektur

Firestore som datalager, anonym inloggning för alla, inga Cloud Functions.
Hostingen står kvar på GitHub Pages; Firebase är enbart data.

**Varför Firestore och inte Realtime Database:** `onSnapshot` landar på
100–300 ms, vilket räcker när det är en människa som klickar fram frågorna.
Avgörandet är i stället regelspråket — designen nedan vilar på `diff()`,
`affectedKeys()` och `get()` mot en post klienten inte får läsa. Realtime
Databases regler klarar inte det lika rent.

**Varför inga Cloud Functions:** de kräver Blaze-planen och ett betalkort.
Hela integriteten går att lägga i säkerhetsreglerna i stället, och då räcker
gratisplanen Spark. En omgång med femtio spelare landar på några tusen
läsningar och under tusen skrivningar — fri kvot är 50 000 respektive 20 000
per dygn.

**Var poängen räknas:** ingenstans lagrad. Facit ligger redan i paketet, så
varje klient räknar samma topplista ur `players`. Ingen kan skriva sin egen
poäng, och alla ser identisk ordning eftersom uträkningen är deterministisk.

## Datamodell

```
session/live     { phase, questionId, revealed, updatedAt }
players/{uid}    { name, answers, joinedAt }
control/host     { uid, key }      ← ingen klient kan läsa
control/secret   { key }           ← ingen klient kan läsa
```

`session/live` är sessionens enda sanning:

| Fält | Värden |
| --- | --- |
| `phase` | `"lobby"` \| `"question"` \| `"leaderboard"` |
| `questionId` | `"01"`–`"15"`, `"bonus"`, eller `null` utanför frågefasen |
| `revealed` | `true` när presentatören tryckt *Visa svar* |
| `updatedAt` | serverns tidsstämpel |

`players/{uid}.answers` är en map från `questionId` till svar: `"A"`, `"B"`
eller `"C"` för frågorna, och den skrivna texten för `"bonus"`.

Däckets sidor mappar mot sessionen så här:

| Sida | `phase` | `questionId` |
| --- | --- | --- |
| Omslag | `lobby` | `null` |
| Fråga 1–15 | `question` | `"01"`–`"15"` |
| Bonusfrågan | `question` | `"bonus"` |
| Facit | `leaderboard` | `null` |

Bonusfrågan är alltså inget specialfall i vare sig datamodell eller regler —
bara ett `questionId` till. Specialbehandlingen sitter enbart i poängräkningen.

## Säkerhetsreglerna

Två saker ska hållas isär: bara presentatören får byta fråga, och en åhörare
får bara röra svaret på den fråga som står öppen.

### Hur värdnyckeln hävdas

Regler kan inte läsa ett adressfält. Knuten löses med att regelmotorns `get()`
inte lyder under läsreglerna: nyckeln kan alltså ligga i en post som ingen
klient får läsa, men som reglerna jämför mot.

Presentatören öppnar däcket med nyckeln i adressen, appen loggar in anonymt och
skriver sin uid till `control/host` tillsammans med nyckeln. Reglerna släpper
igenom skrivningen bara om nyckeln stämmer mot `control/secret`. Först därefter
accepteras sidbyten. Byter presentatören enhet hävdar hen bara om med samma
nyckel.

### Fullständiga regler

```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    function live() {
      return get(/databases/$(database)/documents/session/live).data;
    }

    function hostKey() {
      return get(/databases/$(database)/documents/control/secret).data.key;
    }

    function isHost() {
      return request.auth != null
        && exists(/databases/$(database)/documents/control/host)
        && request.auth.uid ==
             get(/databases/$(database)/documents/control/host).data.uid;
    }

    function validName(name) {
      return name is string && name.size() >= 1 && name.size() <= 40;
    }

    function changedFields() {
      return request.resource.data.diff(resource.data).affectedKeys();
    }

    function isNameEdit() {
      return changedFields().hasOnly(['name'])
        && validName(request.resource.data.name);
    }

    function isAnswerForOpenQuestion() {
      return live().phase == 'question'
        && live().revealed == false
        && changedFields().hasOnly(['answers'])
        && request.resource.data.answers
             .diff(resource.data.answers).affectedKeys()
             .hasOnly([live().questionId])
        && live().questionId in request.resource.data.answers
        && request.resource.data.answers[live().questionId] is string
        && request.resource.data.answers[live().questionId].size() <= 60;
    }

    // Inget under /control är läsbart eller skrivbart för en klient…
    match /control/{doc} {
      allow read, write: if false;
    }

    // …utom en engångsskrivning av hemligheten, som stänger sig själv.
    match /control/secret {
      allow create: if !exists(/databases/$(database)/documents/control/secret);
    }

    // …och att ta värdplatsen, vilket kräver nyckeln.
    match /control/host {
      allow create, update: if request.auth != null
        && request.resource.data.keys().hasOnly(['uid', 'key'])
        && request.resource.data.uid == request.auth.uid
        && request.resource.data.key == hostKey();
    }

    match /session/live {
      allow read: if true;
      allow write: if isHost();
    }

    match /players/{uid} {
      allow read: if true;

      allow create: if request.auth != null
        && request.auth.uid == uid
        && request.resource.data.keys().hasOnly(['name', 'answers', 'joinedAt'])
        && validName(request.resource.data.name)
        && request.resource.data.answers.keys().size() == 0
        && request.resource.data.joinedAt == request.time;

      allow update: if request.auth != null
        && request.auth.uid == uid
        && (isNameEdit() || isAnswerForOpenQuestion());

      allow delete: if isHost();
    }
  }
}
```

### Vad reglerna ger

- Ett svar kan ändras hur många gånger som helst så länge frågan står öppen.
  `hasOnly([live().questionId])` gör att bara den nyckel som är öppen just nu
  får röras — en tidigare fråga går aldrig att gå tillbaka till.
- `live().revealed == false` stänger fönstret i samma ögonblick som
  presentatören trycker *Visa svar*.
- Namnet får ändras när som helst, men aldrig i samma skrivning som ett svar.
  Det gör de två fallen möjliga att läsa var för sig.
- Spelarposten skapas oberoende av sessionens fas, så namnrutan fungerar även
  mitt under en pågående fråga.
- Bara värden får rensa spelare inför nästa omgång.

Villkoret `live().phase == 'question'` står först med flit. Utanför frågefasen
är `questionId` `null`, och `&&` kortsluter innan någon regel försöker slå upp
en nyckel som inte finns. Av samma skäl står `in`-kontrollen före indexeringen:
raderas ett svar hamnar nyckeln i `affectedKeys()` men saknas i den nya datan,
och uppslaget hade blivit ett utvärderingsfel i stället för ett rent avslag.

Facit ligger i paketet och går att läsa i devtools. Det som skyddas är att ett
svar måste vara skrivet innan avslöjandet — för ett sällskapsquiz är det den
gräns som betyder något.

`players` är läsbar för alla, vilket är vad som gör att varje telefon kan räkna
topplistan själv. Namn och svar är alltså inte privata mellan deltagarna. Det
är avsiktligt, men värt att veta innan någon skriver in sitt fullständiga namn.

### Bootstrap av hemligheten

`control/secret` skrivs en enda gång, av det första anropet som hittar posten
tom, och blir därefter omöjlig att skriva om eller läsa. Fönstret är sekunderna
mellan att reglerna deployas och att posten skrivs; skrivningen görs direkt
efter deploy. Behöver nyckeln bytas raderas posten i konsolen först.

## Poängräkning

`src/lib/scoring.ts`, rena funktioner utan beroenden till Firebase eller React.

**Normalisering.** NFD, kombinerande tecken bort, gemener, allt utom `a–z`
bort. `"Živjeli!"` blir `"zivjeli"`.

**Frågorna.** Ett poäng per fråga där spelarens val är lika med facit. Femton
möjliga.

**Bonusfrågan.** Redigeringsavstånd mot `"zivjeli"`, sju bokstäver:

```
d       = levenshtein(normalise(gissning), "zivjeli")
rätta   = max(0, 7 − d)

rätta == 7   → 2 poäng
rätta >= 4   → 1 poäng
annars       → 0
```

Tröskeln är hälften uppåt avrundat: 3,5 av 7 blir 4. Redigeringsavstånd i
stället för positionsjämförelse gör att en insprängd bokstav inte förskjuter
allt efter sig — `"zivjelli"` ger 6 av 7, inte 3.

Maxpoäng blir 17, samma skala som PDF:ens facit redan använder.

**Topplistan.** Sorteras på poäng fallande, därefter på namn med svensk
kollation. Lika poäng skiljs alltså inte på tid.

## Komponenter

```
src/lib/firebase.ts          init, anonym inloggning
src/lib/scoring.ts           levenshtein, bonuspoäng, topplista   ← ren, enhetstestad
src/lib/session.ts           läs och skriv session/live
src/hooks/useLiveSession.ts  speglar sessionen, publicerar i värdläge
src/hooks/usePlayer.ts       uid, namn, egna svar, spegel i localStorage
src/audience/JoinScreen.tsx  namnrutan
src/audience/PlayScreen.tsx  lobby, fråga, facit, topplista
src/slides/Leaderboard.tsx   topplistan på duken
firestore.rules              reglerna ovan
```

Nollställningsknappen i värdläget raderar alla `players` och skriver tillbaka
sessionen till `lobby`. Den ligger bakom en bekräftelse, eftersom den kastar
en hel omgångs svar.

Däcket ändras minimalt. `useSlideNav` får en sidoeffekt som publicerar
`{ phase, questionId, revealed }` när värdnyckeln finns i adressen, och
omslaget får en QR-kod i värdläge, ritad som inline-SVG med paketet `qrcode`.
Resten av presentationsvyn är oförändrad.

Publikvyn följer `phase`:

| `phase` | Publiken ser |
| --- | --- |
| `lobby` | "Väntar på första frågan…" och antalet anslutna |
| `question`, `revealed: false` | Frågan, tre tappbara alternativ, valt alternativ markerat |
| `question`, `revealed: true` | Låst, rätt alternativ grönt, förklaringen under |
| `leaderboard` | Topplistan med egen placering markerad |

Namnet är en grind: utan namn visas ingenting av frågorna.

## localStorage

Anonym uid och namn sparas lokalt, tillsammans med en spegel av egna svar. En
omladdning eller en tappad flik återfår samma spelare med sina svar kvar.
Firestore är sanningen; localStorage gör återkomsten omedelbar och överlever
ett tapp i nätet.

## Tester

**Poängräkningen** enhetstestas med Vitest: normalisering av diakritik och
skiljetecken, redigeringsavstånd, de tre bonuströsklarna, och topplistans
ordning inklusive lika poäng.

**Reglerna** testas mot Firebase-emulatorn med `@firebase/rules-unit-testing`.
Det är där felen gömmer sig, inte i gränssnittet. Fallen som måste täckas:

- en åhörare kan inte skriva till `session/live`
- fel nyckel kan inte ta värdplatsen; rätt nyckel kan, och den uid:n kan sedan
  byta fråga
- en spelare kan svara på den öppna frågan och ändra sig hur många gånger som
  helst
- en spelare kan inte svara efter avslöjandet
- en spelare kan inte röra en tidigare frågas svar
- en spelare kan inte skriva i någon annans post
- namnbyte går när som helst, men namn och svar i samma skrivning avvisas
- `control/secret` går inte att läsa, och inte att skriva om när den finns

## Driftsättning

`firebase.json` med regel- och emulatorkonfiguration, `.firebaserc` med
projektet. Reglerna deployas för hand från maskinen med `npx firebase-tools
deploy --only firestore:rules` — CI:n rör dem inte, eftersom det skulle kräva
en tjänstekontonyckel i repot för ingen egentlig vinst.

Sidan deployas som idag via GitHub Actions vid push till `main`.

Firebase-konfigurationen checkas in. Den är publik av design; skyddet ligger i
reglerna. Värdnyckeln checkas aldrig in.

**Manuellt steg:** slå på Anonymous under Authentication → Sign-in method i
Firebase Console. Det går inte att göra från CLI:n.

## Gränser

- Den som ansluter vid fråga 7 har noll på 1–6. Ingen ifyllnad i efterhand.
- En global session: två grupper kan inte köra samtidigt, och värden nollställer
  mellan tillfällen med en knapp i värdläget.
- Tappar värden både flik och webbläsardata hävdas värdplatsen om med nyckeln.
- Lika poäng skiljs på namn, inte på svarstid.

## Utanför omfattningen

Rumskoder, tidsgränser per fråga, svarstid som skiljedomare, serverberäknad
poäng och administrationsgränssnitt utöver nollställningsknappen. Inget av det
behövs för att köra quizet, och varje del kan läggas till senare utan att röra
det som byggs nu.
