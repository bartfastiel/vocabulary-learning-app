// game/pong-game.js
// Classic Pong against CPU. Score points by getting the ball past the CPU paddle.
// Fires CustomEvent("game-over", { bubbles: true, detail: { score, pointsEarned } })

class PongGame extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._controller = new AbortController();
        this._raf = null;
        this._score = 0;
        this._cpuScore = 0;
        this._maxScore = 7;
    }

    connectedCallback() {
        this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: flex; justify-content: center; align-items: center;
          width: 100%; height: 100%; background: #000;
          flex-direction: column; font-family: "Segoe UI", sans-serif;
        }
        canvas {
          display: block; max-height: 80vh; max-width: 95vw;
          aspect-ratio: 600/400; image-rendering: pixelated; touch-action: none;
        }
        #hud {
          color: white; font-size: 1.1rem; margin-bottom: 0.5rem;
          display: flex; gap: 2rem; font-weight: bold;
        }
      </style>
      <div id="hud">
        <span>Du: <span id="p-score">0</span></span>
        <span>CPU: <span id="c-score">0</span></span>
        <span>Ziel: ${this._maxScore}</span>
      </div>
      <canvas id="c" width="600" height="400"></canvas>`;

        this._cv = this.shadowRoot.getElementById("c");
        this._ctx = this._cv.getContext("2d");
        this._init();
        this._bindInput();
        this._loop();
    }

    disconnectedCallback() {
        cancelAnimationFrame(this._raf);
        this._controller.abort();
    }

    _init() {
        this._pw = 12; this._ph = 70;
        this._py = 200 - 35;
        this._cy = 200 - 35;
        this._bx = 300; this._by = 200;
        this._bvx = 4; this._bvy = 3;
        this._br = 8;
        this._mouseY = 200;
        this._alive = true;
    }

    _bindInput() {
        const sig = { signal: this._controller.signal };
        const rect = () => this._cv.getBoundingClientRect();

        this._cv.addEventListener("mousemove", e => {
            const r = rect();
            this._mouseY = ((e.clientY - r.top) / r.height) * 400;
        }, sig);

        this._cv.addEventListener("touchmove", e => {
            e.preventDefault();
            const r = rect();
            this._mouseY = ((e.touches[0].clientY - r.top) / r.height) * 400;
        }, { ...sig, passive: false });

        document.addEventListener("keydown", e => {
            if (e.key === "ArrowUp" || e.key === "w") { this._mouseY -= 30; e.preventDefault(); }
            if (e.key === "ArrowDown" || e.key === "s") { this._mouseY += 30; e.preventDefault(); }
        }, sig);
    }

    _loop() {
        if (!this._alive) return;
        this._update();
        this._draw();
        this._raf = requestAnimationFrame(() => this._loop());
    }

    _update() {
        // player paddle follows mouse
        this._py += (this._mouseY - this._py - this._ph / 2) * 0.15;
        this._py = Math.max(0, Math.min(400 - this._ph, this._py));

        // CPU paddle
        const cpuSpeed = 2.8;
        const cpuCenter = this._cy + this._ph / 2;
        if (this._by > cpuCenter + 10) this._cy += cpuSpeed;
        else if (this._by < cpuCenter - 10) this._cy -= cpuSpeed;
        this._cy = Math.max(0, Math.min(400 - this._ph, this._cy));

        // ball
        this._bx += this._bvx;
        this._by += this._bvy;

        // top/bottom bounce
        if (this._by - this._br < 0) { this._by = this._br; this._bvy = Math.abs(this._bvy); }
        if (this._by + this._br > 400) { this._by = 400 - this._br; this._bvy = -Math.abs(this._bvy); }

        // player paddle (left)
        if (this._bx - this._br < 30 && this._bx - this._br > 18 &&
            this._by > this._py && this._by < this._py + this._ph) {
            this._bvx = Math.abs(this._bvx) * 1.05;
            const rel = (this._by - this._py - this._ph / 2) / (this._ph / 2);
            this._bvy = rel * 5;
        }

        // CPU paddle (right)
        if (this._bx + this._br > 570 && this._bx + this._br < 582 &&
            this._by > this._cy && this._by < this._cy + this._ph) {
            this._bvx = -Math.abs(this._bvx) * 1.05;
            const rel = (this._by - this._cy - this._ph / 2) / (this._ph / 2);
            this._bvy = rel * 5;
        }

        // cap speed
        const maxV = 10;
        this._bvx = Math.max(-maxV, Math.min(maxV, this._bvx));
        this._bvy = Math.max(-maxV, Math.min(maxV, this._bvy));

        // scoring
        if (this._bx < 0) {
            this._cpuScore++;
            this.shadowRoot.getElementById("c-score").textContent = this._cpuScore;
            this._resetBall(-1);
        }
        if (this._bx > 600) {
            this._score++;
            this.shadowRoot.getElementById("p-score").textContent = this._score;
            this._resetBall(1);
        }

        if (this._score >= this._maxScore || this._cpuScore >= this._maxScore) {
            this._end();
        }
    }

    _resetBall(dir) {
        this._bx = 300; this._by = 200;
        this._bvx = 4 * dir;
        this._bvy = (Math.random() - 0.5) * 6;
    }

    _draw() {
        const ctx = this._ctx;
        ctx.fillStyle = "#0a1628";
        ctx.fillRect(0, 0, 600, 400);

        // center line
        ctx.setLineDash([8, 8]);
        ctx.strokeStyle = "rgba(255,255,255,0.2)";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(300, 0); ctx.lineTo(300, 400); ctx.stroke();
        ctx.setLineDash([]);

        // paddles
        ctx.fillStyle = "#4dd0e1";
        ctx.beginPath(); ctx.roundRect(18, this._py, this._pw, this._ph, 4); ctx.fill();
        ctx.fillStyle = "#ff6b6b";
        ctx.beginPath(); ctx.roundRect(570, this._cy, this._pw, this._ph, 4); ctx.fill();

        // ball
        ctx.fillStyle = "white";
        ctx.shadowColor = "rgba(255,255,255,0.6)";
        ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(this._bx, this._by, this._br, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
    }

    _end() {
        this._alive = false;
        cancelAnimationFrame(this._raf);
        setTimeout(() => {
            this.dispatchEvent(new CustomEvent("game-over", {
                bubbles: true,
                detail: { score: this._score, pointsEarned: 0 },
            }));
        }, 600);
    }
}

customElements.define("pong-game", PongGame);
