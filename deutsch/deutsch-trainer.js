// deutsch/deutsch-trainer.js
// Deutsch-Trainer für die 5. Klasse.
// Aufgabentypen: Wortarten, Rechtschreibung, Zeitformen, Satzglieder, Grammatik

const DE_CATEGORIES = [
    { id: "wortarten",       name: "📝 Wortarten",           generate: genWortarten },
    { id: "nomen",           name: "🏷️ Nomen & Artikel",     generate: genNomen },
    { id: "verben",          name: "🏃 Verben konjugieren",  generate: genVerben },
    { id: "zeitformen",      name: "⏰ Zeitformen",           generate: genZeitformen },
    { id: "rechtschreibung", name: "✏️ Rechtschreibung",     generate: genRechtschreibung },
    { id: "satzzeichen",     name: "❗ Satzzeichen",          generate: genSatzzeichen },
    { id: "einzahl_mehrzahl",name: "👥 Einzahl & Mehrzahl",  generate: genEinzahlMehrzahl },
    { id: "gegenteil",       name: "↔️ Gegenteile",          generate: genGegenteil },
    { id: "wortfamilien",    name: "🌳 Wortfamilien",        generate: genWortfamilien },
    { id: "satzglieder",     name: "🧩 Satzglieder",         generate: genSatzglieder },
];

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// ── Generators ─────────────────────────────────────────────────────────────────

function genWortarten() {
    const words = [
        { w: "schnell", art: "Adjektiv" }, { w: "Hund", art: "Nomen" }, { w: "laufen", art: "Verb" },
        { w: "schön", art: "Adjektiv" }, { w: "Tisch", art: "Nomen" }, { w: "schreiben", art: "Verb" },
        { w: "groß", art: "Adjektiv" }, { w: "Blume", art: "Nomen" }, { w: "singen", art: "Verb" },
        { w: "leise", art: "Adjektiv" }, { w: "Schule", art: "Nomen" }, { w: "spielen", art: "Verb" },
        { w: "klug", art: "Adjektiv" }, { w: "Buch", art: "Nomen" }, { w: "tanzen", art: "Verb" },
        { w: "mutig", art: "Adjektiv" }, { w: "Fenster", art: "Nomen" }, { w: "kochen", art: "Verb" },
        { w: "lustig", art: "Adjektiv" }, { w: "Baum", art: "Nomen" }, { w: "lesen", art: "Verb" },
        { w: "traurig", art: "Adjektiv" }, { w: "Stadt", art: "Nomen" }, { w: "rennen", art: "Verb" },
        { w: "warm", art: "Adjektiv" }, { w: "Katze", art: "Nomen" }, { w: "trinken", art: "Verb" },
        { w: "dunkel", art: "Adjektiv" }, { w: "Haus", art: "Nomen" }, { w: "schwimmen", art: "Verb" },
    ];
    const item = pick(words);
    return {
        question: `Welche Wortart ist "${item.w}"?`,
        answer: item.art,
        choices: shuffle(["Nomen", "Verb", "Adjektiv"]),
    };
}

function genNomen() {
    const nouns = [
        { w: "Hund", a: "der" }, { w: "Katze", a: "die" }, { w: "Buch", a: "das" },
        { w: "Tisch", a: "der" }, { w: "Blume", a: "die" }, { w: "Auto", a: "das" },
        { w: "Baum", a: "der" }, { w: "Schule", a: "die" }, { w: "Kind", a: "das" },
        { w: "Stuhl", a: "der" }, { w: "Tasche", a: "die" }, { w: "Fenster", a: "das" },
        { w: "Vogel", a: "der" }, { w: "Lampe", a: "die" }, { w: "Haus", a: "das" },
        { w: "Berg", a: "der" }, { w: "Straße", a: "die" }, { w: "Meer", a: "das" },
        { w: "Lehrer", a: "der" }, { w: "Brücke", a: "die" }, { w: "Pferd", a: "das" },
        { w: "Apfel", a: "der" }, { w: "Wolke", a: "die" }, { w: "Bett", a: "das" },
        { w: "Mond", a: "der" }, { w: "Sonne", a: "die" }, { w: "Glas", a: "das" },
    ];
    const item = pick(nouns);
    return {
        question: `Welcher Artikel? ___ ${item.w}`,
        answer: item.a,
        choices: shuffle(["der", "die", "das"]),
    };
}

