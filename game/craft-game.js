// game/craft-game.js
// 2D block-building sandbox — mine, build, explore, survive.
// Fires CustomEvent("game-over", { bubbles:true, detail:{ score, pointsEarned } })

const W = 400, H = 300;
const TILE = 16;
const WORLD_W = 80, WORLD_H = 50;
const GRAVITY = 600;
const JUMP = -280;
const SPEED = 120;
const SKY_TOP = 15; // rows of sky above ground

// Block types
const B = {
    AIR: 0, DIRT: 1, GRASS: 2, STONE: 3, WOOD: 4, LEAVES: 5,
    SAND: 6, WATER: 7, COAL: 8, IRON: 9, GOLD: 10, DIAMOND: 11,
    PLANK: 12, BRICK: 13, GLASS: 14, BEDROCK: 15, SNOW: 16, LAVA: 17,
};

const BLOCK_INFO = {
    [B.AIR]:     { name: "Luft",     color: null, hardness: 0 },
    [B.DIRT]:    { name: "Erde",     color: "#8B6914", hardness: 1, top: "#6B4F12" },
    [B.GRASS]:   { name: "Gras",     color: "#8B6914", hardness: 1, top: "#4CAF50", topH: 4 },
    [B.STONE]:   { name: "Stein",    color: "#888", hardness: 3, accent: "#777" },
    [B.WOOD]:    { name: "Holz",     color: "#8B5E3C", hardness: 2, accent: "#6B4226" },
    [B.LEAVES]:  { name: "Bl\u00e4tter", color: "#2E7D32", hardness: 0.5, accent: "#388E3C" },
    [B.SAND]:    { name: "Sand",     color: "#F4D03F", hardness: 0.5 },
    [B.WATER]:   { name: "Wasser",   color: "rgba(30,100,200,0.6)", hardness: 0.5 },
    [B.COAL]:    { name: "Kohle",    color: "#555", hardness: 3, accent: "#222" },
    [B.IRON]:    { name: "Eisen",    color: "#888", hardness: 4, accent: "#D4A574" },
    [B.GOLD]:    { name: "Gold",     color: "#888", hardness: 4, accent: "#FFD700" },
    [B.DIAMOND]: { name: "Diamant",  color: "#888", hardness: 5, accent: "#40E0D0" },
    [B.PLANK]:   { name: "Planke",   color: "#C68E4E", hardness: 2, accent: "#A0723C" },
    [B.BRICK]:   { name: "Ziegel",   color: "#B74C3C", hardness: 3, accent: "#943C30" },
    [B.GLASS]:   { name: "Glas",     color: "rgba(200,230,255,0.4)", hardness: 0.3 },
    [B.BEDROCK]: { name: "Grundstein", color: "#333", hardness: 6, accent: "#222" },
    [B.SNOW]:    { name: "Schnee",   color: "#F5F5F5", hardness: 0.5 },
    [B.LAVA]:    { name: "Lava",     color: "#FF4500", hardness: 1, accent: "#FF6600" },
};

class CraftGame extends HTMLElement {
    constructor() { super(); this.attachShadow({ mode: "open" }); }

