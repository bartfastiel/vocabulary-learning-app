# Vocabulary Learning App

A modular, web-based vocabulary trainer with multiple interaction modes (text, image, audio).
It uses **native Web Components** for full encapsulation — each component contains its own HTML, CSS, and JS.
No frameworks, no build system, no global stylesheets.

---

## Getting Started

There is no build step. Serve the project root with any static file server (required for ES module imports and `fetch` calls):

```sh
# Python
python -m http.server 8080

# Node
npx serve .
```

Then open `http://localhost:8080` in a browser.

---

## Design Principles

- **Domain-oriented structure** — organized by feature area, not by file type
- **Full encapsulation** — each component is fully self-contained (Shadow DOM + own CSS)
- **No global utilities or stylesheets** — the only exception is `core/audio.js`
- **Deterministic imports** — all modules are explicitly imported in `vocab.js`
- **Predictable modes** — all allowed question/answer combinations are defined in a static array
- **Composable** — new question/answer components can be combined freely

---

## Folder Structure

```
vocabulary-learning-app/
├── index.html
│
├── core/
│   ├── app-shell.js         # root element: startup flow, layout, profile UI
│   ├── audio.js             # unified sound + voice playback
│   ├── avatar-builder.js    # avatar editor Web Component
│   ├── help-overlay.js      # onboarding tutorial overlay
│   └── profiles.js          # multi-profile support (create / switch / delete)
│
├── vocab/
│   ├── vocab.js             # orchestrator: modes, flow, component creation
│   ├── vocab-editor.js      # in-app vocab editor (teacher role)
│   ├── points.js            # points, streak + highscore management
│   ├── vocab.json           # all vocabulary data
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
│   ├── game-lobby.js        # game selection overlay with highscores
│   ├── rocket-game.js
│   ├── breakout-game.js
│   ├── catcher-game.js
│   ├── flappy-game.js
│   ├── jump-game.js
│   ├── memory-game.js
│   ├── reaction-game.js
│   └── snake-game.js
│
├── assets/
│   ├── img/                 # vocab images (DALL·E)
│   └── audio/
│       ├── buzz.mp3
│       ├── ding.mp3
│       └── voice/           # per-word voice audio clips
│
├── generate-images.sh       # generate vocab images via OpenAI API
├── generate-voice.sh        # generate voice clips via OpenAI TTS
└── env.sh.template          # API key template
```

---

## Architecture

### Entry point

`index.html` loads `core/app-shell.js` as the sole `<script type="module">`. Everything else is imported transitively.

### Startup flow

On first visit the app goes through:

1. **Profile selection** — pick or create a profile (stored in LocalStorage)
2. **Role selection** — Student, Teacher, or Developer (controls which UI features are shown)
3. **Main app** — `<vocab-trainer>` with header, quiz area, and game lobby button

### Component tree

```
<app-shell>               core/app-shell.js
  <vocab-help>            core/help-overlay.js
  <avatar-builder>        core/avatar-builder.js
  <vocab-trainer>         vocab/vocab.js         ← learning orchestrator
    <vocab-question-*>    vocab/question/
    <vocab-answer-*>      vocab/answer/
  <vocab-editor>          vocab/vocab-editor.js  ← teacher role only
  <game-lobby>            game/game-lobby.js
    <*-game>              game/*.js
```

### Data flow

1. `vocab-trainer` fetches `vocab/vocab.json` and selects a random word.
2. It picks a random `{ question, answer }` pair from the static `MODES` array in `vocab/vocab.js`. Modes that use images are filtered out if `word.allowImage` is false.
3. It creates the question and answer Web Components dynamically, sets `.word` on the question and `.data` on the answer.
4. The answer component fires a `CustomEvent("answered", { detail: { correct } })` when the user responds.
5. `vocab-trainer` advances to the next round and delegates point/streak changes to the `PointsManager` instance (from `vocab/points.js`) that `app-shell` passes in via `trainer.points`.

---

## Profiles (`core/profiles.js`)

Multiple users can share a single device. Each profile stores independently:

- Display name and avatar
- Points and streak record
- Unlocked avatar items
- Role and background theme preference

Profiles are persisted as a JSON array under the `allProfiles` LocalStorage key. Switching profiles snapshots the current state and loads the selected profile.

---

## Avatar Builder (`core/avatar-builder.js`)

Self-contained Web Component (`<avatar-builder>`) with all artwork as inline SVG — no external image assets.