function genVerben() {
    const verbs = [
        { inf: "gehen", forms: { ich: "gehe", du: "gehst", "er/sie": "geht", wir: "gehen", ihr: "geht", sie: "gehen" }},
        { inf: "laufen", forms: { ich: "laufe", du: "läufst", "er/sie": "läuft", wir: "laufen", ihr: "lauft", sie: "laufen" }},
        { inf: "lesen", forms: { ich: "lese", du: "liest", "er/sie": "liest", wir: "lesen", ihr: "lest", sie: "lesen" }},
        { inf: "schreiben", forms: { ich: "schreibe", du: "schreibst", "er/sie": "schreibt", wir: "schreiben", ihr: "schreibt", sie: "schreiben" }},
        { inf: "fahren", forms: { ich: "fahre", du: "fährst", "er/sie": "fährt", wir: "fahren", ihr: "fahrt", sie: "fahren" }},
        { inf: "sprechen", forms: { ich: "spreche", du: "sprichst", "er/sie": "spricht", wir: "sprechen", ihr: "sprecht", sie: "sprechen" }},
        { inf: "essen", forms: { ich: "esse", du: "isst", "er/sie": "isst", wir: "essen", ihr: "esst", sie: "essen" }},
        { inf: "sehen", forms: { ich: "sehe", du: "siehst", "er/sie": "sieht", wir: "sehen", ihr: "seht", sie: "sehen" }},
        { inf: "nehmen", forms: { ich: "nehme", du: "nimmst", "er/sie": "nimmt", wir: "nehmen", ihr: "nehmt", sie: "nehmen" }},
        { inf: "geben", forms: { ich: "gebe", du: "gibst", "er/sie": "gibt", wir: "geben", ihr: "gebt", sie: "geben" }},
        { inf: "schlafen", forms: { ich: "schlafe", du: "schläfst", "er/sie": "schläft", wir: "schlafen", ihr: "schlaft", sie: "schlafen" }},
        { inf: "tragen", forms: { ich: "trage", du: "trägst", "er/sie": "trägt", wir: "tragen", ihr: "tragt", sie: "tragen" }},
    ];
    const verb = pick(verbs);
    const pronouns = Object.keys(verb.forms);
    const pronoun = pick(pronouns);
    const correct = verb.forms[pronoun];
    const wrongs = new Set([correct]);
    Object.values(verb.forms).forEach(f => wrongs.add(f));
    const choices = shuffle([...wrongs].slice(0, 4));
    if (!choices.includes(correct)) choices[0] = correct;

    return {
        question: `${verb.inf} → ${pronoun} ___`,
        answer: correct,
        choices: shuffle(choices),
    };
}

function genZeitformen() {
    const examples = [
        { satz: "Ich spiele Fußball.", zeit: "Präsens" },
        { satz: "Ich spielte Fußball.", zeit: "Präteritum" },
        { satz: "Ich habe Fußball gespielt.", zeit: "Perfekt" },
        { satz: "Er geht in die Schule.", zeit: "Präsens" },
        { satz: "Er ging in die Schule.", zeit: "Präteritum" },
        { satz: "Er ist in die Schule gegangen.", zeit: "Perfekt" },
        { satz: "Wir lesen ein Buch.", zeit: "Präsens" },
        { satz: "Wir lasen ein Buch.", zeit: "Präteritum" },
        { satz: "Wir haben ein Buch gelesen.", zeit: "Perfekt" },
        { satz: "Sie singt ein Lied.", zeit: "Präsens" },
        { satz: "Sie sang ein Lied.", zeit: "Präteritum" },
        { satz: "Sie hat ein Lied gesungen.", zeit: "Perfekt" },
        { satz: "Du schreibst einen Brief.", zeit: "Präsens" },
        { satz: "Du schriebst einen Brief.", zeit: "Präteritum" },
        { satz: "Du hast einen Brief geschrieben.", zeit: "Perfekt" },
    ];
    const item = pick(examples);
    return {
        question: `Welche Zeitform?\n„${item.satz}"`,
        answer: item.zeit,
        choices: shuffle(["Präsens", "Präteritum", "Perfekt"]),
    };
}