    connectedCallback() {
        this._isTouch = "ontouchstart" in window;
        this.shadowRoot.innerHTML = `<style>
            :host{display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:#000;position:relative;flex-direction:column}
            canvas{width:100%;flex:1;image-rendering:pixelated;cursor:crosshair;touch-action:none}
            .touch-ui{display:${this._isTouch ? "flex" : "none"};width:100%;padding:4px 6px;gap:4px;background:rgba(0,0,0,0.85);align-items:center;flex-shrink:0}
            .tb{width:38px;height:38px;border:2px solid rgba(255,255,255,0.3);border-radius:10px;background:rgba(255,255,255,0.08);color:white;font-size:18px;display:flex;align-items:center;justify-content:center;cursor:pointer;user-select:none;-webkit-user-select:none;flex-shrink:0;transition:background 0.15s}
            .tb.active{background:rgba(255,255,255,0.25);border-color:rgba(255,255,255,0.6)}
            .tb.mode{font-size:13px;font-weight:700;min-width:52px;width:auto;padding:0 8px}
            .tb.mode.mine{border-color:#e94560;color:#e94560}
            .tb.mode.build{border-color:#4CAF50;color:#4CAF50}
            .spacer{flex:1}
            .touch-hotbar{display:flex;gap:3px;overflow-x:auto;flex:1;padding:0 4px}
            .th-item{width:32px;height:32px;border:2px solid transparent;border-radius:6px;flex-shrink:0;display:flex;align-items:center;justify-content:center;position:relative}
            .th-item.sel{border-color:#fff}
            .th-item canvas{width:24px;height:24px;image-rendering:pixelated}
            .th-count{position:absolute;bottom:0;right:1px;font-size:7px;color:white;font-weight:700;text-shadow:0 0 2px black}
        </style>
        <canvas></canvas>
        <div class="touch-ui" id="touch-ui">
            <button class="tb" id="t-left">\u25C0</button>
            <button class="tb" id="t-right">\u25B6</button>
            <button class="tb" id="t-jump">\u25B2</button>
            <div class="spacer"></div>
            <button class="tb mode mine" id="t-mode">Abbauen</button>
            <div class="touch-hotbar" id="t-hotbar"></div>
        </div>`;
        const c = this.shadowRoot.querySelector("canvas");
        c.width = W; c.height = H;
        this._ctx = c.getContext("2d");
        this._canvas = c;
        this._init();
        this._bind();
        this._lastT = performance.now();
        this._raf = requestAnimationFrame(t => this._loop(t));
    }

    disconnectedCallback() { cancelAnimationFrame(this._raf); this._ctrl?.abort(); }

    _init() {
        // Generate world
        this._world = Array.from({ length: WORLD_H }, () => new Uint8Array(WORLD_W));
        this._generateWorld();

        // Player
        this._px = WORLD_W / 2 * TILE;
        this._py = (SKY_TOP - 3) * TILE;
        this._pvx = 0; this._pvy = 0;
        this._onGround = false;
        this._facingRight = true;

        // Inventory
        this._inventory = {};
        this._selectedBlock = B.DIRT;
        this._hotbar = [B.DIRT, B.STONE, B.WOOD, B.PLANK, B.BRICK, B.GLASS, B.SAND, B.LEAVES];

        // Mining
        this._mining = null; this._mineProgress = 0;

        // Camera
        this._camX = 0; this._camY = 0;

        // Time
        this._dayTime = 0.3; // 0-1, 0.25=noon, 0.75=midnight
        this._score = 0;
        this._gameTimer = 120;
        this._gameOver = false;

        // Particles
        this._particles = [];

        // Place player on ground
        for (let y = 0; y < WORLD_H; y++) {
            if (this._world[y][Math.floor(WORLD_W / 2)] !== B.AIR) {
                this._py = (y - 2) * TILE;
                break;
            }
        }
    }

    _generateWorld() {
        const w = this._world;

        // Terrain heights using simple noise
        const heights = [];
        let h = SKY_TOP + 2;
        for (let x = 0; x < WORLD_W; x++) {
            h += (Math.random() - 0.5) * 1.5;
            h = Math.max(SKY_TOP, Math.min(SKY_TOP + 8, Math.round(h)));
            heights.push(h);
        }

        for (let x = 0; x < WORLD_W; x++) {
            const surfY = heights[x];
            for (let y = 0; y < WORLD_H; y++) {
                if (y >= WORLD_H - 1) w[y][x] = B.BEDROCK;
                else if (y >= WORLD_H - 3) w[y][x] = Math.random() < 0.5 ? B.BEDROCK : B.LAVA;
                else if (y > surfY + 15) {
                    // Deep underground
                    w[y][x] = B.STONE;
                    if (Math.random() < 0.02) w[y][x] = B.DIAMOND;
                    else if (Math.random() < 0.04) w[y][x] = B.GOLD;
                    else if (Math.random() < 0.06) w[y][x] = B.IRON;
                    else if (Math.random() < 0.08) w[y][x] = B.COAL;
                } else if (y > surfY + 4) {
                    w[y][x] = B.STONE;
                    if (Math.random() < 0.05) w[y][x] = B.COAL;
                    else if (Math.random() < 0.02) w[y][x] = B.IRON;
                    // Caves
                    if (Math.sin(x * 0.3 + y * 0.5) + Math.sin(x * 0.1 - y * 0.3) > 1.2) w[y][x] = B.AIR;
                } else if (y > surfY) {
                    w[y][x] = B.DIRT;
                } else if (y === surfY) {
                    w[y][x] = B.GRASS;
                }
            }

            // Trees
            if (heights[x] === surfY && Math.random() < 0.1 && x > 3 && x < WORLD_W - 3) {
                const treeH = 4 + Math.floor(Math.random() * 3);
                for (let ty = 1; ty <= treeH; ty++) {
                    if (surfY - ty >= 0) w[surfY - ty][x] = B.WOOD;
                }
                // Canopy
                for (let ly = -2; ly <= 0; ly++) {
                    for (let lx = -2; lx <= 2; lx++) {
                        const tx = x + lx, ty = surfY - treeH + ly;
                        if (tx >= 0 && tx < WORLD_W && ty >= 0 && (lx !== 0 || ly !== 0)) {
                            if (Math.abs(lx) + Math.abs(ly) <= 3 && w[ty][tx] === B.AIR) {
                                w[ty][tx] = B.LEAVES;
                            }
                        }
                    }
                }
            }
        }
    }

