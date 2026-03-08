// game/flappy-game.js
// Classic Flappy-Bird clone on a fixed 400×600 canvas (CSS-scaled for mobile).
// Fires CustomEvent("game-over", { bubbles: true, detail: { score, pointsEarned } })

const W = 400, H = 600;
const GROUND = 55;      // ground strip height (bottom of canvas)
const PIPE_W = 64;
const PIPE_GAP = 158;
const GRAVITY   = 0.45;
const FLAP_V    = -9.2;
const BASE_SPEED = 3;

class FlappyGame extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._raf = null;
        this._controller = new AbortController();
    }

    connectedCallback() {
        this.shadowRoot.innerHTML = `
      <style>
        :host { display:flex; justify-content:center; align-items:center;
                width:100%; height:100%; background:#000; }
        canvas { display:block; max-height:85vh; max-width:92vw;
                 aspect-ratio:${W}/${H}; touch-action:none; image-rendering:auto; }
      </style>
      <canvas id="c" width="${W}" height="${H}"></canvas>`;

        this._cv  = this.shadowRoot.getElementById("c");
        this._ctx = this._cv.getContext("2d");
        this._init();
        this._bindInput();
        this._loop();
    }

    disconnectedCallback() {
        cancelAnimationFrame(this._raf);
        this._controller.abort();
    }

    // ── state ──────────────────────────────────────────────────────────────────

    _init() {
        this._bird   = { y: H * 0.42, vy: 0 };
        this._pipes  = [];
        this._score  = 0;
        this._frame  = 0;
        this._alive  = false;   // waits for first tap
        this._dead   = false;
        this._pipeInterval = 90;
        this._speed  = BASE_SPEED;
    }

    // ── input ──────────────────────────────────────────────────────────────────

    _bindInput() {
        const sig = { signal: this._controller.signal };
        const flap = () => {
            if (this._dead) return;
            if (!this._alive) this._alive = true;
            this._bird.vy = FLAP_V;
        };
        this._cv.addEventListener("pointerdown", e => { e.preventDefault(); flap(); }, { ...sig, passive: false });
        document.addEventListener("keydown", e => { if (e.code === "Space") { e.preventDefault(); flap(); } }, sig);
    }

    // ── update ─────────────────────────────────────────────────────────────────

    _update() {
        if (!this._alive || this._dead) return;
        const bx = W * 0.22;

        // bird physics
        this._bird.vy += GRAVITY;
        this._bird.y  += this._bird.vy;

        // pipes
        this._frame++;
        if (this._frame % this._pipeInterval === 0) this._spawnPipe();

        for (const p of this._pipes) {
            p.x -= this._speed;
            if (!p.scored && p.x + PIPE_W < bx) {
                p.scored = true;
                this._score++;
            }
        }
        this._pipes = this._pipes.filter(p => p.x + PIPE_W > 0);

        // ground / ceiling
        if (this._bird.y + 18 > H - GROUND || this._bird.y - 18 < 0) {
            this._die(); return;
        }

        // pipe collision
        for (const p of this._pipes) {
            if (bx + 15 > p.x && bx - 15 < p.x + PIPE_W) {
                const gapTop = p.gapY - PIPE_GAP / 2;
                const gapBot = p.gapY + PIPE_GAP / 2;
                if (this._bird.y - 15 < gapTop || this._bird.y + 15 > gapBot) {
                    this._die(); return;
                }
            }
        }
    }

    _spawnPipe() {
        const min = H * 0.28, max = H * 0.72;
        this._pipes.push({ x: W, gapY: min + Math.random() * (max - min), scored: false });
    }

    _die() {
        this._dead = true;
        this._bird.vy = -6;
        setTimeout(() => {
            const pointsEarned = Math.min(20, this._score * 2);
            this.dispatchEvent(new CustomEvent("game-over", {
                bubbles: true,
                detail: { score: this._score, pointsEarned },
            }));
        }, 1100);
    }

    // ── render ─────────────────────────────────────────────────────────────────

    _draw() {
        const ctx = this._ctx;
        const bx  = W * 0.22;

        // sky gradient
        const sky = ctx.createLinearGradient(0, 0, 0, H - GROUND);
        sky.addColorStop(0, "#87CEEB"); sky.addColorStop(1, "#d0f0ff");
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, W, H - GROUND);

        // moving clouds
        ctx.fillStyle = "rgba(255,255,255,0.82)";
        const t = this._frame;
        [[W * 0.15 - (t * 0.4) % (W + 120), H * 0.12, 55],
         [W * 0.55 - (t * 0.3) % (W + 120), H * 0.22, 40],
         [W * 0.80 - (t * 0.5) % (W + 120), H * 0.08, 35],
        ].forEach(([cx, cy, r]) => {
            const x = ((cx % (W + 120)) + W + 120) % (W + 120) - 60;
            ctx.beginPath();
            ctx.arc(x,       cy,       r,       0, Math.PI * 2);
            ctx.arc(x + r * 0.6, cy - r * 0.32, r * 0.72, 0, Math.PI * 2);
            ctx.arc(x + r * 1.2, cy,       r * 0.82, 0, Math.PI * 2);
            ctx.fill();
        });

        // pipes
        for (const p of this._pipes) {
            const gapTop = p.gapY - PIPE_GAP / 2;
            const gapBot = p.gapY + PIPE_GAP / 2;
            // top pipe body
            ctx.fillStyle = "#5FB843";
            ctx.fillRect(p.x, 0, PIPE_W, gapTop);
            // top pipe cap
            ctx.fillStyle = "#4A9033";
            ctx.fillRect(p.x - 5, gapTop - 24, PIPE_W + 10, 24);
            // bottom pipe body
            ctx.fillStyle = "#5FB843";
            ctx.fillRect(p.x, gapBot, PIPE_W, H - GROUND - gapBot);
            // bottom pipe cap
            ctx.fillStyle = "#4A9033";
            ctx.fillRect(p.x - 5, gapBot, PIPE_W + 10, 24);
        }

        // ground
        ctx.fillStyle = "#DED895";
        ctx.fillRect(0, H - GROUND, W, GROUND);
        ctx.fillStyle = "#5F9C3A";
        ctx.fillRect(0, H - GROUND, W, 14);

        // bird
        const by    = this._bird.y;
        const angle = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, this._bird.vy * 0.07));
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(angle);

        // body
        ctx.fillStyle = "#FFE066";
        ctx.beginPath();
        ctx.ellipse(0, 0, 18, 15, 0, 0, Math.PI * 2);
        ctx.fill();
        // wing
        ctx.fillStyle = "#FFB300";
        ctx.beginPath();
        ctx.ellipse(-3, 6, 10, 5, -0.4, 0, Math.PI * 2);
        ctx.fill();
        // eye
        ctx.fillStyle = "white";
        ctx.beginPath(); ctx.arc(7, -5, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#222";
        ctx.beginPath(); ctx.arc(9, -5, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "white";
        ctx.beginPath(); ctx.arc(10, -7, 1.2, 0, Math.PI * 2); ctx.fill();
        // beak
        ctx.fillStyle = "#FF8C00";
        ctx.beginPath();
        ctx.moveTo(14, -1); ctx.lineTo(22, 3); ctx.lineTo(14, 7);
        ctx.closePath(); ctx.fill();

        ctx.restore();

        // score
        ctx.fillStyle = "white";
        ctx.shadowColor = "rgba(0,0,0,0.6)"; ctx.shadowBlur = 5;
        ctx.font = "bold 38px 'Segoe UI', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(this._score, W / 2, 58);
        ctx.shadowBlur = 0;

        // "tap to start"
        if (!this._alive && !this._dead) {
            ctx.fillStyle = "rgba(0,0,0,0.45)";
            ctx.beginPath();
            ctx.roundRect(W / 2 - 110, H / 2 - 28, 220, 52, 12);
            ctx.fill();
            ctx.fillStyle = "white";
            ctx.font = "bold 20px 'Segoe UI', sans-serif";
            ctx.fillText("Tippen zum Starten ✋", W / 2, H / 2 + 8);
        }

        // game-over overlay
        if (this._dead) {
            ctx.fillStyle = "rgba(0,0,0,0.42)";
            ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = "white";
            ctx.shadowColor = "rgba(0,0,0,0.8)"; ctx.shadowBlur = 8;
            ctx.font = "bold 46px 'Segoe UI', sans-serif";
            ctx.fillText("💀 Game Over", W / 2, H / 2 - 18);
            ctx.font = "26px 'Segoe UI', sans-serif";
            ctx.fillText(`Score: ${this._score}`, W / 2, H / 2 + 32);
            ctx.shadowBlur = 0;
        }
    }

    _loop() {
        this._update();
        this._draw();
        this._raf = requestAnimationFrame(() => this._loop());
    }
}

customElements.define("flappy-game", FlappyGame);
