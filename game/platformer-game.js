// game/platformer-game.js
// Hüpf Held: a Mario-style side-scrolling platformer.
// Collect coins, stomp enemies, reach the flag!
// Fires CustomEvent("game-over", { bubbles: true, detail: { score, pointsEarned } })

const PF_W = 400, PF_H = 300;
const GRAVITY = 1200;
const JUMP_VEL = -420;
const MOVE_SPEED = 160;
const TILE = 24;

// Level map: each string is a row. Characters:
// . = air, # = ground, B = brick, C = coin, E = enemy, F = flag, P = player start
const LEVELS = [
    [
        "........................................F",
        "........................................#",
        "...............................##........",
        "...........C.C.C.....C................C..",
        "..........#####......##....###...........",
        "......C.................E.........C.C....",
        "P....###......E....######...E...####....",
        "#########..########..####.###.#########.",
        "##########################################",
    ],
    [
        "..........................................F",
        ".........................................##",
        "...C.C.C..........C.C.........C...........",
        "..#####........########.......###.........",
        "...........E..............C................",
        ".........####....E....########...C.C......",
        "P....C..........####.............####..E..",
        "##..###...###..........E...###..######.##.",
        "###########################################",
    ],
    [
        "...............................................F",
        "..............................................##",
        ".....C.C...........C.C.C..........C.C.........",
        "....#####.........#######.........####........",
        "..............E..............E.................",
        "..........#####......E....#######....C.C.C...",
        "P.....C..........########..........########.E.",
        "##..####...###............###..###..#####.####.",
        "################################################",
    ],
];

