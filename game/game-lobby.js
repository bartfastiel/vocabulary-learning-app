// game/game-lobby.js
//
// Central hub for all fun-games.
// Usage (from app-shell):
//   gameLobby.pointsManager = pointsManager;
//   gameLobby.open();
//
// Internally manages three screens: list → playing → result.
// Deducts cost on game start, awards pointsEarned on game end.
// All events from child game components are caught on this.shadowRoot.

import "./rocket-game.js";
import "./flappy-game.js";
import "./jump-game.js";
import "./reaction-game.js";
import "./memory-game.js";
import "./snake-game.js";
import "./breakout-game.js";
import "./catcher-game.js";
import "./tetris-game.js";
import "./invaders-game.js";
import "./pong-game.js";
import "./whack-game.js";
import "./colormatch-game.js";
import "./maze-game.js";
import "./bubble-game.js";
import "./numbertap-game.js";
import "./dodge-game.js";
import "./platformer-game.js";
import "./pacman-game.js";
import "./doodlejump-game.js";
import "./2048-game.js";
import "./minesweeper-game.js";
import "./asteroids-game.js";

const HS_KEY = "gameHighscores";

const GAMES = [
    {
        id: "reaction", label: "Reaktion",      emoji: "⚡",
        cost: 1,  maxEarn: 0,
        component: "reaction-game",
        desc: "Treffe 30s lang alle Ziele!",
        scoreLabel: "Treffer",
    },
    {
        id: "memory",   label: "Paare Finden",   emoji: "🃏",
        cost: 1,  maxEarn: 0,
        component: "memory-game",
        desc: "Finde alle Emoji-Paare!",
        scoreLabel: "Züge",
    },
    {
        id: "jump",     label: "Endlos Lauf",    emoji: "🏃",
        cost: 1,  maxEarn: 0,
        component: "jump-game",
        desc: "Überspringe Hindernisse!",
        scoreLabel: "Sekunden",
    },
    {
        id: "flappy",   label: "Flatter Vogel",  emoji: "🐦",
        cost: 1,  maxEarn: 0,
        component: "flappy-game",
        desc: "Fliege durch die Rohre!",
        scoreLabel: "Rohre",
    },
    {
        id: "snake",    label: "Schlange",         emoji: "🐍",
        cost: 1,  maxEarn: 0,
        component: "snake-game",
        desc: "Iss Äpfel, weiche dir selbst aus!",
        scoreLabel: "Äpfel",
    },
    {
        id: "breakout", label: "Mauer Brecher",     emoji: "🧱",
        cost: 1,  maxEarn: 0,
        component: "breakout-game",
        desc: "Zerstöre alle Blöcke!",
        scoreLabel: "Blöcke",
    },
    {
        id: "catcher",  label: "Fänger",            emoji: "🧺",
        cost: 2,  maxEarn: 0,
        component: "catcher-game",
        desc: "Fange Sterne, meide Bomben!",
        scoreLabel: "Gefangen",
    },
    {
        id: "rocket",   label: "Rakete",            emoji: "🚀",
        cost: 1,  maxEarn: 0,
        component: "rocket-game",
        desc: "Schieße Münzen ab!",
        scoreLabel: null,
    },
    {
        id: "tetris",   label: "Blöcke Stapeln",      emoji: "🟦",
        cost: 2,  maxEarn: 0,
        component: "tetris-game",
        desc: "Stapele Blöcke & räume Reihen!",
        scoreLabel: "Punkte",
    },
    {
        id: "invaders", label: "Weltraum Angriff",   emoji: "👾",
        cost: 2,  maxEarn: 0,
        component: "invaders-game",
        desc: "Vernichte die Alien-Flotte!",
        scoreLabel: "Punkte",
    },
    {
        id: "pong",     label: "Tischtennis",        emoji: "🏓",
        cost: 1,  maxEarn: 0,
        component: "pong-game",
        desc: "Klassisches Pong gegen den Computer!",
        scoreLabel: "Tore",
    },
    {
        id: "whack",    label: "Maulwurf Klopfen",   emoji: "🔨",
        cost: 1,  maxEarn: 0,
        component: "whack-game",
        desc: "Triff die Maulwürfe bevor sie verschwinden!",
        scoreLabel: "Treffer",
    },
    {
        id: "colormatch", label: "Farben-Rätsel",    emoji: "🎨",
        cost: 1,  maxEarn: 0,
        component: "colormatch-game",
        desc: "Tippe die Farbe der Schrift, nicht das Wort!",
        scoreLabel: "Richtige",
    },
    {
        id: "maze",     label: "Labyrinth",          emoji: "🧩",
        cost: 1,  maxEarn: 0,
        component: "maze-game",
        desc: "Finde den Weg durch 5 Labyrinthe!",
        scoreLabel: "Sekunden",
    },
    {
        id: "bubble",   label: "Blasen Platzen",     emoji: "🫧",
        cost: 1,  maxEarn: 0,
        component: "bubble-game",
        desc: "Platze die Blasen bevor sie entwischen!",
        scoreLabel: "Geplatzt",
    },
    {
        id: "numbertap", label: "Zahlen Tippen",     emoji: "🔢",
        cost: 1,  maxEarn: 0,
        component: "numbertap-game",
        desc: "Tippe 1 bis 25 so schnell du kannst!",
        scoreLabel: "Sekunden",
    },
    {
        id: "dodge",    label: "Ausweichen",         emoji: "🛡️",
        cost: 1,  maxEarn: 0,
        component: "dodge-game",
        desc: "Weiche den Hindernissen aus!",
        scoreLabel: "Sekunden",
    },
    {
        id: "platformer", label: "Hüpfelt",          emoji: "🦸",
        cost: 2,  maxEarn: 0,
        component: "platformer-game",
        desc: "Sammle Münzen, besiege Gegner, erreiche die Flagge!",
        scoreLabel: "Punkte",
    },
    {
        id: "pacman",   label: "Punktefresser",      emoji: "🟡",
        cost: 2,  maxEarn: 0,
        component: "pacman-game",
        desc: "Friss alle Punkte, weiche den Geistern aus!",
        scoreLabel: "Punkte",
    },
    {
        id: "doodlejump", label: "Hoch Springer",    emoji: "🐸",
        cost: 1,  maxEarn: 0,
        component: "doodlejump-game",
        desc: "Spring so hoch wie möglich!",
        scoreLabel: "Meter",
    },
    {
        id: "2048",     label: "Zahlen Schieben",    emoji: "🔢",
        cost: 1,  maxEarn: 0,
        component: "game-2048",
        desc: "Schiebe Zahlen zusammen bis 2048!",
        scoreLabel: "Punkte",
    },
    {
        id: "minesweeper", label: "Minenfeld",       emoji: "💣",
        cost: 1,  maxEarn: 0,
        component: "minesweeper-game",
        desc: "Finde alle Minen ohne zu explodieren!",
        scoreLabel: "Sekunden",
    },
    {
        id: "asteroids", label: "Weltraum Pilot",    emoji: "☄️",
        cost: 2,  maxEarn: 0,
        component: "asteroids-game",
        desc: "Zerstöre Asteroiden mit deinem Raumschiff!",
        scoreLabel: "Punkte",
    },
];

