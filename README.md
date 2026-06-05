# Björn Rhythm Tap

Ett lokalt, webbaserat rytmspelsdemo baserat på Björn-temat, låten `Björn Tune` och grafiken i `graph.png`. Spelet är fortfarande en egen liten prototyp: horisontella noter, tydlig träffzon och snabba tangenter.

## Starta projektet

Öppna filen `index.html` direkt i en webbläsare.

Ingen installation, byggkedja eller server krävs. Spelet använder vanlig HTML, CSS, JavaScript, Web Audio API för slagljud och WAV-filen i `songs/` för musiken.

## Filer

- `index.html` - sidstruktur, låtval, svårighet, HUD, spelcanvas och resultatpanel.
- `style.css` - Björn-inspirerad layout, färger, knappar, paneler och mobil/ipad-anpassning.
- `script.js` - låtval, fullängds-beatmaps, spel-loop, input, scoring, WAV-uppspelning, fallback-metronom och canvas-ritning.
- `graph.png` - asset sheet som används som källa för spelets grafik.
- `sprites/` - transparenta PNG-utklipp från `graph.png` för logo, Björn, noter och ikoner.
- `songs/bjorn-tune.wav` - spelas i spelet som `Björn Tune`.
- `README.md` - den här filen.

## Tangenter

- `F` - röd not / mitt-träff.
- `J` - turkos not / kant-träff.
- `Space` - startar låten när spelet inte körs.

Det finns också två stora touchknappar under spelbanan:

- Röd knapp - mittslag.
- Turkos knapp - kantslag.

På mobil och iPad ligger knapparna större och nära nederkanten för att vara lättare att spela på.
På touch-enheter är spelet anpassat för liggande läge. I stående läge visas en uppmaning att vända skärmen.

## Vad som är färdigt

- Startknapp och enkel huvudvy.
- Låtval med `Björn Tune`.
- Tre svårighetsnivåer: Easy, Normal och Hard.
- Beatmap-mönster som repeteras genom hela vald låt och svårighet.
- Timing som följer ljudfilens faktiska uppspelningsposition när musik spelas.
- Horisontellt scrollande noter mot en träffzon.
- Separata röda och turkosa noter.
- Timing-feedback: `Perfect`, `Good` och `Miss`.
- Score, combo, max combo och missräkning.
- Resultatruta efter låten.
- Touchkontroller för telefon och iPad.
- Liggande mobil/ipad-layout med stor spelbana och F/J-knappar på varsin sida av skärmen.
- WAV-uppspelning för vald låt.
- Metronomfallback och enkla slagljud via Web Audio API.
- Ny Björn-baserad färgpalett, bakgrund, HUD, progressbar och sprite-baserad canvasgrafik från `graph.png`.
- Logotyp och spelgrafik används som rena sprites, inte som synlig asset sheet-referens.

## Kan utvecklas senare

- Göra exakt beatmap-synk för hela låtens struktur.
- Läsa beatmaps från JSON-filer.
- Sprite-cropping från `graph.png` för fler animerade Björn-varianter.
- Fever-mätare, hållnoter och större noter.
- Lokal high score.
- Kalibrering för ljudlatens.
