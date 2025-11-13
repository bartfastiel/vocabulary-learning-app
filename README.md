# **📘 Vocabulary Learning App**

Ein modularer, webbasierter Vokabeltrainer mit mehreren Interaktionsmodi (Text, Bild, Audio).
Er nutzt **native Web Components** für vollständige Kapselung — jede Komponente enthält ihr eigenes HTML, CSS und JS.
Keine Frameworks, kein Build-System und keine globalen Stylesheets.

Nur ein einziger Helper wird geteilt: `core/audio.js`.

---

# 🧭 **Design Principles**

* **Domain-oriented structure** – Gliederung nach Funktionsbereichen statt nach Dateitypen
* **Full encapsulation** – jede Komponente ist vollständig eigenständig (Shadow DOM + eigenes CSS)
* **No global utilities or stylesheets** – einzige Ausnahme: `core/audio.js`
* **Deterministic imports** – alle Module werden explizit in `vocab.js` importiert
* **Predictable modes** – alle erlaubten Kombinationen von question/answer befinden sich in einem statischen Array
* **Composable** – neue question/answer Komponenten können flexibel kombiniert werden
* **Maintainability** – klarer, expliziter Lernfluss ohne versteckte Magie

---

# 🧩 **Folder Structure**

```
vocabulary-learning-app/
├── index.html
│
├── core/
│   ├── app-shell.js         # root element that loads <vocab-trainer> or the game
│   └── audio.js             # unified sound + voice playback
│
├── vocab/
│   ├── vocab.js             # orchestrator: modes, flow, component creation
│   ├── points.js            # points, streak + highscore management
│   │
│   ├── question/
│   │   ├── question-wordgerman.js
│   │   ├── question-wordenglish.js
│   │   ├── question-image.js
│   │   └── question-voiceenglish.js
│   │
│   └── answer/
│       ├── answer-choosewordenglish.js
│       ├── answer-choosewordgerman.js
│       ├── answer-chooseimage.js
│       ├── answer-choosevoiceenglish.js
│       ├── answer-typewordenglish.js
│       │
│       └── elements/
│           └── next-button.js
│
├── game/
│   └── rocket-game.js       # standalone rocket coin mini-game
│
├── assets/
│   ├── img/                 # vocab images (DALL·E)
│   └── audio/
│       ├── buzz.mp3
│       ├── ding.mp3
│       └── voice/           # per-word voice audio clips
│
└── vocab/vocab.json         # all vocabulary data
```

---

# 🧱 **Responsibilities by File**

## **index.html**

* Minimal Root-Dokument
* Bindet `<app-shell>` ein
* Keine eigene Logik oder Styles

---

## **core/app-shell.js**

* Wurzelkomponente
* Enthält:

  * Header (Punkte / Streak)
  * den weißen Quiz-Bereich
  * das Overlay für das Minispiel
* Bindet `<vocab-trainer>` oder `<rocket-game>` je nach Interaktion
* Keine Lernlogik

---

## **core/audio.js**

Der **einzige global geteilte Helper**.

Bietet:

```js
playSound("ding" | "buzz");
playVoice(englishWord);
```

* Einheitliches Soundverhalten
* Einheitliches Voice-Playback (OpenAI TTS)
* Garantiert identisches Lautstärke- und Timing-Verhalten in allen Komponenten

---

# **vocab/vocab.js — Orchestrator**

Die zentrale Steuerlogik der Anwendung:

* Lädt `vocab.json`

* Selektiert zufällige Wörter

* Selektiert einen **Mode** aus einer Liste fester Kombinationen:

  ```js
  { question: "vocab-question-wordgerman", answer: "vocab-answer-choosewordenglish" }
  ...
  ```

* Erzeugt dynamisch die passenden Web Components

* Setzt das `data`-Objekt für Antwortkomponenten

* Hört auf das `answered`-Event der Antwortkomponenten

* Verbindet das Ergebnis mit `points.js`

* Führt zur nächsten Runde weiter

🔥 **Keine globale oder implizite Abhängigkeit — alles explicit wiring.**

---

# **vocab/points.js**

Verantwortlich für:

* lokale Punkte
* Streak-Logik
* Highscore-Tracking
* Punktestand in DOM aktualisieren (über Referenzen von `app-shell`)

Keine Lernlogik, nur Statusmanagement.

---

# **vocab/question/**

Jede Frage ist ein eigener Web Component:

| Component                  | Aufgabe                    |
| -------------------------- | -------------------------- |
| `question-wordgerman.js`   | Zeigt deutsches Wort       |
| `question-wordenglish.js`  | Zeigt englisches Wort      |
| `question-image.js`        | Zeigt ein Bild             |
| `question-voiceenglish.js` | Spielt englisches Audio ab |

Alle setzen:

```js
this.word = {...}
```

und rendern sofort ihren Inhalt.

---

# **vocab/answer/**

Jede Antwortkomponente implementiert exakt **eine** Interaktionsform.

| Component                      | Aufgabe                           |
| ------------------------------ | --------------------------------- |
| `answer-choosewordenglish.js`  | Englisch per Klick auswählen      |
| `answer-choosewordgerman.js`   | Deutsch per Klick auswählen       |
| `answer-chooseimage.js`        | Bild auswählen                    |
| `answer-choosevoiceenglish.js` | Stimme auswählen / Audiovergleich |
| `answer-typewordenglish.js`    | Englisch eintippen                |

Jede Komponente löst aus:

```js
this.dispatchEvent(new CustomEvent("answered", {
  bubbles: true,
  detail: { correct: true/false }
}));
```

---

# 🎮 **game/** Domain

Mini-Game zum spielerischen Punktetausch.

| Datei            | Aufgabe                                                          |
| ---------------- | ---------------------------------------------------------------- |
| `rocket-game.js` | eigenes Overlay, eigener Loop, keine Verbindung zur Vokabellogik |

---

# 🧠 **Mode Handling (aktuelles System)**

README **aktualisiert**:

Es gibt **keine `mode-*.js` Dateien** mehr.

Stattdessen:

* Alle gültigen Kombinationen stehen im `MODES`-Array in `vocab.js`.
* Jede Kombination ist statisch definiert:

  ```js
  { question: "vocab-question-image", answer: "vocab-answer-choosewordenglish" }
  ```
* Neue Frage-/Antwortkomponenten können einfach über neue Mode-Einträge kombiniert werden.

---

# 🧰 **Technologies**

* **Native Web Components**
* **Shadow DOM**
* **ES Modules**
* **LocalStorage**
* **OpenAI TTS** für audio playback (voice clips)
* **Keine Frameworks, keine Abhängigkeiten**

---

# 🚀 **Future Extensions**

* Mehr Fragetypen (z. B. Satzbeschreibung, Grammatik)
* Erweiterte Antworttypen (Drag&Drop, Satzbau)
* Erweiterter Sprachumfang
* Leaderboards / Cloud-Sync
* Adaptive Lernlogik

---

# 📜 **Attributions**

* `buzz.mp3` — LorenzoTheGreat (CC BY 3.0)
* `ding.mp3` — timgormly (CC0)
* Bilder in `assets/img` — DALL·E
* Audio-Clips — OpenAI Text-To-Speech Model