function genRechtschreibung() {
    const pairs = [
        { correct: "Fahrrad", wrong: ["Fahrad", "Farrad", "Fahrrat"] },
        { correct: "Schmetterling", wrong: ["Schmeteling", "Schmeterling", "Schmetalink"] },
        { correct: "Geburtstag", wrong: ["Geburtztag", "Geburstag", "Geburtsdag"] },
        { correct: "Donnerstag", wrong: ["Donerstag", "Donnerstak", "Donnersdah"] },
        { correct: "Bibliothek", wrong: ["Biblothek", "Bibliotheck", "Biblyothek"] },
        { correct: "Rhythmus", wrong: ["Rythmus", "Rhytmus", "Rytmus"] },
        { correct: "Abenteuer", wrong: ["Abendteuer", "Abenteur", "Abänteuer"] },
        { correct: "Mannschaft", wrong: ["Manschaft", "Mannchaft", "Mannshaft"] },
        { correct: "Wettbewerb", wrong: ["Wetbewerb", "Wettbeverb", "Wetbewerb"] },
        { correct: "Krankenwagen", wrong: ["Kranckenwagen", "Krankenwahgen", "Grankenwagen"] },
        { correct: "Unterschied", wrong: ["Untershied", "Underschied", "Unterschiet"] },
        { correct: "Aufgabe", wrong: ["Aufgahbe", "Aufgahbe", "Aufgahbe"] },
        { correct: "Entschuldigung", wrong: ["Endschuldigung", "Entschuldigun", "Enschuldigung"] },
        { correct: "Kühlschrank", wrong: ["Kühlschranck", "Külschrank", "Kühlshrank"] },
        { correct: "Geschwister", wrong: ["Geschiwster", "Geschwizter", "Geschwistär"] },
    ];
    const item = pick(pairs);
    const wrongOne = pick(item.wrong);
    return {
        question: `Welches Wort ist richtig geschrieben?`,
        answer: item.correct,
        choices: shuffle([item.correct, wrongOne, pick(item.wrong.filter(w => w !== wrongOne)) || wrongOne + "x"].slice(0, 4)),
    };
}

function genSatzzeichen() {
    const examples = [
        { satz: "Wie heißt du", answer: "?", type: "Fragesatz" },
        { satz: "Heute ist ein schöner Tag", answer: ".", type: "Aussagesatz" },
        { satz: "Pass auf", answer: "!", type: "Ausrufesatz" },
        { satz: "Wann kommst du nach Hause", answer: "?", type: "Fragesatz" },
        { satz: "Das Wetter ist wunderbar", answer: ".", type: "Aussagesatz" },
        { satz: "Hilfe", answer: "!", type: "Ausrufesatz" },
        { satz: "Kannst du mir helfen", answer: "?", type: "Fragesatz" },
        { satz: "Ich mag Schokolade", answer: ".", type: "Aussagesatz" },
        { satz: "Feuer", answer: "!", type: "Ausrufesatz" },
        { satz: "Wo ist mein Buch", answer: "?", type: "Fragesatz" },
        { satz: "Das hast du toll gemacht", answer: "!", type: "Ausrufesatz" },
    ];
    const item = pick(examples);
    return {
        question: `Welches Satzzeichen fehlt?\n„${item.satz}___"`,
        answer: item.answer,
        choices: shuffle([".", "!", "?"]),
    };
}

function genEinzahlMehrzahl() {
    const words = [
        { e: "Haus", m: "Häuser" }, { e: "Baum", m: "Bäume" }, { e: "Kind", m: "Kinder" },
        { e: "Buch", m: "Bücher" }, { e: "Hand", m: "Hände" }, { e: "Stuhl", m: "Stühle" },
        { e: "Apfel", m: "Äpfel" }, { e: "Vogel", m: "Vögel" }, { e: "Glas", m: "Gläser" },
        { e: "Hund", m: "Hunde" }, { e: "Katze", m: "Katzen" }, { e: "Blume", m: "Blumen" },
        { e: "Tisch", m: "Tische" }, { e: "Schule", m: "Schulen" }, { e: "Maus", m: "Mäuse" },
        { e: "Ball", m: "Bälle" }, { e: "Nacht", m: "Nächte" }, { e: "Wort", m: "Wörter" },
        { e: "Stadt", m: "Städte" }, { e: "Mann", m: "Männer" }, { e: "Frau", m: "Frauen" },
    ];
    const item = pick(words);
    if (Math.random() < 0.5) {
        // Einzahl → Mehrzahl
        const wrongs = words.filter(w => w.m !== item.m).map(w => w.m);
        return {
            question: `Mehrzahl von „${item.e}"?`,
            answer: item.m,
            choices: shuffle([item.m, ...shuffle(wrongs).slice(0, 3)]),
        };
    } else {
        // Mehrzahl → Einzahl
        const wrongs = words.filter(w => w.e !== item.e).map(w => w.e);
        return {
            question: `Einzahl von „${item.m}"?`,
            answer: item.e,
            choices: shuffle([item.e, ...shuffle(wrongs).slice(0, 3)]),
        };
    }
}