class PlatformerGame extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._controller = new AbortController();
        this._raf = null;
        this._lastFrame = 0;
    }

    connectedCallback() {
        this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          width: 100%; height: 100%; background: #000;
          font-family: "Segoe UI", sans-serif; user-select: none;
        }
        canvas {
          display: block; max-height: 80vh; max-width: 96vw;
          aspect-ratio: ${PF_W}/${PF_H}; image-rendering: pixelated; touch-action: none;
        }
        #mobile-controls {
          display: none; margin-top: 0.5rem; gap: 0.8rem;
        }
        @media (pointer: coarse) {
          #mobile-controls { display: flex; }
        }
        .ctrl-btn {
          width: 56px; height: 56px; border-radius: 50%;
          background: rgba(255,255,255,0.15); border: 2px solid rgba(255,255,255,0.3);
          color: white; font-size: 1.5rem; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          -webkit-user-select: none; user-select: none;
        }
        .ctrl-btn:active { background: rgba(255,255,255,0.3); }
      </style>
      <canvas id="c" width="${PF_W}" height="${PF_H}"></canvas>
      <div id="mobile-controls">
        <button class="ctrl-btn" id="btn-left">⬅</button>
        <button class="ctrl-btn" id="btn-jump">⬆</button>
        <button class="ctrl-btn" id="btn-right">➡</button>
      </div>`;

        this._cv = this.shadowRoot.getElementById("c");
        this._ctx = this._cv.getContext("2d");
        this._keys = { left: false, right: false, jump: false };
        this._score = 0;
        this._lives = 3;
        this._currentLevel = 0;
        this._alive = true;
        this._won = false;
        this._initLevel(0);
        this._bindInput();
        this._lastFrame = performance.now();
        this._loop();
    }

    disconnectedCallback() {
        cancelAnimationFrame(this._raf);
        this._controller.abort();
    }

    // ── Level loading ──────────────────────────────────────────────────────────

    _initLevel(idx) {
        const map = LEVELS[idx];
        this._tiles = [];
        this._coins = [];
        this._enemies = [];
        this._flag = null;
        this._playerStart = { x: 0, y: 0 };

        const rows = map.length;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < map[r].length; c++) {
                const ch = map[r][c];
                const x = c * TILE, y = r * TILE;
                if (ch === "#" || ch === "B") this._tiles.push({ x, y, w: TILE, h: TILE, type: ch });
                if (ch === "C") this._coins.push({ x: x + 4, y: y + 4, w: 16, h: 16, collected: false });
                if (ch === "E") this._enemies.push({ x, y: y, w: TILE, h: TILE, vx: 40, startX: x, range: 60, alive: true });
                if (ch === "F") this._flag = { x, y: y - TILE, w: TILE, h: TILE * 2 };
                if (ch === "P") this._playerStart = { x, y };
            }
        }

        this._levelW = Math.max(...map.map(r => r.length)) * TILE;
        this._levelH = rows * TILE;

        // player
        this._px = this._playerStart.x;
        this._py = this._playerStart.y;
        this._pvx = 0;
        this._pvy = 0;
        this._onGround = false;
        this._facingRight = true;
        this._invincible = 0;
        this._camX = 0;
    }

    // ── Input ──────────────────────────────────────────────────────────────────

    _bindInput() {
        const sig = { signal: this._controller.signal };

        document.addEventListener("keydown", e => {
            if (e.key === "ArrowLeft" || e.key === "a") this._keys.left = true;
            if (e.key === "ArrowRight" || e.key === "d") this._keys.right = true;
            if (e.key === "ArrowUp" || e.key === "w" || e.key === " ") {
                e.preventDefault();
                this._keys.jump = true;
            }
        }, sig);
        document.addEventListener("keyup", e => {
            if (e.key === "ArrowLeft" || e.key === "a") this._keys.left = false;
            if (e.key === "ArrowRight" || e.key === "d") this._keys.right = false;
            if (e.key === "ArrowUp" || e.key === "w" || e.key === " ") this._keys.jump = false;
        }, sig);

        // mobile buttons
        const wire = (id, key) => {
            const btn = this.shadowRoot.getElementById(id);
            btn.addEventListener("touchstart", e => { e.preventDefault(); this._keys[key] = true; }, { ...sig, passive: false });
            btn.addEventListener("touchend", e => { e.preventDefault(); this._keys[key] = false; }, { ...sig, passive: false });
        };
        wire("btn-left", "left");
        wire("btn-right", "right");
        wire("btn-jump", "jump");
    }

    // ── Game loop ──────────────────────────────────────────────────────────────

    _loop() {
        if (!this._alive && !this._won) return;
        const now = performance.now();
        const dt = Math.min((now - this._lastFrame) / 1000, 0.04);
        this._lastFrame = now;

        if (this._alive && !this._won) this._update(dt);
        this._draw();
        this._raf = requestAnimationFrame(() => this._loop());
    }

    _update(dt) {
        // horizontal movement
        this._pvx = 0;
        if (this._keys.left) { this._pvx = -MOVE_SPEED; this._facingRight = false; }
        if (this._keys.right) { this._pvx = MOVE_SPEED; this._facingRight = true; }

        // jump
        if (this._keys.jump && this._onGround) {
            this._pvy = JUMP_VEL;
            this._onGround = false;
        }

        // gravity
        this._pvy += GRAVITY * dt;
        if (this._pvy > 600) this._pvy = 600;

        // move X
        this._px += this._pvx * dt;
        this._resolveCollisionsX();

        // move Y
        this._py += this._pvy * dt;
        this._resolveCollisionsY();

        // fell off
        if (this._py > this._levelH + 50) {
            this._die();
            return;
        }

        // clamp left
        if (this._px < 0) this._px = 0;

        // invincibility timer
        if (this._invincible > 0) this._invincible -= dt;

        // coins
        const pw = 20, ph = 24;
        for (const coin of this._coins) {
            if (coin.collected) continue;
            if (this._overlaps(this._px, this._py, pw, ph, coin.x, coin.y, coin.w, coin.h)) {
                coin.collected = true;
                this._score += 10;
            }
        }

        // enemies
        for (const en of this._enemies) {
            if (!en.alive) continue;
            en.x += en.vx * dt;
            if (en.x > en.startX + en.range || en.x < en.startX - en.range) en.vx *= -1;

            if (this._invincible > 0) continue;
            if (this._overlaps(this._px, this._py, pw, ph, en.x, en.y, en.w, en.h)) {
                // stomp from above
                if (this._pvy > 0 && this._py + ph - 8 < en.y + en.h / 2) {
                    en.alive = false;
                    this._pvy = JUMP_VEL * 0.6;
                    this._score += 20;
                } else {
                    this._die();
                    return;
                }
            }
        }

        // flag
        if (this._flag && this._overlaps(this._px, this._py, pw, ph,
            this._flag.x, this._flag.y, this._flag.w, this._flag.h)) {
            this._score += 50;
            this._currentLevel++;
            if (this._currentLevel >= LEVELS.length) {
                this._won = true;
                this._endGame();
            } else {
                this._initLevel(this._currentLevel);
            }
        }

        // camera
        const targetCam = this._px - PF_W / 3;
        this._camX += (targetCam - this._camX) * 0.1;
        this._camX = Math.max(0, Math.min(this._levelW - PF_W, this._camX));
    }

    _resolveCollisionsX() {
        const pw = 20, ph = 24;
        for (const t of this._tiles) {
            if (this._overlaps(this._px, this._py, pw, ph, t.x, t.y, t.w, t.h)) {
                if (this._pvx > 0) this._px = t.x - pw;
                else if (this._pvx < 0) this._px = t.x + t.w;
            }
        }
    }

    _resolveCollisionsY() {
        const pw = 20, ph = 24;
        this._onGround = false;
        for (const t of this._tiles) {
            if (this._overlaps(this._px, this._py, pw, ph, t.x, t.y, t.w, t.h)) {
                if (this._pvy > 0) {
                    this._py = t.y - ph;
                    this._pvy = 0;
                    this._onGround = true;
                } else if (this._pvy < 0) {
                    this._py = t.y + t.h;
                    this._pvy = 0;
                }
            }
        }
    }

    _overlaps(ax, ay, aw, ah, bx, by, bw, bh) {
        return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
    }

    _die() {
        this._lives--;
        if (this._lives <= 0) {
            this._alive = false;
            this._endGame();
        } else {
            this._invincible = 2;
            this._px = this._playerStart.x;
            this._py = this._playerStart.y;
            this._pvy = 0;
        }
    }

    _endGame() {
        cancelAnimationFrame(this._raf);
        // final draw
        this._draw();
        setTimeout(() => {
            this.dispatchEvent(new CustomEvent("game-over", {
                bubbles: true,
                detail: { score: this._score, pointsEarned: 0 },
            }));
        }, 1200);
    }

    // ── Drawing ────────────────────────────────────────────────────────────────

    _draw() {
        const ctx = this._ctx;
        const cx = Math.floor(this._camX);

        // sky gradient
        const sky = ctx.createLinearGradient(0, 0, 0, PF_H);
        sky.addColorStop(0, "#4a90d9");
        sky.addColorStop(0.6, "#87ceeb");
        sky.addColorStop(1, "#c8e6c9");
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, PF_W, PF_H);

        // clouds (parallax)
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        for (let i = 0; i < 6; i++) {
            const cloudX = (i * 180 + 40) - cx * 0.3;
            const cloudY = 20 + (i % 3) * 25;
            ctx.beginPath();
            ctx.ellipse(cloudX, cloudY, 30, 12, 0, 0, Math.PI * 2);
            ctx.ellipse(cloudX + 20, cloudY - 5, 20, 10, 0, 0, Math.PI * 2);
            ctx.ellipse(cloudX - 15, cloudY + 2, 18, 9, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.save();
        ctx.translate(-cx, 0);

        // tiles
        for (const t of this._tiles) {
            if (t.x + t.w < cx - 10 || t.x > cx + PF_W + 10) continue;
            if (t.type === "#") {
                ctx.fillStyle = "#8B4513";
                ctx.fillRect(t.x, t.y, t.w, t.h);
                ctx.fillStyle = "#228B22";
                ctx.fillRect(t.x, t.y, t.w, 5);
            } else {
                ctx.fillStyle = "#CD853F";
                ctx.fillRect(t.x, t.y, t.w, t.h);
                ctx.strokeStyle = "#8B6914";
                ctx.lineWidth = 1;
                ctx.strokeRect(t.x + 1, t.y + 1, t.w - 2, t.h - 2);
            }
        }

        // coins
        ctx.font = `${TILE - 4}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        for (const c of this._coins) {
            if (c.collected) continue;
            const bobY = Math.sin(performance.now() / 300 + c.x) * 3;
            ctx.fillText("🪙", c.x + c.w / 2, c.y + c.h / 2 + bobY);
        }

        // enemies
        for (const en of this._enemies) {
            if (!en.alive) continue;
            ctx.fillText(en.vx > 0 ? "🍄" : "🍄", en.x + en.w / 2, en.y + en.h / 2);
        }

        // flag
        if (this._flag) {
            ctx.fillStyle = "#888";
            ctx.fillRect(this._flag.x + 10, this._flag.y, 4, this._flag.h);
            ctx.fillStyle = "#FF1744";
            ctx.beginPath();
            ctx.moveTo(this._flag.x + 14, this._flag.y);
            ctx.lineTo(this._flag.x + 30, this._flag.y + 10);
            ctx.lineTo(this._flag.x + 14, this._flag.y + 20);
            ctx.fill();
        }

        // player
        const blink = this._invincible > 0 && Math.floor(performance.now() / 100) % 2;
        if (!blink) {
            const pw = 20, ph = 24;
            // body
            ctx.fillStyle = "#E53935";
            ctx.beginPath();
            ctx.roundRect(this._px + 2, this._py, pw - 4, 14, 3);
            ctx.fill();
            // head
            ctx.fillStyle = "#FFCC80";
            ctx.beginPath();
            ctx.arc(this._px + pw / 2, this._py - 2, 8, 0, Math.PI * 2);
            ctx.fill();
            // hat
            ctx.fillStyle = "#E53935";
            ctx.beginPath();
            ctx.ellipse(this._px + pw / 2, this._py - 6, 10, 5, 0, Math.PI, 0);
            ctx.fill();
            // eyes
            ctx.fillStyle = "#333";
            const eyeOff = this._facingRight ? 2 : -2;
            ctx.beginPath();
            ctx.arc(this._px + pw / 2 + eyeOff, this._py - 3, 1.5, 0, Math.PI * 2);
            ctx.fill();
            // legs
            ctx.fillStyle = "#1565C0";
            ctx.fillRect(this._px + 4, this._py + 14, 5, 10);
            ctx.fillRect(this._px + 11, this._py + 14, 5, 10);
            // shoes
            ctx.fillStyle = "#5D4037";
            ctx.fillRect(this._px + 3, this._py + 22, 7, 3);
            ctx.fillRect(this._px + 10, this._py + 22, 7, 3);
        }

        ctx.restore();

        // HUD
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.beginPath(); ctx.roundRect(4, 4, 200, 28, 6); ctx.fill();
        ctx.fillStyle = "white";
        ctx.font = "bold 13px 'Segoe UI',sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";
        ctx.fillText(`🪙 ${this._score}   ❤️ ${this._lives}   Level ${this._currentLevel + 1}/${LEVELS.length}`, 12, 22);

        // game over / win overlay
        if (!this._alive || this._won) {
            ctx.fillStyle = "rgba(0,0,0,0.6)";
            ctx.fillRect(0, 0, PF_W, PF_H);
            ctx.fillStyle = "white";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.font = "bold 24px 'Segoe UI',sans-serif";
            ctx.fillText(this._won ? "🎉 Geschafft!" : "💀 Game Over", PF_W / 2, PF_H / 2 - 14);
            ctx.font = "16px 'Segoe UI',sans-serif";
            ctx.fillText(`Punkte: ${this._score}`, PF_W / 2, PF_H / 2 + 14);
        }
    }
}

customElements.define("platformer-game", PlatformerGame);
