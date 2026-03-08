# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the App

There is no build system, package manager, or test suite. The app is plain HTML/JS served directly from the filesystem or a static file server.

To run locally, serve from the project root (required for ES module imports and `fetch` calls):

```sh
# Example using Python
python -m http.server 8080

# Example using Node
npx serve .
```

Then open `http://localhost:8080` in a browser.

## Architecture

**No frameworks, no build step, no global stylesheets.** The app uses native Web Components (Shadow DOM + ES Modules) exclusively.

### Entry point

`index.html` loads `core/app-shell.js` as the sole `<script type="module">`. Everything else is imported transitively.

### Component tree

```
<app-shell>               core/app-shell.js
  <vocab-help>            core/help-overlay.js
  <vocab-trainer>         vocab/vocab.js         ← orchestrator
    <vocab-question-*>    vocab/question/
    <vocab-answer-*>      vocab/answer/
  <rocket-game>           game/rocket-game.js    ← mini-game overlay
```

### Data flow

1. `vocab-trainer` fetches `vocab/vocab.json` and selects a random word.
2. It picks a random `{ question, answer }` pair from the static `MODES` array in `vocab/vocab.js`. Modes that use images are filtered out if `word.allowImage` is false.
3. It creates the question and answer Web Components dynamically, sets `.word` on the question and `.data` on the answer.
4. The answer component fires a `CustomEvent("answered", { detail: { correct } })` when the user responds.
5. `vocab-trainer` advances to the next round and delegates point/streak changes to the `PointsManager` instance (from `vocab/points.js`) that `app-shell` passes in via `trainer.points`.

### The only shared module

`core/audio.js` exports two functions used across all components:
- `playSound("ding" | "buzz")` — feedback sounds
- `playVoice(englishWord)` — plays a pre-generated voice clip from `assets/audio/voice/<word>_<voice>.mp3`

### vocab.json structure

Each entry in the top-level array is a lesson:
```json
{ "name": "Lesson 1", "words": [ { "de": "...", "en": "...", "allowImage": true } ] }
```
Optional fields per word: `en_info` (displayed as extra hint).

### Adding a new question/answer mode

1. Create `vocab/question/question-<name>.js` or `vocab/answer/answer-<name>.js` as a Web Component.
2. Import it at the top of `vocab/vocab.js`.
3. Add one or more `{ question, answer }` entries to the `MODES` array in `vocab/vocab.js`.

### Audio assets

Voice clips are pre-generated OpenAI TTS files. Filename convention: `assets/audio/voice/<normalized_word>_<voice>.mp3` where the word is lowercased with non-alphanumeric characters replaced by `_`, and voice is one of `alloy`, `ash`, `coral`, `nova`, `onyx`.

Generation scripts use an API key from `env.sh` (see `env.sh.template`). The `log/` directory (gitignored) holds request/response logs from generation runs.

### Avatar builder

`core/avatar-builder.js` is a self-contained Web Component (`<avatar-builder>`) with all artwork as inline SVG — no external image assets.

- **API**: `avatarBuilder.open()` / `avatarBuilder.close()`; fires `CustomEvent("avatar-saved")` on save.
- **Export**: `getAvatarSVG()` — returns the composite SVG string for the current saved avatar.
- **Layers** (bottom→top): `background`, `face`, `hair`, `eyes`, `mouth`, `glasses`, `accessory`. Each layer is a fragment inside a `200×200` viewBox. `glasses` and `accessory` have index 0 = "none".
- **Adding artwork**: add an entry `{ label, svg }` to the relevant array in `LAYERS` inside `avatar-builder.js`. No other changes needed.

### LocalStorage keys

- `points` — persisted point total
- `streakRecord` — all-time best streak
- `vocabHelpSeen` — set after the onboarding tutorial is dismissed
- `avatarSelection` — JSON object `{ background, face, hair, eyes, mouth, glasses, accessory }` (indices into each LAYERS array)