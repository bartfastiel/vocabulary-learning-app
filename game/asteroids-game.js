// game/asteroids-game.js
// Weltraum Pilot: Asteroids-style with shop, ship skins, and upgrades.
// Coins earned by destroying asteroids. Spend coins on skins & upgrades.

const AS_W = 400, AS_H = 400;

// ── Shop Data ─────────────────────────────────────────────────────────────────

const SHIPS = [
    { id: "default", name: "Starter", price: 0, desc: "Dein treues Schiff",
      hull: "#4dd0e1", accent: "#00838f", flame: "#FF6D00" },
    { id: "fire", name: "Feuerfalke", price: 20, desc: "Brennt vor Energie",
      hull: "#ef5350", accent: "#b71c1c", flame: "#ffeb3b" },
    { id: "ice", name: "Eispfeil", price: 20, desc: "Eiskalt unterwegs",
      hull: "#81d4fa", accent: "#0277bd", flame: "#4fc3f7" },
    { id: "gold", name: "Goldadler", price: 40, desc: "Purer Luxus",
      hull: "#ffd54f", accent: "#f9a825", flame: "#ff6f00" },
    { id: "neon", name: "Neon-Jäger", price: 40, desc: "Leuchtet im Dunkeln",
      hull: "#76ff03", accent: "#00c853", flame: "#00e5ff" },
    { id: "galaxy", name: "Galaxie", price: 60, desc: "Aus einer anderen Welt",
      hull: "#7c4dff", accent: "#311b92", flame: "#e040fb" },
    { id: "rainbow", name: "Regenbogen", price: 80, desc: "Alle Farben!",
      hull: "rainbow", accent: "#9c27b0", flame: "rainbow" },
    { id: "stealth", name: "Stealth", price: 50, desc: "Unsichtbar... fast",
      hull: "#546e7a", accent: "#263238", flame: "#ff5722" },
    { id: "candy", name: "Candy", price: 30, desc: "Zuckersüss",
      hull: "#f48fb1", accent: "#ec407a", flame: "#ff80ab" },
    { id: "plasma", name: "Plasma", price: 70, desc: "Reine Energie",
      hull: "#00e5ff", accent: "#006064", flame: "#18ffff" },
];

const UPGRADES = [
    { id: "speed1", name: "Schnelle Schüsse I", price: 15, desc: "Schüsse fliegen schneller",
      icon: "⚡", requires: null, effect: { bulletSpeed: 400 } },
    { id: "speed2", name: "Schnelle Schüsse II", price: 35, desc: "Noch schneller!",
      icon: "⚡⚡", requires: "speed1", effect: { bulletSpeed: 500 } },
    { id: "speed3", name: "Schnelle Schüsse III", price: 60, desc: "Lichtgeschwindigkeit!",
      icon: "⚡⚡⚡", requires: "speed2", effect: { bulletSpeed: 650 } },
    { id: "double", name: "Doppelschuss", price: 50, desc: "Zwei Schüsse auf einmal",
      icon: "🔫🔫", requires: null, effect: { doubleShot: true } },
    { id: "lives1", name: "Extralife I", price: 25, desc: "4 Leben statt 3",
      icon: "❤️", requires: null, effect: { lives: 4 } },
    { id: "lives2", name: "Extralife II", price: 50, desc: "5 Leben!",
      icon: "❤️❤️", requires: "lives1", effect: { lives: 5 } },
    { id: "rainbow_bullets", name: "Regenbogen-Schüsse", price: 20, desc: "Bunte Kugeln!",
      icon: "🌈", requires: null, effect: { rainbowBullets: true } },
    { id: "thrust", name: "Turbo-Antrieb", price: 30, desc: "Schnelleres Schiff",
      icon: "🔥", requires: null, effect: { thrustPower: 300 } },
];

