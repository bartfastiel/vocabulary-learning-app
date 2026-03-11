// game/numbertap-game.js
// Zahlen Tippen: Tap numbers 1–25 in order as fast as possible.
// Fires CustomEvent("game-over", { bubbles: true, detail: { score, pointsEarned } })

class NumberTapGame extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._next = 1;
        this._max = 25;
        this._startTime = 0;
        this._timerId = null;
    }

    connectedCallback() {
        this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          width: 100%; height: 100%;
          background: radial-gradient(ellipse at top, #1a1a3e 0%, #0d0d20 100%);
          font-family: "Segoe UI", sans-serif; user-select: none;
        }
        #hud {
          color: white; font-size: 1.1rem; font-weight: bold;
          margin-bottom: 0.8rem; display: flex; gap: 2rem;
        }
        #board {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: clamp(6px, 1.5vw, 10px);
          width: min(380px, 92vw);
        }
        .num-btn {
          aspect-ratio: 1;
          border: 2px solid rgba(255,255,255,0.2);
          border-radius: 12px;
          background: linear-gradient(135deg, #1a237e, #283593);
          color: white;
          font-size: clamp(1.1rem, 4vw, 1.6rem);
          font-weight: bold;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: transform 0.1s, background 0.15s, border-color 0.15s;
        }
        .num-btn:hover {
          border-color: #4dd0e1;
          transform: scale(1.05);
        }
        .num-btn:active { transform: scale(0.92); }
        .num-btn.done {
          background: #66BB6A;
          border-color: #66BB6A;
          opacity: 0.5;
          cursor: default;
          pointer-events: none;
        }
        .num-btn.wrong {
          animation: shake 0.3s;
          border-color: #EF5350;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
      </style>
      <div id="hud">
        <span>Nächste: <span id="next">1</span></span>
        <span>⏱ <span id="time">0.0</span>s</span>
      </div>
      <div id="board"></div>`;

        this._buildBoard();
    }

    disconnectedCallback() {
        clearInterval(this._timerId);
    }

    _buildBoard() {
        const nums = Array.from({ length: this._max }, (_, i) => i + 1);
        // shuffle
        for (let i = nums.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [nums[i], nums[j]] = [nums[j], nums[i]];
        }

        const board = this.shadowRoot.getElementById("board");
        board.innerHTML = "";
        nums.forEach(n => {
            const btn = document.createElement("button");
            btn.className = "num-btn";
            btn.textContent = n;
            btn.dataset.num = n;
            btn.addEventListener("pointerdown", () => this._tap(btn, n));
            board.appendChild(btn);
        });
    }

    _tap(btn, n) {
        if (n !== this._next) {
            btn.classList.add("wrong");
            setTimeout(() => btn.classList.remove("wrong"), 300);
            return;
        }

        // start timer on first tap
        if (this._next === 1) {
            this._startTime = performance.now();
            this._timerId = setInterval(() => {
                const elapsed = ((performance.now() - this._startTime) / 1000).toFixed(1);
                this.shadowRoot.getElementById("time").textContent = elapsed;
            }, 100);
        }

        btn.classList.add("done");
        this._next++;
        this.shadowRoot.getElementById("next").textContent =
            this._next <= this._max ? this._next : "✅";

        if (this._next > this._max) {
            this._end();
        }
    }

    _end() {
        clearInterval(this._timerId);
        const elapsed = Math.round((performance.now() - this._startTime) / 1000);
        this.shadowRoot.getElementById("time").textContent = elapsed.toFixed(1);

        setTimeout(() => {
            this.dispatchEvent(new CustomEvent("game-over", {
                bubbles: true,
                detail: { score: elapsed, pointsEarned: 0 },
            }));
        }, 600);
    }
}

customElements.define("numbertap-game", NumberTapGame);
