// game/jump-game.js
// Endless side-scrolling runner. Tap / Space to jump (double-jump allowed).
// Fires CustomEvent("game-over", { bubbles: true, detail: { score, pointsEarned } })

const CW = 400, CH = 260;
const GY  = 218;    // ground y (top of ground strip)
const GH  = CH - GY; // ground strip height
const CHAR_W = 28, CHAR_H = 36;
const CHAR_X  = 72;
const GRAVITY   = 0.55;
const JUMP_V    = -10.5;
const BASE_SPEED = 4.2;

class JumpGame extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._raf = null;
        this._controller = new AbortController();
    }

    connectedCallback() {
        this.shadowRoot.innerHTML = `
      <style>
        :host { display:flex; flex-direction:column; justify-content:center;
                align-items:center; width:100%; height:100%; background:#000; }
        canvas { display:block; max-width:92vw; max-height:60vh;
                 aspect-ratio:${CW}/${CH}; touch-action:none; }
      </style>
      <canvas id="c" width="${CW}" height="${CH}"></canvas>`;

        this._cv  = this.shadowRoot.getElementById("c");
        this._ctx = this._cv.getContext("2d");
        this._init();
        this._bindInput();
        this._startCountdown();
    }

    disconnectedCallback() {
        cancelAnimationFrame(this._raf);
        this._controller.abort();
    }

    // ── state ──────────────────────────────────────────────────────────────────

    _init() {
        this._char    = { y: GY - CHAR_H, vy: 0, jumpsLeft: 2, onGround: true };
        this._obs     = [];
        this._score   = 0;
        this._frame   = 0;
        this._speed   = BASE_SPEED;
        this._dead    = false;
        this._running = false;
        this._bgX     = 0;   // parallax clouds
        this._legPhase = 0;
        this._nextObs  = 80 + Math.random() * 60;
        this._countdown = 3;
    }

    // ── countdown before game ──────────────────────────────────────────────────

    _startCountdown() {
        this._drawStatic();
        const tick = () => {
            if (this._countdown <= 0) {
                this._running = true;
                this._loop();
                return;
            }
            this._drawCountdown();
            this._countdown--;
            setTimeout(tick, 900);
        };
        tick();
    }

    _drawStatic() {
        this._drawBackground();
        this._drawChar();
    }

    _drawCountdown() {
        this._drawStatic();
        const ctx = this._ctx;
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(0, 0, CW, CH);
        ctx.fillStyle = "white";
        ctx.font = `bold ${CH * 0.4}px 'Segoe UI', sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(this._countdown === 0 ? "LOS!" : this._countdown, CW / 2, CH / 2);
        ctx.textBaseline = "alphabetic";
    }

    // ── input ──────────────────────────────────────────────────────────────────

    _bindInput() {
        const sig = { signal: this._controller.signal };
        const jump = () => {
            if (this._dead || !this._running) return;
            if (this._char.jumpsLeft > 0) {
                this._char.vy = JUMP_V;
                this._char.jumpsLeft--;
                this._char.onGround = false;
            }
        };
        this._cv.addEventListener("pointerdown",   e => { e.preventDefault(); jump(); }, { ...sig, passive: false });
        document.addEventListener("keydown", e => { if (e.code === "Space") { e.preventDefault(); jump(); } }, sig);
    }

    // ── update ─────────────────────────────────────────────────────────────────

    _update() {
        if (!this._running || this._dead) return;

        this._frame++;
        this._score = Math.floor(this._frame / 60);
        this._speed = BASE_SPEED;
        this._bgX  -= this._speed * 0.3;

        // character physics
        this._char.vy += GRAVITY;
        this._char.y  += this._char.vy;

        if (this._char.y >= GY - CHAR_H) {
            this._char.y        = GY - CHAR_H;
            this._char.vy       = 0;
            this._char.jumpsLeft = 2;
            this._char.onGround  = true;
        }
        if (this._char.onGround) this._legPhase = (this._frame * 0.4) % (Math.PI * 2);

        // spawn obstacle
        this._nextObs -= this._speed;
        if (this._nextObs <= 0) {
            const phase = this._score < 8 ? 0 : this._score < 18 ? 1 : 2;
            const heights = [[45, 55, 65], [55, 75, 85], [65, 85, 100]][phase];
            const h = heights[Math.floor(Math.random() * heights.length)];
            const colors = ["#8B4513","#5D4037","#4CAF50","#F44336","#9C27B0","#FF5722"];
            this._obs.push({
                x: CW,
                w: 28 + Math.random() * 18,
                h,
                color: colors[Math.floor(Math.random() * colors.length)],
            });
            this._nextObs = 90 + Math.random() * 80;
        }

        // move obstacles
        for (const ob of this._obs) ob.x -= this._speed;
        this._obs = this._obs.filter(ob => ob.x + ob.w > 0);

        // collision (AABB with small margin)
        const cx = CHAR_X + 3, cy = this._char.y + 4;
        const cw = CHAR_W - 6, ch = CHAR_H - 6;
        for (const ob of this._obs) {
            const oy = GY - ob.h;
            if (cx + cw > ob.x && cx < ob.x + ob.w &&
                cy + ch > oy  && cy < GY) {
                this._die();
                return;
            }
        }
    }

    _die() {
        this._dead    = true;
        this._running = false;
        setTimeout(() => {
            const pointsEarned = Math.min(15, Math.floor(this._score / 3));
            this.dispatchEvent(new CustomEvent("game-over", {
                bubbles: true,
                detail: { score: this._score, pointsEarned },
            }));
        }, 900);
    }

    // ── render ─────────────────────────────────────────────────────────────────

    _drawBackground() {
        const ctx = this._ctx;
        // sky
        const sky = ctx.createLinearGradient(0, 0, 0, GY);
        sky.addColorStop(0, "#87CEEB"); sky.addColorStop(1, "#c8e6f5");
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, CW, GY);

        // clouds (parallax)
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        [[80,30,30],[200,22,22],[310,38,26],[60,50,18],[240,45,20]].forEach(([bx,by,r]) => {
            const x = ((bx + Math.abs(this._bgX)) % (CW + 120)) - 60;
            ctx.beginPath();
            ctx.arc(x, by, r, 0, Math.PI * 2);
            ctx.arc(x + r * 0.7, by - r * 0.3, r * 0.65, 0, Math.PI * 2);
            ctx.arc(x + r * 1.3, by, r * 0.7, 0, Math.PI * 2);
            ctx.fill();
        });

        // ground strip
        ctx.fillStyle = "#6DB33F";
        ctx.fillRect(0, GY, CW, 12);
        ctx.fillStyle = "#C8A96E";
        ctx.fillRect(0, GY + 12, CW, GH - 12);
    }

    _drawChar() {
        const ctx = this._ctx;
        const cx  = CHAR_X;
        const cy  = this._char.y;
        const onG = this._char.onGround;

        // legs (animated when running)
        const lp = onG ? this._legPhase : 0;
        ctx.fillStyle = "#2962FF";
        const legH = 14;
        ctx.fillRect(cx + 4,  cy + CHAR_H - legH, 8, legH + Math.sin(lp) * 3 * (onG ? 1 : 0));
        ctx.fillRect(cx + 16, cy + CHAR_H - legH, 8, legH - Math.sin(lp) * 3 * (onG ? 1 : 0));

        // body
        ctx.fillStyle = "#1565C0";
        ctx.beginPath();
        ctx.roundRect(cx, cy + 12, CHAR_W, CHAR_H - 14, 6);
        ctx.fill();

        // head
        const skinColors = ["#FFDBB4","#F1C27D","#C68642"];
        ctx.fillStyle = skinColors[0];
        ctx.beginPath();
        ctx.arc(cx + CHAR_W / 2, cy + 8, 11, 0, Math.PI * 2);
        ctx.fill();

        // eyes
        ctx.fillStyle = "#333";
        ctx.fillRect(cx + CHAR_W / 2 - 5, cy + 5, 3, 3);
        ctx.fillRect(cx + CHAR_W / 2 + 2, cy + 5, 3, 3);

        // smile
        ctx.strokeStyle = "#333"; ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx + CHAR_W / 2, cy + 10, 4, 0, Math.PI);
        ctx.stroke();

        // arms
        ctx.fillStyle = "#1565C0";
        ctx.fillRect(cx - 5,        cy + 14, 6, 10);
        ctx.fillRect(cx + CHAR_W - 1, cy + 14, 6, 10);
    }

    _draw() {
        const ctx = this._ctx;
        this._drawBackground();

        // obstacles
        for (const ob of this._obs) {
            const oy = GY - ob.h;
            ctx.fillStyle = ob.color;
            ctx.beginPath();
            ctx.roundRect(ob.x, oy, ob.w, ob.h, [4, 4, 0, 0]);
            ctx.fill();
            // darker top cap
            ctx.fillStyle = "rgba(0,0,0,0.25)";
            ctx.beginPath();
            ctx.roundRect(ob.x, oy, ob.w, 8, [4, 4, 0, 0]);
            ctx.fill();
        }

        this._drawChar();

        // HUD
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.beginPath(); ctx.roundRect(6, 6, 115, 28, 6); ctx.fill();
        ctx.fillStyle = "white";
        ctx.font = "bold 14px 'Segoe UI', sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(`⏱ ${this._score}s   💨 ${this._speed.toFixed(1)}x`, 14, 24);

        // double-jump indicator
        ctx.fillStyle = this._char.jumpsLeft === 2 ? "#4dd0e1"
                      : this._char.jumpsLeft === 1 ? "#FFD700"
                      : "rgba(255,255,255,0.2)";
        ctx.beginPath(); ctx.arc(CW - 20, 20, 8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = this._char.jumpsLeft >= 2 ? "#4dd0e1" : "rgba(255,255,255,0.2)";
        ctx.beginPath(); ctx.arc(CW - 36, 20, 8, 0, Math.PI * 2); ctx.fill();

        // death overlay
        if (this._dead) {
            ctx.fillStyle = "rgba(0,0,0,0.5)";
            ctx.fillRect(0, 0, CW, CH);
            ctx.fillStyle = "white";
            ctx.textAlign = "center";
            ctx.font = `bold ${CH * 0.16}px 'Segoe UI', sans-serif`;
            ctx.fillText("💥 Treffer!", CW / 2, CH / 2 - 10);
            ctx.font = `${CH * 0.1}px 'Segoe UI', sans-serif`;
            ctx.fillText(`${this._score} Sekunden überlebt`, CW / 2, CH / 2 + 22);
        }
    }

    _loop() {
        this._update();
        this._draw();
        this._raf = requestAnimationFrame(() => this._loop());
    }
}

customElements.define("jump-game", JumpGame);
