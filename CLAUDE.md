# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the App

The app is plain HTML/JS served from a static file server. A `package.json` exists for dev tooling (testing).

```sh
npm install          # install dev dependencies (first time)
npx serve . -l 8080  # serve the app
```

Then open `http://localhost:8080` in a browser.

## Testing (MANDATORY)

**Quality gate: All tests MUST pass before any push.** A pre-push hook enforces this automatically.

### Test Stack

- **Vitest** — unit tests (jsdom environment) for isolated modules
- **Playwright** — E2E tests (Chromium) for all user flows
- **v8** — coverage provider

### Running Tests

```sh
npm test                    # run ALL tests (unit + E2E) — this is what the pre-push hook runs
npm run test:unit           # unit tests only
npm run test:e2e            # E2E tests only
npm run test:e2e:headed     # E2E with visible browser (debugging)
npm run test:unit:watch     # unit tests in watch mode
npm run test:coverage       # unit tests with coverage report
```

### Test Structure

```
tests/
  unit/               # Vitest unit tests
    points.test.js    # PointsManager: points, streaks, treasure, dev mode
    profiles.test.js  # Profile CRUD, activation, snapshots, avatar
    audio.test.js     # playSound, playVoice, normalization
  e2e/                # Playwright E2E tests
    helpers.js        # Shared helpers (freshStart, waitForAppShell, etc.)
    app-loads.spec.js # App loads without errors, shadow DOM present
    dashboard.spec.js # Topbar, subject cards, stats, action buttons
    navigation.spec.js# Subject navigation, back button
    vocab-trainer.spec.js  # Full vocab training flow
    vocab-data.spec.js     # vocab.json integrity (structure, duplicates)
    math-trainer.spec.js   # Math trainer renders and has interactive elements
    deutsch-trainer.spec.js# Deutsch trainer renders
    game-lobby.spec.js     # Game lobby opens, shows games
    avatar-builder.spec.js # Avatar builder opens, has controls
    profiles.spec.js       # Profile persistence in browser
    localStorage.spec.js   # All localStorage integrations
```

### Pre-push Hook

`.githooks/pre-push` runs automatically before every `git push`:
1. Unit tests (Vitest)
2. E2E tests (Playwright)
3. Static checks (vocab.json validity)

Git is configured to use `.githooks/` via `core.hooksPath`.

### Writing New Tests

When adding a new feature:
1. Write E2E test first (in `tests/e2e/`) covering the user flow
2. Add unit tests (in `tests/unit/`) for any new isolated logic
3. Run `npm test` to verify everything passes
4. Only then commit

### Coverage

Unit test coverage for core modules:
- `audio.js` — 100%
- `points.js` — 100%
- `profiles.js` — 84%

E2E tests cover all remaining UI components and user flows (42 tests across 11 spec files). Web Components with Shadow DOM are not measurable via v8 coverage in jsdom, so E2E tests are the primary safety net for UI components.

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