function getHighscores() {
    try { return JSON.parse(localStorage.getItem(HS_KEY) || "{}"); } catch { return {}; }
}
function saveHighscore(id, score) {
    const hs = getHighscores();
    if (score > (hs[id] ?? -1)) { hs[id] = score; localStorage.setItem(HS_KEY, JSON.stringify(hs)); return true; }
    return false;
}

// ─── component ────────────────────────────────────────────────────────────────

class GameLobby extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this.pointsManager = null;
        this._activeGame   = null;
    }

    connectedCallback() {
        this._renderShell();
        this._setupGlobalListeners();
    }

    // ── public API ────────────────────────────────────────────────────────────

    open() {
        this.shadowRoot.querySelector(".overlay").classList.add("active");
        this._showList();
    }

    close() {
        this._clearSlot();
        this.shadowRoot.querySelector(".overlay").classList.remove("active");
    }

    // ── shell ─────────────────────────────────────────────────────────────────

    _renderShell() {
        this.shadowRoot.innerHTML = `
      <style>
        .overlay {
          display: none;
          position: fixed; inset: 0; z-index: 1500;
          background: rgba(10,10,20,0.96);
          flex-direction: column;
        }
        .overlay.active { display: flex; }

        /* ── list screen ── */
        .list-screen {
          display: flex; flex-direction: column;
          height: 100%; overflow: hidden;
        }
        .lobby-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0.9rem 1rem 0.7rem;
          background: linear-gradient(135deg, #0d47a1, #1565c0);
          color: white; flex-shrink: 0;
          box-shadow: 0 2px 12px rgba(0,0,0,0.5);
        }
        .lobby-title { font-size: 1.2rem; font-weight: bold; }
        .points-badge {
          background: rgba(255,255,255,0.15);
          border-radius: 20px;
          padding: 0.3rem 0.8rem;
          font-size: 0.95rem;
          font-weight: bold;
        }
        .close-lobby-btn {
          background: rgba(255,255,255,0.15); border: none; color: white;
          font-size: 1.3rem; border-radius: 8px; padding: 0.3rem 0.6rem;
          cursor: pointer; transition: background 0.2s;
        }
        .close-lobby-btn:hover { background: rgba(255,255,255,0.3); }

        .games-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 0.9rem;
          padding: 1rem;
          overflow-y: auto;
          flex: 1;
        }

        .game-card {
          background: linear-gradient(135deg, #1a237e, #283593);
          border-radius: 14px;
          padding: 1rem 0.8rem;
          cursor: pointer;
          border: 2px solid transparent;
          transition: transform 0.15s, border-color 0.15s, box-shadow 0.15s;
          color: white;
          display: flex; flex-direction: column; align-items: center; gap: 0.4rem;
          user-select: none;
          position: relative;
        }
        .game-card:not(.locked):hover {
          transform: translateY(-3px);
          border-color: #4dd0e1;
          box-shadow: 0 6px 20px rgba(77,208,225,0.3);
        }
        .game-card.locked {
          opacity: 0.45; cursor: default; filter: grayscale(60%);
        }
        .card-emoji  { font-size: 2.4rem; }
        .card-label  { font-weight: bold; font-size: 1rem; }
        .card-desc   { font-size: 0.75rem; opacity: 0.8; text-align: center; }
        .card-cost   { font-size: 0.82rem; margin-top: 0.3rem;
                       background: rgba(255,255,255,0.12); border-radius: 10px;
                       padding: 0.2rem 0.6rem; }
        .card-hs     { font-size: 0.75rem; opacity: 0.6; }
        .locked-badge {
          position: absolute; top: 8px; right: 8px;
          font-size: 0.68rem; background: rgba(255,50,50,0.7);
          border-radius: 6px; padding: 0.1rem 0.4rem;
        }

        /* ── play screen ── */
        .play-screen {
          position: relative; width: 100%; height: 100%;
          display: flex; align-items: center; justify-content: center;
        }
        #game-slot {
          width: 100%; height: 100%;
          display: flex; align-items: center; justify-content: center;
        }
        .quit-btn {
          position: absolute; top: 10px; right: 10px; z-index: 10;
          background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3);
          color: white; border-radius: 8px; padding: 0.4rem 0.9rem;
          font-size: 0.9rem; cursor: pointer; transition: background 0.2s;
        }
        .quit-btn:hover { background: rgba(255,80,80,0.5); }

        /* ── result screen ── */
        .result-screen {
          display: flex; align-items: center; justify-content: center;
          width: 100%; height: 100%;
        }
        .result-card {
          background: white; border-radius: 20px;
          padding: 2rem 2.2rem; text-align: center;
          max-width: min(360px, 90vw);
          box-shadow: 0 20px 60px rgba(0,0,0,0.5);
          display: flex; flex-direction: column; align-items: center; gap: 0.6rem;
          animation: pop-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes pop-in {
          from { transform: scale(0.6); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
        .result-trophy { font-size: 3rem; }
        .result-title  { font-size: 1.4rem; font-weight: bold; color: #222; margin: 0; }
        .result-score  { font-size: 1rem; color: #555; }
        .result-points { font-size: 1.3rem; font-weight: bold; color: #007ea7; }
        .result-hs     { font-size: 0.9rem; color: #e65100; font-weight: bold; }
        .result-btns   { display: flex; gap: 0.7rem; margin-top: 0.6rem; flex-wrap: wrap; justify-content: center; }
        .result-btns button {
          padding: 0.6rem 1.2rem; border: none; border-radius: 10px;
          font-size: 0.95rem; font-weight: bold; cursor: pointer; transition: filter 0.2s;
        }
        .btn-again { background: #4dd0e1; color: white; }
        .btn-back  { background: #e0e0e0; color: #333; }
        .btn-again:hover, .btn-back:hover { filter: brightness(0.92); }
        .btn-again:disabled { opacity: 0.4; cursor: default; filter: none; }

        /* screen visibility */
        [hidden] { display: none !important; }
      </style>

      <div class="overlay">

        <!-- List -->
        <div class="list-screen" id="list-screen">
          <div class="lobby-header">
            <span class="lobby-title">🎮 Fun-Spiele</span>
            <span class="points-badge" id="lobby-points">… Punkte</span>
            <button class="close-lobby-btn">✕</button>
          </div>
          <div class="games-grid" id="games-grid"></div>
        </div>

        <!-- Playing -->
        <div class="play-screen" id="play-screen" hidden>
          <button class="quit-btn" id="quit-btn">✕ Beenden</button>
          <div id="game-slot"></div>
        </div>

        <!-- Result -->
        <div class="result-screen" id="result-screen" hidden>
          <div class="result-card">
            <div class="result-trophy" id="r-trophy">🏆</div>
            <p class="result-title"  id="r-title">Spiel beendet!</p>
            <p class="result-score"  id="r-score"></p>
            <p class="result-points" id="r-points"></p>
            <p class="result-hs"     id="r-hs"></p>
            <div class="result-btns">
              <button class="btn-again" id="btn-again">🔄 Nochmal</button>
              <button class="btn-back"  id="btn-back">🎮 Andere Spiele</button>
            </div>
          </div>
        </div>

      </div>`;

        // static button wiring
        this.shadowRoot.querySelector(".close-lobby-btn").onclick = () => this.close();
        this.shadowRoot.getElementById("btn-back").onclick  = () => this._showList();
        this.shadowRoot.getElementById("quit-btn").onclick  = () => this._handleQuit();
    }

    // ── listeners for game events ─────────────────────────────────────────────

    _setupGlobalListeners() {
        this.shadowRoot.addEventListener("game-over",   e => this._handleGameOver(e));
        this.shadowRoot.addEventListener("close-game",  ()  => this._handleCloseGame());
    }

    // ── screens ───────────────────────────────────────────────────────────────

    _showList() {
        this._clearSlot();
        this._activeGame = null;
        this.shadowRoot.getElementById("list-screen").hidden   = false;
        this.shadowRoot.getElementById("play-screen").hidden   = true;
        this.shadowRoot.getElementById("result-screen").hidden = true;
        this._renderCards();
    }

    _showPlay(game) {
        this.shadowRoot.getElementById("list-screen").hidden   = true;
        this.shadowRoot.getElementById("play-screen").hidden   = false;
        this.shadowRoot.getElementById("result-screen").hidden = true;

        // hide the lobby quit button for rocket-game (has its own)
        this.shadowRoot.getElementById("quit-btn").hidden = (game.id === "rocket");

        const el = document.createElement(game.component);
        this.shadowRoot.getElementById("game-slot").appendChild(el);
    }

    _showResult(score, pointsEarned, isNewHS) {
        this._clearSlot();
        this.shadowRoot.getElementById("list-screen").hidden   = true;
        this.shadowRoot.getElementById("play-screen").hidden   = true;
        this.shadowRoot.getElementById("result-screen").hidden = false;

        const game = this._activeGame;
        const trophy = pointsEarned > 0 ? "🏆" : "🎮";
        this.shadowRoot.getElementById("r-trophy").textContent  = trophy;
        this.shadowRoot.getElementById("r-title").textContent   = "Spiel beendet!";

        if (score !== null && game.scoreLabel) {
            this.shadowRoot.getElementById("r-score").textContent =
                `${game.scoreLabel}: ${score}`;
        } else {
            this.shadowRoot.getElementById("r-score").textContent = "";
        }

        this.shadowRoot.getElementById("r-points").textContent =
            pointsEarned > 0 ? `+${pointsEarned} Punkte gewonnen!` : "";

        this.shadowRoot.getElementById("r-hs").textContent =
            isNewHS ? "🎉 Neuer Highscore!" : "";

        // "Play again" — check if still affordable
        const canAfford = this._pm()?.points >= game.cost;
        const btnAgain  = this.shadowRoot.getElementById("btn-again");
        btnAgain.disabled = !canAfford;
        btnAgain.title    = canAfford ? "" : `Zu wenig Punkte (${game.cost} benötigt)`;
        btnAgain.onclick  = () => this._startGame(game.id);
    }

    // ── game lifecycle ────────────────────────────────────────────────────────

    _renderCards() {
        const pm = this._pm();
        const pts = pm?.points ?? 0;
        const hs  = getHighscores();
        const grid = this.shadowRoot.getElementById("games-grid");

        this.shadowRoot.getElementById("lobby-points").textContent =
            `${pts} Punkt${pts !== 1 ? "e" : ""}`;

        grid.innerHTML = GAMES.map(g => {
            const locked = pts < g.cost;
            const hsVal  = hs[g.id] != null ? hs[g.id] : null;
            const hsText = hsVal != null && g.scoreLabel
                ? `Highscore: ${hsVal} ${g.scoreLabel}`
                : hsVal != null ? `Gespielt` : `Noch nicht gespielt`;
            return `
        <div class="game-card${locked ? " locked" : ""}" data-id="${g.id}">
          ${locked ? `<span class="locked-badge">🔒 ${g.cost} Pkt.</span>` : ""}
          <span class="card-emoji">${g.emoji}</span>
          <span class="card-label">${g.label}</span>
          <span class="card-desc">${g.desc}</span>
          <span class="card-cost">💰 ${g.cost} Punkte</span>
          ${g.maxEarn > 0 ? `<span class="card-hs">▲ bis +${g.maxEarn} Pkt.</span>` : ""}
          <span class="card-hs">${hsText}</span>
        </div>`;
        }).join("");

        grid.querySelectorAll(".game-card:not(.locked)").forEach(card => {
            card.onclick = () => this._startGame(card.dataset.id);
        });
    }

    _startGame(id) {
        const game = GAMES.find(g => g.id === id);
        if (!game) return;
        const pm = this._pm();
        if (!pm || pm.points < game.cost) return;

        pm.updatePoints(-game.cost);
        this._activeGame = game;
        this._showPlay(game);
    }

    _clearSlot() {
        const slot = this.shadowRoot.getElementById("game-slot");
        if (slot) slot.innerHTML = "";
    }

    _handleGameOver(e) {
        if (!this._activeGame) return;
        const { score } = e.detail ?? {};
        const isNew = saveHighscore(this._activeGame.id, score ?? 0);
        this._showResult(score ?? null, 0, isNew);
    }

    _handleCloseGame() {
        if (!this._activeGame) return;
        // rocket-game: no score, no points earned; just show a minimal result
        this._showResult(null, 0, false);
    }

    _handleQuit() {
        this._clearSlot();
        this._showList();
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    _pm() { return this.pointsManager ?? null; }
}

customElements.define("game-lobby", GameLobby);