function genGegenteil() {
    const pairs = [
        ["groß", "klein"], ["hell", "dunkel"], ["schnell", "langsam"], ["laut", "leise"],
        ["warm", "kalt"], ["schwer", "leicht"], ["alt", "jung"], ["reich", "arm"],
        ["dick", "dünn"], ["hoch", "niedrig"], ["nah", "fern"], ["fröhlich", "traurig"],
        ["mutig", "feige"], ["fleißig", "faul"], ["stark", "schwach"], ["trocken", "nass"],
        ["breit", "schmal"], ["weich", "hart"], ["lang", "kurz"], ["offen", "geschlossen"],
    ];
    const pair = pick(pairs);
    const idx = randInt(0, 1);
    const word = pair[idx];
    const correct = pair[1 - idx];
    const wrongs = pairs.filter(p => !p.includes(word)).map(p => p[randInt(0, 1)]);

    return {
        question: `Gegenteil von „${word}"?`,
        answer: correct,
        choices: shuffle([correct, ...shuffle(wrongs).slice(0, 3)]),
    };
}

function genWortfamilien() {
    const families = [
        { stamm: "fahr", words: ["fahren", "Fahrrad", "Fahrer", "Abfahrt"], outsider: "fallen" },
        { stamm: "lern", words: ["lernen", "Lerner", "Lernstoff", "gelernt"], outsider: "lehren" },
        { stamm: "spiel", words: ["spielen", "Spielplatz", "Spieler", "Spielzeug"], outsider: "spülen" },
        { stamm: "wohn", words: ["wohnen", "Wohnung", "Bewohner", "wohnlich"], outsider: "wünschen" },
        { stamm: "bau", words: ["bauen", "Gebäude", "Bauer", "Bauwerk"], outsider: "Baum" },
        { stamm: "schreib", words: ["schreiben", "Schreibtisch", "Schrift", "beschreiben"], outsider: "schreien" },
        { stamm: "koch", words: ["kochen", "Koch", "Küche", "Kochbuch"], outsider: "Kuchen" },
    ];
    const fam = pick(families);
    const word = pick(fam.words);
    return {
        question: `Welches Wort gehört NICHT zur Wortfamilie „${fam.stamm}"?`,
        answer: fam.outsider,
        choices: shuffle([fam.outsider, ...shuffle(fam.words).slice(0, 3)]),
    };
}

function genSatzglieder() {
    const examples = [
        { satz: "Der Hund bellt laut.", frage: "Wer oder was bellt?", answer: "Der Hund", choices: ["Der Hund", "bellt", "laut"] },
        { satz: "Die Kinder spielen im Garten.", frage: "Wo spielen die Kinder?", answer: "im Garten", choices: ["Die Kinder", "spielen", "im Garten"] },
        { satz: "Lisa liest ein Buch.", frage: "Was liest Lisa?", answer: "ein Buch", choices: ["Lisa", "liest", "ein Buch"] },
        { satz: "Der Lehrer erklärt die Aufgabe.", frage: "Wer erklärt?", answer: "Der Lehrer", choices: ["Der Lehrer", "erklärt", "die Aufgabe"] },
        { satz: "Am Montag beginnt die Schule.", frage: "Wann beginnt die Schule?", answer: "Am Montag", choices: ["Am Montag", "beginnt", "die Schule"] },
        { satz: "Der Vogel singt im Baum.", frage: "Wo singt der Vogel?", answer: "im Baum", choices: ["Der Vogel", "singt", "im Baum"] },
        { satz: "Marie gibt Tom ein Geschenk.", frage: "Wem gibt Marie ein Geschenk?", answer: "Tom", choices: ["Marie", "Tom", "ein Geschenk"] },
        { satz: "Morgens trinkt Papa Kaffee.", frage: "Was trinkt Papa?", answer: "Kaffee", choices: ["Morgens", "Papa", "Kaffee"] },
    ];
    const item = pick(examples);
    return {
        question: `${item.satz}\n${item.frage}`,
        answer: item.answer,
        choices: shuffle([...item.choices]),
    };
}

