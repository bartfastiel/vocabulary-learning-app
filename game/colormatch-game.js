// game/colormatch-game.js
// Color Match: A color name is shown in a DIFFERENT ink color. Tap the button
// matching the INK color (not the word). 30 seconds. Score = correct taps.
// Fires CustomEvent("game-over", { bubbles: true, detail: { score, pointsEarned } })

const COLORS = [
    { name: "Rot",    hex: "#EF5350" },
    { name: "Blau",   hex: "#42A5F5" },
    { name: "Grün",   hex: "#66BB6A" },
    { name: "Gelb",   hex: "#FFEE58" },
    { name: "Lila",   hex: "#AB47BC" },
    { name: "Orange", hex: "#FFA726" },
];

class ColorMatchGame extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._score = 0;
        this._timeLeft = 30;
        this._running = false;
        this._timerId = null;
        this._correctIdx = 0;
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
          display: flex; gap: 2rem; color: white; font-size: 1.1rem;
          font-weight: bold; margin-bottom: 1.5rem;
        }
        #prompt {
          font-size: clamp(2.5rem, 10vw, 4rem);
          font-weight: 900;
          margin-bottom: 1.5rem;
          text-shadow: 0 4px 20px rgba(0,0,0,0.5);
          transition: color 0.15s;
        }
        #hint {
          color: rgba(255,255,255,0.5);
          font-size: 0.9rem;
          margin-bottom: 1rem;
        }
        #buttons {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: clamp(8px, 2vw, 14px);
          width: min(380px, 90vw);
        }
        .color-btn {
          padding: clamp(0.7rem, 2.5vw, 1.1rem);
          border: 3px solid transparent;
          border-radius: 12px;
          font-size: clamp(0.9rem, 3vw, 1.1rem);
          font-weight: bold;
          color: white;
          cursor: pointer;
          transition: transform 0.1s, border-color 0.15s, box-shadow 0.15s;
          text-shadow: 0 1px 3px rgba(0,0,0,0.4);
        }
        .color-btn:hover {
          transform: scale(1.06);
          box-shadow: 0 4px 16px rgba(0,0,0,0.4);
        }
        .color-btn:active { transform: scale(0.95); }
        .color-btn.correct {
          border-color: #66BB6A;
          box-shadow: 0 0 20px rgba(102,187,106,0.5);
        }
        .color-btn.wrong {
          border-color: #EF5350;
          box-shadow: 0 0 20px rgba(239,83,80,0.5);
        }
        #feedback {
          margin-top: 1rem; font-size: 1.5rem; height: 2rem;
        }
        #timer-bar {
          width: min(380px, 90vw); height: 6px;
          background: rgba(255,255,255,0.15); border-radius: 3px;
          margin-top: 1.2rem; overflow: hidden;
        }
        #timer-fill {
          height: 100%; width: 100%;
          background: linear-gradient(to right, #4dd0e1, #e040fb);
          transition: width 1s linear;
        }
      </style>
      <div id="hud">
        <span>✅ <span id="score">0</span></span>
        <span>⏱ <span id="timer">30</span>s</span>
      </div>
      <div id="hint">Tippe die FARBE der Schrift!</div>
      <div id="prompt">---</div>
      <div id="buttons"></div>
      <div id="feedback"></div>
      <div id="timer-bar"><div id="timer-fill"></div></div>`;

        this._buildButtons();
        this._nextRound();
        this._start();
    }

    disconnectedCallback() {
        clearInterval(this._timerId);
    }

    _buildButtons() {
        const container = this.shadowRoot.getElementById("buttons");
        COLORS.forEach((c, i) => {
            const btn = document.createElement("button");
            btn.className = "color-btn";
            btn.textContent = c.name;
            btn.style.background = c.hex;
            btn.dataset.idx = i;
            btn.addEventListener("pointerdown", () => this._choose(i));
            container.appendChild(btn);
        });
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
    }

    _nextRound() {
        // pick random word and random (different) ink color
        const wordIdx = Math.floor(Math.random() * COLORS.length);
        let inkIdx;
        do { inkIdx = Math.floor(Math.random() * COLORS.length); } while (inkIdx === wordIdx);

        this._correctIdx = inkIdx;
        const prompt = this.shadowRoot.getElementById("prompt");
        prompt.textContent = COLORS[wordIdx].name;
        prompt.style.color = COLORS[inkIdx].hex;

        // clear feedback
        this.shadowRoot.getElementById("feedback").textContent = "";
        this.shadowRoot.querySelectorAll(".color-btn").forEach(b => {
            b.classList.remove("correct", "wrong");
        });
    }

    _choose(idx) {
        if (!this._running) return;
        const btns = this.shadowRoot.querySelectorAll(".color-btn");
        const fb = this.shadowRoot.getElementById("feedback");

        if (idx === this._correctIdx) {
            this._score++;
            this.shadowRoot.getElementById("score").textContent = this._score;
            btns[idx].classList.add("correct");
            fb.textContent = "✅";
        } else {
            btns[idx].classList.add("wrong");
            btns[this._correctIdx].classList.add("correct");
            fb.textContent = "❌";
        }

        setTimeout(() => this._nextRound(), 400);
    }

    _end() {
        this._running = false;
        clearInterval(this._timerId);
        this.dispatchEvent(new CustomEvent("game-over", {
            bubbles: true,
            detail: { score: this._score, pointsEarned: 0 },
        }));
    }
}

customElements.define("colormatch-game", ColorMatchGame);
