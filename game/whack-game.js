// game/whack-game.js
// Whack-a-Mole: hit moles popping out of holes. 30 seconds. Score = hits.
// Fires CustomEvent("game-over", { bubbles: true, detail: { score, pointsEarned } })

class WhackGame extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._score = 0;
        this._timeLeft = 30;
        this._running = false;
        this._timerId = null;
        this._spawnId = null;
    }

    connectedCallback() {
        this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          width: 100%; height: 100%;
          background: radial-gradient(ellipse at bottom, #2d5016 0%, #1a2e0a 60%, #0d1a05 100%);
          font-family: "Segoe UI", sans-serif; user-select: none;
        }
        #hud {
          display: flex; justify-content: space-between; width: min(400px, 90vw);
          color: white; font-size: 1.1rem; font-weight: bold;
          margin-bottom: 0.8rem; padding: 0 0.5rem;
        }
        #board {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: clamp(12px, 3vw, 20px);
          width: min(400px, 90vw);
        }
        .hole {
          aspect-ratio: 1;
          background: radial-gradient(ellipse at center, #3d2b1f 0%, #2a1f14 100%);
          border-radius: 50%;
          border: 3px solid #5a3d2b;
          display: flex; align-items: center; justify-content: center;
          font-size: clamp(2rem, 8vw, 3.5rem);
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: border-color 0.1s;
        }
        .hole:hover { border-color: #8B6914; }
        .mole {
          position: absolute; bottom: -100%; transition: bottom 0.15s ease-out;
          font-size: clamp(2rem, 8vw, 3.5rem);
          pointer-events: none;
        }
        .hole.active .mole { bottom: 10%; }
        .hole.hit .mole { bottom: 10%; opacity: 0.3; }
        .hole.hit::after {
          content: "💥"; position: absolute; font-size: 2rem;
          animation: pop 0.3s ease-out forwards;
        }
        @keyframes pop {
          0%   { transform: scale(0.5); opacity: 1; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        #timer-bar {
          width: min(400px, 90vw); height: 6px;
          background: rgba(255,255,255,0.15); border-radius: 3px;
          margin-top: 1rem; overflow: hidden;
        }
        #timer-fill {
          height: 100%; width: 100%;
          background: linear-gradient(to right, #66BB6A, #FFEB3B, #FF5722);
          transition: width 1s linear;
        }
      </style>
      <div id="hud">
        <span>🔨 <span id="score">0</span></span>
        <span>⏱ <span id="timer">30</span>s</span>
      </div>
      <div id="board"></div>
      <div id="timer-bar"><div id="timer-fill"></div></div>`;

        this._buildBoard();
        this._start();
    }

    disconnectedCallback() {
        this._stop();
    }

    _buildBoard() {
        const board = this.shadowRoot.getElementById("board");
        const moles = ["🐹", "🐭", "🐰", "🦔", "🐿️", "🐾"];
        for (let i = 0; i < 9; i++) {
            const hole = document.createElement("div");
            hole.className = "hole";
            hole.dataset.idx = i;
            const mole = document.createElement("span");
            mole.className = "mole";
            mole.textContent = moles[i % moles.length];
            hole.appendChild(mole);
            hole.addEventListener("pointerdown", () => this._whack(hole));
            board.appendChild(hole);
        }
    }

    _start() {
        this._running = true;
        this._timerId = setInterval(() => {
            this._timeLeft--;
            this.shadowRoot.getElementById("timer").textContent = this._timeLeft;
            this.shadowRoot.getElementById("timer-fill").style.width =
                `${(this._timeLeft / 30) * 100}%`;
            if (this._timeLeft <= 0) this._end();
        }, 1000);
        this._scheduleSpawn();
    }

    _stop() {
        this._running = false;
        clearInterval(this._timerId);
        clearTimeout(this._spawnId);
    }

    _scheduleSpawn() {
        if (!this._running) return;
        const delay = 400 + Math.random() * 800;
        this._spawnId = setTimeout(() => {
            if (this._running) { this._spawnMole(); this._scheduleSpawn(); }
        }, delay);
    }

    _spawnMole() {
        const holes = this.shadowRoot.querySelectorAll(".hole");
        const available = [...holes].filter(h => !h.classList.contains("active"));
        if (available.length === 0) return;
        const hole = available[Math.floor(Math.random() * available.length)];
        hole.classList.add("active");

        const stay = 800 + Math.random() * 700;
        setTimeout(() => {
            hole.classList.remove("active");
            hole.classList.remove("hit");
        }, stay);
    }

    _whack(hole) {
        if (!hole.classList.contains("active") || hole.classList.contains("hit")) return;
        hole.classList.add("hit");
        this._score++;
        this.shadowRoot.getElementById("score").textContent = this._score;
        setTimeout(() => {
            hole.classList.remove("active");
            hole.classList.remove("hit");
        }, 300);
    }

    _end() {
        this._stop();
        this.dispatchEvent(new CustomEvent("game-over", {
            bubbles: true,
            detail: { score: this._score, pointsEarned: 0 },
        }));
    }
}

customElements.define("whack-game", WhackGame);