- **API**: `avatarBuilder.open()` / `avatarBuilder.close()`; fires `CustomEvent("avatar-saved")` on save.
- **Export**: `getAvatarSVG()` — returns the composite SVG string for the current saved avatar.
- **Layers** (bottom→top): `background`, `face`, `hair`, `eyes`, `mouth`, `glasses`, `accessory`. Each layer is a fragment inside a `200×200` viewBox. `glasses` and `accessory` have index 0 = "none".
- Some items cost 1 Taler (point) to unlock and are locked until purchased.
- **Adding artwork**: add an entry `{ label, svg }` to the relevant array in `LAYERS` inside `avatar-builder.js`.

---

## Vocab Editor (`vocab/vocab-editor.js`)

Available to users with the **Teacher** or **Developer** role. Allows editing the loaded vocabulary in-app. Changes fire a `vocab-updated` event that causes `vocab-trainer` to reload.

---

## Background Themes

The animated background in `app-shell` supports multiple color themes:

| Key       | Description       |
|-----------|-------------------|
| `dark`    | Deep blue (default) |
| `ocean`   | Cyan / teal       |
| `purple`  | Violet / magenta  |
| `forest`  | Green             |
| `sunset`  | Orange / red      |

The selected theme is stored in LocalStorage as `appBg` and is persisted per profile.

---

## Game Lobby (`game/game-lobby.js`)

Accessible from the main header. Lets users spend earned points on mini-games. Each game:

- Has an entry cost (deducted from points on play)
- Tracks a per-device highscore
- Runs in a fullscreen overlay, then returns the player to the vocab trainer

Available games: Rocket, Breakout, Catcher, Flappy, Jump, Memory, Reaction, Snake.

---

## Question Components (`vocab/question/`)

| Component                  | Role                         |
|----------------------------|------------------------------|
| `question-wordgerman.js`   | Displays the German word     |
| `question-wordenglish.js`  | Displays the English word    |
| `question-image.js`        | Displays an image            |
| `question-voiceenglish.js` | Plays English audio          |

All accept `.word = { de: "...", en: "...", allowImage: true }` and render immediately.

---

## Answer Components (`vocab/answer/`)

| Component                      | Role                            |
|--------------------------------|---------------------------------|
| `answer-choosewordenglish.js`  | Choose English word by clicking |
| `answer-choosewordgerman.js`   | Choose German word by clicking  |
| `answer-chooseimage.js`        | Choose the correct image        |
| `answer-choosevoiceenglish.js` | Choose by listening to audio    |
| `answer-typewordenglish.js`    | Type the English word           |

Each component dispatches:

```js
this.dispatchEvent(new CustomEvent("answered", {
  bubbles: true,
  detail: { correct: true | false }
}));
```

---

## Adding a New Question/Answer Mode

1. Create `vocab/question/question-<name>.js` or `vocab/answer/answer-<name>.js` as a Web Component.
2. Import it at the top of `vocab/vocab.js`.
3. Add one or more `{ question, answer }` entries to the `MODES` array in `vocab/vocab.js`.

---

## vocab.json Structure

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

## Audio Assets

Voice clips are pre-generated OpenAI TTS files.

Filename convention: `assets/audio/voice/<normalized_word>_<voice>.mp3`
- Word is lowercased with non-alphanumeric characters replaced by `_`
- Voice is one of: `alloy`, `ash`, `coral`, `nova`, `onyx`

Generation scripts (`generate-voice.sh`, `generate-images.sh`) read an API key from `env.sh` (see `env.sh.template`).

The shared audio module (`core/audio.js`) exports:

```js
playSound("ding" | "buzz");
playVoice(englishWord);
```

---

## LocalStorage Keys

| Key               | Purpose                                              |
|-------------------|------------------------------------------------------|
| `allProfiles`     | JSON array of all profile objects                    |
| `activeProfileId` | ID of the currently active profile                   |
| `points`          | Current point total (also snapshotted in profile)    |
| `streakRecord`    | All-time best streak (also snapshotted in profile)   |
| `userRole`        | `"student"`, `"teacher"`, or `"developer"`           |
| `appBg`           | Background theme key (e.g. `"dark"`, `"ocean"`)      |
| `avatarSelection` | JSON object with layer indices for the avatar        |
| `avatarUnlocked`  | JSON array of unlocked premium avatar item keys      |
| `vocabHelpSeen`   | Set after the onboarding tutorial is dismissed       |

---

## Technologies

- Native Web Components (Shadow DOM + ES Modules)
- LocalStorage for persistence
- OpenAI TTS for voice clips
- OpenAI DALL·E for vocab images
- No frameworks, no build step, no dependencies

---

## Attributions

- `buzz.mp3` — LorenzoTheGreat (CC BY 3.0)
- `ding.mp3` — timgormly (CC0)
- Images in `assets/img` — DALL·E
- Audio clips — OpenAI Text-To-Speech
