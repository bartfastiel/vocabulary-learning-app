// game/2048-game.js
// Zahlen Schieben: 2048-style tile merging puzzle.
// Fires CustomEvent("game-over", { bubbles: true, detail: { score, pointsEarned } })

const GRID = 4;
const TILE_COLORS = {
    2: "#eee4da", 4: "#ede0c8", 8: "#f2b179", 16: "#f59563",
    32: "#f67c5f", 64: "#f65e3b", 128: "#edcf72", 256: "#edcc61",
    512: "#edc850", 1024: "#edc53f", 2048: "#edc22e",
};
const DARK_TILES = new Set([8, 16, 32, 64, 128, 256, 512, 1024, 2048]);

class Game2048 extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._controller = new AbortController();
        this._score = 0;
        this._grid = [];
        this._gameOver = false;
    }

    connectedCallback() {
        this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          width: 100%; height: 100%;
          background: #faf8ef;
          font-family: "Segoe UI", sans-serif; user-select: none;
        }
        #hud {
          display: flex; gap: 1.5rem; margin-bottom: 0.8rem;
          font-size: 1.1rem; font-weight: bold; color: #776e65;
        }
        #board {
          display: grid; grid-template-columns: repeat(${GRID}, 1fr);
          gap: 8px; padding: 8px;
          background: #bbada0; border-radius: 8px;
          width: min(340px, 88vw); aspect-ratio: 1;
        }
        .tile {
          border-radius: 6px;
          display: flex; align-items: center; justify-content: center;
          font-weight: bold;
          transition: transform 0.1s;
        }
      </style>
      <div id="hud">
        <span>Punkte: <span id="score">0</span></span>
      </div>
      <div id="board"></div>`;

        this._initGrid();
        this._spawn();
        this._spawn();
        this._render();
        this._bindInput();
    }

    disconnectedCallback() {
        this._controller.abort();
    }

    _initGrid() {
        this._grid = Array.from({ length: GRID }, () => Array(GRID).fill(0));
    }

    _spawn() {
        const empty = [];
        for (let r = 0; r < GRID; r++)
            for (let c = 0; c < GRID; c++)
                if (this._grid[r][c] === 0) empty.push({ r, c });
        if (empty.length === 0) return;
        const cell = empty[Math.floor(Math.random() * empty.length)];
        this._grid[cell.r][cell.c] = Math.random() < 0.9 ? 2 : 4;
    }

    _bindInput() {
        const sig = { signal: this._controller.signal };
        const dirs = {
            ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
            w: "up", s: "down", a: "left", d: "right",
        };
        document.addEventListener("keydown", e => {
            if (dirs[e.key] && !this._gameOver) {
                e.preventDefault();
                this._move(dirs[e.key]);
            }
        }, sig);

        let tx, ty;
        const board = this.shadowRoot.getElementById("board");
        board.addEventListener("touchstart", e => {
            tx = e.touches[0].clientX; ty = e.touches[0].clientY;
        }, { ...sig, passive: true });
        board.addEventListener("touchend", e => {
            if (this._gameOver) return;
            const dx = e.changedTouches[0].clientX - tx;
            const dy = e.changedTouches[0].clientY - ty;
            if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
            if (Math.abs(dx) > Math.abs(dy)) this._move(dx > 0 ? "right" : "left");
            else this._move(dy > 0 ? "down" : "up");
        }, { ...sig, passive: true });
    }

    _move(dir) {
        const prev = JSON.stringify(this._grid);
        const rotated = dir === "up" || dir === "down";
        const reversed = dir === "right" || dir === "down";

        for (let i = 0; i < GRID; i++) {
            let line = [];
            for (let j = 0; j < GRID; j++) {
                const r = rotated ? j : i;
                const c = rotated ? i : j;
                line.push(this._grid[r][c]);
            }
            if (reversed) line.reverse();

            // compress
            line = line.filter(v => v !== 0);
            for (let k = 0; k < line.length - 1; k++) {
                if (line[k] === line[k + 1]) {
                    line[k] *= 2;
                    this._score += line[k];
                    line.splice(k + 1, 1);
                }
            }
            while (line.length < GRID) line.push(0);
            if (reversed) line.reverse();

            for (let j = 0; j < GRID; j++) {
                const r = rotated ? j : i;
                const c = rotated ? i : j;
                this._grid[r][c] = line[j];
            }
        }

        if (JSON.stringify(this._grid) !== prev) {
            this._spawn();
            this._render();
            if (this._checkGameOver()) {
                this._gameOver = true;
                this._end();
            }
        }
    }

    _checkGameOver() {
        for (let r = 0; r < GRID; r++)
            for (let c = 0; c < GRID; c++) {
                if (this._grid[r][c] === 0) return false;
                if (c < GRID - 1 && this._grid[r][c] === this._grid[r][c + 1]) return false;
                if (r < GRID - 1 && this._grid[r][c] === this._grid[r + 1][c]) return false;
            }
        return true;
    }

    _render() {
        this.shadowRoot.getElementById("score").textContent = this._score;
        const board = this.shadowRoot.getElementById("board");
        board.innerHTML = "";
        for (let r = 0; r < GRID; r++) {
            for (let c = 0; c < GRID; c++) {
                const v = this._grid[r][c];
                const tile = document.createElement("div");
                tile.className = "tile";
                const bg = v > 0 ? (TILE_COLORS[v] || "#3c3a32") : "rgba(238,228,218,0.35)";
                const color = v === 0 ? "transparent" : (DARK_TILES.has(v) || v > 2048 ? "white" : "#776e65");
                const fontSize = v >= 1024 ? "clamp(1rem, 4vw, 1.4rem)" :
                                 v >= 128 ? "clamp(1.2rem, 5vw, 1.7rem)" :
                                 "clamp(1.4rem, 6vw, 2rem)";
                tile.style.cssText = `background:${bg};color:${color};font-size:${fontSize};`;
                tile.textContent = v || "";
                board.appendChild(tile);
            }
        }
    }

    _end() {
        setTimeout(() => {
            this.dispatchEvent(new CustomEvent("game-over", {
                bubbles: true, detail: { score: this._score, pointsEarned: 0 },
            }));
        }, 800);
    }
}

customElements.define("game-2048", Game2048);
