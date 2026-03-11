// game/bubble-game.js
// Bubble Pop: tap rising bubbles before they escape. 30 seconds.
// Fires CustomEvent("game-over", { bubbles: true, detail: { score, pointsEarned } })

class BubbleGame extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._score = 0;
        this._missed = 0;
        this._timeLeft = 30;
        this._running = false;
        this._timerId = null;
        this._spawnId = null;
        this._raf = null;
        this._bubbles = [];
    }

    connectedCallback() {
        this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block; width: 100%; height: 100%; position: relative;
          background: linear-gradient(180deg, #0a1628 0%, #1a3a5c 50%, #2a6090 100%);
          overflow: hidden; user-select: none; touch-action: none;
          font-family: "Segoe UI", sans-serif;
        }
        #hud {
          position: absolute; top: 0; left: 0; right: 0;
          display: flex; justify-content: space-between; align-items: center;
          padding: 0.8rem 1.2rem; color: white; font-size: 1.1rem;
          font-weight: bold; z-index: 10; background: rgba(0,0,0,0.3);
        }
        #timer-bar {
          position: absolute; top: 50px; left: 0; right: 0;
          height: 4px; background: rgba(255,255,255,0.15); z-index: 10;
        }
        #timer-fill {
          height: 100%; width: 100%;
          background: linear-gradient(to right, #4dd0e1, #e040fb);
          transition: width 1s linear;
        }
        .bubble {
          position: absolute; border-radius: 50%; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: transform 0.1s;
          box-shadow: inset -4px -4px 10px rgba(0,0,0,0.15),
                      inset 4px 4px 10px rgba(255,255,255,0.3),
                      0 0 20px rgba(255,255,255,0.1);
        }
        .bubble:active { transform: scale(0.8); }
        .bubble.pop {
          transform: scale(1.5); opacity: 0;
          transition: transform 0.2s, opacity 0.2s;
        }
      </style>
      <div id="hud">
        <span>🫧 <span id="score">0</span></span>
        <span>💨 <span id="missed">0</span> entwischt</span>
        <span>⏱ <span id="timer">30</span>s</span>
      </div>
      <div id="timer-bar"><div id="timer-fill"></div></div>
      <div id="arena" style="position:absolute;inset:54px 0 0 0;"></div>`;

        this._arena = this.shadowRoot.getElementById("arena");
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
            this.shadowRoot.getElementById("timer-fill").style.width =
                `${(this._timeLeft / 30) * 100}%`;
            if (this._timeLeft <= 0) this._end();
        }, 1000);
        this._spawnLoop();
        this._animate();
    }

    _stop() {
        this._running = false;
        clearInterval(this._timerId);
        clearTimeout(this._spawnId);
        cancelAnimationFrame(this._raf);
    }

    _spawnLoop() {
        if (!this._running) return;
        this._spawnBubble();
        const delay = 300 + Math.random() * 600;
        this._spawnId = setTimeout(() => this._spawnLoop(), delay);
    }

    _spawnBubble() {
        const colors = [
            "rgba(77,208,225,0.6)", "rgba(224,64,251,0.5)", "rgba(102,187,106,0.5)",
            "rgba(255,167,38,0.5)", "rgba(239,83,80,0.5)", "rgba(255,238,88,0.5)",
        ];
        const size = 40 + Math.random() * 40;
        const arenaW = this._arena.offsetWidth || 300;
        const x = Math.random() * (arenaW - size);
        const speed = 0.8 + Math.random() * 1.2;

        const el = document.createElement("div");
        el.className = "bubble";
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;
        el.style.left = `${x}px`;
        el.style.bottom = `-${size}px`;
        el.style.background = colors[Math.floor(Math.random() * colors.length)];
        el.style.fontSize = `${size * 0.45}px`;
        el.textContent = ["🫧", "💎", "⭐", "🔮", "💧"][Math.floor(Math.random() * 5)];

        el.addEventListener("pointerdown", (e) => {
            e.stopPropagation();
            el.classList.add("pop");
            this._score++;
            this.shadowRoot.getElementById("score").textContent = this._score;
            const b = this._bubbles.find(b => b.el === el);
            if (b) b.popped = true;
            setTimeout(() => el.remove(), 200);
        }, { once: true });

        this._arena.appendChild(el);
        this._bubbles.push({ el, y: -size, speed, popped: false });
    }

    _animate() {
        if (!this._running) return;
        const arenaH = this._arena.offsetHeight || 500;

        for (let i = this._bubbles.length - 1; i >= 0; i--) {
            const b = this._bubbles[i];
            if (b.popped) { this._bubbles.splice(i, 1); continue; }
            b.y += b.speed;
            b.el.style.bottom = `${b.y}px`;
            if (b.y > arenaH + 60) {
                b.el.remove();
                this._bubbles.splice(i, 1);
                this._missed++;
                this.shadowRoot.getElementById("missed").textContent = this._missed;
            }
        }

        this._raf = requestAnimationFrame(() => this._animate());
    }

    _end() {
        this._stop();
        this.dispatchEvent(new CustomEvent("game-over", {
            bubbles: true,
            detail: { score: this._score, pointsEarned: 0 },
        }));
    }
}

customElements.define("bubble-game", BubbleGame);
