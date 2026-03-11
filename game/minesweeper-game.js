// game/minesweeper-game.js
// Minenfeld: Classic Minesweeper. Uncover all safe cells without hitting a mine.
// Fires CustomEvent("game-over", { bubbles: true, detail: { score, pointsEarned } })

const MS_ROWS = 9, MS_COLS = 9, MS_MINES = 10;

class MinesweeperGame extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._board = [];
        this._revealed = [];
        this._flagged = [];
        this._gameOver = false;
        this._won = false;
        this._firstClick = true;
        this._seconds = 0;
        this._timerId = null;
    }

    connectedCallback() {
        this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          width: 100%; height: 100%;
          background: #e0e0e0;
          font-family: "Segoe UI", sans-serif; user-select: none;
        }
        #hud {
          display: flex; gap: 1.5rem; margin-bottom: 0.6rem;
          font-size: 1rem; font-weight: bold; color: #333;
        }
        #grid {
          display: grid;
          grid-template-columns: repeat(${MS_COLS}, 1fr);
          gap: 2px;
          padding: 4px;
          background: #999;
          border-radius: 4px;
          width: min(320px, 90vw);
        }
        .cell {
          aspect-ratio: 1;
          display: flex; align-items: center; justify-content: center;
          font-weight: bold;
          cursor: pointer;
          border-radius: 2px;
          font-size: clamp(0.8rem, 3vw, 1.1rem);
          transition: background 0.1s;
        }
        .cell.hidden {
          background: #bdbdbd;
          box-shadow: inset 1px 1px 2px rgba(255,255,255,0.5), inset -1px -1px 2px rgba(0,0,0,0.2);
        }
        .cell.hidden:hover { background: #ccc; }
        .cell.revealed { background: #e8e8e8; }
        .cell.mine { background: #ff5252; }
        .cell.flagged::after { content: "🚩"; }
        .c1 { color: #1976D2; } .c2 { color: #388E3C; }
        .c3 { color: #D32F2F; } .c4 { color: #7B1FA2; }
        .c5 { color: #FF8F00; } .c6 { color: #00838F; }
        .c7 { color: #333; } .c8 { color: #888; }
        #hint {
          margin-top: 0.5rem; color: #666; font-size: 0.8rem;
        }
      </style>
      <div id="hud">
        <span>💣 <span id="mines-left">${MS_MINES}</span></span>
        <span>⏱ <span id="time">0</span>s</span>
      </div>
      <div id="grid"></div>
      <div id="hint">Rechtsklick / langes Tippen = Flagge</div>`;

        this._initBoard();
        this._render();
    }

    disconnectedCallback() {
        clearInterval(this._timerId);
    }

    _initBoard() {
        this._board = Array.from({ length: MS_ROWS }, () => Array(MS_COLS).fill(0));
        this._revealed = Array.from({ length: MS_ROWS }, () => Array(MS_COLS).fill(false));
        this._flagged = Array.from({ length: MS_ROWS }, () => Array(MS_COLS).fill(false));
    }

    _placeMines(safeR, safeC) {
        let placed = 0;
        while (placed < MS_MINES) {
            const r = Math.floor(Math.random() * MS_ROWS);
            const c = Math.floor(Math.random() * MS_COLS);
            if (this._board[r][c] === -1) continue;
            if (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1) continue;
            this._board[r][c] = -1;
            placed++;
        }
        // compute numbers
        for (let r = 0; r < MS_ROWS; r++)
            for (let c = 0; c < MS_COLS; c++) {
                if (this._board[r][c] === -1) continue;
                let count = 0;
                for (let dr = -1; dr <= 1; dr++)
                    for (let dc = -1; dc <= 1; dc++) {
                        const nr = r + dr, nc = c + dc;
                        if (nr >= 0 && nr < MS_ROWS && nc >= 0 && nc < MS_COLS && this._board[nr][nc] === -1)
                            count++;
                    }
                this._board[r][c] = count;
            }
    }

    _reveal(r, c) {
        if (r < 0 || r >= MS_ROWS || c < 0 || c >= MS_COLS) return;
        if (this._revealed[r][c] || this._flagged[r][c]) return;
        this._revealed[r][c] = true;

        if (this._board[r][c] === 0) {
            for (let dr = -1; dr <= 1; dr++)
                for (let dc = -1; dc <= 1; dc++)
                    this._reveal(r + dr, c + dc);
        }
    }

    _checkWin() {
        let unrevealed = 0;
        for (let r = 0; r < MS_ROWS; r++)
            for (let c = 0; c < MS_COLS; c++)
                if (!this._revealed[r][c]) unrevealed++;
        return unrevealed === MS_MINES;
    }

    _render() {
        const grid = this.shadowRoot.getElementById("grid");
        grid.innerHTML = "";

        const flagCount = this._flagged.flat().filter(Boolean).length;
        this.shadowRoot.getElementById("mines-left").textContent = MS_MINES - flagCount;

        for (let r = 0; r < MS_ROWS; r++) {
            for (let c = 0; c < MS_COLS; c++) {
                const cell = document.createElement("div");
                cell.className = "cell";

                if (this._revealed[r][c]) {
                    if (this._board[r][c] === -1) {
                        cell.classList.add("mine");
                        cell.textContent = "💣";
                    } else {
                        cell.classList.add("revealed");
                        if (this._board[r][c] > 0) {
                            cell.textContent = this._board[r][c];
                            cell.classList.add(`c${this._board[r][c]}`);
                        }
                    }
                } else {
                    cell.classList.add("hidden");
                    if (this._flagged[r][c]) cell.classList.add("flagged");

                    cell.addEventListener("click", () => this._onClick(r, c));
                    cell.addEventListener("contextmenu", e => {
                        e.preventDefault();
                        this._toggleFlag(r, c);
                    });
                    // long press for mobile
                    let pressTimer;
                    cell.addEventListener("touchstart", () => {
                        pressTimer = setTimeout(() => {
                            this._toggleFlag(r, c);
                            pressTimer = null;
                        }, 400);
                    }, { passive: true });
                    cell.addEventListener("touchend", () => {
                        if (pressTimer) { clearTimeout(pressTimer); this._onClick(r, c); }
                    }, { passive: true });
                    cell.addEventListener("touchmove", () => clearTimeout(pressTimer), { passive: true });
                }

                grid.appendChild(cell);
            }
        }
    }

    _onClick(r, c) {
        if (this._gameOver || this._flagged[r][c]) return;

        if (this._firstClick) {
            this._firstClick = false;
            this._placeMines(r, c);
            this._timerId = setInterval(() => {
                this._seconds++;
                this.shadowRoot.getElementById("time").textContent = this._seconds;
            }, 1000);
        }

        if (this._board[r][c] === -1) {
            // boom
            this._revealed[r][c] = true;
            this._gameOver = true;
            // reveal all mines
            for (let rr = 0; rr < MS_ROWS; rr++)
                for (let cc = 0; cc < MS_COLS; cc++)
                    if (this._board[rr][cc] === -1) this._revealed[rr][cc] = true;
            this._render();
            this._end(false);
            return;
        }

        this._reveal(r, c);
        this._render();

        if (this._checkWin()) {
            this._gameOver = true;
            this._won = true;
            this._end(true);
        }
    }

    _toggleFlag(r, c) {
        if (this._gameOver || this._revealed[r][c]) return;
        this._flagged[r][c] = !this._flagged[r][c];
        this._render();
    }

    _end(won) {
        clearInterval(this._timerId);
        setTimeout(() => {
            this.dispatchEvent(new CustomEvent("game-over", {
                bubbles: true,
                detail: { score: won ? this._seconds : 0, pointsEarned: 0 },
            }));
        }, 1000);
    }
}

customElements.define("minesweeper-game", MinesweeperGame);
