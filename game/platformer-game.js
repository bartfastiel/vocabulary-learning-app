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

// Power-up types
const POWERUPS = [
    { type: "wings",  emoji: "\u{1F985}", label: "Flügel",       color: "#60a5fa", duration: 8  },
    { type: "star",   emoji: "\u2B50",    label: "Stern",        color: "#fbbf24", duration: 6  },
    { type: "speed",  emoji: "\u26A1",    label: "Blitz",        color: "#f472b6", duration: 7  },
    { type: "shield", emoji: "\u{1F6E1}", label: "Schild",       color: "#34d399", duration: 10 },
    { type: "magnet", emoji: "\u{1F9F2}", label: "Magnet",       color: "#a78bfa", duration: 8  },
    { type: "tiny",   emoji: "\u{1F30D}", label: "Mini",         color: "#fb923c", duration: 8  },
];

// Persistent inventory
const INV_KEY = "huepfeltInventory";
function loadInventory() {
    try { return JSON.parse(localStorage.getItem(INV_KEY)) || []; } catch { return []; }
}
function saveInventory(inv) {
    localStorage.setItem(INV_KEY, JSON.stringify(inv));
}
function unlockPower(type) {
    const inv = loadInventory();
    if (!inv.includes(type)) { inv.push(type); saveInventory(inv); }
}

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
        const inv = loadInventory();
        if (inv.length > 0) {
            this._showLoadout(inv);
        } else {
            this._startWithPower(null);
        }
    }

    _showLoadout(inv) {
        const items = inv.map(t => POWERUPS.find(p => p.type === t)).filter(Boolean);
        this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          width: 100%; height: 100%; background: #000;
          font-family: "Segoe UI", sans-serif; user-select: none;
        }
        .loadout {
          text-align: center; color: white; padding: 1.5rem;
          max-width: 360px; width: 100%;
        }
        .loadout h2 { margin: 0 0 0.3rem; font-size: 1.3rem; }
        .loadout p { margin: 0 0 1rem; font-size: 0.85rem; opacity: 0.7; }
        .power-grid {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.6rem;
          margin-bottom: 1rem;
        }
        .power-card {
          background: rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.2);
          border-radius: 10px; padding: 0.6rem 0.3rem; cursor: pointer;
          transition: all 0.2s; display: flex; flex-direction: column; align-items: center; gap: 0.3rem;
        }
        .power-card:hover { background: rgba(255,255,255,0.2); transform: scale(1.05); }
        .power-card.selected { border-color: #fbbf24; background: rgba(251,191,36,0.2); box-shadow: 0 0 12px rgba(251,191,36,0.3); }
        .power-card .emoji { font-size: 1.6rem; }
        .power-card .label { font-size: 0.7rem; color: white; }
        .power-card .desc { font-size: 0.6rem; opacity: 0.6; }
        .start-btn {
          background: #28a745; color: white; border: none; border-radius: 10px;
          padding: 0.7rem 2rem; font-size: 1rem; cursor: pointer; font-weight: bold;
          transition: background 0.2s;
        }
        .start-btn:hover { background: #218838; }
        .skip-btn {
          background: none; border: 1px solid rgba(255,255,255,0.3); color: rgba(255,255,255,0.7);
          border-radius: 8px; padding: 0.5rem 1.2rem; font-size: 0.8rem; cursor: pointer;
          margin-top: 0.5rem; transition: all 0.2s;
        }
        .skip-btn:hover { border-color: white; color: white; }
      </style>
      <div class="loadout">
        <h2>Ausrüstung wählen</h2>
        <p>Wähle ein Power-Up für das ganze Spiel!</p>
        <div class="power-grid" id="pgrid"></div>
        <button class="start-btn" id="go-btn">Spielen!</button><br>
        <button class="skip-btn" id="skip-btn">Ohne Power-Up starten</button>
      </div>`;

        const grid = this.shadowRoot.getElementById("pgrid");
        let selected = null;
        const POWER_DESCS = {
            wings: "Doppelsprung + Gleiten",
            star: "Gegner besiegen bei Berührung",
            speed: "Schnellere Bewegung",
            shield: "Absorbiert einen Treffer",
            magnet: "Zieht Münzen an",
            tiny: "Kleiner & wendiger",
        };

        for (const pu of items) {
            const card = document.createElement("div");
            card.className = "power-card";
            card.innerHTML = `<span class="emoji">${pu.emoji}</span><span class="label">${pu.label}</span><span class="desc">${POWER_DESCS[pu.type] || ""}</span>`;
            card.onclick = () => {
                grid.querySelectorAll(".power-card").forEach(c => c.classList.remove("selected"));
                card.classList.add("selected");
                selected = pu;
            };
            grid.appendChild(card);
        }

        this.shadowRoot.getElementById("go-btn").onclick = () => this._startWithPower(selected);
        this.shadowRoot.getElementById("skip-btn").onclick = () => this._startWithPower(null);
    }

    _startWithPower(equippedPower) {
        this._equippedPower = equippedPower;
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
        this._powerupItems = [];   // power-ups bouncing out of blocks
        this._activePower = null;  // current active power-up { type, timer }
        this._shieldCooldown = 0;
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
        this._doubleJumpUsed = false;
        this._jumpHeld = false;
        this._camX = 0;
        this._camY = 0;
        this._walkFrame = 0;
        this._levelTransition = 1.5;

        // Generate cloud world above the level
        this._cloudPlatforms = [];
        this._cloudCoins = [];
        const skyTop = -TILE * 12; // how high the cloud world goes
        this._skyTop = skyTop;
        for (let cx = 0; cx < this._levelW; cx += TILE * 3 + Math.floor(Math.random() * TILE * 3)) {
            const cy = -TILE * 2 - Math.floor(Math.random() * TILE * 8);
            const pw = TILE * (2 + Math.floor(Math.random() * 3));
            this._cloudPlatforms.push({ x: cx, y: cy, w: pw, h: TILE, type: "cloud" });
            // Bonus coins on cloud platforms
            for (let i = 0; i < pw / TILE; i++) {
                if (Math.random() < 0.6) {
                    this._cloudCoins.push({
                        x: cx + i * TILE + 4, y: cy - TILE + 4,
                        w: 16, h: 16, collected: false, star: Math.random() < 0.3,
                        bobOffset: Math.random() * Math.PI * 2,
                    });
                }
            }
        }

        // Apply equipped power-up (permanent, timer = Infinity)
        if (this._equippedPower) {
            const ep = this._equippedPower;
            this._activePower = { type: ep.type, timer: Infinity, label: ep.label, emoji: ep.emoji, color: ep.color, permanent: true };
        }
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
        const speedMul = (this._activePower?.type === "speed") ? 1.7 : 1;
        const sizeMul = (this._activePower?.type === "tiny") ? 0.6 : 1;
        this._pvx = 0;
        if (this._keys.left) { this._pvx = -MOVE_SPEED * speedMul; this._facingRight = false; }
        if (this._keys.right) { this._pvx = MOVE_SPEED * speedMul; this._facingRight = true; }

        if (this._pvx !== 0) this._walkFrame += dt * 8 * speedMul;
        else this._walkFrame = 0;

        // jump
        const hasWings = this._activePower?.type === "wings";
        const jumpPressed = this._keys.jump && !this._jumpHeld;
        if (this._keys.jump) this._jumpHeld = true;
        else this._jumpHeld = false;

        if (jumpPressed && this._onGround) {
            this._pvy = JUMP_VEL * (hasWings ? 1.3 : 1);
            this._onGround = false;
            this._doubleJumpUsed = false;
        } else if (jumpPressed && hasWings && !this._onGround && !this._doubleJumpUsed) {
            // Wings: double jump
            this._pvy = JUMP_VEL * 0.9;
            this._doubleJumpUsed = true;
            // Wing flap particles
            for (let i = 0; i < 4; i++) {
                this._particles.push({
                    x: this._px + 10, y: this._py + 12,
                    vx: (Math.random() - 0.5) * 40, vy: 20 + Math.random() * 30,
                    life: 0.5, color: "#93c5fd", size: 2,
                });
            }
        }

        // gravity (wings = floatier)
        const gravMul = hasWings ? 0.6 : 1;
        this._pvy += GRAVITY * gravMul * dt;
        if (this._pvy > (hasWings ? 200 : 500)) this._pvy = hasWings ? 200 : 500;

        // move X
        this._px += this._pvx * dt;
        this._resolveCollisionsX();

        // move Y
        this._py += this._pvy * dt;
        // Check ? blocks BEFORE collision resolution pushes player away
        this._checkQBlocks();
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
        const hasMagnet = this._activePower?.type === "magnet";
        for (const coin of this._coinItems) {
            if (coin.collected) continue;
            // Magnet effect: pull coins toward player
            if (hasMagnet) {
                const dx = (this._px + pw / 2) - (coin.x + coin.w / 2);
                const dy = (this._py + ph / 2) - (coin.y + coin.h / 2);
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 120 && dist > 2) {
                    const pull = 150 * dt / dist;
                    coin.x += dx * pull;
                    coin.y += dy * pull;
                }
            }
            if (this._overlaps(this._px, this._py, pw, ph, coin.x, coin.y, coin.w, coin.h)) {
                coin.collected = true;
                this._score += coin.star ? 30 : 10;
                this._coins++;
                this._spawnCoinParticles(coin.x + coin.w / 2, coin.y);
                this._popups.push({ x: coin.x, y: coin.y, text: coin.star ? "+30" : "+10", life: 1 });
            }
        }

        // question blocks bounce animation
        for (const qb of this._qBlocks) {
            if (qb.bounceY > 0) qb.bounceY = Math.max(0, qb.bounceY - dt * 40);
        }

        // power-up items physics
        for (const pu of this._powerupItems) {
            pu.vy += GRAVITY * 0.5 * dt;
            pu.y += pu.vy * dt;
            pu.bobPhase += dt * 4;
            // land on tiles
            for (const t of this._tiles) {
                if (this._overlaps(pu.x, pu.y, pu.w, pu.h, t.x, t.y, t.w, t.h)) {
                    if (pu.vy > 0) { pu.y = t.y - pu.h; pu.vy = 0; pu.onGround = true; }
                }
            }
            // collect
            if (this._overlaps(this._px, this._py, pw, ph, pu.x, pu.y, pu.w, pu.h)) {
                this._activePower = { type: pu.type, timer: pu.duration, label: pu.label, emoji: pu.emoji, color: pu.color };
                this._popups.push({ x: pu.x, y: pu.y - 10, text: pu.emoji + " " + pu.label, life: 1.5 });
                this._score += 25;
                pu.collected = true;
                // Spawn sparkle particles
                for (let i = 0; i < 10; i++) {
                    this._particles.push({
                        x: pu.x + 10, y: pu.y + 10,
                        vx: (Math.random() - 0.5) * 100, vy: -50 - Math.random() * 50,
                        life: 0.8, color: pu.color, size: 2 + Math.random() * 2,
                    });
                }
            }
        }
        this._powerupItems = this._powerupItems.filter(p => !p.collected && p.y < this._levelH + 50);

        // active power-up timer (permanent ones never expire)
        if (this._activePower && !this._activePower.permanent) {
            this._activePower.timer -= dt;
            if (this._activePower.timer <= 0) {
                // Revert to equipped power-up if one exists
                if (this._equippedPower) {
                    const ep = this._equippedPower;
                    this._activePower = { type: ep.type, timer: Infinity, label: ep.label, emoji: ep.emoji, color: ep.color, permanent: true };
                } else {
                    this._activePower = null;
                }
            }
        }

        // Shield cooldown regeneration (for permanent shield)
        if (this._shieldCooldown > 0) {
            this._shieldCooldown -= dt;
            if (this._shieldCooldown <= 0 && this._equippedPower?.type === "shield" && !this._activePower) {
                const ep = this._equippedPower;
                this._activePower = { type: ep.type, timer: Infinity, label: ep.label, emoji: ep.emoji, color: ep.color, permanent: true };
                this._popups.push({ x: this._px, y: this._py - 15, text: "Schild zurück!", life: 1.5 });
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
            const isStar = this._activePower?.type === "star";
            if (this._overlaps(this._px, this._py, pw, ph, en.x, en.y, en.w, en.h)) {
                if (isStar) {
                    // Star power: auto-defeat enemies on contact
                    en.alive = false;
                    this._score += 20;
                    this._popups.push({ x: en.x, y: en.y - 10, text: "+20", life: 1 });
                    this._spawnStompParticles(en.x + en.w / 2, en.y + en.h);
                } else if (this._pvy > 0 && this._py + ph - 10 < en.y + en.h / 2) {
                    // stomp from above
                    en.alive = false;
                    this._pvy = JUMP_VEL * 0.5;
                    this._score += 20;
                    this._popups.push({ x: en.x, y: en.y - 10, text: "+20", life: 1 });
                    this._spawnStompParticles(en.x + en.w / 2, en.y + en.h);
                } else if (this._activePower?.type === "shield") {
                    // Shield absorbs the hit
                    this._invincible = 1.5;
                    this._popups.push({ x: this._px, y: this._py - 15, text: "Schild!", life: 1 });
                    if (this._activePower.permanent) {
                        // Permanent shield: temporarily deactivate, regenerates after invincibility
                        this._shieldCooldown = 3;
                        this._activePower = null;
                    } else {
                        this._activePower = null;
                    }
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

        // ceiling: can't fly above the sky top
        if (this._py < this._skyTop) {
            this._py = this._skyTop;
            this._pvy = 0;
        }

        // cloud platform collisions
        for (const cp of this._cloudPlatforms) {
            if (this._overlaps(this._px, this._py, pw, ph, cp.x, cp.y, cp.w, cp.h)) {
                if (this._pvy > 0 && this._py + ph - 8 < cp.y + cp.h / 2) {
                    this._py = cp.y - ph;
                    this._pvy = 0;
                    this._onGround = true;
                    this._doubleJumpUsed = false;
                }
            }
        }

        // cloud coins
        for (const cc of this._cloudCoins) {
            if (cc.collected) continue;
            if (hasMagnet) {
                const dx = (this._px + pw / 2) - (cc.x + cc.w / 2);
                const dy = (this._py + ph / 2) - (cc.y + cc.h / 2);
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 120 && dist > 2) {
                    const pull = 150 * dt / dist;
                    cc.x += dx * pull;
                    cc.y += dy * pull;
                }
            }
            if (this._overlaps(this._px, this._py, pw, ph, cc.x, cc.y, cc.w, cc.h)) {
                cc.collected = true;
                this._score += cc.star ? 30 : 10;
                this._coins++;
                this._spawnCoinParticles(cc.x + cc.w / 2, cc.y);
                this._popups.push({ x: cc.x, y: cc.y, text: cc.star ? "+30" : "+10", life: 1 });
            }
        }

        // camera (smooth follow X and Y)
        const targetCam = this._px - PF_W / 3;
        this._camX += (targetCam - this._camX) * 0.08;
        this._camX = Math.max(0, Math.min(this._levelW - PF_W, this._camX));

        const targetCamY = this._py - PF_H / 2;
        this._camY += (targetCamY - this._camY) * 0.08;
        this._camY = Math.max(this._skyTop - TILE * 2, Math.min(this._levelH - PF_H, this._camY));
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

    _checkQBlocks() {
        const pw = 20, ph = 24;
        for (const qb of this._qBlocks) {
            if (qb.hit) continue;
            const bx = qb.x, by = qb.y - qb.bounceY, bw = qb.w, bh = qb.h;
            // Check if player's head is hitting the block from below
            // Use generous overlap: player top within 6px of block bottom, horizontal overlap exists
            const playerTop = this._py;
            const blockBottom = by + bh;
            const headNearBlock = playerTop >= by && playerTop <= blockBottom + 6;
            const hOverlap = this._px + pw > bx + 2 && this._px < bx + bw - 2;
            if (headNearBlock && hOverlap && this._pvy < 50) {
                qb.hit = true;
                qb.bounceY = 8;
                this._pvy = 40;
                this._py = blockBottom; // push player below the block

                if (Math.random() < 0.5) {
                    // Spawn a power-up!
                    const pu = POWERUPS[Math.floor(Math.random() * POWERUPS.length)];
                    unlockPower(pu.type);
                    this._powerupItems.push({
                        x: qb.x + 2, y: qb.y - TILE, w: 20, h: 20,
                        vy: -80, onGround: false,
                        type: pu.type, emoji: pu.emoji, label: pu.label,
                        color: pu.color, duration: pu.duration,
                        bobPhase: 0,
                    });
                    this._popups.push({ x: qb.x, y: qb.y - 20, text: pu.label + "!", life: 1.5 });
                } else {
                    // Normal coin
                    this._score += 10;
                    this._coins++;
                    this._spawnCoinParticles(qb.x + qb.w / 2, qb.y - 10);
                    this._popups.push({ x: qb.x, y: qb.y - 15, text: "+10", life: 1 });
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
        if (this._equippedPower) {
            ctx.font = "12px 'Segoe UI',sans-serif";
            ctx.fillText(this._equippedPower.emoji + " " + this._equippedPower.label, PF_W / 2, PF_H / 2 + 40);
        }
    }

    _draw() {
        const ctx = this._ctx;
        const cx = Math.floor(this._camX);
        const cy = Math.floor(this._camY);
        const now = performance.now();

        // sky gradient — shifts color when high up
        const skyProgress = Math.max(0, Math.min(1, -cy / (TILE * 10)));
        const sky = ctx.createLinearGradient(0, 0, 0, PF_H);
        if (skyProgress > 0.3) {
            // Cloud world: lighter, dreamier sky
            sky.addColorStop(0, "#c4e0ff");
            sky.addColorStop(1, "#87ceeb");
        } else {
            sky.addColorStop(0, COL_SKY_TOP);
            sky.addColorStop(1, COL_SKY_BOT);
        }
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, PF_W, PF_H);

        // Stars/sparkles in cloud world
        if (skyProgress > 0.2) {
            ctx.fillStyle = `rgba(255,255,200,${skyProgress * 0.5})`;
            for (let i = 0; i < 20; i++) {
                const sx = (i * 137 + Math.sin(now / 2000 + i) * 15) % PF_W;
                const sy = (i * 89 + Math.cos(now / 3000 + i * 2) * 10) % PF_H;
                const sz = 1 + Math.sin(now / 500 + i * 3) * 0.8;
                ctx.beginPath();
                ctx.arc(sx, sy, sz, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // background hills (only visible when near ground)
        if (cy > -TILE * 4) {
            ctx.fillStyle = "#4a8c3f";
            for (let i = 0; i < 8; i++) {
                const hx = i * 130 - (cx * 0.2) % 130;
                const hillY = PF_H - 30 - cy * 0.3;
                if (hillY < PF_H + 40) {
                    ctx.beginPath();
                    ctx.ellipse(hx, hillY, 60 + i * 5, 30 + (i % 3) * 10, 0, Math.PI, 0);
                    ctx.fill();
                }
            }
        }

        // background clouds (parallax, move with both X and Y)
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        for (let i = 0; i < 10; i++) {
            const cloudX = (i * 160 + 40) - cx * 0.15;
            const cloudY = (20 + (i % 3) * 25 - i * 50) - cy * 0.4;
            if (cloudY < -30 || cloudY > PF_H + 30) continue;
            ctx.beginPath();
            ctx.ellipse(cloudX, cloudY, 28, 11, 0, 0, Math.PI * 2);
            ctx.ellipse(cloudX + 18, cloudY - 4, 18, 9, 0, 0, Math.PI * 2);
            ctx.ellipse(cloudX - 14, cloudY + 2, 16, 8, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.save();
        ctx.translate(-cx, -cy);

        // tiles
        for (const t of this._tiles) {
            if (t.x + t.w < cx - 10 || t.x > cx + PF_W + 10) continue;
            if (t.y + t.h < cy - 10 || t.y > cy + PF_H + 10) continue;
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
            if (qb.y + qb.h < cy - 10 || qb.y > cy + PF_H + 10) continue;
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

        // cloud platforms
        for (const cp of this._cloudPlatforms) {
            if (cp.x + cp.w < cx - 10 || cp.x > cx + PF_W + 10) continue;
            if (cp.y + cp.h < cy - 10 || cp.y > cy + PF_H + 10) continue;
            // fluffy cloud shape
            ctx.fillStyle = "rgba(255,255,255,0.85)";
            const cpCx = cp.x + cp.w / 2, cpCy = cp.y + cp.h / 2;
            ctx.beginPath();
            // main body
            ctx.ellipse(cpCx, cpCy, cp.w / 2 + 4, cp.h / 2 + 6, 0, 0, Math.PI * 2);
            ctx.fill();
            // bumps on top
            ctx.beginPath();
            for (let b = 0; b < cp.w / TILE; b++) {
                const bx = cp.x + b * TILE + TILE / 2;
                ctx.ellipse(bx, cp.y - 2, 12, 8, 0, 0, Math.PI * 2);
            }
            ctx.fill();
            // subtle bottom shadow
            ctx.fillStyle = "rgba(180,210,240,0.4)";
            ctx.beginPath();
            ctx.ellipse(cpCx, cpCy + 4, cp.w / 2, cp.h / 2 + 2, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // cloud coins
        for (const c of this._cloudCoins) {
            if (c.collected) continue;
            const bobY = Math.sin(now / 300 + c.bobOffset) * 3;
            const stretch = Math.abs(Math.cos(now / 200 + c.bobOffset));
            ctx.fillStyle = c.star ? "#ff69b4" : "#ffd700";
            ctx.beginPath();
            ctx.ellipse(c.x + c.w / 2, c.y + c.h / 2 + bobY, c.w / 2 * Math.max(0.3, stretch), c.h / 2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = c.star ? "#ffb6c1" : "#ffed4a";
            ctx.beginPath();
            ctx.ellipse(c.x + c.w / 2, c.y + c.h / 2 + bobY, c.w / 3 * Math.max(0.3, stretch), c.h / 3, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // power-up items
        for (const pu of this._powerupItems) {
            const bob = Math.sin(pu.bobPhase) * 3;
            // glow (no shadowBlur for performance)
            ctx.save();
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = pu.color;
            ctx.beginPath();
            ctx.roundRect(pu.x - 3, pu.y + bob - 3, pu.w + 6, pu.h + 6, 8);
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.fillStyle = pu.color;
            ctx.beginPath();
            ctx.roundRect(pu.x, pu.y + bob, pu.w, pu.h, 6);
            ctx.fill();
            ctx.restore();
            // emoji
            ctx.font = "14px serif";
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText(pu.emoji, pu.x + pu.w / 2, pu.y + pu.h / 2 + bob);
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

        // player power-up aura (no shadowBlur for performance)
        if (this._activePower) {
            ctx.save();
            ctx.globalAlpha = 0.18 + Math.sin(now / 200) * 0.08;
            ctx.fillStyle = this._activePower.color;
            ctx.beginPath();
            ctx.arc(this._px + 10, this._py + 12, 20, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 0.1;
            ctx.beginPath();
            ctx.arc(this._px + 10, this._py + 12, 26, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // Wings visual
            if (this._activePower.type === "wings") {
                const wingFlap = Math.sin(now / 100) * 8;
                ctx.fillStyle = "rgba(147,197,253,0.6)";
                // left wing
                ctx.beginPath();
                ctx.ellipse(this._px - 2, this._py + 6, 10, 5 + wingFlap, -0.3, 0, Math.PI * 2);
                ctx.fill();
                // right wing
                ctx.beginPath();
                ctx.ellipse(this._px + 22, this._py + 6, 10, 5 + wingFlap, 0.3, 0, Math.PI * 2);
                ctx.fill();
            }

            // Star sparkle trail
            if (this._activePower.type === "star" && Math.random() < 0.3) {
                this._particles.push({
                    x: this._px + 10 + (Math.random() - 0.5) * 20,
                    y: this._py + 12 + (Math.random() - 0.5) * 20,
                    vx: (Math.random() - 0.5) * 30, vy: -20 - Math.random() * 20,
                    life: 0.5, color: "#fbbf24", size: 1.5 + Math.random(),
                });
            }

            // Shield bubble
            if (this._activePower.type === "shield") {
                ctx.save();
                ctx.globalAlpha = 0.25 + Math.sin(now / 300) * 0.1;
                ctx.strokeStyle = "#34d399"; ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(this._px + 10, this._py + 10, 16, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }

            // Speed trail
            if (this._activePower.type === "speed" && Math.abs(this._pvx) > 0) {
                this._particles.push({
                    x: this._px + (this._facingRight ? 0 : 20),
                    y: this._py + 10 + Math.random() * 10,
                    vx: this._facingRight ? -40 : 40, vy: (Math.random() - 0.5) * 10,
                    life: 0.3, color: "#f472b6", size: 2,
                });
            }

            // Magnet lines
            if (this._activePower.type === "magnet" && Math.random() < 0.15) {
                this._particles.push({
                    x: this._px + 10 + (Math.random() - 0.5) * 60,
                    y: this._py + 12 + (Math.random() - 0.5) * 60,
                    vx: 0, vy: 0,
                    life: 0.3, color: "#a78bfa", size: 1.5,
                });
            }
        }

        // player
        const blink = this._invincible > 0 && Math.floor(now / 80) % 2;
        if (!blink) {
            const tinyScale = (this._activePower?.type === "tiny") ? 0.6 : 1;
            this._drawPlayer(ctx, this._px, this._py, this._facingRight, this._walkFrame, this._onGround, this._pvy, tinyScale);
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

        // Power-up HUD (right side)
        if (this._activePower) {
            const barW = 60, barH = 8;
            const barX = PF_W - barW - 10, barY = 8;
            // background
            ctx.fillStyle = "rgba(0,0,0,0.55)";
            ctx.beginPath(); ctx.roundRect(barX - 22, barY - 2, barW + 26, barH + 16, 8); ctx.fill();
            // emoji
            ctx.font = "12px serif"; ctx.textAlign = "left"; ctx.textBaseline = "top";
            ctx.fillText(this._activePower.emoji, barX - 18, barY);
            // label
            ctx.fillStyle = "white"; ctx.font = "bold 9px sans-serif";
            ctx.fillText(this._activePower.label, barX - 2, barY - 1);
            if (this._activePower.permanent) {
                // Permanent: show full bar with ∞
                ctx.fillStyle = this._activePower.color;
                ctx.fillRect(barX, barY + 10, barW, barH);
                ctx.fillStyle = "white"; ctx.font = "bold 8px sans-serif"; ctx.textAlign = "center";
                ctx.fillText("\u221E", barX + barW / 2, barY + 11);
            } else {
                // Temporary: timer bar
                const pct = this._activePower.timer / (POWERUPS.find(p => p.type === this._activePower.type)?.duration || 8);
                ctx.fillStyle = "rgba(255,255,255,0.2)";
                ctx.fillRect(barX, barY + 10, barW, barH);
                ctx.fillStyle = this._activePower.color;
                ctx.fillRect(barX, barY + 10, barW * Math.max(0, pct), barH);
            }
        }

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

    _drawPlayer(ctx, x, y, right, walkFrame, onGround, vy, scale = 1) {
        const pw = 20, ph = 24;
        const dir = right ? 1 : -1;

        if (scale !== 1) {
            ctx.save();
            ctx.translate(x + pw / 2, y + ph);
            ctx.scale(scale, scale);
            ctx.translate(-(x + pw / 2), -(y + ph));
        }

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

        if (scale !== 1) ctx.restore();
    }
}

customElements.define("platformer-game", PlatformerGame);
