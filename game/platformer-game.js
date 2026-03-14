// game/platformer-game.js
// Huepfelt: a Mario-style side-scrolling platformer.
// Collect coins, stomp enemies, hit ? blocks, enter pipes, reach the flag!
// Fires CustomEvent("game-over", { bubbles: true, detail: { score, pointsEarned } })

const PF_W = 400, PF_H = 300;
const GRAVITY = 900;
const JUMP_VEL = -350;
const MOVE_SPEED = 150;
const TILE = 24;

// Level map characters:
// . = air, # = ground, B = brick, ? = question block (coin), C = coin,
// E = enemy, F = flag, P = player start, T = pipe top, t = pipe body,
// M = mushroom block (gives big), S = star coin (bonus)
const LEVELS = [
    // Level 1 - easy intro
    [
        "........................................",
        "........................................",
        "........................................",
        "...............?..?..?.................",
        "........................................",
        ".......C.C.C.............C.C..........F",
        "P.....#####.....E...##.......###.....##",
        "####.........########..###.####..##.###",
        "########################################",
    ],
    // Level 2
    [
        "..........................................",
        "..........................................",
        "..............?.....?..?.?...............",
        "...C.C...........................C.C.....",
        "..#####....E.....######..............F..",
        "..........####...........E...####...###.",
        "P...C...........###....####.........####",
        "####..####..###......###...###..########",
        "##########################################",
    ],
    // Level 3
    [
        ".............................................",
        "..............................................",
        ".........?..?........?.?.?...................",
        "....C.C...........C.C.C..........C.C........",
        "...#####........#######..........####.....F.",
        "...........E..............E..........E...###",
        "P......C.......####...#####.....######.....",
        "####..####..###..........###..###..########.",
        "##############################################",
    ],
    // Level 4
    [
        "...................................................",
        "...................................................",
        "..........?..........?.?.?........?..?.............",
        ".....C.C.C..........C.C.C..........C.C.C..........",
        "....######.........########.........######........F",
        "..............E..............E..............E....##",
        "P.....C..........######..........######..........##",
        "#####..####..###..........###..###..########..####.",
        "###################################################",
    ],
    // Level 5
    [
        "........................................................",
        "........................................................",
        "...........?..?..........?.?.?..........?..?..?.........",
        "......C.C.C...........C.C.C.C..........C.C.C.C.........",
        ".....######..........########..........########.......F.",
        ".............E...............E...............E.......###",
        "P......C...........####...........####...........######.",
        "#####..####..####..........####..........####..########.",
        "########################################################",
    ],
];