    _bind() {
        this._keys = { left: false, right: false, jump: false };
        this._mouse = { x: 0, y: 0, left: false, right: false };
        this._touchMode = "mine"; // "mine" or "build"
        this._ctrl = new AbortController();
        const o = { signal: this._ctrl.signal };

        // ── Keyboard ──
        document.addEventListener("keydown", e => {
            if (e.key === "ArrowLeft" || e.key === "a") this._keys.left = true;
            if (e.key === "ArrowRight" || e.key === "d") this._keys.right = true;
            if (e.key === "ArrowUp" || e.key === "w" || e.key === " ") this._keys.jump = true;
            const n = parseInt(e.key);
            if (n >= 1 && n <= 9) this._selectedBlock = this._hotbar[n - 1];
        }, o);
        document.addEventListener("keyup", e => {
            if (e.key === "ArrowLeft" || e.key === "a") this._keys.left = false;
            if (e.key === "ArrowRight" || e.key === "d") this._keys.right = false;
            if (e.key === "ArrowUp" || e.key === "w" || e.key === " ") this._keys.jump = false;
        }, o);

        // ── Mouse (desktop) ──
        const c = this._canvas;
        const getPos = (e) => {
            const r = c.getBoundingClientRect();
            this._mouse.x = (e.clientX - r.left) / r.width * W;
            this._mouse.y = (e.clientY - r.top) / r.height * H;
        };
        c.addEventListener("mousemove", getPos, o);
        c.addEventListener("mousedown", e => {
            e.preventDefault(); getPos(e);
            if (e.button === 0) this._mouse.left = true;
            if (e.button === 2) this._mouse.right = true;
        }, o);
        c.addEventListener("mouseup", e => {
            if (e.button === 0) this._mouse.left = false;
            if (e.button === 2) this._mouse.right = false;
            this._mining = null; this._mineProgress = 0;
        }, o);
        c.addEventListener("contextmenu", e => e.preventDefault(), o);
        c.addEventListener("wheel", e => {
            e.preventDefault();
            const idx = this._hotbar.indexOf(this._selectedBlock);
            const dir = e.deltaY > 0 ? 1 : -1;
            this._selectedBlock = this._hotbar[(idx + dir + this._hotbar.length) % this._hotbar.length];
        }, o);

        // ── Touch (iPad) — tap on canvas = mine or build based on mode ──
        c.addEventListener("touchstart", e => {
            e.preventDefault();
            const t = e.touches[0];
            const r = c.getBoundingClientRect();
            this._mouse.x = (t.clientX - r.left) / r.width * W;
            this._mouse.y = (t.clientY - r.top) / r.height * H;
            if (this._touchMode === "mine") this._mouse.left = true;
            else this._mouse.right = true;
        }, o);
        c.addEventListener("touchmove", e => {
            e.preventDefault();
            const t = e.touches[0];
            const r = c.getBoundingClientRect();
            this._mouse.x = (t.clientX - r.left) / r.width * W;
            this._mouse.y = (t.clientY - r.top) / r.height * H;
        }, o);
        c.addEventListener("touchend", e => {
            e.preventDefault();
            this._mouse.left = false; this._mouse.right = false;
            this._mining = null;
        }, o);

        // ── Touch buttons ──
        const hold = (el, key) => {
            const start = (e) => { e.preventDefault(); this._keys[key] = true; el.classList.add("active"); };
            const end = (e) => { e.preventDefault(); this._keys[key] = false; el.classList.remove("active"); };
            el.addEventListener("touchstart", start, o);
            el.addEventListener("touchend", end, o);
            el.addEventListener("touchcancel", end, o);
        };

        const sr = this.shadowRoot;
        hold(sr.getElementById("t-left"), "left");
        hold(sr.getElementById("t-right"), "right");
        hold(sr.getElementById("t-jump"), "jump");

        // Mode toggle
        const modeBtn = sr.getElementById("t-mode");
        modeBtn.addEventListener("touchstart", e => { e.preventDefault(); }, o);
        modeBtn.addEventListener("click", () => {
            this._touchMode = this._touchMode === "mine" ? "build" : "mine";
            modeBtn.textContent = this._touchMode === "mine" ? "Abbauen" : "Bauen";
            modeBtn.className = "tb mode " + (this._touchMode === "mine" ? "mine" : "build");
        }, o);

        // Touch hotbar
        this._renderTouchHotbar();
    }