const SHOP_KEY = "asteroidsShop";
function loadShop() { try { return JSON.parse(localStorage.getItem(SHOP_KEY) || "null"); } catch { return null; } }
function defaultShop() { return { ownedShips: ["default"], ownedUpgrades: [], equipped: "default" }; }
function saveShop(d) { localStorage.setItem(SHOP_KEY, JSON.stringify(d)); }
function getCoins() { return parseInt(localStorage.getItem("asteroidCoins") || "0"); }
function setCoins(n) { localStorage.setItem("asteroidCoins", String(n)); }

// ── Component ─────────────────────────────────────────────────────────────────

class AsteroidsGame extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    connectedCallback() {
        this._shop = loadShop() || defaultShop();
        this._coins = getCoins();
        this._showShop();
    }

    disconnectedCallback() {
        if (this._cleanup) { this._cleanup(); this._cleanup = null; }
    }

    _getEffects() {
        let bulletSpeed = 300, lives = 3, doubleShot = false, rainbowBullets = false, thrustPower = 200;
        for (const uid of this._shop.ownedUpgrades) {
            const u = UPGRADES.find(x => x.id === uid);
            if (!u) continue;
            if (u.effect.bulletSpeed) bulletSpeed = u.effect.bulletSpeed;
            if (u.effect.lives) lives = u.effect.lives;
            if (u.effect.doubleShot) doubleShot = true;
            if (u.effect.rainbowBullets) rainbowBullets = true;
            if (u.effect.thrustPower) thrustPower = u.effect.thrustPower;
        }
        return { bulletSpeed, lives, doubleShot, rainbowBullets, thrustPower };
    }

    _getSkin() { return SHIPS.find(s => s.id === this._shop.equipped) || SHIPS[0]; }

    // ── Shop Screen ───────────────────────────────────────────────────────────

    _showShop() {
        if (this._cleanup) { this._cleanup(); this._cleanup = null; }
        const shop = this._shop, coins = this._coins, effects = this._getEffects();

        this.shadowRoot.innerHTML = `
      <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :host { display: flex; width: 100%; height: 100%; }
        .shop-wrap {
          display: flex; flex-direction: column; width: 100%; height: 100%;
          background: radial-gradient(ellipse at top, #0a0a1a, #111, #1a1a2e);
          color: #e0e0e0; font-family: "Segoe UI", system-ui, sans-serif; overflow-y: auto;
        }
        .shop-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 16px; background: rgba(0,0,0,0.4);
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .shop-title { font-size: 1.3rem; font-weight: 800; }
        .shop-coins {
          display: flex; align-items: center; gap: 6px;
          background: rgba(255,215,0,0.15); border: 1px solid rgba(255,215,0,0.3);
          border-radius: 20px; padding: 4px 14px; font-weight: 700; color: #ffd700;
        }
        .shop-close {
          background: none; border: 1px solid rgba(255,255,255,0.2);
          color: #e0e0e0; border-radius: 8px; padding: 6px 14px;
          cursor: pointer; font-size: 0.9rem; font-weight: 600;
        }
        .shop-close:hover { background: rgba(255,255,255,0.1); }
        .shop-body { padding: 12px 16px; display: flex; flex-direction: column; gap: 20px; flex: 1; }
        .section-title { font-size: 1rem; font-weight: 700; margin-bottom: 8px; }
        .play-btn {
          width: 100%; padding: 14px; border: none; border-radius: 12px;
          font-size: 1.2rem; font-weight: 800; cursor: pointer;
          background: linear-gradient(135deg, #00e676, #00c853);
          color: #1b5e20; text-transform: uppercase; letter-spacing: 1px;
          box-shadow: 0 4px 15px rgba(0,230,118,0.3);
        }
        .play-btn:active { transform: scale(0.97); }
        .stats-row { display: flex; gap: 8px; flex-wrap: wrap; }
        .stat-chip {
          background: rgba(255,255,255,0.08); border-radius: 8px; padding: 6px 12px;
          font-size: 0.8rem; font-weight: 600;
        }
        .stat-chip span { color: #4fc3f7; }
        .ship-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap: 10px;
        }
        .ship-card {
          display: flex; flex-direction: column; align-items: center; gap: 4px;
          padding: 10px 6px; border-radius: 12px; cursor: pointer;
          border: 2px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05);
          position: relative;
        }
        .ship-card:hover { transform: scale(1.03); }
        .ship-card.equipped { border-color: #00e676; background: rgba(0,230,118,0.1); }
        .ship-card.locked { opacity: 0.5; }
        .ship-name { font-size: 0.75rem; font-weight: 700; text-align: center; }
        .ship-price { font-size: 0.7rem; color: #ffd700; font-weight: 600; }
        .ship-price.owned { color: #00e676; }
        .equip-badge {
          position: absolute; top: 4px; right: 4px;
          font-size: 0.6rem; background: #00e676; color: #1b5e20;
          border-radius: 4px; padding: 1px 4px; font-weight: 700;
        }
        .ship-preview { width: 48px; height: 48px; }
        .upgrade-list { display: flex; flex-direction: column; gap: 8px; }
        .upgrade-card {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 14px; border-radius: 12px;
          border: 2px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05);
          cursor: pointer;
        }
        .upgrade-card:hover { border-color: rgba(255,255,255,0.3); }
        .upgrade-card.owned { border-color: #00e676; background: rgba(0,230,118,0.08); }
        .upgrade-card.locked { opacity: 0.4; cursor: default; }
        .upgrade-icon { font-size: 1.4rem; min-width: 36px; text-align: center; }
        .upgrade-info { flex: 1; }
        .upgrade-name { font-size: 0.9rem; font-weight: 700; }
        .upgrade-desc { font-size: 0.75rem; color: #a0a0a0; }
        .upgrade-price { font-size: 0.85rem; font-weight: 700; color: #ffd700; white-space: nowrap; }
        .upgrade-price.owned { color: #00e676; }
      </style>
      <div class="shop-wrap">
        <div class="shop-header">
          <span class="shop-title">☄️ Weltraum Pilot</span>
          <div class="shop-coins">💰 ${coins}</div>
          <button class="shop-close" id="shop-close">Zurück</button>
        </div>
        <div class="shop-body">
          <button class="play-btn" id="play-btn">▶ Spielen</button>
          <div>
            <div class="section-title">📊 Dein Setup</div>
            <div class="stats-row">
              <div class="stat-chip">Leben: <span>${effects.lives}</span></div>
              <div class="stat-chip">Schuss-Speed: <span>${effects.bulletSpeed}</span></div>
              <div class="stat-chip">Doppelschuss: <span>${effects.doubleShot ? "Ja" : "Nein"}</span></div>
              <div class="stat-chip">Antrieb: <span>${effects.thrustPower}</span></div>
              <div class="stat-chip">Regenbogen: <span>${effects.rainbowBullets ? "Ja" : "Nein"}</span></div>
            </div>
          </div>
          <div>
            <div class="section-title">🚀 Raumschiffe</div>
            <div class="ship-grid" id="ship-grid"></div>
          </div>
          <div>
            <div class="section-title">⬆️ Upgrades</div>
            <div class="upgrade-list" id="upgrade-list"></div>
          </div>
        </div>
      </div>`;

        const sr = this.shadowRoot;
        sr.getElementById("shop-close").onclick = () =>
            this.dispatchEvent(new CustomEvent("close-game", { bubbles: true }));
        sr.getElementById("play-btn").onclick = () => this._startGame();

        // Ships
        const grid = sr.getElementById("ship-grid");
        for (const s of SHIPS) {
            const owned = shop.ownedShips.includes(s.id);
            const equipped = shop.equipped === s.id;
            const canBuy = !owned && coins >= s.price;
            const card = document.createElement("div");
            card.className = "ship-card" + (equipped ? " equipped" : "") + (!owned && !canBuy ? " locked" : "");

            const cvs = document.createElement("canvas");
            cvs.width = 48; cvs.height = 48; cvs.className = "ship-preview";
            this._drawShipPreview(cvs.getContext("2d"), s);
            card.appendChild(cvs);

            const nm = document.createElement("div"); nm.className = "ship-name"; nm.textContent = s.name;
            card.appendChild(nm);
            const pr = document.createElement("div");
            pr.className = "ship-price" + (owned ? " owned" : "");
            pr.textContent = owned ? "✓" : `💰 ${s.price}`;
            card.appendChild(pr);
            if (equipped) { const b = document.createElement("div"); b.className = "equip-badge"; b.textContent = "AKTIV"; card.appendChild(b); }

            card.onclick = () => {
                if (owned && !equipped) { shop.equipped = s.id; saveShop(shop); this._showShop(); }
                else if (!owned && coins >= s.price) {
                    this._coins -= s.price; setCoins(this._coins);
                    shop.ownedShips.push(s.id); shop.equipped = s.id;
                    saveShop(shop); this._showShop();
                }
            };
            grid.appendChild(card);
        }

        // Upgrades
        const ul = sr.getElementById("upgrade-list");
        for (const u of UPGRADES) {
            const owned = shop.ownedUpgrades.includes(u.id);
            const reqMet = !u.requires || shop.ownedUpgrades.includes(u.requires);
            const canBuy = !owned && reqMet && coins >= u.price;
            const card = document.createElement("div");
            card.className = "upgrade-card" + (owned ? " owned" : "") + (!owned && !canBuy ? " locked" : "");
            card.innerHTML = `
              <div class="upgrade-icon">${u.icon}</div>
              <div class="upgrade-info">
                <div class="upgrade-name">${u.name}</div>
                <div class="upgrade-desc">${u.desc}${u.requires && !reqMet ? " (braucht " + UPGRADES.find(x => x.id === u.requires).name + ")" : ""}</div>
              </div>
              <div class="upgrade-price ${owned ? "owned" : ""}">${owned ? "✓ Gekauft" : "💰 " + u.price}</div>`;
            if (!owned && canBuy) {
                card.onclick = () => {
                    this._coins -= u.price; setCoins(this._coins);
                    shop.ownedUpgrades.push(u.id); saveShop(shop); this._showShop();
                };
            }
            ul.appendChild(card);
        }
    }

    _drawShipPreview(ctx, skin) {
        ctx.save();
        ctx.translate(24, 24);
        const t = performance.now() / 300;
        const hull = skin.hull === "rainbow" ? `hsl(${(t * 60) % 360}, 80%, 60%)` : skin.hull;
        ctx.strokeStyle = hull; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-10, -8); ctx.lineTo(-6, 0); ctx.lineTo(-10, 8); ctx.closePath(); ctx.stroke();
        const fl = skin.flame === "rainbow" ? `hsl(${((t * 80) + 180) % 360}, 90%, 55%)` : skin.flame;
        ctx.strokeStyle = fl; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-8, -4); ctx.lineTo(-16, 0); ctx.lineTo(-8, 4); ctx.stroke();
        ctx.restore();
    }

    // ── Game Screen ───────────────────────────────────────────────────────────

    _startGame() {
        const effects = this._getEffects();
        const skin = this._getSkin();

        this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          width: 100%; height: 100%; background: #000;
          font-family: "Segoe UI", sans-serif; user-select: none;
        }
        .top-bar {
          width: min(95vw, ${AS_W}px); display: flex; justify-content: space-between;
          align-items: center; margin-bottom: 6px;
        }
        .top-btn {
          background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);
          color: #e0e0e0; border-radius: 8px; padding: 6px 12px;
          cursor: pointer; font-size: 0.85rem; font-weight: 600;
        }
        .top-btn:hover { background: rgba(255,255,255,0.2); }
        .coins-display { color: #ffd700; font-weight: 700; font-size: 1rem; }
        canvas { display: block; max-height: 78vh; max-width: 95vw;
                 aspect-ratio: 1; touch-action: none;
                 border: 2px solid rgba(0,255,255,0.2); border-radius: 12px;
                 box-shadow: 0 0 20px rgba(0,255,255,0.1); }
        #mobile-controls { display: none; margin-top: 0.5rem; gap: 0.6rem; }
        @media (pointer: coarse) { #mobile-controls { display: flex; } }
        .ctrl-btn {
          width: 54px; height: 54px; border-radius: 50%;
          background: rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.2);
          color: white; font-size: 1.3rem; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
        }
        .ctrl-btn:active { background: rgba(255,255,255,0.25); }
      </style>
      <div class="top-bar">
        <button class="top-btn" id="back-shop">🛒 Shop</button>
        <div class="coins-display">💰 <span id="coin-display">${this._coins}</span></div>
        <button class="top-btn" id="close-game">✕ Ende</button>
      </div>
      <canvas id="c" width="${AS_W}" height="${AS_H}"></canvas>
      <div id="mobile-controls">
        <button class="ctrl-btn" id="btn-ccw">↺</button>
        <button class="ctrl-btn" id="btn-thrust">🔥</button>
        <button class="ctrl-btn" id="btn-cw">↻</button>
        <button class="ctrl-btn" id="btn-fire">💥</button>
      </div>`;

        this.shadowRoot.getElementById("close-game").onclick = () =>
            this.dispatchEvent(new CustomEvent("close-game", { bubbles: true }));
        this.shadowRoot.getElementById("back-shop").onclick = () => this._showShop();

        this._runGame(effects, skin);
    }

    _runGame(effects, skin) {
        const sr = this.shadowRoot;
        const cv = sr.getElementById("c");
        const ctx = cv.getContext("2d");
        const coinEl = sr.getElementById("coin-display");
        const controller = new AbortController();
        const sig = { signal: controller.signal };

        let ship = { x: AS_W / 2, y: AS_H / 2, angle: -Math.PI / 2, vx: 0, vy: 0 };
        let bullets = [], asteroids = [], particles = [];
        let keys = { left: false, right: false, up: false, fire: false };
        let fireCooldown = 0, score = 0, alive = true;
        let lives = effects.lives, invincible = 0;
        let bulletHue = 0, raf;

        // Stars
        const stars = [];
        for (let i = 0; i < 60; i++) {
            stars.push({ x: Math.random() * AS_W, y: Math.random() * AS_H,
                size: Math.random() * 1.5 + 0.5, bright: Math.random() });
        }

        const spawnAsteroid = (size, x, y) => {
            const r = size * 14;
            if (x === undefined) {
                do { x = Math.random() * AS_W; y = Math.random() * AS_H; }
                while (Math.hypot(x - ship.x, y - ship.y) < 80);
            }
            const speed = (1.5 + Math.random() * 1.5) * (4 - size);
            const angle = Math.random() * Math.PI * 2;
            const verts = [], n = 7 + Math.floor(Math.random() * 4);
            for (let i = 0; i < n; i++) {
                const a = (i / n) * Math.PI * 2;
                verts.push({ x: Math.cos(a) * r * (0.7 + Math.random() * 0.3),
                             y: Math.sin(a) * r * (0.7 + Math.random() * 0.3) });
            }
            asteroids.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r, size, verts });
        };

        for (let i = 0; i < 5; i++) spawnAsteroid(3);

        const spawnParticles = (x, y, count) => {
            for (let i = 0; i < count; i++) {
                particles.push({ x, y, vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5,
                    life: 1, hue: Math.random() * 360 });
            }
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
            const btn = sr.getElementById(id);
            btn.addEventListener("touchstart", e => { e.preventDefault(); keys[key] = true; }, { ...sig, passive: false });
            btn.addEventListener("touchend", e => { e.preventDefault(); keys[key] = false; }, { ...sig, passive: false });
        };
        wire("btn-ccw", "left"); wire("btn-cw", "right");
        wire("btn-thrust", "up"); wire("btn-fire", "fire");

        this._cleanup = () => { controller.abort(); cancelAnimationFrame(raf); };

        let lastFrame = performance.now();

        const update = (dt) => {
            invincible -= dt;
            if (keys.left) ship.angle -= 4 * dt;
            if (keys.right) ship.angle += 4 * dt;
            if (keys.up) {
                ship.vx += Math.cos(ship.angle) * effects.thrustPower * dt;
                ship.vy += Math.sin(ship.angle) * effects.thrustPower * dt;
            }
            ship.vx *= 0.995; ship.vy *= 0.995;
            ship.x += ship.vx * dt; ship.y += ship.vy * dt;
            if (ship.x < 0) ship.x = AS_W; if (ship.x > AS_W) ship.x = 0;
            if (ship.y < 0) ship.y = AS_H; if (ship.y > AS_H) ship.y = 0;

            // Fire
            fireCooldown -= dt;
            if (keys.fire && fireCooldown <= 0) {
                fireCooldown = 0.18;
                const cos = Math.cos(ship.angle), sin = Math.sin(ship.angle);
                const bvx = cos * effects.bulletSpeed + ship.vx * 0.3;
                const bvy = sin * effects.bulletSpeed + ship.vy * 0.3;
                if (effects.doubleShot) {
                    const ox = Math.cos(ship.angle + Math.PI / 2) * 5;
                    const oy = Math.sin(ship.angle + Math.PI / 2) * 5;
                    bullets.push({ x: ship.x + cos * 14 + ox, y: ship.y + sin * 14 + oy, vx: bvx, vy: bvy, life: 1.5, hue: bulletHue });
                    bullets.push({ x: ship.x + cos * 14 - ox, y: ship.y + sin * 14 - oy, vx: bvx, vy: bvy, life: 1.5, hue: bulletHue + 30 });
                } else {
                    bullets.push({ x: ship.x + cos * 14, y: ship.y + sin * 14, vx: bvx, vy: bvy, life: 1.5, hue: bulletHue });
                }
                bulletHue = (bulletHue + 15) % 360;
            }

            // Bullets
            for (let i = bullets.length - 1; i >= 0; i--) {
                const b = bullets[i];
                b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
                b.hue = (b.hue + 3) % 360;
                if (b.x < 0) b.x = AS_W; if (b.x > AS_W) b.x = 0;
                if (b.y < 0) b.y = AS_H; if (b.y > AS_H) b.y = 0;
                if (b.life <= 0) { bullets.splice(i, 1); continue; }
                for (let j = asteroids.length - 1; j >= 0; j--) {
                    const a = asteroids[j];
                    if (Math.hypot(b.x - a.x, b.y - a.y) < a.r) {
                        bullets.splice(i, 1);
                        const pts = (4 - a.size) * 10;
                        score += pts;
                        this._coins += Math.ceil(pts / 10);
                        setCoins(this._coins);
                        coinEl.textContent = this._coins;
                        spawnParticles(a.x, a.y, 6);
                        if (a.size > 1) { spawnAsteroid(a.size - 1, a.x, a.y); spawnAsteroid(a.size - 1, a.x, a.y); }
                        asteroids.splice(j, 1);
                        break;
                    }
                }
            }

            // Asteroids
            for (const a of asteroids) {
                a.x += a.vx * dt; a.y += a.vy * dt;
                if (a.x < -a.r) a.x = AS_W + a.r; if (a.x > AS_W + a.r) a.x = -a.r;
                if (a.y < -a.r) a.y = AS_H + a.r; if (a.y > AS_H + a.r) a.y = -a.r;
            }

            // Ship collision
            if (invincible <= 0) {
                for (const a of asteroids) {
                    if (Math.hypot(ship.x - a.x, ship.y - a.y) < a.r + 10) {
                        lives--;
                        spawnParticles(ship.x, ship.y, 12);
                        if (lives <= 0) { alive = false; endGame(); return; }
                        invincible = 2;
                        ship.x = AS_W / 2; ship.y = AS_H / 2; ship.vx = 0; ship.vy = 0;
                        break;
                    }
                }
            }

            // Respawn asteroids
            if (asteroids.length === 0) {
                for (let i = 0; i < 5 + Math.floor(score / 100); i++) spawnAsteroid(3);
            }

            // Particles
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.x += p.vx; p.y += p.vy; p.life -= 0.03;
                if (p.life <= 0) particles.splice(i, 1);
            }
        };

        const draw = () => {
            ctx.fillStyle = "#0a0a1a";
            ctx.fillRect(0, 0, AS_W, AS_H);

            // Stars
            for (const s of stars) {
                const a = 0.3 + 0.5 * Math.sin(performance.now() / 1000 + s.bright * 10);
                ctx.fillStyle = `rgba(255,255,255,${a})`;
                ctx.fillRect(s.x, s.y, s.size, s.size);
            }

            // Asteroids
            ctx.strokeStyle = "#aaa"; ctx.lineWidth = 1.5;
            for (const a of asteroids) {
                ctx.beginPath();
                ctx.moveTo(a.x + a.verts[0].x, a.y + a.verts[0].y);
                for (let i = 1; i < a.verts.length; i++) ctx.lineTo(a.x + a.verts[i].x, a.y + a.verts[i].y);
                ctx.closePath(); ctx.stroke();
            }

            // Bullets
            for (const b of bullets) {
                if (effects.rainbowBullets) {
                    ctx.fillStyle = `hsl(${b.hue}, 100%, 65%)`;
                    ctx.shadowColor = `hsl(${b.hue}, 100%, 50%)`; ctx.shadowBlur = 8;
                } else {
                    ctx.fillStyle = "#FFD600"; ctx.shadowColor = "rgba(255,214,0,0.5)"; ctx.shadowBlur = 6;
                }
                ctx.beginPath(); ctx.arc(b.x, b.y, 2.5, 0, Math.PI * 2); ctx.fill();
                ctx.shadowBlur = 0;
            }

            // Ship
            if (alive) {
                const blink = invincible > 0 && Math.floor(performance.now() / 100) % 2;
                if (!blink) {
                    ctx.save(); ctx.translate(ship.x, ship.y); ctx.rotate(ship.angle);
                    const t = performance.now() / 300;
                    const hull = skin.hull === "rainbow" ? `hsl(${(t * 60) % 360}, 80%, 60%)` : skin.hull;
                    ctx.strokeStyle = hull; ctx.lineWidth = 2.5;
                    ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-10, -8); ctx.lineTo(-6, 0); ctx.lineTo(-10, 8);
                    ctx.closePath(); ctx.stroke();
                    if (keys.up) {
                        const fl = skin.flame === "rainbow" ? `hsl(${((t * 80) + 180) % 360}, 90%, 55%)` : skin.flame;
                        ctx.strokeStyle = fl; ctx.lineWidth = 2;
                        ctx.beginPath(); ctx.moveTo(-8, -4); ctx.lineTo(-16 - Math.random() * 6, 0); ctx.lineTo(-8, 4); ctx.stroke();
                    }
                    ctx.restore();
                }
            }

            // Particles
            for (const p of particles) {
                ctx.globalAlpha = p.life;
                ctx.fillStyle = `hsl(${p.hue}, 100%, 65%)`;
                ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
            }
            ctx.globalAlpha = 1;

            // HUD
            ctx.fillStyle = "rgba(0,0,0,0.5)";
            ctx.beginPath(); ctx.roundRect(4, 4, 180, 26, 6); ctx.fill();
            ctx.fillStyle = "white"; ctx.font = "bold 13px 'Segoe UI',sans-serif";
            ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
            ctx.fillText(`⭐ ${score}   ❤️ ${lives}`, 12, 22);

            if (!alive) {
                ctx.fillStyle = "rgba(0,0,0,0.65)";
                ctx.fillRect(0, 0, AS_W, AS_H);
                ctx.fillStyle = "white"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
                ctx.font = "bold 24px 'Segoe UI',sans-serif";
                ctx.fillText("💀 Game Over", AS_W / 2, AS_H / 2 - 10);
                ctx.font = "16px 'Segoe UI',sans-serif";
                ctx.fillText(`Punkte: ${score}`, AS_W / 2, AS_H / 2 + 16);
            }
        };

        const endGame = () => {
            setTimeout(() => {
                cancelAnimationFrame(raf);
                this._showShop();
            }, 1500);
        };

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