// Colors
const COL_SKY_TOP = "#5c94fc";
const COL_SKY_BOT = "#87ceeb";
const COL_GROUND = "#c84c09";
const COL_GROUND_TOP = "#00a800";
const COL_BRICK = "#c84c09";
const COL_BRICK_LINE = "#e09050";
const COL_Q_BLOCK = "#ffa000";
const COL_Q_BORDER = "#e08000";
const COL_PLAYER_RED = "#e03020";
const COL_PLAYER_SKIN = "#ffb980";
const COL_PLAYER_BLUE = "#2050d0";
const COL_PLAYER_BROWN = "#6d3a00";

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
        <button class="ctrl-btn" id="btn-left">&#11013;</button>
        <button class="ctrl-btn" id="btn-jump">&#11014;</button>
        <button class="ctrl-btn" id="btn-right">&#10145;</button>
      </div>`;

        this._cv = this.shadowRoot.getElementById("c");
        this._ctx = this._cv.getContext("2d");
        this._keys = { left: false, right: false, jump: false };
        this._score = 0;
        this._coins = 0;
        this._lives = 5;
        this._currentLevel = 0;
        this._alive = true;
        this._won = false;
        this._levelTransition = 0;
        this._particles = [];
        this._popups = [];
        this._initLevel(0);
        this._bindInput();
        this._lastFrame = performance.now();
        this._loop();
    }

    disconnectedCallback() {
        cancelAnimationFrame(this._raf);
        this._controller.abort();
    }

    // -- Level loading --

    _initLevel(idx) {
        const map = LEVELS[idx];
        this._tiles = [];
        this._coinItems = [];
        this._enemies = [];
        this._qBlocks = [];
        this._flag = null;
        this._playerStart = { x: 0, y: 0 };

        const rows = map.length;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < map[r].length; c++) {
                const ch = map[r][c];
                const x = c * TILE, y = r * TILE;
                if (ch === "#") this._tiles.push({ x, y, w: TILE, h: TILE, type: "#" });
                if (ch === "B") this._tiles.push({ x, y, w: TILE, h: TILE, type: "B" });
                if (ch === "?") this._qBlocks.push({ x, y, w: TILE, h: TILE, hit: false, bounceY: 0 });
                if (ch === "C") this._coinItems.push({ x: x + 4, y: y + 4, w: 16, h: 16, collected: false, bobOffset: Math.random() * Math.PI * 2 });
                if (ch === "S") this._coinItems.push({ x: x + 2, y: y + 2, w: 20, h: 20, collected: false, star: true, bobOffset: Math.random() * Math.PI * 2 });
                if (ch === "E") this._enemies.push({ x, y, w: TILE, h: TILE, vx: 35, startX: x, range: 70, alive: true, frame: 0 });
                if (ch === "F") this._flag = { x, y: y - TILE, w: TILE, h: TILE * 2 };
                if (ch === "P") this._playerStart = { x, y };
            }
        }

        this._levelW = Math.max(...map.map(r => r.length)) * TILE;
        this._levelH = rows * TILE;

        this._px = this._playerStart.x;
        this._py = this._playerStart.y;
        this._pvx = 0;
        this._pvy = 0;
        this._onGround = false;
        this._facingRight = true;
        this._invincible = 0;
        this._camX = 0;
        this._walkFrame = 0;
        this._levelTransition = 1.5;
    }

    // -- Input --

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

        const wire = (id, key) => {
            const btn = this.shadowRoot.getElementById(id);
            btn.addEventListener("touchstart", e => { e.preventDefault(); this._keys[key] = true; }, { ...sig, passive: false });
            btn.addEventListener("touchend", e => { e.preventDefault(); this._keys[key] = false; }, { ...sig, passive: false });
        };
        wire("btn-left", "left");
        wire("btn-right", "right");
        wire("btn-jump", "jump");
    }

    // -- Game loop --

    _loop() {
        if (!this._alive && !this._won) return;
        const now = performance.now();
        const dt = Math.min((now - this._lastFrame) / 1000, 0.04);
        this._lastFrame = now;

        if (this._levelTransition > 0) {
            this._levelTransition -= dt;
            this._drawLevelIntro();
            this._raf = requestAnimationFrame(() => this._loop());
            return;
        }

        if (this._alive && !this._won) this._update(dt);
        this._updateParticles(dt);
        this._draw();
        this._raf = requestAnimationFrame(() => this._loop());
    }

    _update(dt) {
        // horizontal movement
        this._pvx = 0;
        if (this._keys.left) { this._pvx = -MOVE_SPEED; this._facingRight = false; }
        if (this._keys.right) { this._pvx = MOVE_SPEED; this._facingRight = true; }

        if (this._pvx !== 0) this._walkFrame += dt * 8;
        else this._walkFrame = 0;

        // jump (more forgiving)
        if (this._keys.jump && this._onGround) {
            this._pvy = JUMP_VEL;
            this._onGround = false;
        }

        // gravity (lighter = easier jumps)
        this._pvy += GRAVITY * dt;
        if (this._pvy > 500) this._pvy = 500;

        // move X
        this._px += this._pvx * dt;
        this._resolveCollisionsX();

        // move Y
        this._py += this._pvy * dt;
        this._resolveCollisionsY();

        // fell off - don't die, respawn at start of current section
        if (this._py > this._levelH + 50) {
            this._die();
            return;
        }

        if (this._px < 0) this._px = 0;

        // invincibility timer
        if (this._invincible > 0) this._invincible -= dt;

        // coins
        const pw = 20, ph = 24;
        for (const coin of this._coinItems) {
            if (coin.collected) continue;
            if (this._overlaps(this._px, this._py, pw, ph, coin.x, coin.y, coin.w, coin.h)) {
                coin.collected = true;
                this._score += coin.star ? 30 : 10;
                this._coins++;
                this._spawnCoinParticles(coin.x + coin.w / 2, coin.y);
                this._popups.push({ x: coin.x, y: coin.y, text: coin.star ? "+30" : "+10", life: 1 });
            }
        }

        // question blocks (hit from below)
        for (const qb of this._qBlocks) {
            if (qb.hit) continue;
            if (qb.bounceY > 0) qb.bounceY = Math.max(0, qb.bounceY - dt * 40);
            if (this._pvy < 0 && this._overlaps(this._px, this._py, pw, ph, qb.x, qb.y, qb.w, qb.h)) {
                if (this._py + ph > qb.y + qb.h * 0.5) {
                    qb.hit = true;
                    qb.bounceY = 8;
                    this._score += 10;
                    this._coins++;
                    this._spawnCoinParticles(qb.x + qb.w / 2, qb.y - 10);
                    this._popups.push({ x: qb.x, y: qb.y - 15, text: "+10", life: 1 });
                    this._pvy = 40; // small bounce down
                }
            }
        }

        // enemies
        for (const en of this._enemies) {
            if (!en.alive) continue;
            en.x += en.vx * dt;
            en.frame += dt * 3;
            if (en.x > en.startX + en.range || en.x < en.startX - en.range) en.vx *= -1;

            // collision with tiles
            for (const t of this._tiles) {
                if (this._overlaps(en.x, en.y, en.w, en.h, t.x, t.y, t.w, t.h)) {
                    en.vx *= -1;
                    en.x += en.vx * dt * 2;
                }
            }

            if (this._invincible > 0) continue;
            if (this._overlaps(this._px, this._py, pw, ph, en.x, en.y, en.w, en.h)) {
                // stomp from above (very generous detection)
                if (this._pvy > 0 && this._py + ph - 10 < en.y + en.h / 2) {
                    en.alive = false;
                    this._pvy = JUMP_VEL * 0.5;
                    this._score += 20;
                    this._popups.push({ x: en.x, y: en.y - 10, text: "+20", life: 1 });
                    this._spawnStompParticles(en.x + en.w / 2, en.y + en.h);
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
            this._popups.push({ x: this._flag.x, y: this._flag.y - 10, text: "LEVEL UP!", life: 2 });
            this._currentLevel++;
            if (this._currentLevel >= LEVELS.length) {
                this._won = true;
                this._endGame();
            } else {
                this._initLevel(this._currentLevel);
            }
        }

        // camera (smooth follow)
        const targetCam = this._px - PF_W / 3;
        this._camX += (targetCam - this._camX) * 0.08;
        this._camX = Math.max(0, Math.min(this._levelW - PF_W, this._camX));
    }

    _resolveCollisionsX() {
        const pw = 20, ph = 24;
        const solids = [...this._tiles, ...this._qBlocks.map(q => ({ ...q, y: q.y - q.bounceY }))];
        for (const t of solids) {
            if (this._overlaps(this._px, this._py, pw, ph, t.x, t.y, t.w, t.h)) {
                if (this._pvx > 0) this._px = t.x - pw;
                else if (this._pvx < 0) this._px = t.x + t.w;
            }
        }
    }

    _resolveCollisionsY() {
        const pw = 20, ph = 24;
        this._onGround = false;
        const solids = [...this._tiles, ...this._qBlocks.map(q => ({ ...q, y: q.y - q.bounceY }))];
        for (const t of solids) {
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
            this._invincible = 2.5;
            this._px = this._playerStart.x;
            this._py = this._playerStart.y;
            this._pvy = 0;
        }
    }

    _endGame() {
        cancelAnimationFrame(this._raf);
        this._draw();
        setTimeout(() => {
            this.dispatchEvent(new CustomEvent("game-over", {
                bubbles: true,
                detail: { score: this._score, pointsEarned: 0 },
            }));
        }, 1500);
    }

    // -- Particles --

    _spawnCoinParticles(x, y) {
        for (let i = 0; i < 6; i++) {
            this._particles.push({
                x, y, vx: (Math.random() - 0.5) * 80, vy: -60 - Math.random() * 60,
                life: 0.6 + Math.random() * 0.3, color: "#ffd700", size: 3,
            });
        }
    }

    _spawnStompParticles(x, y) {
        for (let i = 0; i < 8; i++) {
            this._particles.push({
                x, y, vx: (Math.random() - 0.5) * 100, vy: -40 - Math.random() * 40,
                life: 0.5 + Math.random() * 0.3, color: "#ff8800", size: 2 + Math.random() * 2,
            });
        }
    }

    _updateParticles(dt) {
        for (const p of this._particles) {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 200 * dt;
            p.life -= dt;
        }
        this._particles = this._particles.filter(p => p.life > 0);

        for (const p of this._popups) {
            p.y -= 30 * dt;
            p.life -= dt;
        }
        this._popups = this._popups.filter(p => p.life > 0);
    }

    // -- Drawing --

    _drawLevelIntro() {
        const ctx = this._ctx;
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, PF_W, PF_H);
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "bold 20px 'Segoe UI',sans-serif";
        ctx.fillText("WELT " + (this._currentLevel + 1), PF_W / 2, PF_H / 2 - 20);
        ctx.font = "14px 'Segoe UI',sans-serif";
        const hearts = "";
        for (let i = 0; i < this._lives; i++) ctx.fillText("\u2764\uFE0F", PF_W / 2 - 30 + i * 15, PF_H / 2 + 15);
        ctx.fillText("x " + this._lives, PF_W / 2 + 20, PF_H / 2 + 15);
    }

    _draw() {
        const ctx = this._ctx;
        const cx = Math.floor(this._camX);
        const now = performance.now();

        // sky gradient
        const sky = ctx.createLinearGradient(0, 0, 0, PF_H);
        sky.addColorStop(0, COL_SKY_TOP);
        sky.addColorStop(1, COL_SKY_BOT);
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, PF_W, PF_H);

        // background hills
        ctx.fillStyle = "#4a8c3f";
        for (let i = 0; i < 8; i++) {
            const hx = i * 130 - (cx * 0.2) % 130;
            ctx.beginPath();
            ctx.ellipse(hx, PF_H - 30, 60 + i * 5, 30 + (i % 3) * 10, 0, Math.PI, 0);
            ctx.fill();
        }

        // clouds (parallax)
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        for (let i = 0; i < 6; i++) {
            const cloudX = (i * 180 + 40) - cx * 0.15;
            const cloudY = 20 + (i % 3) * 25;
            ctx.beginPath();
            ctx.ellipse(cloudX, cloudY, 28, 11, 0, 0, Math.PI * 2);
            ctx.ellipse(cloudX + 18, cloudY - 4, 18, 9, 0, 0, Math.PI * 2);
            ctx.ellipse(cloudX - 14, cloudY + 2, 16, 8, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.save();
        ctx.translate(-cx, 0);

        // tiles
        for (const t of this._tiles) {
            if (t.x + t.w < cx - 10 || t.x > cx + PF_W + 10) continue;
            if (t.type === "#") {
                // ground block with grass
                ctx.fillStyle = COL_GROUND;
                ctx.fillRect(t.x, t.y, t.w, t.h);
                ctx.fillStyle = COL_GROUND_TOP;
                ctx.fillRect(t.x, t.y, t.w, 4);
                // subtle brick pattern
                ctx.strokeStyle = "rgba(0,0,0,0.15)";
                ctx.lineWidth = 0.5;
                ctx.strokeRect(t.x, t.y + 4, t.w / 2, (t.h - 4) / 2);
                ctx.strokeRect(t.x + t.w / 2, t.y + 4 + (t.h - 4) / 2, t.w / 2, (t.h - 4) / 2);
            } else if (t.type === "B") {
                // brick
                ctx.fillStyle = COL_BRICK;
                ctx.fillRect(t.x, t.y, t.w, t.h);
                ctx.strokeStyle = COL_BRICK_LINE;
                ctx.lineWidth = 1;
                ctx.strokeRect(t.x + 1, t.y + 1, t.w - 2, t.h / 2 - 1);
                ctx.strokeRect(t.x + t.w / 4, t.y + t.h / 2, t.w / 2, t.h / 2 - 1);
            }
        }

        // question blocks
        for (const qb of this._qBlocks) {
            if (qb.x + qb.w < cx - 10 || qb.x > cx + PF_W + 10) continue;
            const by = qb.y - qb.bounceY;
            if (qb.hit) {
                ctx.fillStyle = "#8b7355";
                ctx.fillRect(qb.x, by, qb.w, qb.h);
                ctx.strokeStyle = "#6b5335";
                ctx.lineWidth = 1;
                ctx.strokeRect(qb.x + 1, by + 1, qb.w - 2, qb.h - 2);
            } else {
                // animated ? block
                ctx.fillStyle = COL_Q_BLOCK;
                ctx.fillRect(qb.x, by, qb.w, qb.h);
                ctx.strokeStyle = COL_Q_BORDER;
                ctx.lineWidth = 2;
                ctx.strokeRect(qb.x + 1, by + 1, qb.w - 2, qb.h - 2);
                // ? symbol with bob
                const bob = Math.sin(now / 400 + qb.x) * 2;
                ctx.fillStyle = "#fff";
                ctx.font = "bold 16px sans-serif";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText("?", qb.x + qb.w / 2, by + qb.h / 2 + bob);
            }
        }

        // coins
        for (const c of this._coinItems) {
            if (c.collected) continue;
            const bobY = Math.sin(now / 300 + c.bobOffset) * 3;
            // spinning coin effect
            const stretch = Math.abs(Math.cos(now / 200 + c.bobOffset));
            ctx.fillStyle = "#ffd700";
            ctx.beginPath();
            ctx.ellipse(c.x + c.w / 2, c.y + c.h / 2 + bobY, c.w / 2 * Math.max(0.3, stretch), c.h / 2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#ffed4a";
            ctx.beginPath();
            ctx.ellipse(c.x + c.w / 2, c.y + c.h / 2 + bobY, c.w / 3 * Math.max(0.3, stretch), c.h / 3, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // enemies (Goomba-style)
        for (const en of this._enemies) {
            if (!en.alive) continue;
            const ex = en.x, ey = en.y;
            const wobble = Math.sin(en.frame * 3) * 1.5;
            // body
            ctx.fillStyle = "#8b4513";
            ctx.beginPath();
            ctx.ellipse(ex + TILE / 2, ey + TILE * 0.6, TILE * 0.45, TILE * 0.4, 0, 0, Math.PI * 2);
            ctx.fill();
            // feet
            ctx.fillStyle = "#4a2500";
            const footOff = Math.sin(en.frame * 4) * 2;
            ctx.fillRect(ex + 3, ey + TILE - 5 + footOff, 7, 5);
            ctx.fillRect(ex + TILE - 10, ey + TILE - 5 - footOff, 7, 5);
            // angry eyes
            ctx.fillStyle = "white";
            ctx.beginPath();
            ctx.ellipse(ex + TILE * 0.35, ey + TILE * 0.4, 4, 3.5, 0, 0, Math.PI * 2);
            ctx.ellipse(ex + TILE * 0.65, ey + TILE * 0.4, 4, 3.5, 0, 0, Math.PI * 2);
            ctx.fill();
            // pupils
            ctx.fillStyle = "#000";
            const pupilDir = en.vx > 0 ? 1 : -1;
            ctx.beginPath();
            ctx.arc(ex + TILE * 0.35 + pupilDir * 1.5, ey + TILE * 0.42, 2, 0, Math.PI * 2);
            ctx.arc(ex + TILE * 0.65 + pupilDir * 1.5, ey + TILE * 0.42, 2, 0, Math.PI * 2);
            ctx.fill();
            // eyebrows (angry)
            ctx.strokeStyle = "#4a2500";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(ex + TILE * 0.2, ey + TILE * 0.28 + wobble);
            ctx.lineTo(ex + TILE * 0.45, ey + TILE * 0.32);
            ctx.moveTo(ex + TILE * 0.8, ey + TILE * 0.28 + wobble);
            ctx.lineTo(ex + TILE * 0.55, ey + TILE * 0.32);
            ctx.stroke();
        }

        // flag
        if (this._flag) {
            // pole
            ctx.fillStyle = "#aaa";
            ctx.fillRect(this._flag.x + 10, this._flag.y, 4, this._flag.h);
            // ball on top
            ctx.fillStyle = "#ffd700";
            ctx.beginPath();
            ctx.arc(this._flag.x + 12, this._flag.y, 4, 0, Math.PI * 2);
            ctx.fill();
            // flag waving
            const wave = Math.sin(now / 300) * 3;
            ctx.fillStyle = "#28a745";
            ctx.beginPath();
            ctx.moveTo(this._flag.x + 14, this._flag.y + 2);
            ctx.lineTo(this._flag.x + 32 + wave, this._flag.y + 10);
            ctx.lineTo(this._flag.x + 14, this._flag.y + 20);
            ctx.fill();
        }

        // player
        const blink = this._invincible > 0 && Math.floor(now / 80) % 2;
        if (!blink) {
            this._drawPlayer(ctx, this._px, this._py, this._facingRight, this._walkFrame, this._onGround, this._pvy);
        }

        // particles
        for (const p of this._particles) {
            ctx.globalAlpha = Math.min(1, p.life * 3);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // score popups
        ctx.font = "bold 11px 'Segoe UI',sans-serif";
        ctx.textAlign = "center";
        for (const p of this._popups) {
            ctx.globalAlpha = Math.min(1, p.life * 2);
            ctx.fillStyle = "#fff";
            ctx.strokeStyle = "#000";
            ctx.lineWidth = 2;
            ctx.strokeText(p.text, p.x + 10, p.y);
            ctx.fillText(p.text, p.x + 10, p.y);
        }
        ctx.globalAlpha = 1;

        ctx.restore();

        // HUD
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.beginPath();
        ctx.roundRect(4, 4, 240, 28, 8);
        ctx.fill();
        ctx.fillStyle = "white";
        ctx.font = "bold 12px 'Segoe UI',sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";
        const hearts = Array(this._lives).fill("\u2764").join("");
        ctx.fillText("  " + this._score + "   \uD83E\uDE99 " + this._coins + "   " + hearts + "   Welt " + (this._currentLevel + 1) + "/" + LEVELS.length, 12, 22);

        // game over / win overlay
        if (!this._alive || this._won) {
            ctx.fillStyle = "rgba(0,0,0,0.6)";
            ctx.fillRect(0, 0, PF_W, PF_H);
            ctx.fillStyle = "white";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.font = "bold 22px 'Segoe UI',sans-serif";
            ctx.fillText(this._won ? "Geschafft!" : "Game Over", PF_W / 2, PF_H / 2 - 18);
            ctx.font = "15px 'Segoe UI',sans-serif";
            ctx.fillText("Punkte: " + this._score + "  Coins: " + this._coins, PF_W / 2, PF_H / 2 + 12);
        }
    }

    _drawPlayer(ctx, x, y, right, walkFrame, onGround, vy) {
        const pw = 20, ph = 24;
        const dir = right ? 1 : -1;
        const cx = x + pw / 2;

        // legs walk animation
        const legSwing = onGround ? Math.sin(walkFrame) * 4 : 3;

        // body
        ctx.fillStyle = COL_PLAYER_RED;
        ctx.beginPath();
        ctx.roundRect(x + 3, y + 2, pw - 6, 12, 2);
        ctx.fill();

        // head
        ctx.fillStyle = COL_PLAYER_SKIN;
        ctx.beginPath();
        ctx.arc(cx, y - 1, 8, 0, Math.PI * 2);
        ctx.fill();

        // hat (Mario cap)
        ctx.fillStyle = COL_PLAYER_RED;
        ctx.beginPath();
        ctx.ellipse(cx + dir * 2, y - 5, 10, 5, 0, Math.PI, 0);
        ctx.fill();
        // cap brim
        ctx.fillRect(cx - 5 + (right ? 3 : -8), y - 3, 10, 3);

        // eyes
        ctx.fillStyle = "#333";
        ctx.beginPath();
        ctx.arc(cx + dir * 3, y - 2, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // mustache
        ctx.fillStyle = COL_PLAYER_BROWN;
        ctx.fillRect(cx - 4, y + 2, 8, 2);

        // legs
        ctx.fillStyle = COL_PLAYER_BLUE;
        ctx.fillRect(x + 4 - legSwing * 0.3, y + 14, 5, 8);
        ctx.fillRect(x + 11 + legSwing * 0.3, y + 14, 5, 8);

        // shoes
        ctx.fillStyle = COL_PLAYER_BROWN;
        ctx.fillRect(x + 3 - legSwing * 0.3, y + 21, 7, 3);
        ctx.fillRect(x + 10 + legSwing * 0.3, y + 21, 7, 3);
    }
}

customElements.define("platformer-game", PlatformerGame);