    _renderTouchHotbar() {
        if (!this._isTouch) return;
        const hb = this.shadowRoot.getElementById("t-hotbar");
        if (!hb) return;
        hb.innerHTML = "";
        for (let i = 0; i < this._hotbar.length; i++) {
            const b = this._hotbar[i];
            const info = BLOCK_INFO[b];
            const item = document.createElement("div");
            item.className = "th-item" + (b === this._selectedBlock ? " sel" : "");
            // Mini canvas for block preview
            const mc = document.createElement("canvas");
            mc.width = 16; mc.height = 16;
            const mx = mc.getContext("2d");
            mx.fillStyle = info.color || "#888";
            mx.fillRect(0, 0, 16, 16);
            if (info.top) { mx.fillStyle = info.top; mx.fillRect(0, 0, 16, 4); }
            if (info.accent && [B.COAL, B.IRON, B.GOLD, B.DIAMOND].includes(b)) {
                mx.fillStyle = info.accent;
                mx.fillRect(3, 5, 4, 4); mx.fillRect(9, 8, 4, 4);
            }
            item.appendChild(mc);
            const count = this._inventory[b] || 0;
            if (count > 0) {
                const cnt = document.createElement("span");
                cnt.className = "th-count";
                cnt.textContent = count > 99 ? "99+" : count;
                item.appendChild(cnt);
            }
            item.addEventListener("click", () => {
                this._selectedBlock = b;
                this._renderTouchHotbar();
            });
            hb.appendChild(item);
        }
    }

    _loop(t) {
        const dt = Math.min((t - this._lastT) / 1000, 0.05);
        this._lastT = t;
        if (!this._gameOver) {
            this._update(dt);
            this._gameTimer -= dt;
            if (this._gameTimer <= 0) { this._gameTimer = 0; this._endGame(); }
        }
        this._draw();
        this._raf = requestAnimationFrame(t => this._loop(t));
    }

