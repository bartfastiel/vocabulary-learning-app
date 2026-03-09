# **📘 Vocabulary Learning App**

A modular, web-based vocabulary trainer with multiple interaction modes (text, image, audio).
It uses **native Web Components** for full encapsulation — each component contains its own HTML, CSS, and JS.
No frameworks, no build system, no global stylesheets.

The only shared helper is `core/audio.js`.

---

# 🚀 **Getting Started**

There is no build step. Serve the project root with any static file server (required for ES module imports and `fetch` calls):

```sh
# Python
python -m http.server 8080

# Node
npx serve .
```

Then open `http://localhost:8080` in a browser.

---

# 🧭 **Design Principles**

* **Domain-oriented structure** – organized by feature area, not by file type
* **Full encapsulation** – each component is fully self-contained (Shadow DOM + own CSS)
* **No global utilities or stylesheets** – the only exception is `core/audio.js`
* **Deterministic imports** – all modules are explicitly imported in `vocab.js`
* **Predictable modes** – all allowed question/answer combinations are defined in a static array
* **Composable** – new question/answer components can be combined freely
* **Maintainability** – clear, explicit learning flow with no hidden magic

---

# 🧩 **Folder Structure**

```
vocabulary-learning-app/
├── index.html
│
├── core/
│   ├── app-shell.js         # root element that loads <vocab-trainer> or the game
│   ├── audio.js             # unified sound + voice playback
│   └── help-overlay.js      # onboarding tutorial overlay
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

* Minimal root document
* Mounts `<app-shell>`
* No logic or styles of its own

---

## **core/app-shell.js**

* Root component
* Contains:
  * Header (points / streak)
  * The white quiz area
  * The mini-game overlay
* Loads `<vocab-trainer>` or `<rocket-game>` depending on interaction
* No learning logic

---

## **core/audio.js**

The **only globally shared helper**.

Provides:

```js
playSound("ding" | "buzz");
playVoice(englishWord);
```

* Consistent sound behavior
* Consistent voice playback (OpenAI TTS)
* Guaranteed identical volume and timing behavior across all components

---

## **core/help-overlay.js**

Onboarding tutorial overlay shown to first-time users. Dismissed via LocalStorage key `vocabHelpSeen`.

---

# **vocab/vocab.js — Orchestrator**

The central control logic of the application:

* Loads `vocab.json`

* Selects a random word

* Selects a **mode** from a list of fixed combinations:

  ```js
  { question: "vocab-question-wordgerman", answer: "vocab-answer-choosewordenglish" }
  // ...
  ```

* Dynamically creates the matching Web Components

* Sets the `data` object on answer components

* Listens for the `answered` event from answer components

* Delegates results to `points.js`

* Advances to the next round

🔥 **No global or implicit dependencies — everything is explicit wiring.**

---

# **vocab/points.js**

Responsible for:

* Local point total
* Streak logic
* Highscore tracking
* Updating the score display in the DOM (via references from `app-shell`)

No learning logic — pure state management.

---

# **vocab/question/**

Each question type is its own Web Component:

| Component                  | Role                         |
| -------------------------- | ---------------------------- |
| `question-wordgerman.js`   | Displays the German word     |
| `question-wordenglish.js`  | Displays the English word    |
| `question-image.js`        | Displays an image            |
| `question-voiceenglish.js` | Plays English audio          |

All accept:

```js
this.word = { de: "...", en: "...", allowImage: true }
```

and render immediately.

---

# **vocab/answer/**

Each answer component implements exactly **one** interaction form.

| Component                      | Role                              |
| ------------------------------ | --------------------------------- |
| `answer-choosewordenglish.js`  | Choose English word by clicking   |
| `answer-choosewordgerman.js`   | Choose German word by clicking    |
| `answer-chooseimage.js`        | Choose the correct image          |
| `answer-choosevoiceenglish.js` | Choose by listening to audio      |
| `answer-typewordenglish.js`    | Type the English word             |

Each component dispatches:

```js
this.dispatchEvent(new CustomEvent("answered", {
  bubbles: true,
  detail: { correct: true | false }
}));
```

---

# 🎮 **game/ Domain**

Mini-game for spending points playfully.

| File             | Role                                                             |
| ---------------- | ---------------------------------------------------------------- |
| `rocket-game.js` | Own overlay, own loop, no connection to the vocab learning logic |

---

# 🧠 **Mode Handling**

There are **no `mode-*.js` files**.

Instead:

* All valid combinations are listed in the `MODES` array in `vocab.js`.
* Each combination is statically defined:

  ```js
  { question: "vocab-question-image", answer: "vocab-answer-choosewordenglish" }
  ```
* Modes that use images are filtered out if `word.allowImage` is false.
* New question/answer components can be added by importing them in `vocab.js` and appending entries to `MODES`.

---

# 📄 **vocab.json Structure**

```json
[
  {
    "name": "Lesson 1",
    "words": [
      { "de": "Hund", "en": "dog", "allowImage": true }
    ]
  }
]
```

Optional word fields: `en_info` (displayed as an extra hint).

---

# 🔊 **Audio Assets**

Voice clips are pre-generated OpenAI TTS files.

Filename convention: `assets/audio/voice/<normalized_word>_<voice>.mp3`
- Word is lowercased with non-alphanumeric characters replaced by `_`
- Voice is one of: `alloy`, `ash`, `coral`, `nova`, `onyx`

Generation scripts (`generate-voice.sh`, `generate-images.sh`) read an API key from `env.sh` (see `env.sh.template`).

---

# 💾 **LocalStorage Keys**

| Key             | Purpose                                              |
| --------------- | ---------------------------------------------------- |
| `points`        | Persisted point total                                |
| `streakRecord`  | All-time best streak                                 |
| `vocabHelpSeen` | Set after the onboarding tutorial is dismissed       |

---

# 🧰 **Technologies**

* **Native Web Components**
* **Shadow DOM**
* **ES Modules**
* **LocalStorage**
* **OpenAI TTS** for audio playback (voice clips)
* **No frameworks, no dependencies**

---

# 🚀 **Future Extensions**

* More question types (e.g. sentence description, grammar)
* Extended answer types (drag & drop, sentence building)
* Broader vocabulary
* Leaderboards / cloud sync
* Adaptive learning logic

---

# 📜 **Attributions**

* `buzz.mp3` — LorenzoTheGreat (CC BY 3.0)
* `ding.mp3` — timgormly (CC0)
* Images in `assets/img` — DALL·E
* Audio clips — OpenAI Text-To-Speech
