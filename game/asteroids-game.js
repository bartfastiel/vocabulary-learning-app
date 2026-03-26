// game/asteroids-game.js
// Weltraum Pilot: Infinite-universe asteroids with shop, upgrades & custom ships.

// ── Shop Data ─────────────────────────────────────────────────────────────────

const SHIPS = [
    { id: "default", name: "Starter", price: 0, hull: "#4dd0e1", accent: "#00838f", flame: "#FF6D00" },
    { id: "fire", name: "Feuerfalke", price: 20, hull: "#ef5350", accent: "#b71c1c", flame: "#ffeb3b" },
    { id: "ice", name: "Eispfeil", price: 20, hull: "#81d4fa", accent: "#0277bd", flame: "#4fc3f7" },
    { id: "gold", name: "Goldadler", price: 40, hull: "#ffd54f", accent: "#f9a825", flame: "#ff6f00" },
    { id: "neon", name: "Neon-Jäger", price: 40, hull: "#76ff03", accent: "#00c853", flame: "#00e5ff" },
    { id: "galaxy", name: "Galaxie", price: 60, hull: "#7c4dff", accent: "#311b92", flame: "#e040fb" },
    { id: "rainbow", name: "Regenbogen", price: 80, hull: "rainbow", accent: "#9c27b0", flame: "rainbow" },
    { id: "stealth", name: "Stealth", price: 50, hull: "#546e7a", accent: "#263238", flame: "#ff5722" },
    { id: "candy", name: "Candy", price: 30, hull: "#f48fb1", accent: "#ec407a", flame: "#ff80ab" },
    { id: "plasma", name: "Plasma", price: 70, hull: "#00e5ff", accent: "#006064", flame: "#18ffff" },
];

// Repeatable upgrades: each level costs more
const UPGRADE_DEFS = [
    { id: "speed", name: "Schuss-Speed", icon: "⚡", basePrice: 10, priceScale: 1.4,
      desc: lvl => `Level ${lvl} → ${lvl+1}`, apply: (e, lvl) => { e.bulletSpeed = 300 + lvl * 40; } },
    { id: "thrust", name: "Antrieb", icon: "🔥", basePrice: 12, priceScale: 1.4,
      desc: lvl => `Level ${lvl} → ${lvl+1}`, apply: (e, lvl) => { e.thrustPower = 200 + lvl * 40; } },
    { id: "lives", name: "Extra-Leben", icon: "❤️", basePrice: 20, priceScale: 1.6,
      desc: lvl => `${3+lvl} → ${4+lvl} Leben`, apply: (e, lvl) => { e.lives = 3 + lvl; } },
    { id: "firerate", name: "Feuerrate", icon: "💨", basePrice: 15, priceScale: 1.5,
      desc: lvl => `Level ${lvl} → ${lvl+1}`, apply: (e, lvl) => { e.fireCooldown = Math.max(0.05, 0.18 - lvl * 0.02); } },
    { id: "double", name: "Doppelschuss", icon: "🔫🔫", basePrice: 50, priceScale: 0, maxLevel: 1,
      desc: () => "Zwei Schüsse auf einmal", apply: (e) => { e.doubleShot = true; } },
    { id: "rainbow_bullets", name: "Regenbogen-Schüsse", icon: "🌈", basePrice: 20, priceScale: 0, maxLevel: 1,
      desc: () => "Bunte Kugeln!", apply: (e) => { e.rainbowBullets = true; } },
];

const SHOP_KEY = "asteroidsShop";
const COIN_KEY = "asteroidCoins";
function loadShop() { try { return JSON.parse(localStorage.getItem(SHOP_KEY) || "null"); } catch { return null; } }
function defaultShop() { return { ownedShips: ["default"], upgradeLevels: {}, equipped: "default", customShip: null }; }
function saveShop(d) { localStorage.setItem(SHOP_KEY, JSON.stringify(d)); }
function getCoins() { return parseInt(localStorage.getItem(COIN_KEY) || "0"); }
function setCoins(n) { localStorage.setItem(COIN_KEY, String(n)); }