    _update(dt) {
        // Movement
        this._pvx = 0;
        if (this._keys.left) { this._pvx = -SPEED; this._facingRight = false; }
        if (this._keys.right) { this._pvx = SPEED; this._facingRight = true; }
        if (this._keys.jump && this._onGround) { this._pvy = JUMP; this._onGround = false; }

        // Water physics
        const inWater = this._getBlock(this._px + 8, this._py + 8) === B.WATER;
        const grav = inWater ? GRAVITY * 0.3 : GRAVITY;
        this._pvy += grav * dt;
        if (inWater) { this._pvy *= 0.95; if (this._keys.jump) this._pvy -= 200 * dt; }
        if (this._pvy > 400) this._pvy = 400;

        // Move X
        this._px += this._pvx * dt;
        this._resolveX();

        // Move Y
        this._py += this._pvy * dt;
        this._resolveY();

        // World bounds
        this._px = Math.max(0, Math.min((WORLD_W - 1) * TILE, this._px));

        // Camera
        this._camX += (this._px - W / 2 - this._camX) * 0.1;
        this._camY += (this._py - H / 2 - this._camY) * 0.1;
        this._camX = Math.max(0, Math.min(WORLD_W * TILE - W, this._camX));
        this._camY = Math.max(-TILE * 5, Math.min(WORLD_H * TILE - H, this._camY));

        // Day/night cycle
        this._dayTime = (this._dayTime + dt * 0.01) % 1;

        // Mining
        if (this._mouse.left) {
            const wx = Math.floor((this._mouse.x + this._camX) / TILE);
            const wy = Math.floor((this._mouse.y + this._camY) / TILE);
            const block = this._getBlockAt(wx, wy);
            if (block > 0 && BLOCK_INFO[block].hardness > 0) {
                const key = wx + "," + wy;
                if (this._mining !== key) { this._mining = key; this._mineProgress = 0; }
                this._mineProgress += dt;
                if (this._mineProgress >= BLOCK_INFO[block].hardness * 0.3) {
                    // Break block
                    this._world[wy][wx] = B.AIR;
                    this._inventory[block] = (this._inventory[block] || 0) + 1;
                    this._score += block >= B.COAL ? 20 : 5;
                    this._mining = null; this._mineProgress = 0;
                    // Particles
                    const info = BLOCK_INFO[block];
                    for (let i = 0; i < 6; i++) {
                        this._particles.push({
                            x: wx * TILE + 8, y: wy * TILE + 8,
                            vx: (Math.random() - 0.5) * 80, vy: -30 - Math.random() * 60,
                            life: 0.4, color: info.color, size: 2 + Math.random() * 2,
                        });
                    }
                    // Add to hotbar if not there
                    if (!this._hotbar.includes(block) && this._hotbar.length < 12) {
                        this._hotbar.push(block);
                    }
                    this._renderTouchHotbar();
                }
            }
        }

        // Placing blocks
        if (this._mouse.right) {
            const wx = Math.floor((this._mouse.x + this._camX) / TILE);
            const wy = Math.floor((this._mouse.y + this._camY) / TILE);
            if (this._getBlockAt(wx, wy) === B.AIR && this._selectedBlock > 0) {
                const count = this._inventory[this._selectedBlock] || 0;
                if (count > 0) {
                    // Don't place on player
                    const px1 = Math.floor(this._px / TILE), py1 = Math.floor(this._py / TILE);
                    const px2 = Math.floor((this._px + 10) / TILE), py2 = Math.floor((this._py + 14) / TILE);
                    if (!(wx >= px1 && wx <= px2 && wy >= py1 && wy <= py2)) {
                        this._world[wy][wx] = this._selectedBlock;
                        this._inventory[this._selectedBlock]--;
                        this._score += 2;
                        this._renderTouchHotbar();
                    }
                }
            }
            this._mouse.right = false; // Single place
        }

        // Particles
        this._particles = this._particles.filter(p => {
            p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 200 * dt;
            return p.life > 0;
        });
    }

    _getBlock(px, py) {
        const wx = Math.floor(px / TILE), wy = Math.floor(py / TILE);
        return this._getBlockAt(wx, wy);
    }

    _getBlockAt(wx, wy) {
        if (wx < 0 || wx >= WORLD_W || wy < 0 || wy >= WORLD_H) return B.AIR;
        return this._world[wy][wx];
    }

    _isSolid(wx, wy) {
        const b = this._getBlockAt(wx, wy);
        return b !== B.AIR && b !== B.WATER && b !== B.LAVA;
    }

    _resolveX() {
        const pw = 10, ph = 14;
        const left = Math.floor(this._px / TILE);
        const right = Math.floor((this._px + pw) / TILE);
        const top = Math.floor(this._py / TILE);
        const bot = Math.floor((this._py + ph) / TILE);
        for (let y = top; y <= bot; y++) {
            if (this._pvx > 0 && this._isSolid(right, y)) { this._px = right * TILE - pw - 0.01; break; }
            if (this._pvx < 0 && this._isSolid(left, y)) { this._px = (left + 1) * TILE + 0.01; break; }
        }
    }

    _resolveY() {
        const pw = 10, ph = 14;
        const left = Math.floor(this._px / TILE);
        const right = Math.floor((this._px + pw) / TILE);
        const top = Math.floor(this._py / TILE);
        const bot = Math.floor((this._py + ph) / TILE);
        this._onGround = false;
        for (let x = left; x <= right; x++) {
            if (this._pvy > 0 && this._isSolid(x, bot)) {
                this._py = bot * TILE - ph - 0.01;
                this._pvy = 0; this._onGround = true; break;
            }
            if (this._pvy < 0 && this._isSolid(x, top)) {
                this._py = (top + 1) * TILE + 0.01;
                this._pvy = 0; break;
            }
        }
    }

