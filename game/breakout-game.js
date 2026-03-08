// game/breakout-game.js
// Breakout / Arkanoid clone. Move paddle with mouse/touch/arrows. Break all bricks.
// Fires CustomEvent("game-over", { bubbles: true, detail: { score, pointsEarned } })

const CW = 400, CH = 480;
const PAD_W = 80, PAD_H = 12, PAD_Y = CH - 36;
const BALL_R = 9;
const ROWS = 6, COLS = 9;
const BRICK_W = Math.floor((CW - 20) / COLS);
const BRICK_H = 22;
const BRICK_PAD = 3;
const BRICK_TOP = 55;

const ROW_COLORS = ["#e53935","#FB8C00","#FDD835","#43A047","#1E88E5","#8E24AA"];

class BreakoutGame extends HTMLElement {
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
                 aspect-ratio:${CW}/${CH}; touch-action:none; }
      </style>
      <canvas id="c" width="${CW}" height="${CH}"></canvas>`;

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

    _init() {
        this._padX  = CW / 2 - PAD_W / 2;
        this._ball  = { x: CW / 2, y: PAD_Y - BALL_R - 2, vx: 3.2, vy: -4 };
        this._score = 0;
        this._lives = 3;
        this._alive = false;   // wait for first input
        this._dead  = false;
        this._won   = false;
        this._bricks = [];
        for (let r = 0; r < ROWS; r++)
            for (let c = 0; c < COLS; c++)
                this._bricks.push({ r, c, alive: true });
    }

    _bindInput() {
        const sig = { signal: this._controller.signal };
        const startIfNeeded = () => { if (!this._alive && !this._dead && !this._won) this._alive = true; };

        // mouse
        this._cv.addEventListener("mousemove", e => {
            const rect = this._cv.getBoundingClientRect();
            const mx   = (e.clientX - rect.left) * (CW / rect.width);
            this._padX = Math.max(0, Math.min(CW - PAD_W, mx - PAD_W / 2));
            startIfNeeded();
        }, sig);

        // touch
        this._cv.addEventListener("touchmove", e => {
            e.preventDefault();
            const rect = this._cv.getBoundingClientRect();
            const mx   = (e.touches[0].clientX - rect.left) * (CW / rect.width);
            this._padX = Math.max(0, Math.min(CW - PAD_W, mx - PAD_W / 2));
            startIfNeeded();
        }, { ...sig, passive: false });

        this._cv.addEventListener("touchstart", e => { e.preventDefault(); startIfNeeded(); }, { ...sig, passive: false });
        this._cv.addEventListener("click", startIfNeeded, sig);

        // arrow keys
        document.addEventListener("keydown", e => {
            if (e.key === "ArrowLeft")  { this._padX = Math.max(0,          this._padX - 20); startIfNeeded(); }
            if (e.key === "ArrowRight") { this._padX = Math.min(CW - PAD_W, this._padX + 20); startIfNeeded(); }
        }, sig);
    }

    _update() {
        if (!this._alive || this._dead || this._won) return;

        this._ball.x += this._ball.vx;
        this._ball.y += this._ball.vy;

        // wall bounce
        if (this._ball.x - BALL_R < 0)    { this._ball.x = BALL_R;      this._ball.vx *= -1; }
        if (this._ball.x + BALL_R > CW)   { this._ball.x = CW - BALL_R; this._ball.vx *= -1; }
        if (this._ball.y - BALL_R < 0)    { this._ball.y = BALL_R;      this._ball.vy *= -1; }

        // paddle bounce
        if (this._ball.vy > 0 &&
            this._ball.y + BALL_R >= PAD_Y &&
            this._ball.y + BALL_R <= PAD_Y + PAD_H + 2 &&
            this._ball.x >= this._padX - 4 &&
            this._ball.x <= this._padX + PAD_W + 4) {
            const hit = (this._ball.x - (this._padX + PAD_W / 2)) / (PAD_W / 2);
            this._ball.vx = hit * 5;
            this._ball.vy = -Math.abs(this._ball.vy);
            // clamp speed
            const spd = Math.hypot(this._ball.vx, this._ball.vy);
            if (spd > 8) { this._ball.vx *= 8/spd; this._ball.vy *= 8/spd; }
        }

        // bottom — lose life
        if (this._ball.y - BALL_R > CH) {
            this._lives--;
            if (this._lives <= 0) { this._dead = true; return; }
            this._ball = { x: this._padX + PAD_W/2, y: PAD_Y - BALL_R - 2, vx: 3.2, vy: -4 };
            this._alive = false; // pause until next input
        }

        // brick collision
        const bLeft = 10;
        for (const b of this._bricks) {
            if (!b.alive) continue;
            const bx = bLeft + b.c * BRICK_W + BRICK_PAD;
            const by = BRICK_TOP + b.r * (BRICK_H + BRICK_PAD);
            const bw = BRICK_W - BRICK_PAD * 2;
            const bh = BRICK_H;

            if (this._ball.x + BALL_R > bx && this._ball.x - BALL_R < bx + bw &&
                this._ball.y + BALL_R > by && this._ball.y - BALL_R < by + bh) {
                b.alive = false;
                this._score++;
                // determine bounce axis
                const overlapL = this._ball.x + BALL_R - bx;
                const overlapR = bx + bw - (this._ball.x - BALL_R);
                const overlapT = this._ball.y + BALL_R - by;
                const overlapB = by + bh - (this._ball.y - BALL_R);
                const minH = Math.min(overlapL, overlapR);
                const minV = Math.min(overlapT, overlapB);
                if (minH < minV) this._ball.vx *= -1; else this._ball.vy *= -1;
                break;
            }
        }

        if (this._bricks.every(b => !b.alive)) this._won = true;
    }

    _draw() {
        const ctx = this._ctx;
        // bg
        const bg = ctx.createLinearGradient(0, 0, 0, CH);
        bg.addColorStop(0, "#0d0d2b"); bg.addColorStop(1, "#1a1a4e");
        ctx.fillStyle = bg; ctx.fillRect(0, 0, CW, CH);

        // bricks
        const bLeft = 10;
        for (const b of this._bricks) {
            if (!b.alive) continue;
            const bx = bLeft + b.c * BRICK_W + BRICK_PAD;
            const by = BRICK_TOP + b.r * (BRICK_H + BRICK_PAD);
            const bw = BRICK_W - BRICK_PAD * 2;
            ctx.fillStyle = ROW_COLORS[b.r % ROW_COLORS.length];
            ctx.beginPath(); ctx.roundRect(bx, by, bw, BRICK_H, 4); ctx.fill();
            ctx.fillStyle = "rgba(255,255,255,0.25)";
            ctx.beginPath(); ctx.roundRect(bx + 2, by + 2, bw - 4, 6, 2); ctx.fill();
        }

        // paddle
        const grad = ctx.createLinearGradient(this._padX, 0, this._padX + PAD_W, 0);
        grad.addColorStop(0, "#4dd0e1"); grad.addColorStop(1, "#26c6da");
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.roundRect(this._padX, PAD_Y, PAD_W, PAD_H, 6); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.beginPath(); ctx.roundRect(this._padX + 4, PAD_Y + 2, PAD_W - 8, 4, 2); ctx.fill();

        // ball
        const bg2 = ctx.createRadialGradient(this._ball.x - 3, this._ball.y - 3, 1,
                                              this._ball.x, this._ball.y, BALL_R);
        bg2.addColorStop(0, "#fff"); bg2.addColorStop(1, "#e0e0e0");
        ctx.fillStyle = bg2;
        ctx.beginPath(); ctx.arc(this._ball.x, this._ball.y, BALL_R, 0, Math.PI*2); ctx.fill();

        // lives
        ctx.font = "16px sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
        ctx.fillText("❤️".repeat(this._lives), 8, 26);

        // score
        ctx.fillStyle = "white"; ctx.font = "bold 16px 'Segoe UI',sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(`${this._score} / ${ROWS * COLS}`, CW - 8, 26);

        // tap to start
        if (!this._alive && !this._dead && !this._won) {
            ctx.fillStyle = "rgba(0,0,0,0.55)";
            ctx.beginPath(); ctx.roundRect(CW/2-120, CH/2+40, 240, 42, 10); ctx.fill();
            ctx.fillStyle = "white"; ctx.font = "bold 15px 'Segoe UI',sans-serif";
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText("Maus bewegen / Tippen ✋", CW/2, CH/2 + 61);
        }

        // overlays
        if (this._won || this._dead) {
            ctx.fillStyle = "rgba(0,0,0,0.52)"; ctx.fillRect(0,0,CW,CH);
            ctx.fillStyle = "white"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.font = `bold 40px 'Segoe UI',sans-serif`;
            ctx.fillText(this._won ? "🎉 Gewonnen!" : "💀 Game Over", CW/2, CH/2 - 14);
            ctx.font = "22px 'Segoe UI',sans-serif";
            ctx.fillText(`Score: ${this._score}`, CW/2, CH/2 + 24);
        }
    }

    _loop() {
        this._update();
        this._draw();
        if (this._dead || this._won) {
            // fire game-over after brief pause
            if (!this._ended) {
                this._ended = true;
                setTimeout(() => {
                    const pointsEarned = Math.min(15, Math.floor(this._score / 2));
                    this.dispatchEvent(new CustomEvent("game-over", {
                        bubbles: true,
                        detail: { score: this._score, pointsEarned },
                    }));
                }, 1200);
            }
            return;
        }
        this._raf = requestAnimationFrame(() => this._loop());
    }
}

customElements.define("breakout-game", BreakoutGame);