function getUpgradePrice(def, level) {
    if (def.maxLevel && level >= def.maxLevel) return Infinity;
    return Math.floor(def.basePrice * Math.pow(def.priceScale || 1, level));
}

function getEffects(shop) {
    const e = { bulletSpeed: 300, thrustPower: 200, lives: 3, fireCooldown: 0.18, doubleShot: false, rainbowBullets: false };
    for (const def of UPGRADE_DEFS) {
        const lvl = shop.upgradeLevels[def.id] || 0;
        if (lvl > 0) def.apply(e, lvl);
    }
    return e;
}

const PLAY_COST = 3;

// ── Shared CSS ────────────────────────────────────────────────────────────────

const SHOP_CSS = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:host { display: flex; width: 100%; height: 100%; }
.wrap {
  display: flex; flex-direction: column; width: 100%; height: 100%;
  background: radial-gradient(ellipse at top, #0a0a1a, #111, #1a1a2e);
  color: #e0e0e0; font-family: "Segoe UI", system-ui, sans-serif; overflow-y: auto;
}
.header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; background: rgba(0,0,0,0.4);
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
.title { font-size: 1.3rem; font-weight: 800; }
.coins-badge {
  display: flex; align-items: center; gap: 6px;
  background: rgba(255,215,0,0.15); border: 1px solid rgba(255,215,0,0.3);
  border-radius: 20px; padding: 4px 14px; font-weight: 700; color: #ffd700;
}
.btn-sm {
  background: none; border: 1px solid rgba(255,255,255,0.2);
  color: #e0e0e0; border-radius: 8px; padding: 6px 14px;
  cursor: pointer; font-size: 0.9rem; font-weight: 600;
}
.btn-sm:hover { background: rgba(255,255,255,0.1); }
.body { padding: 12px 16px; display: flex; flex-direction: column; gap: 16px; flex: 1; }
.section { font-size: 1rem; font-weight: 700; margin-bottom: 6px; }
.play-btn {
  width: 100%; padding: 14px; border: none; border-radius: 12px;
  font-size: 1.1rem; font-weight: 800; cursor: pointer;
  background: linear-gradient(135deg, #00e676, #00c853);
  color: #1b5e20; letter-spacing: 1px; box-shadow: 0 4px 15px rgba(0,230,118,0.3);
}
.play-btn:active { transform: scale(0.97); }
.play-btn:disabled { opacity: 0.5; cursor: default; background: #555; color: #999; }
.play-cost { font-size: 0.85rem; font-weight: 600; margin-top: 4px; text-align: center; color: #ffd700; }
.stats-row { display: flex; gap: 6px; flex-wrap: wrap; }
.chip { background: rgba(255,255,255,0.08); border-radius: 8px; padding: 5px 10px; font-size: 0.78rem; font-weight: 600; }
.chip span { color: #4fc3f7; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(88px, 1fr)); gap: 8px; }
.card {
  display: flex; flex-direction: column; align-items: center; gap: 3px;
  padding: 8px 4px; border-radius: 10px; cursor: pointer;
  border: 2px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04);
  position: relative; transition: border-color 0.15s;
}
.card:hover { transform: scale(1.03); }
.card.active { border-color: #00e676; background: rgba(0,230,118,0.1); }
.card.locked { opacity: 0.45; }
.card-name { font-size: 0.72rem; font-weight: 700; text-align: center; }
.card-price { font-size: 0.68rem; color: #ffd700; font-weight: 600; }
.card-price.owned { color: #00e676; }
.badge { position: absolute; top: 3px; right: 3px; font-size: 0.55rem; background: #00e676; color: #1b5e20; border-radius: 3px; padding: 1px 3px; font-weight: 700; }
.preview { width: 44px; height: 44px; }
.ulist { display: flex; flex-direction: column; gap: 6px; }
.ucard {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 12px; border-radius: 10px;
  border: 2px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04);
  cursor: pointer;
}
.ucard:hover { border-color: rgba(255,255,255,0.25); }
.ucard.maxed { border-color: #00e676; background: rgba(0,230,118,0.06); cursor: default; }
.ucard.locked { opacity: 0.4; cursor: default; }
.uicon { font-size: 1.2rem; min-width: 32px; text-align: center; }
.uinfo { flex: 1; }
.uname { font-size: 0.85rem; font-weight: 700; }
.udesc { font-size: 0.72rem; color: #a0a0a0; }
.uprice { font-size: 0.82rem; font-weight: 700; color: #ffd700; white-space: nowrap; }
.uprice.maxed { color: #00e676; }
/* Custom ship builder */
.custom-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.color-label { font-size: 0.8rem; font-weight: 600; min-width: 60px; }
.color-pick { width: 36px; height: 36px; border: 2px solid rgba(255,255,255,0.2); border-radius: 8px; cursor: pointer; padding: 0; background: none; }
.color-pick::-webkit-color-swatch-wrapper { padding: 0; }
.color-pick::-webkit-color-swatch { border: none; border-radius: 6px; }
.custom-preview { width: 64px; height: 64px; border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; }
.custom-save {
  padding: 8px 16px; border: none; border-radius: 8px;
  background: #00e676; color: #1b5e20; font-weight: 700; cursor: pointer; font-size: 0.85rem;
}
.custom-save:active { transform: scale(0.97); }
`;

// ── Component ─────────────────────────────────────────────────────────────────

class AsteroidsGame extends HTMLElement {
    constructor() { super(); this.attachShadow({ mode: "open" }); }

    connectedCallback() {
        this._shop = loadShop() || defaultShop();
        this._coins = getCoins();
        this._showShop();
    }
    disconnectedCallback() { if (this._cleanup) { this._cleanup(); this._cleanup = null; } }

    _getSkin() {
        if (this._shop.equipped === "custom" && this._shop.customShip) return this._shop.customShip;
        return SHIPS.find(s => s.id === this._shop.equipped) || SHIPS[0];
    }

    // ── Shop ──────────────────────────────────────────────────────────────────

    _showShop() {
        if (this._cleanup) { this._cleanup(); this._cleanup = null; }
        const shop = this._shop, coins = this._coins, effects = getEffects(shop);
        const canPlay = coins >= PLAY_COST;
        const custom = shop.customShip || { hull: "#4dd0e1", accent: "#00838f", flame: "#FF6D00" };

        this.shadowRoot.innerHTML = `<style>${SHOP_CSS}</style>
      <div class="wrap">
        <div class="header">
          <span class="title">☄️ Weltraum Pilot</span>
          <div class="coins-badge">💰 ${coins}</div>
          <button class="btn-sm" id="close">Zurück</button>
        </div>
        <div class="body">
          <div>
            <button class="play-btn" id="play" ${canPlay ? "" : "disabled"}>▶ Spielen</button>
            <div class="play-cost">${canPlay ? `Kostet 💰 ${PLAY_COST} Coins` : `Nicht genug Coins (${PLAY_COST} nötig)`}</div>
          </div>
          <div>
            <div class="section">📊 Dein Setup</div>
            <div class="stats-row">
              <div class="chip">Leben: <span>${effects.lives}</span></div>
              <div class="chip">Schuss: <span>${effects.bulletSpeed}</span></div>
              <div class="chip">Antrieb: <span>${effects.thrustPower}</span></div>
              <div class="chip">Feuerrate: <span>${Math.round(1/effects.fireCooldown)}/s</span></div>
              <div class="chip">Doppel: <span>${effects.doubleShot?"Ja":"Nein"}</span></div>
              <div class="chip">Regenbogen: <span>${effects.rainbowBullets?"Ja":"Nein"}</span></div>
            </div>
          </div>
          <div>
            <div class="section">🚀 Raumschiffe</div>
            <div class="grid" id="ship-grid"></div>
          </div>
          <div>
            <div class="section">🎨 Eigenes Schiff bauen</div>
            <div style="display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap">
              <div style="display:flex;flex-direction:column;gap:6px">
                <div class="custom-row"><span class="color-label">Rumpf</span><input type="color" class="color-pick" id="c-hull" value="${custom.hull === 'rainbow' ? '#4dd0e1' : custom.hull}"></div>
                <div class="custom-row"><span class="color-label">Akzent</span><input type="color" class="color-pick" id="c-accent" value="${custom.accent}"></div>
                <div class="custom-row"><span class="color-label">Flamme</span><input type="color" class="color-pick" id="c-flame" value="${custom.flame === 'rainbow' ? '#FF6D00' : custom.flame}"></div>
              </div>
              <canvas class="custom-preview" id="c-preview" width="64" height="64"></canvas>
              <button class="custom-save" id="c-save">Speichern & Auswählen</button>
            </div>
          </div>
          <div>
            <div class="section">⬆️ Upgrades</div>
            <div class="ulist" id="upgrade-list"></div>
          </div>
        </div>
      </div>`;

        const sr = this.shadowRoot;
        sr.getElementById("close").onclick = () => this.dispatchEvent(new CustomEvent("close-game", { bubbles: true }));
        sr.getElementById("play").onclick = () => {
            if (this._coins < PLAY_COST) return;
            this._coins -= PLAY_COST; setCoins(this._coins);
            this._startGame();
        };

        // Ship grid
        const grid = sr.getElementById("ship-grid");
        const allShips = [...SHIPS];
        if (shop.customShip) allShips.push({ id: "custom", name: "Eigenes", price: 0, ...shop.customShip });
        for (const s of allShips) {
            const owned = s.id === "custom" || shop.ownedShips.includes(s.id);
            const active = shop.equipped === s.id;
            const canBuy = !owned && coins >= s.price;
            const card = document.createElement("div");
            card.className = "card" + (active ? " active" : "") + (!owned && !canBuy ? " locked" : "");
            const cvs = document.createElement("canvas"); cvs.width = 44; cvs.height = 44; cvs.className = "preview";
            this._drawPreview(cvs.getContext("2d"), s); card.appendChild(cvs);
            const nm = document.createElement("div"); nm.className = "card-name"; nm.textContent = s.name; card.appendChild(nm);
            const pr = document.createElement("div"); pr.className = "card-price" + (owned ? " owned" : "");
            pr.textContent = owned ? "✓" : `💰 ${s.price}`; card.appendChild(pr);
            if (active) { const b = document.createElement("div"); b.className = "badge"; b.textContent = "AKTIV"; card.appendChild(b); }
            card.onclick = () => {
                if (owned && !active) { shop.equipped = s.id; saveShop(shop); this._showShop(); }
                else if (!owned && coins >= s.price) {
                    this._coins -= s.price; setCoins(this._coins);
                    shop.ownedShips.push(s.id); shop.equipped = s.id; saveShop(shop); this._showShop();
                }
            };
            grid.appendChild(card);
        }

        // Custom ship builder
        const cHull = sr.getElementById("c-hull"), cAccent = sr.getElementById("c-accent"), cFlame = sr.getElementById("c-flame");
        const cPreview = sr.getElementById("c-preview");
        const updatePreview = () => {
            const s = { hull: cHull.value, accent: cAccent.value, flame: cFlame.value };
            const ctx = cPreview.getContext("2d"); ctx.clearRect(0, 0, 64, 64);
            this._drawPreview(ctx, s, 32, 32, 1.3);
        };
        cHull.oninput = cAccent.oninput = cFlame.oninput = updatePreview;
        updatePreview();
        sr.getElementById("c-save").onclick = () => {
            shop.customShip = { hull: cHull.value, accent: cAccent.value, flame: cFlame.value };
            shop.equipped = "custom"; saveShop(shop); this._showShop();
        };

        // Upgrades
        const ul = sr.getElementById("upgrade-list");
        for (const def of UPGRADE_DEFS) {
            const lvl = shop.upgradeLevels[def.id] || 0;
            const maxed = def.maxLevel && lvl >= def.maxLevel;
            const price = maxed ? Infinity : getUpgradePrice(def, lvl);
            const canBuy = !maxed && coins >= price;
            const card = document.createElement("div");
            card.className = "ucard" + (maxed ? " maxed" : "") + (!maxed && !canBuy ? " locked" : "");
            card.innerHTML = `
              <div class="uicon">${def.icon}</div>
              <div class="uinfo">
                <div class="uname">${def.name} ${maxed ? "" : "(Lv " + lvl + ")"}</div>
                <div class="udesc">${maxed ? "Max erreicht!" : def.desc(lvl)}</div>
              </div>
              <div class="uprice ${maxed?"maxed":""}">${maxed ? "✓ Max" : "💰 " + price}</div>`;
            if (!maxed && canBuy) {
                card.onclick = () => {
                    this._coins -= price; setCoins(this._coins);
                    shop.upgradeLevels[def.id] = lvl + 1; saveShop(shop); this._showShop();
                };
            }
            ul.appendChild(card);
        }
    }

    _drawPreview(ctx, skin, cx, cy, scale) {
        cx = cx || 22; cy = cy || 22; scale = scale || 1;
        ctx.save(); ctx.translate(cx, cy); ctx.scale(scale, scale);
        const t = performance.now() / 300;
        const hull = skin.hull === "rainbow" ? `hsl(${(t*60)%360},80%,60%)` : skin.hull;
        ctx.strokeStyle = hull; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(14,0); ctx.lineTo(-10,-8); ctx.lineTo(-6,0); ctx.lineTo(-10,8); ctx.closePath(); ctx.stroke();
        const fl = skin.flame === "rainbow" ? `hsl(${((t*80)+180)%360},90%,55%)` : skin.flame;
        ctx.strokeStyle = fl; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-8,-4); ctx.lineTo(-16,0); ctx.lineTo(-8,4); ctx.stroke();
        ctx.restore();
    }

    // ── Game ──────────────────────────────────────────────────────────────────

    _startGame() {
        const effects = getEffects(this._shop);
        const skin = this._getSkin();

        this.shadowRoot.innerHTML = `<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:host { display: flex; flex-direction: column; align-items: center; justify-content: center;
  width: 100%; height: 100%; background: #000; font-family: "Segoe UI", sans-serif; user-select: none; }
.top-bar { width: min(95vw, 400px); display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.top-btn { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);
  color: #e0e0e0; border-radius: 8px; padding: 5px 10px; cursor: pointer; font-size: 0.8rem; font-weight: 600; }
.coins-d { color: #ffd700; font-weight: 700; font-size: 0.95rem; }
canvas { display: block; max-height: 80vh; max-width: 95vw; touch-action: none;
  border: 2px solid rgba(0,255,255,0.2); border-radius: 10px; box-shadow: 0 0 20px rgba(0,255,255,0.08); }
#mc { display: none; margin-top: 0.4rem; gap: 0.5rem; }
@media (pointer: coarse) { #mc { display: flex; } }
.cb { width: 50px; height: 50px; border-radius: 50%; background: rgba(255,255,255,0.1);
  border: 2px solid rgba(255,255,255,0.2); color: white; font-size: 1.2rem; cursor: pointer;
  display: flex; align-items: center; justify-content: center; }
.cb:active { background: rgba(255,255,255,0.25); }
</style>
<div class="top-bar">
  <button class="top-btn" id="back">🛒 Shop</button>
  <div class="coins-d">💰 <span id="cd">${this._coins}</span></div>
  <button class="top-btn" id="quit">✕</button>
</div>
<canvas id="c" width="400" height="400"></canvas>
<div id="mc">
  <button class="cb" id="bl">↺</button>
  <button class="cb" id="bt">🔥</button>
  <button class="cb" id="br">↻</button>
  <button class="cb" id="bf">💥</button>
</div>`;

        const sr = this.shadowRoot;
        sr.getElementById("quit").onclick = () => this.dispatchEvent(new CustomEvent("close-game", { bubbles: true }));
        sr.getElementById("back").onclick = () => this._showShop();
        this._runGame(effects, skin);
    }

    _runGame(fx, skin) {
        const sr = this.shadowRoot;
        const cv = sr.getElementById("c"), ctx = cv.getContext("2d");
        const coinEl = sr.getElementById("cd");
        const W = cv.width, H = cv.height;
        const ctrl = new AbortController(), sig = { signal: ctrl.signal };

        // Infinite world state
        let cam = { x: 0, y: 0 }; // camera center
        let ship = { x: 0, y: 0, angle: -Math.PI / 2, vx: 0, vy: 0 };
        let bullets = [], asteroids = [], particles = [];
        let keys = { left: false, right: false, up: false, fire: false };
        let fireCooldown = 0, score = 0, alive = true, wave = 1;
        let lives = fx.lives, invincible = 0, totalKills = 0;
        let bulletHue = 0, raf;

        // Generate star field (fixed positions spread over a large area, tiled)
        const STAR_COUNT = 200;
        const stars = [];
        for (let i = 0; i < STAR_COUNT; i++) {
            stars.push({ x: Math.random() * 2000 - 1000, y: Math.random() * 2000 - 1000,
                size: Math.random() * 1.5 + 0.5, bright: Math.random() });
        }

        const spawnAsteroid = (size, x, y) => {
            const r = size * 14;
            if (x === undefined) {
                // Spawn around the ship but not too close, in a ring
                const angle = Math.random() * Math.PI * 2;
                const dist = 250 + Math.random() * 200;
                x = ship.x + Math.cos(angle) * dist;
                y = ship.y + Math.sin(angle) * dist;
            }
            const speed = (1.5 + Math.random() * 1.5) * (4 - size);
            const a = Math.random() * Math.PI * 2;
            const verts = [], n = 7 + Math.floor(Math.random() * 4);
            for (let i = 0; i < n; i++) {
                const va = (i / n) * Math.PI * 2;
                verts.push({ x: Math.cos(va) * r * (0.7 + Math.random() * 0.3),
                             y: Math.sin(va) * r * (0.7 + Math.random() * 0.3) });
            }
            asteroids.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r, size, verts });
        };

        const spawnWave = () => {
            // Number of asteroids based on kills + wave number
            const count = Math.min(5 + Math.floor(totalKills / 3), 20);
            for (let i = 0; i < count; i++) spawnAsteroid(3);
            wave++;
        };
        spawnWave();

        const spawnParticles = (x, y, n) => {
            for (let i = 0; i < n; i++)
                particles.push({ x, y, vx: (Math.random()-0.5)*5, vy: (Math.random()-0.5)*5, life: 1, hue: Math.random()*360 });
        };

        // Input
        document.addEventListener("keydown", e => {
            if (e.key === "ArrowLeft" || e.key === "a") keys.left = true;
            if (e.key === "ArrowRight" || e.key === "d") keys.right = true;
            if (e.key === "ArrowUp" || e.key === "w") keys.up = true;
            if (e.key === " " || e.key === "Enter") { e.preventDefault(); keys.fire = true; }
        }, sig);
        document.addEventListener("keyup", e => {
            if (e.key === "ArrowLeft" || e.key === "a") keys.left = false;
            if (e.key === "ArrowRight" || e.key === "d") keys.right = false;
            if (e.key === "ArrowUp" || e.key === "w") keys.up = false;
            if (e.key === " " || e.key === "Enter") keys.fire = false;
        }, sig);
        const wire = (id, key) => {
            const b = sr.getElementById(id);
            b.addEventListener("touchstart", e => { e.preventDefault(); keys[key] = true; }, { ...sig, passive: false });
            b.addEventListener("touchend", e => { e.preventDefault(); keys[key] = false; }, { ...sig, passive: false });
        };
        wire("bl","left"); wire("br","right"); wire("bt","up"); wire("bf","fire");

        this._cleanup = () => { ctrl.abort(); cancelAnimationFrame(raf); };
        let lastFrame = performance.now();

        const update = (dt) => {
            invincible -= dt;
            if (keys.left) ship.angle -= 4 * dt;
            if (keys.right) ship.angle += 4 * dt;
            if (keys.up) {
                ship.vx += Math.cos(ship.angle) * fx.thrustPower * dt;
                ship.vy += Math.sin(ship.angle) * fx.thrustPower * dt;
            }
            ship.vx *= 0.995; ship.vy *= 0.995;
            ship.x += ship.vx * dt; ship.y += ship.vy * dt;

            // Camera follows ship smoothly
            cam.x += (ship.x - cam.x) * 0.1;
            cam.y += (ship.y - cam.y) * 0.1;

            // Fire
            fireCooldown -= dt;
            if (keys.fire && fireCooldown <= 0) {
                fireCooldown = fx.fireCooldown;
                const cos = Math.cos(ship.angle), sin = Math.sin(ship.angle);
                const bvx = cos * fx.bulletSpeed + ship.vx * 0.3;
                const bvy = sin * fx.bulletSpeed + ship.vy * 0.3;
                if (fx.doubleShot) {
                    const ox = Math.cos(ship.angle + Math.PI/2) * 5, oy = Math.sin(ship.angle + Math.PI/2) * 5;
                    bullets.push({ x: ship.x+cos*14+ox, y: ship.y+sin*14+oy, vx: bvx, vy: bvy, life: 2, hue: bulletHue });
                    bullets.push({ x: ship.x+cos*14-ox, y: ship.y+sin*14-oy, vx: bvx, vy: bvy, life: 2, hue: bulletHue+30 });
                } else {
                    bullets.push({ x: ship.x+cos*14, y: ship.y+sin*14, vx: bvx, vy: bvy, life: 2, hue: bulletHue });
                }
                bulletHue = (bulletHue + 15) % 360;
            }

            // Bullets
            for (let i = bullets.length - 1; i >= 0; i--) {
                const b = bullets[i];
                b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt; b.hue = (b.hue+3)%360;
                if (b.life <= 0) { bullets.splice(i, 1); continue; }
                for (let j = asteroids.length - 1; j >= 0; j--) {
                    const a = asteroids[j];
                    if (Math.hypot(b.x-a.x, b.y-a.y) < a.r) {
                        bullets.splice(i, 1);
                        const pts = (4 - a.size) * 10;
                        score += pts;
                        const earned = Math.ceil(pts / 10);
                        this._coins += earned; setCoins(this._coins); coinEl.textContent = this._coins;
                        totalKills++;
                        spawnParticles(a.x, a.y, 6);
                        if (a.size > 1) { spawnAsteroid(a.size-1, a.x, a.y); spawnAsteroid(a.size-1, a.x, a.y); }
                        asteroids.splice(j, 1);
                        break;
                    }
                }
            }

            // Asteroid movement (no wrapping - infinite world)
            for (const a of asteroids) { a.x += a.vx * dt; a.y += a.vy * dt; }

            // Remove asteroids too far away (> 800 from ship)
            asteroids = asteroids.filter(a => Math.hypot(a.x-ship.x, a.y-ship.y) < 800);

            // Ship collision
            if (invincible <= 0) {
                for (const a of asteroids) {
                    if (Math.hypot(ship.x-a.x, ship.y-a.y) < a.r + 10) {
                        lives--; spawnParticles(ship.x, ship.y, 12);
                        if (lives <= 0) { alive = false; endGame(); return; }
                        invincible = 2; ship.vx = 0; ship.vy = 0;
                        break;
                    }
                }
            }

            // Spawn new wave when few asteroids left
            if (asteroids.length < 3) spawnWave();

            // Particles
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i]; p.x += p.vx; p.y += p.vy; p.life -= 0.03;
                if (p.life <= 0) particles.splice(i, 1);
            }
        };

        const draw = () => {
            ctx.fillStyle = "#0a0a1a"; ctx.fillRect(0, 0, W, H);
            const ox = W/2 - cam.x, oy = H/2 - cam.y;

            // Stars (tile them)
            const t = performance.now();
            for (const s of stars) {
                // Parallax: stars move slower than world
                const sx = ((s.x * 0.3 - cam.x * 0.3 + ox) % W + W) % W;
                const sy = ((s.y * 0.3 - cam.y * 0.3 + oy) % H + H) % H;
                const a = 0.3 + 0.4 * Math.sin(t/1000 + s.bright * 10);
                ctx.fillStyle = `rgba(255,255,255,${a})`;
                ctx.fillRect(sx, sy, s.size, s.size);
            }

            // Asteroids
            ctx.strokeStyle = "#aaa"; ctx.lineWidth = 1.5;
            for (const a of asteroids) {
                const ax = a.x + ox, ay = a.y + oy;
                if (ax < -60 || ax > W+60 || ay < -60 || ay > H+60) continue;
                ctx.beginPath();
                ctx.moveTo(ax + a.verts[0].x, ay + a.verts[0].y);
                for (let i = 1; i < a.verts.length; i++) ctx.lineTo(ax + a.verts[i].x, ay + a.verts[i].y);
                ctx.closePath(); ctx.stroke();
            }

            // Bullets
            for (const b of bullets) {
                const bx = b.x + ox, by = b.y + oy;
                if (bx < -10 || bx > W+10 || by < -10 || by > H+10) continue;
                if (fx.rainbowBullets) {
                    ctx.fillStyle = `hsl(${b.hue},100%,65%)`; ctx.shadowColor = `hsl(${b.hue},100%,50%)`; ctx.shadowBlur = 6;
                } else {
                    ctx.fillStyle = "#FFD600"; ctx.shadowColor = "rgba(255,214,0,0.4)"; ctx.shadowBlur = 4;
                }
                ctx.beginPath(); ctx.arc(bx, by, 2.5, 0, Math.PI*2); ctx.fill();
                ctx.shadowBlur = 0;
            }

            // Ship
            if (alive) {
                const blink = invincible > 0 && Math.floor(t/100) % 2;
                if (!blink) {
                    const sx = ship.x + ox, sy = ship.y + oy;
                    ctx.save(); ctx.translate(sx, sy); ctx.rotate(ship.angle);
                    const tt = t / 300;
                    const hullC = skin.hull === "rainbow" ? `hsl(${(tt*60)%360},80%,60%)` : skin.hull;
                    ctx.strokeStyle = hullC; ctx.lineWidth = 2.5;
                    ctx.beginPath(); ctx.moveTo(14,0); ctx.lineTo(-10,-8); ctx.lineTo(-6,0); ctx.lineTo(-10,8); ctx.closePath(); ctx.stroke();
                    if (keys.up) {
                        const flC = skin.flame === "rainbow" ? `hsl(${((tt*80)+180)%360},90%,55%)` : skin.flame;
                        ctx.strokeStyle = flC; ctx.lineWidth = 2;
                        ctx.beginPath(); ctx.moveTo(-8,-4); ctx.lineTo(-16-Math.random()*6,0); ctx.lineTo(-8,4); ctx.stroke();
                    }
                    ctx.restore();
                }
            }

            // Particles
            for (const p of particles) {
                const px = p.x + ox, py = p.y + oy;
                ctx.globalAlpha = p.life;
                ctx.fillStyle = `hsl(${p.hue},100%,65%)`;
                ctx.fillRect(px-2, py-2, 4, 4);
            }
            ctx.globalAlpha = 1;

            // HUD
            ctx.fillStyle = "rgba(0,0,0,0.5)";
            ctx.beginPath(); ctx.roundRect(4, 4, 220, 26, 6); ctx.fill();
            ctx.fillStyle = "white"; ctx.font = "bold 12px 'Segoe UI',sans-serif";
            ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
            ctx.fillText(`⭐ ${score}  ❤️ ${lives}  🌊 Welle ${wave}  💀 ${totalKills}`, 10, 22);

            if (!alive) {
                ctx.fillStyle = "rgba(0,0,0,0.65)"; ctx.fillRect(0, 0, W, H);
                ctx.fillStyle = "white"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
                ctx.font = "bold 22px 'Segoe UI',sans-serif";
                ctx.fillText("💀 Game Over", W/2, H/2 - 20);
                ctx.font = "15px 'Segoe UI',sans-serif";
                ctx.fillText(`Punkte: ${score}  |  Kills: ${totalKills}  |  Wellen: ${wave}`, W/2, H/2 + 8);
                ctx.fillText("Zurück zum Shop...", W/2, H/2 + 30);
            }
        };

        const endGame = () => { setTimeout(() => { cancelAnimationFrame(raf); this._showShop(); }, 2000); };

        const loop = () => {
            const now = performance.now();
            const dt = Math.min((now - lastFrame) / 1000, 0.04);
            lastFrame = now;
            if (alive) update(dt);
            draw();
            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
    }
}

customElements.define("asteroids-game", AsteroidsGame);