    _draw() {
        const ctx = this._ctx;
        const cx = Math.floor(this._camX), cy = Math.floor(this._camY);
        const now = performance.now();

        // Sky gradient based on time of day
        const dayBright = Math.max(0, Math.sin(this._dayTime * Math.PI * 2));
        const skyTop = this._lerpColor("#000820", "#87CEEB", dayBright);
        const skyBot = this._lerpColor("#0a0a20", "#E0F0FF", dayBright);
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, skyTop);
        grad.addColorStop(1, skyBot);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        // Sun/Moon
        const sunAngle = this._dayTime * Math.PI * 2 - Math.PI / 2;
        const sunX = W / 2 + Math.cos(sunAngle) * 150;
        const sunY = H * 0.4 - Math.sin(sunAngle) * 120;
        if (dayBright > 0.1) {
            ctx.fillStyle = "#FFD700";
            ctx.beginPath(); ctx.arc(sunX, sunY, 12, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "rgba(255,215,0,0.1)";
            ctx.beginPath(); ctx.arc(sunX, sunY, 25, 0, Math.PI * 2); ctx.fill();
        } else {
            ctx.fillStyle = "#DDD";
            ctx.beginPath(); ctx.arc(W - sunX + W * 0.3, sunY + 20, 10, 0, Math.PI * 2); ctx.fill();
        }

        // Stars at night
        if (dayBright < 0.4) {
            ctx.fillStyle = `rgba(255,255,255,${(0.4 - dayBright) * 2})`;
            for (let i = 0; i < 30; i++) {
                const sx = (i * 137.5 + now * 0.0005) % W;
                const sy = (i * 73.3) % (H * 0.4);
                ctx.fillRect(sx, sy, 1, 1);
            }
        }

        // Clouds
        ctx.fillStyle = `rgba(255,255,255,${0.3 * dayBright + 0.1})`;
        for (let i = 0; i < 6; i++) {
            const cloudX = ((i * 120 + now * 0.01) % (W + 80)) - 40;
            const cloudY = 20 + i * 12;
            ctx.beginPath();
            ctx.ellipse(cloudX, cloudY, 25, 8, 0, 0, Math.PI * 2);
            ctx.ellipse(cloudX + 15, cloudY - 3, 18, 7, 0, 0, Math.PI * 2);
            ctx.ellipse(cloudX - 12, cloudY + 1, 15, 6, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Blocks
        const startX = Math.floor(cx / TILE), startY = Math.floor(cy / TILE);
        const endX = startX + Math.ceil(W / TILE) + 1, endY = startY + Math.ceil(H / TILE) + 1;

        for (let y = Math.max(0, startY); y < Math.min(WORLD_H, endY); y++) {
            for (let x = Math.max(0, startX); x < Math.min(WORLD_W, endX); x++) {
                const block = this._world[y][x];
                if (block === B.AIR) continue;
                const info = BLOCK_INFO[block];
                const sx = x * TILE - cx, sy = y * TILE - cy;

                // Main color
                ctx.fillStyle = info.color;
                ctx.fillRect(sx, sy, TILE, TILE);

                // Block-specific details
                if (info.topH && info.top) {
                    ctx.fillStyle = info.top;
                    ctx.fillRect(sx, sy, TILE, info.topH);
                }

                // Ore/accent spots
                if (info.accent) {
                    ctx.fillStyle = info.accent;
                    if (block === B.COAL || block === B.IRON || block === B.GOLD || block === B.DIAMOND) {
                        // Ore spots
                        for (let i = 0; i < 3; i++) {
                            const ox = (x * 7 + y * 13 + i * 5) % 12 + 2;
                            const oy = (x * 11 + y * 3 + i * 7) % 10 + 3;
                            ctx.fillRect(sx + ox, sy + oy, 3, 3);
                        }
                    } else if (block === B.STONE) {
                        ctx.fillRect(sx + 2, sy + 3, 5, 4);
                        ctx.fillRect(sx + 9, sy + 8, 4, 5);
                    } else if (block === B.WOOD) {
                        ctx.fillRect(sx + 6, sy, 4, TILE);
                    } else if (block === B.PLANK) {
                        ctx.fillRect(sx, sy + 7, TILE, 1);
                    } else if (block === B.BRICK) {
                        ctx.strokeStyle = info.accent; ctx.lineWidth = 0.5;
                        ctx.strokeRect(sx + 1, sy + 1, 7, 4);
                        ctx.strokeRect(sx + 8, sy + 1, 7, 4);
                        ctx.strokeRect(sx + 4, sy + 6, 7, 4);
                        ctx.strokeRect(sx - 1, sy + 6, 5, 4);
                        ctx.strokeRect(sx + 1, sy + 11, 7, 4);
                        ctx.strokeRect(sx + 8, sy + 11, 7, 4);
                    } else if (block === B.LEAVES) {
                        for (let i = 0; i < 4; i++) {
                            ctx.fillRect(sx + (x * 3 + i * 5) % 12, sy + (y * 7 + i * 3) % 12, 4, 4);
                        }
                    } else if (block === B.LAVA) {
                        ctx.fillStyle = info.accent;
                        ctx.globalAlpha = 0.5 + Math.sin(now * 0.003 + x + y) * 0.3;
                        ctx.fillRect(sx, sy, TILE, TILE);
                        ctx.globalAlpha = 1;
                    }
                }

                // Block edge (subtle 3D effect)
                ctx.fillStyle = "rgba(255,255,255,0.08)";
                ctx.fillRect(sx, sy, TILE, 1);
                ctx.fillRect(sx, sy, 1, TILE);
                ctx.fillStyle = "rgba(0,0,0,0.12)";
                ctx.fillRect(sx + TILE - 1, sy, 1, TILE);
                ctx.fillRect(sx, sy + TILE - 1, TILE, 1);

                // Night darkening
                if (dayBright < 0.8) {
                    ctx.fillStyle = `rgba(0,0,30,${(0.8 - dayBright) * 0.5})`;
                    ctx.fillRect(sx, sy, TILE, TILE);
                }
            }
        }

        // Mining indicator
        if (this._mining && this._mineProgress > 0) {
            const [mx, my] = this._mining.split(",").map(Number);
            const sx = mx * TILE - cx, sy = my * TILE - cy;
            const block = this._getBlockAt(mx, my);
            const hardness = BLOCK_INFO[block]?.hardness || 1;
            const pct = this._mineProgress / (hardness * 0.3);
            // Crack overlay
            ctx.strokeStyle = "rgba(0,0,0,0.6)";
            ctx.lineWidth = 1;
            const cracks = Math.floor(pct * 4);
            for (let i = 0; i < cracks; i++) {
                ctx.beginPath();
                ctx.moveTo(sx + 8 + (i - 2) * 3, sy + 2);
                ctx.lineTo(sx + 8 + (i - 1) * 2, sy + 8);
                ctx.lineTo(sx + 6 + i * 3, sy + 14);
                ctx.stroke();
            }
        }

        // Particles
        for (const p of this._particles) {
            ctx.globalAlpha = p.life * 2;
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x - cx, p.y - cy, p.size, p.size);
        }
        ctx.globalAlpha = 1;

        // Player
        this._drawPlayer(ctx, cx, cy, now);

        // Block highlight (cursor)
        const mx = Math.floor((this._mouse.x + cx) / TILE);
        const my = Math.floor((this._mouse.y + cy) / TILE);
        if (mx >= 0 && mx < WORLD_W && my >= 0 && my < WORLD_H) {
            ctx.strokeStyle = "rgba(255,255,255,0.5)";
            ctx.lineWidth = 1;
            ctx.strokeRect(mx * TILE - cx, my * TILE - cy, TILE, TILE);
        }

        // HUD
        this._drawHUD(ctx, now);
    }

    _drawPlayer(ctx, cx, cy, now) {
        const px = Math.floor(this._px - cx), py = Math.floor(this._py - cy);
        const dir = this._facingRight ? 1 : -1;

        ctx.save();
        if (!this._facingRight) {
            ctx.translate(px + 5, 0);
            ctx.scale(-1, 1);
            ctx.translate(-(px + 5), 0);
        }

        // Body
        ctx.fillStyle = "#4A90D9";
        ctx.fillRect(px + 2, py + 5, 8, 7);
        // Head
        ctx.fillStyle = "#FFDBB4";
        ctx.fillRect(px + 2, py - 2, 8, 7);
        // Hair
        ctx.fillStyle = "#4A3728";
        ctx.fillRect(px + 1, py - 3, 10, 3);
        // Eyes
        ctx.fillStyle = "#333";
        ctx.fillRect(px + 7, py + 1, 2, 2);
        // Legs (walking animation)
        ctx.fillStyle = "#2E5A88";
        const walk = this._pvx !== 0 ? Math.sin(now * 0.01) * 2 : 0;
        ctx.fillRect(px + 2, py + 12, 3, 4 + walk);
        ctx.fillRect(px + 6, py + 12, 3, 4 - walk);

        ctx.restore();
    }

    _drawHUD(ctx, now) {
        // Hotbar background
        const hbW = this._hotbar.length * 22 + 6;
        const hbX = W / 2 - hbW / 2;
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.beginPath(); ctx.roundRect(hbX, H - 30, hbW, 26, 6); ctx.fill();

        // Hotbar items
        for (let i = 0; i < this._hotbar.length; i++) {
            const b = this._hotbar[i];
            const x = hbX + 5 + i * 22;
            const selected = b === this._selectedBlock;
            if (selected) {
                ctx.strokeStyle = "#fff"; ctx.lineWidth = 2;
                ctx.strokeRect(x - 1, H - 29, 20, 24);
            }
            // Mini block
            const info = BLOCK_INFO[b];
            ctx.fillStyle = info.color || "#888";
            ctx.fillRect(x + 2, H - 26, 16, 16);
            if (info.accent) {
                ctx.fillStyle = info.accent;
                ctx.fillRect(x + 5, H - 23, 6, 6);
            }
            if (info.top) {
                ctx.fillStyle = info.top;
                ctx.fillRect(x + 2, H - 26, 16, 4);
            }
            // Count
            const count = this._inventory[b] || 0;
            if (count > 0) {
                ctx.fillStyle = "#fff"; ctx.font = "bold 7px sans-serif";
                ctx.textAlign = "right";
                ctx.fillText(count > 99 ? "99+" : count, x + 18, H - 8);
            }
            // Key number
            ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.font = "6px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(i + 1, x + 10, H - 27);
        }

        // Score
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.beginPath(); ctx.roundRect(5, 5, 90, 22, 6); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.font = "bold 12px sans-serif"; ctx.textAlign = "left";
        ctx.fillText("\u2B50 " + this._score, 12, 20);

        // Timer
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.beginPath(); ctx.roundRect(W / 2 - 25, 5, 50, 22, 6); ctx.fill();
        ctx.fillStyle = this._gameTimer < 15 ? "#ff4444" : "#fff";
        ctx.font = "bold 12px monospace"; ctx.textAlign = "center";
        ctx.fillText(Math.ceil(this._gameTimer) + "s", W / 2, 20);

        // Block name
        const selInfo = BLOCK_INFO[this._selectedBlock];
        ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.font = "9px sans-serif"; ctx.textAlign = "center";
        ctx.fillText(selInfo.name, W / 2, H - 34);

        // Game over
        if (this._gameOver) {
            ctx.fillStyle = "rgba(0,0,0,0.7)";
            ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = "#4CAF50"; ctx.font = "bold 24px sans-serif"; ctx.textAlign = "center";
            ctx.fillText("ZEIT VORBEI!", W / 2, H / 2 - 20);
            ctx.fillStyle = "#fff"; ctx.font = "bold 16px sans-serif";
            ctx.fillText(this._score + " Punkte", W / 2, H / 2 + 10);
            ctx.fillStyle = "#888"; ctx.font = "11px sans-serif";
            const items = Object.entries(this._inventory).filter(([, c]) => c > 0);
            ctx.fillText(items.length + " verschiedene Materialien gesammelt", W / 2, H / 2 + 35);
        }
    }

    _lerpColor(c1, c2, t) {
        const p = (c, i) => parseInt(c.slice(1 + i * 2, 3 + i * 2), 16);
        const r = Math.round(p(c1, 0) + (p(c2, 0) - p(c1, 0)) * t);
        const g = Math.round(p(c1, 1) + (p(c2, 1) - p(c1, 1)) * t);
        const b = Math.round(p(c1, 2) + (p(c2, 2) - p(c1, 2)) * t);
        return `rgb(${r},${g},${b})`;
    }

    _endGame() {
        this._gameOver = true;
        setTimeout(() => {
            this.dispatchEvent(new CustomEvent("game-over", {
                bubbles: true, detail: { score: this._score, pointsEarned: 0 }
            }));
        }, 3000);
    }
}

customElements.define("craft-game", CraftGame);