// ── Component ──────────────────────────────────────────────────────────────────

class DeutschTrainer extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._category = null;
        this._streak = 0;
        this._total = 0;
        this._correct = 0;
    }

    set points(pm) { this._pm = pm; }

    connectedCallback() {
        this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: flex; flex-direction: column; align-items: center;
          font-family: "Segoe UI", sans-serif; width: 100%;
        }
        .lesson-header {
          display: flex; align-items: center; justify-content: space-between;
          background: linear-gradient(135deg, rgba(3,60,110,0.92), rgba(7,100,160,0.92));
          backdrop-filter: blur(14px); border: 1px solid rgba(56,189,248,0.45);
          color: #bae6fd; border-radius: 16px 16px 0 0;
          padding: 0.9rem 1.2rem; cursor: pointer; user-select: none;
          font-size: 1.1rem; font-weight: 600;
          width: 400px; max-width: 90vw; margin-top: 1.2rem;
          box-shadow: 0 0 24px rgba(14,165,233,0.5);
          transition: box-shadow 0.3s, transform 0.2s;
        }
        .lesson-header:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 36px rgba(14,165,233,0.9);
        }
        #quiz-box {
          background: rgba(4,20,45,0.75);
          backdrop-filter: blur(22px); border: 1px solid rgba(56,189,248,0.3);
          border-top: none; border-radius: 0 0 18px 18px;
          box-shadow: 0 20px 60px rgba(14,165,233,0.2);
          padding: 1.5rem; max-width: 90vw; width: 400px;
          text-align: center; color: #e0f2fe;
          display: flex; flex-direction: column; gap: 1rem;
          min-height: 200px; justify-content: center;
        }
        #question-text {
          font-size: 1.2rem; font-weight: bold; white-space: pre-line;
          line-height: 1.6; margin-bottom: 0.5rem;
        }
        .choices {
          display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem;
        }
        .choice-btn {
          padding: 0.8rem; border: 2px solid rgba(56,189,248,0.35);
          border-radius: 12px; background: rgba(14,105,163,0.2);
          color: #bae6fd; font-size: 1rem; font-weight: bold;
          cursor: pointer; transition: all 0.15s;
        }
        .choice-btn:hover {
          background: rgba(14,165,233,0.35);
          border-color: rgba(56,189,248,0.7);
          transform: scale(1.03);
        }
        .choice-btn.correct { background: rgba(76,175,80,0.5) !important; border-color: #66BB6A !important; }
        .choice-btn.wrong { background: rgba(244,67,54,0.4) !important; border-color: #EF5350 !important; }
        #stats { font-size: 0.85rem; color: #7dd3fc; margin-top: 0.3rem; }
        #feedback { font-size: 1.3rem; min-height: 2rem; }
        .lesson-overlay { position: fixed; inset: 0; background: rgba(0,5,15,0.75); backdrop-filter: blur(6px); z-index: 150; display: none; }
        .lesson-overlay.active { display: block; }
        .lesson-popup {
          position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
          background: rgba(4,20,45,0.96); backdrop-filter: blur(22px);
          border: 1px solid rgba(56,189,248,0.4); border-radius: 16px;
          box-shadow: 0 0 40px rgba(14,165,233,0.4);
          padding: 1rem; width: 320px; max-width: 90vw;
          z-index: 200; display: none; color: #bae6fd;
        }
        .lesson-popup.active { display: block; }
        .lesson-popup h2 { font-size: 1.1rem; margin: 0 0 0.8rem; text-align: center; color: #38bdf8; }
        .set-list { display: flex; flex-direction: column; gap: 0.5rem; max-height: 50vh; overflow-y: auto; }
        .set-list button {
          background: rgba(14,105,163,0.3); color: #bae6fd;
          border: 1px solid rgba(56,189,248,0.35); border-radius: 10px;
          padding: 0.6rem 1rem; font-size: 1rem; cursor: pointer;
          transition: all 0.2s; text-align: left;
        }
        .set-list button:hover { background: rgba(14,165,233,0.4); transform: translateX(4px); }
        .set-list button.active { background: rgba(3,105,161,0.8); font-weight: bold; color: #e0f2fe; }
      </style>

      <div class="lesson-header">
        <span class="title">Thema wählen...</span>
        <span style="font-size:1.4rem">☰</span>
      </div>
      <div id="quiz-box">
        <div id="question-text">Wähle ein Thema oben!</div>
        <div class="choices" id="choices"></div>
        <div id="feedback"></div>
        <div id="stats"></div>
      </div>

      <div class="lesson-overlay"></div>
      <div class="lesson-popup">
        <h2>📖 Deutsch-Thema wählen</h2>
        <div class="set-list"></div>
      </div>
    `;

        this._setupPopup();
        this._renderCategories();
        this._selectCategory(0);
    }

    _setupPopup() {
        const header = this.shadowRoot.querySelector(".lesson-header");
        const overlay = this.shadowRoot.querySelector(".lesson-overlay");
        const popup = this.shadowRoot.querySelector(".lesson-popup");
        const toggle = (show) => {
            overlay.classList.toggle("active", show);
            popup.classList.toggle("active", show);
        };
        header.onclick = () => toggle(true);
        overlay.onclick = () => toggle(false);
        this._togglePopup = toggle;
    }

    _renderCategories() {
        const list = this.shadowRoot.querySelector(".set-list");
        list.innerHTML = "";
        DE_CATEGORIES.forEach((cat, i) => {
            const btn = document.createElement("button");
            btn.textContent = cat.name;
            btn.onclick = () => { this._selectCategory(i); this._togglePopup(false); };
            list.appendChild(btn);
        });
    }

    _selectCategory(i) {
        this._category = DE_CATEGORIES[i];
        this._streak = 0; this._total = 0; this._correct = 0;
        this.shadowRoot.querySelector(".lesson-header .title").textContent = this._category.name;
        const btns = this.shadowRoot.querySelectorAll(".set-list button");
        btns.forEach((b, j) => b.classList.toggle("active", j === i));
        this._nextQuestion();
    }

    _nextQuestion() {
        const q = this._category.generate();
        this._currentAnswer = String(q.answer);
        this.shadowRoot.getElementById("question-text").textContent = q.question;
        this.shadowRoot.getElementById("feedback").textContent = "";
        this._updateStats();

        const container = this.shadowRoot.getElementById("choices");
        container.innerHTML = "";
        q.choices.forEach(c => {
            const btn = document.createElement("button");
            btn.className = "choice-btn";
            btn.textContent = c;
            btn.onclick = () => this._answer(btn, c, container);
            container.appendChild(btn);
        });
    }

    _answer(btn, chosen, container) {
        const correct = chosen === this._currentAnswer;
        this._total++;
        container.querySelectorAll(".choice-btn").forEach(b => b.style.pointerEvents = "none");

        if (correct) {
            btn.classList.add("correct");
            this._correct++;
            this._streak++;
            this.shadowRoot.getElementById("feedback").textContent = "✅ Richtig!";
            this._pm?.updatePoints(1);
            this._pm?.updateStreak(true);
        } else {
            btn.classList.add("wrong");
            container.querySelectorAll(".choice-btn").forEach(b => {
                if (b.textContent === this._currentAnswer) b.classList.add("correct");
            });
            this._streak = 0;
            this.shadowRoot.getElementById("feedback").textContent = `❌ Richtig: ${this._currentAnswer}`;
            this._pm?.updatePoints(-1);
            this._pm?.updateStreak(false);
        }

        this._updateStats();
        setTimeout(() => this._nextQuestion(), correct ? 800 : 2000);
    }

    _updateStats() {
        const pct = this._total > 0 ? Math.round(this._correct / this._total * 100) : 0;
        this.shadowRoot.getElementById("stats").textContent =
            `${this._correct}/${this._total} richtig (${pct}%) · Serie: ${this._streak}`;
    }
}

customElements.define("deutsch-trainer", DeutschTrainer);
