// game/reaction-game.js
// Tap/click colored targets before they vanish. 30 seconds, score = hits.
// Fires CustomEvent("game-over", { bubbles: true, detail: { score, pointsEarned } })

class ReactionGame extends HTMLElement {
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
          display: block;
          width: 100%; height: 100%;
          position: relative;
          background: radial-gradient(ellipse at top, #1a1a4e 0%, #0d0d26 100%);
          overflow: hidden;
          user-select: none;
          touch-action: none;
          font-family: "Segoe UI", sans-serif;
        }
        #hud {
          position: absolute;
          top: 0; left: 0; right: 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.8rem 1.2rem;
          color: white;
          font-size: 1.2rem;
          font-weight: bold;
          z-index: 10;
          background: rgba(0,0,0,0.3);
        }
        #timer-bar-wrap {
          position: absolute;
          top: 52px; left: 0; right: 0;
          height: 5px;
          background: rgba(255,255,255,0.15);
          z-index: 10;
        }
        #timer-bar {
          height: 100%;
          background: linear-gradient(to right, #4dd0e1, #e040fb);
          transition: width 1s linear;
          width: 100%;
        }
        #arena {
          position: absolute;
          inset: 57px 0 0 0;
        }
        .target {
          position: absolute;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.8rem;
          transform: scale(0);
          transition: transform 0.12s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 0 20px rgba(255,255,255,0.25);
          will-change: transform;
        }
        .target.pop { transform: scale(1); }
        .target.hit {
          transform: scale(1.4);
          opacity: 0;
          transition: transform 0.15s, opacity 0.15s;
        }
      </style>
      <div id="hud">
        <span>⚡ <span id="score">0</span></span>
        <span>⏱ <span id="timer">30</span>s</span>
      </div>
      <div id="timer-bar-wrap"><div id="timer-bar"></div></div>
      <div id="arena"></div>
    `;
        this._start();
    }

    disconnectedCallback() {
        this._stop();
    }

    _start() {
        this._running = true;
        this._timerId = setInterval(() => {
            this._timeLeft--;
            this.shadowRoot.getElementById("timer").textContent = this._timeLeft;
            this.shadowRoot.getElementById("timer-bar").style.width =
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
        const delay = 500 + Math.random() * 900;
        this._spawnId = setTimeout(() => {
            if (this._running) { this._spawnTarget(); this._scheduleSpawn(); }
        }, delay);
    }

    _spawnTarget() {
        const arena = this.shadowRoot.getElementById("arena");
        const colors = [
            "#FF6B6B","#4ECDC4","#45B7D1","#FFA07A","#98D8C8",
            "#FFD93D","#6BCB77","#E040FB","#FF6D00","#00E5FF",
        ];
        const emojis = ["⭐","🌟","💫","✨","🎯","💥","🌈","🍀","🎪","🔥"];
        const size = 58 + Math.random() * 28;
        const maxX = arena.offsetWidth  - size;
        const maxY = arena.offsetHeight - size;
        if (maxX < 10 || maxY < 10) return;

        const el = document.createElement("div");
        el.className = "target";
        el.style.cssText = `
      width:${size}px; height:${size}px;
      left:${Math.random() * maxX}px; top:${Math.random() * maxY}px;
      background:${colors[Math.floor(Math.random() * colors.length)]};
    `;
        el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        arena.appendChild(el);
        requestAnimationFrame(() => el.classList.add("pop"));

        const removeTimer = setTimeout(() => el.remove(), 1800);

        el.addEventListener("pointerdown", (e) => {
            e.stopPropagation();
            clearTimeout(removeTimer);
            el.classList.add("hit");
            this._score++;
            this.shadowRoot.getElementById("score").textContent = this._score;
            setTimeout(() => el.remove(), 180);
        }, { once: true });
    }

    _end() {
        this._stop();
        const pointsEarned = Math.min(10, Math.floor(this._score / 3));
        this.dispatchEvent(new CustomEvent("game-over", {
            bubbles: true,
            detail: { score: this._score, pointsEarned },
        }));
    }
}

customElements.define("reaction-game", ReactionGame);
