// game/dodge-game.js
// Ausweichen: move your character left/right to dodge falling obstacles. Survive as long as possible.
// Fires CustomEvent("game-over", { bubbles: true, detail: { score, pointsEarned } })

class DodgeGame extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._controller = new AbortController();
        this._raf = null;
        this._alive = true;
        this._score = 0;
        this._obstacles = [];
        this._px = 150;
        this._pw = 30;
        this._moveLeft = false;
        this._moveRight = false;
        this._lastFrame = 0;
        this._spawnTimer = 0;
        this._difficulty = 1;
    }

    connectedCallback() {
        const W = 320, H = 480;
        this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          width: 100%; height: 100%; background: #000;
          font-family: "Segoe UI", sans-serif;
        }
        canvas { display: block; max-height: 82vh; max-width: 95vw;
                 aspect-ratio: ${W}/${H}; touch-action: none; }
      </style>
      <canvas id="c" width="${W}" height="${H}"></canvas>`;

        this._W = W; this._H = H;
        this._cv = this.shadowRoot.getElementById("c");
        this._ctx = this._cv.getContext("2d");
        this._px = W / 2;
        this._bindInput();
        this._lastFrame = performance.now();
        this._loop();
    }

    disconnectedCallback() {
        this._alive = false;
        cancelAnimationFrame(this._raf);
        this._controller.abort();
    }

    _bindInput() {
        const sig = { signal: this._controller.signal };
        document.addEventListener("keydown", e => {
            if (e.key === "ArrowLeft" || e.key === "a") this._moveLeft = true;
            if (e.key === "ArrowRight" || e.key === "d") this._moveRight = true;
        }, sig);
        document.addEventListener("keyup", e => {
            if (e.key === "ArrowLeft" || e.key === "a") this._moveLeft = false;
            if (e.key === "ArrowRight" || e.key === "d") this._moveRight = false;
        }, sig);

        // touch: move toward touch X
        this._touchX = null;
        this._cv.addEventListener("touchstart", e => {
            const r = this._cv.getBoundingClientRect();
            this._touchX = ((e.touches[0].clientX - r.left) / r.width) * this._W;
        }, { ...sig, passive: true });
        this._cv.addEventListener("touchmove", e => {
            const r = this._cv.getBoundingClientRect();
            this._touchX = ((e.touches[0].clientX - r.left) / r.width) * this._W;
        }, { ...sig, passive: true });
        this._cv.addEventListener("touchend", () => { this._touchX = null; }, { ...sig, passive: true });
    }

    _loop() {
        if (!this._alive) return;
        const now = performance.now();
        const dt = Math.min((now - this._lastFrame) / 1000, 0.05);
        this._lastFrame = now;

        this._update(dt);
        this._draw();
        this._raf = requestAnimationFrame(() => this._loop());
    }

    _update(dt) {
        const speed = 200;
        if (this._moveLeft) this._px -= speed * dt;
        if (this._moveRight) this._px += speed * dt;
        if (this._touchX !== null) {
            const diff = this._touchX - this._px;
            this._px += Math.sign(diff) * Math.min(Math.abs(diff), speed * dt);
        }
        this._px = Math.max(this._pw / 2, Math.min(this._W - this._pw / 2, this._px));

        // score
        this._score += dt;
        this._difficulty = 1 + this._score / 15;

        // spawn
        this._spawnTimer -= dt;
        if (this._spawnTimer <= 0) {
            this._spawnTimer = Math.max(0.2, 0.7 / this._difficulty);
            const w = 20 + Math.random() * 30;
            this._obstacles.push({
                x: Math.random() * (this._W - w),
                y: -20,
                w,
                h: 16 + Math.random() * 10,
                speed: (120 + Math.random() * 80) * this._difficulty,
                emoji: ["🔥", "💣", "⚡", "☄️", "🌩️"][Math.floor(Math.random() * 5)],
            });
        }

        // move obstacles
        for (let i = this._obstacles.length - 1; i >= 0; i--) {
            const o = this._obstacles[i];
            o.y += o.speed * dt;
            if (o.y > this._H + 20) { this._obstacles.splice(i, 1); continue; }

            // collision
            const playerY = this._H - 40;
            if (o.y + o.h > playerY && o.y < playerY + 24 &&
                o.x + o.w > this._px - this._pw / 2 && o.x < this._px + this._pw / 2) {
                this._die();
                return;
            }
        }
    }

    _draw() {
        const ctx = this._ctx;
        // background
        ctx.fillStyle = "#0a1628";
        ctx.fillRect(0, 0, this._W, this._H);

        // stars
        ctx.fillStyle = "rgba(255,255,255,0.15)";
        for (let i = 0; i < 30; i++) {
            const sx = (i * 97 + 13) % this._W;
            const sy = (i * 53 + (this._score * 20)) % this._H;
            ctx.fillRect(sx, sy, 2, 2);
        }

        // obstacles
        ctx.font = "20px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        for (const o of this._obstacles) {
            ctx.fillText(o.emoji, o.x + o.w / 2, o.y + o.h / 2);
        }

        // player
        const py = this._H - 40;
        ctx.fillStyle = "#4dd0e1";
        ctx.beginPath();
        ctx.roundRect(this._px - this._pw / 2, py, this._pw, 24, 6);
        ctx.fill();
        ctx.font = "18px sans-serif";
        ctx.fillText("🛡️", this._px, py + 12);

        // HUD
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.beginPath(); ctx.roundRect(4, 4, 130, 28, 6); ctx.fill();
        ctx.fillStyle = "white"; ctx.font = "bold 14px 'Segoe UI',sans-serif";
        ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
        ctx.fillText(`⏱ ${Math.floor(this._score)}s`, 12, 24);
    }

    _die() {
        this._alive = false;
        cancelAnimationFrame(this._raf);
        const finalScore = Math.floor(this._score);
        setTimeout(() => {
            this.dispatchEvent(new CustomEvent("game-over", {
                bubbles: true,
                detail: { score: finalScore, pointsEarned: 0 },
            }));
        }, 600);
    }
}

customElements.define("dodge-game", DodgeGame);
