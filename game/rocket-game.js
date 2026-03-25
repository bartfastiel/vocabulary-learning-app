// game/rocket-game.js
//
// Rocket mini-game with shop, upgrades, and unlockable rocket skins.
// Coins earned in-game can be spent on upgrades and cosmetics.

// ── Shop Data ─────────────────────────────────────────────────────────────────

const ROCKETS = [
    {
        id: "default", name: "Starter", price: 0, desc: "Deine treue Rakete",
        body: "#cfd8dc", accent: "#607d8b", window: "#2196f3", flame: "#ff9800",
    },
    {
        id: "fire", name: "Feuerrakete", price: 15, desc: "Brennt vor Energie",
        body: "#ef5350", accent: "#b71c1c", window: "#ffa726", flame: "#ffeb3b",
    },
    {
        id: "ice", name: "Eisrakete", price: 15, desc: "Eiskalt unterwegs",
        body: "#81d4fa", accent: "#0277bd", window: "#e0f7fa", flame: "#4fc3f7",
    },
    {
        id: "gold", name: "Goldrakete", price: 30, desc: "Purer Luxus",
        body: "#ffd54f", accent: "#f9a825", window: "#fff8e1", flame: "#ff6f00",
    },
    {
        id: "neon", name: "Neon-Blitz", price: 30, desc: "Leuchtet im Dunkeln",
        body: "#76ff03", accent: "#00c853", window: "#f5f5f5", flame: "#00e5ff",
    },
    {
        id: "galaxy", name: "Galaxie", price: 50, desc: "Aus einer anderen Welt",
        body: "#7c4dff", accent: "#311b92", window: "#e8eaf6", flame: "#e040fb",
    },
    {
        id: "rainbow", name: "Regenbogen", price: 75, desc: "Alle Farben!",
        body: "rainbow", accent: "#9c27b0", window: "#fff", flame: "rainbow",
    },
    {
        id: "stealth", name: "Stealth", price: 40, desc: "Unsichtbar... fast",
        body: "#263238", accent: "#37474f", window: "#f44336", flame: "#ff5722",
    },
    {
        id: "candy", name: "Candy", price: 25, desc: "Zuckersüss",
        body: "#f48fb1", accent: "#ec407a", window: "#fce4ec", flame: "#ff80ab",
    },
    {
        id: "ocean", name: "Tiefsee", price: 35, desc: "Aus der Tiefe",
        body: "#00838f", accent: "#004d40", window: "#80deea", flame: "#26c6da",
    },
];

const UPGRADES = [
    {
        id: "speed1", name: "Schnelle Schüsse I", price: 10, desc: "Kugeln fliegen schneller",
        icon: "⚡", requires: null, effect: { bulletSpeed: 11 },
    },
    {
        id: "speed2", name: "Schnelle Schüsse II", price: 25, desc: "Noch schneller!",
        icon: "⚡⚡", requires: "speed1", effect: { bulletSpeed: 14 },
    },
    {
        id: "speed3", name: "Schnelle Schüsse III", price: 50, desc: "Lichtgeschwindigkeit!",
        icon: "⚡⚡⚡", requires: "speed2", effect: { bulletSpeed: 18 },
    },
    {
        id: "double", name: "Doppelschuss", price: 40, desc: "Zwei Kugeln auf einmal",
        icon: "🔫🔫", requires: null, effect: { doubleShot: true },
    },
    {
        id: "ammo1", name: "Mehr Munition I", price: 15, desc: "40 Schuss statt 30",
        icon: "🎯", requires: null, effect: { maxShots: 40 },
    },
    {
        id: "ammo2", name: "Mehr Munition II", price: 35, desc: "50 Schuss!",
        icon: "🎯🎯", requires: "ammo1", effect: { maxShots: 50 },
    },
    {
        id: "rainbow_bullets", name: "Regenbogen-Schüsse", price: 20, desc: "Bunte Kugeln!",
        icon: "🌈", requires: null, effect: { rainbowBullets: true },
    },
];

function loadShopData() {
    try { return JSON.parse(localStorage.getItem("rocketShop") || "null"); } catch { return null; }
}
function defaultShopData() {
    return { ownedRockets: ["default"], ownedUpgrades: [], equipped: "default" };
}
function saveShopData(data) {
    localStorage.setItem("rocketShop", JSON.stringify(data));
}
function getCoins() { return parseInt(localStorage.getItem("gameCoins") || "0"); }
function setCoins(n) { localStorage.setItem("gameCoins", String(n)); }

// ── Component ─────────────────────────────────────────────────────────────────

class RocketGame extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    connectedCallback() {
        this._shop = loadShopData() || defaultShopData();
        this._coins = getCoins();
        this._showShop();
    }

    disconnectedCallback() {
        if (this._cleanupFn) this._cleanupFn();
    }

    // ── Shop Screen ───────────────────────────────────────────────────────────

    _showShop() {
        if (this._cleanupFn) { this._cleanupFn(); this._cleanupFn = null; }
        const shop = this._shop;
        const coins = this._coins;

        // Compute active effects
        const effects = this._getEffects();

        this.shadowRoot.innerHTML = `
      <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :host { display: flex; width: 100%; height: 100%; }
        .shop-wrap {
          display: flex; flex-direction: column;
          width: 100%; height: 100%;
          background: radial-gradient(ellipse at top, #1a1a2e, #16213e, #0f3460);
          color: #e0e0e0; font-family: "Segoe UI", system-ui, sans-serif;
          overflow-y: auto;
        }
        .shop-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 16px;
          background: rgba(0,0,0,0.3); border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .shop-title { font-size: 1.3rem; font-weight: 800; }
        .shop-coins {
          display: flex; align-items: center; gap: 6px;
          background: rgba(255,215,0,0.15); border: 1px solid rgba(255,215,0,0.3);
          border-radius: 20px; padding: 4px 14px; font-weight: 700; font-size: 1rem;
          color: #ffd700;
        }
        .shop-close {
          background: none; border: 1px solid rgba(255,255,255,0.2);
          color: #e0e0e0; border-radius: 8px; padding: 6px 14px;
          cursor: pointer; font-size: 0.9rem; font-weight: 600;
        }
        .shop-close:hover { background: rgba(255,255,255,0.1); }

        .shop-body { padding: 12px 16px; display: flex; flex-direction: column; gap: 20px; flex: 1; }

        .section-title {
          font-size: 1rem; font-weight: 700; margin-bottom: 8px;
          display: flex; align-items: center; gap: 8px;
        }

        .play-btn {
          width: 100%; padding: 14px; border: none; border-radius: 12px;
          font-size: 1.2rem; font-weight: 800; cursor: pointer;
          background: linear-gradient(135deg, #00e676, #00c853);
          color: #1b5e20; text-transform: uppercase; letter-spacing: 1px;
          box-shadow: 0 4px 15px rgba(0,230,118,0.3);
          transition: transform 0.1s;
        }
        .play-btn:active { transform: scale(0.97); }

        /* Rocket grid */
        .rocket-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px;
        }
        .rocket-card {
          display: flex; flex-direction: column; align-items: center; gap: 4px;
          padding: 10px 6px; border-radius: 12px; cursor: pointer;
          border: 2px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.05);
          transition: border-color 0.2s, transform 0.1s;
          position: relative;
        }
        .rocket-card:hover { transform: scale(1.03); }
        .rocket-card.equipped { border-color: #00e676; background: rgba(0,230,118,0.1); }
        .rocket-card.locked { opacity: 0.5; }
        .rocket-card .rocket-name { font-size: 0.75rem; font-weight: 700; text-align: center; }
        .rocket-card .rocket-price {
          font-size: 0.7rem; color: #ffd700; font-weight: 600;
        }
        .rocket-card .rocket-price.owned { color: #00e676; }
        .rocket-card .equip-badge {
          position: absolute; top: 4px; right: 4px;
          font-size: 0.6rem; background: #00e676; color: #1b5e20;
          border-radius: 4px; padding: 1px 4px; font-weight: 700;
        }
        .rocket-preview {
          width: 48px; height: 64px;
        }

        /* Upgrade list */
        .upgrade-list { display: flex; flex-direction: column; gap: 8px; }
        .upgrade-card {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 14px; border-radius: 12px;
          border: 2px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.05);
          cursor: pointer; transition: border-color 0.2s;
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

        /* Stats */
        .stats-row {
          display: flex; gap: 8px; flex-wrap: wrap;
        }
        .stat-chip {
          background: rgba(255,255,255,0.08); border-radius: 8px; padding: 6px 12px;
          font-size: 0.8rem; font-weight: 600;
        }
        .stat-chip span { color: #4fc3f7; }
      </style>

      <div class="shop-wrap">
        <div class="shop-header">
          <span class="shop-title">🚀 Weltraumpilot</span>
          <div class="shop-coins">💰 ${coins}</div>
          <button class="shop-close" id="shop-close">Zurück</button>
        </div>
        <div class="shop-body">

          <button class="play-btn" id="play-btn">▶ Spielen</button>

          <div>
            <div class="section-title">📊 Dein Setup</div>
            <div class="stats-row">
              <div class="stat-chip">Schuss: <span>${effects.maxShots}</span></div>
              <div class="stat-chip">Speed: <span>${effects.bulletSpeed}</span></div>
              <div class="stat-chip">Doppelschuss: <span>${effects.doubleShot ? "Ja" : "Nein"}</span></div>
              <div class="stat-chip">Regenbogen: <span>${effects.rainbowBullets ? "Ja" : "Nein"}</span></div>
            </div>
          </div>

          <div>
            <div class="section-title">🚀 Raketen</div>
            <div class="rocket-grid" id="rocket-grid"></div>
          </div>

          <div>
            <div class="section-title">⬆️ Upgrades</div>
            <div class="upgrade-list" id="upgrade-list"></div>
          </div>

        </div>
      </div>
    `;

        const sr = this.shadowRoot;

        sr.getElementById("shop-close").onclick = () => {
            this.dispatchEvent(new CustomEvent("close-game", { bubbles: true }));
        };
        sr.getElementById("play-btn").onclick = () => this._startGame();

        // Render rockets
        const rocketGrid = sr.getElementById("rocket-grid");
        for (const r of ROCKETS) {
            const owned = shop.ownedRockets.includes(r.id);
            const equipped = shop.equipped === r.id;
            const canBuy = !owned && coins >= r.price;

            const card = document.createElement("div");
            card.className = "rocket-card" + (equipped ? " equipped" : "") + (!owned && !canBuy ? " locked" : "");

            // Mini rocket preview
            const cvs = document.createElement("canvas");
            cvs.width = 48; cvs.height = 64; cvs.className = "rocket-preview";
            this._drawMiniRocket(cvs.getContext("2d"), r, 24, 32);
            card.appendChild(cvs);

            const name = document.createElement("div");
            name.className = "rocket-name";
            name.textContent = r.name;
            card.appendChild(name);

            const price = document.createElement("div");
            price.className = "rocket-price" + (owned ? " owned" : "");
            price.textContent = owned ? "✓" : `💰 ${r.price}`;
            card.appendChild(price);

            if (equipped) {
                const badge = document.createElement("div");
                badge.className = "equip-badge";
                badge.textContent = "AKTIV";
                card.appendChild(badge);
            }

            card.onclick = () => {
                if (owned && !equipped) {
                    shop.equipped = r.id;
                    saveShopData(shop);
                    this._showShop();
                } else if (!owned && coins >= r.price) {
                    this._coins -= r.price;
                    setCoins(this._coins);
                    shop.ownedRockets.push(r.id);
                    shop.equipped = r.id;
                    saveShopData(shop);
                    this._showShop();
                }
            };
            rocketGrid.appendChild(card);
        }

        // Render upgrades
        const upgradeList = sr.getElementById("upgrade-list");
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
          <div class="upgrade-price ${owned ? "owned" : ""}">${owned ? "✓ Gekauft" : "💰 " + u.price}</div>
        `;

            if (!owned && canBuy) {
                card.onclick = () => {
                    this._coins -= u.price;
                    setCoins(this._coins);
                    shop.ownedUpgrades.push(u.id);
                    saveShopData(shop);
                    this._showShop();
                };
            }
            upgradeList.appendChild(card);
        }
    }

    _getEffects() {
        const shop = this._shop;
        let bulletSpeed = 8, maxShots = 30, doubleShot = false, rainbowBullets = false;
        for (const uid of shop.ownedUpgrades) {
            const u = UPGRADES.find(x => x.id === uid);
            if (!u) continue;
            if (u.effect.bulletSpeed) bulletSpeed = u.effect.bulletSpeed;
            if (u.effect.maxShots) maxShots = u.effect.maxShots;
            if (u.effect.doubleShot) doubleShot = true;
            if (u.effect.rainbowBullets) rainbowBullets = true;
        }
        return { bulletSpeed, maxShots, doubleShot, rainbowBullets };
    }

    _getRocketSkin() {
        return ROCKETS.find(r => r.id === this._shop.equipped) || ROCKETS[0];
    }

    _drawMiniRocket(ctx, skin, cx, cy) {
        ctx.save();
        ctx.translate(cx, cy);
        const sc = 1.0;
        ctx.scale(sc, sc);

        // Body
        const t = performance.now() / 300;
        if (skin.body === "rainbow") {
            const hue = (t * 60) % 360;
            ctx.fillStyle = `hsl(${hue}, 80%, 60%)`;
        } else {
            ctx.fillStyle = skin.body;
        }
        ctx.beginPath();
        ctx.moveTo(0, -20); ctx.lineTo(12, 12); ctx.lineTo(-12, 12);
        ctx.closePath(); ctx.fill();

        // Fins
        ctx.fillStyle = skin.accent;
        ctx.beginPath(); ctx.moveTo(-12, 12); ctx.lineTo(-20, 22); ctx.lineTo(-8, 12); ctx.fill();
        ctx.beginPath(); ctx.moveTo(12, 12); ctx.lineTo(20, 22); ctx.lineTo(8, 12); ctx.fill();

        // Flame
        const flame = Math.random() * 5 + 6;
        if (skin.flame === "rainbow") {
            const hue = ((t * 80) + 180) % 360;
            ctx.fillStyle = `hsl(${hue}, 90%, 55%)`;
        } else {
            ctx.fillStyle = skin.flame;
        }
        ctx.beginPath();
        ctx.moveTo(-5, 12); ctx.lineTo(0, 12 + flame); ctx.lineTo(5, 12);
        ctx.closePath(); ctx.fill();

        // Glow around flame
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.moveTo(-8, 12); ctx.lineTo(0, 12 + flame + 4); ctx.lineTo(8, 12);
        ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 1;

        // Window
        ctx.fillStyle = skin.window;
        ctx.beginPath(); ctx.arc(0, -4, 4, 0, Math.PI * 2); ctx.fill();

        // Window shine
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.beginPath(); ctx.arc(-1.5, -5.5, 1.5, 0, Math.PI * 2); ctx.fill();

        ctx.restore();
    }

    // ── Game Screen ───────────────────────────────────────────────────────────

    _startGame() {
        const effects = this._getEffects();
        const skin = this._getRocketSkin();

        this.shadowRoot.innerHTML = `
      <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :host { display: flex; justify-content: center; align-items: center; width: 100%; height: 100%; }
        #game-overlay {
          display: flex; position: relative; flex-direction: column;
          align-items: center; justify-content: center;
          background: radial-gradient(ellipse at top, #0a0a23, #16213e, #0f3460);
          color: white; width: 100%; height: 100%;
          border-radius: 12px; padding: 12px;
        }
        .top-bar {
          width: min(92vw, 440px);
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 8px;
        }
        .top-btn {
          background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);
          color: #e0e0e0; border-radius: 8px; padding: 6px 12px;
          cursor: pointer; font-size: 0.85rem; font-weight: 600;
        }
        .top-btn:hover { background: rgba(255,255,255,0.2); }
        .coins-display {
          display: flex; align-items: center; gap: 4px;
          color: #ffd700; font-weight: 700; font-size: 1rem;
        }
        #hud {
          width: min(92vw, 440px);
          display: flex; flex-direction: column; gap: 4px; margin-bottom: 6px;
        }
        .bar-title {
          font-size: 0.85rem; display: flex; justify-content: space-between;
          align-items: center; opacity: 0.85;
        }
        .bar {
          position: relative; width: 100%; height: 14px;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(0,255,255,0.3); border-radius: 7px;
          overflow: hidden; display: flex;
        }
        #combo-hits { background: linear-gradient(90deg, #66bb6a, #00e676); height: 100%; width: 0%; transition: width 0.2s; }
        #combo-misses { background: linear-gradient(90deg, #ef5350, #ff1744); height: 100%; width: 0%; transition: width 0.2s; }
        #combo-remaining { background: rgba(255,255,255,0.15); height: 100%; width: 100%; }
        #game-canvas {
          background: radial-gradient(ellipse at center, #0a0a23, #000011);
          border: 2px solid rgba(0,255,255,0.25); border-radius: 12px;
          touch-action: none;
          width: min(92vw, 440px); height: calc(min(92vw, 440px) * 1.5);
          max-height: 78vh;
          box-shadow: 0 0 30px rgba(0,255,255,0.1);
        }
      </style>

      <div id="game-overlay">
        <div class="top-bar">
          <button class="top-btn" id="back-to-shop">🛒 Shop</button>
          <div class="coins-display">💰 <span id="game-coins">${this._coins}</span></div>
          <button class="top-btn" id="close-game">✕ Ende</button>
        </div>

        <div id="hud">
          <div class="bar-title">
            <span>Treffer / Daneben / Offen</span>
            <span id="combo-count">0 | 0 | ${effects.maxShots}</span>
          </div>
          <div class="bar">
            <div id="combo-hits"></div>
            <div id="combo-misses"></div>
            <div id="combo-remaining"></div>
          </div>
        </div>

        <canvas id="game-canvas" width="400" height="600"></canvas>
      </div>
    `;

        this._setupGame(effects, skin);
    }

    _setupGame(effects, skin) {
        const shadow = this.shadowRoot;
        const canvas = shadow.getElementById("game-canvas");
        const ctx = canvas.getContext("2d");
        const gameCoinsEl = shadow.getElementById("game-coins");
        const comboCountEl = shadow.getElementById("combo-count");
        const comboHits = shadow.getElementById("combo-hits");
        const comboMisses = shadow.getElementById("combo-misses");
        const comboRemaining = shadow.getElementById("combo-remaining");

        shadow.getElementById("close-game").onclick = () => {
            this.dispatchEvent(new CustomEvent("close-game", { bubbles: true }));
        };
        shadow.getElementById("back-to-shop").onclick = () => this._showShop();

        let rocket = { x: 200, y: 550, w: 40, h: 40 };
        let bullets = [], coins = [];
        let leftPressed = false, rightPressed = false;
        let spaceDown = false;
        let lastSpawn = 0;
        let particles = [];
        let stars = [];

        const maxShots = effects.maxShots;
        const bulletSpeed = effects.bulletSpeed;
        const doubleShot = effects.doubleShot;
        const rainbowBullets = effects.rainbowBullets;
        let shotsFired = 0, hits = 0, misses = 0;
        let bulletHue = 0;

        // Star field
        for (let i = 0; i < 80; i++) {
            stars.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 1.5 + 0.5,
                speed: Math.random() * 0.3 + 0.1,
                brightness: Math.random(),
            });
        }

        const clamp = (x, min, max) => (x < min ? min : (x > max ? max : x));
        const toCanvasX = (clientX) => {
            const rect = canvas.getBoundingClientRect();
            return (clientX - rect.left) * (canvas.width / rect.width);
        };
        const placeRocketAtClientX = (clientX) => {
            rocket.x = clamp(toCanvasX(clientX) - rocket.w / 2, 0, canvas.width - rocket.w);
        };

        const onKeyDown = (e) => {
            if (e.key === "ArrowLeft" || e.key === "a") leftPressed = true;
            if (e.key === "ArrowRight" || e.key === "d") rightPressed = true;
            if (e.key === " " && !spaceDown) { spaceDown = true; e.preventDefault(); shoot(); }
        };
        const onKeyUp = (e) => {
            if (e.key === "ArrowLeft" || e.key === "a") leftPressed = false;
            if (e.key === "ArrowRight" || e.key === "d") rightPressed = false;
            if (e.key === " ") spaceDown = false;
        };
        document.addEventListener("keydown", onKeyDown);
        document.addEventListener("keyup", onKeyUp);
        let rafId;
        this._cleanupFn = () => {
            document.removeEventListener("keydown", onKeyDown);
            document.removeEventListener("keyup", onKeyUp);
            cancelAnimationFrame(rafId);
        };

        let hasShotThisTouch = false;
        canvas.addEventListener("touchstart", (e) => {
            const t = e.touches[0];
            placeRocketAtClientX(t.clientX);
            if (!hasShotThisTouch) { shoot(); hasShotThisTouch = true; }
        }, { passive: true });
        canvas.addEventListener("touchmove", (e) => {
            placeRocketAtClientX(e.touches[0].clientX);
        }, { passive: true });
        canvas.addEventListener("touchend", () => { hasShotThisTouch = false; }, { passive: true });
        canvas.addEventListener("click", (e) => { placeRocketAtClientX(e.clientX); shoot(); e.preventDefault(); });

        const flashBar = (el) => {
            el.style.boxShadow = "0 0 14px 3px rgba(244,67,54,0.9)";
            setTimeout(() => (el.style.boxShadow = ""), 200);
        };

        const updateComboBar = () => {
            const remaining = maxShots - shotsFired;
            comboCountEl.textContent = `${hits} | ${misses} | ${remaining}`;
            comboHits.style.width = `${(hits / maxShots) * 100}%`;
            comboMisses.style.width = `${(misses / maxShots) * 100}%`;
            comboRemaining.style.width = `${(remaining / maxShots) * 100}%`;
        };

        const shoot = () => {
            if (shotsFired >= maxShots) {
                flashBar(shadow.querySelector(".bar"));
                return;
            }
            const cx = rocket.x + rocket.w / 2;
            if (doubleShot) {
                bullets.push({ x: cx - 8, y: rocket.y - 10, hue: bulletHue });
                bullets.push({ x: cx + 6, y: rocket.y - 10, hue: bulletHue + 30 });
                shotsFired += 2;
            } else {
                bullets.push({ x: cx - 2, y: rocket.y - 10, hue: bulletHue });
                shotsFired++;
            }
            bulletHue = (bulletHue + 15) % 360;
            updateComboBar();
        };

        const spawnParticles = (x, y) => {
            for (let i = 0; i < 8; i++) {
                particles.push({
                    x, y,
                    vx: (Math.random() - 0.5) * 6,
                    vy: (Math.random() - 0.5) * 6,
                    life: 1,
                    hue: Math.random() * 360,
                });
            }
        };

        const drawStars = () => {
            for (const s of stars) {
                s.y += s.speed;
                if (s.y > canvas.height) { s.y = 0; s.x = Math.random() * canvas.width; }
                const a = 0.4 + 0.6 * Math.sin(performance.now() / 1000 + s.brightness * 10);
                ctx.fillStyle = `rgba(255,255,255,${a * 0.7})`;
                ctx.fillRect(s.x, s.y, s.size, s.size);
            }
        };

        const drawRocket = (x, y) => {
            this._drawMiniRocket(ctx, skin, x + rocket.w / 2, y + rocket.h / 2);
        };

        const drawBullet = (b) => {
            if (rainbowBullets) {
                ctx.fillStyle = `hsl(${b.hue}, 100%, 65%)`;
                ctx.shadowColor = `hsl(${b.hue}, 100%, 50%)`;
                ctx.shadowBlur = 8;
            } else {
                ctx.fillStyle = skin.flame === "rainbow" ? `hsl(${b.hue}, 100%, 65%)` : "#fff";
                ctx.shadowColor = skin.flame === "rainbow" ? `hsl(${b.hue}, 80%, 50%)` : "rgba(255,255,255,0.5)";
                ctx.shadowBlur = 6;
            }
            ctx.beginPath();
            ctx.ellipse(b.x + 2, b.y + 5, 2.5, 6, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        };

        const drawCoin = (c) => {
            const glow = Math.sin(performance.now() / 400 + c.x) * 0.3 + 0.7;
            ctx.shadowColor = "rgba(255,215,0,0.6)";
            ctx.shadowBlur = 10 * glow;
            ctx.fillStyle = `rgba(255,215,0,${0.7 + glow * 0.3})`;
            ctx.beginPath();
            ctx.arc(c.x + 10, c.y + 10, 10, 0, Math.PI * 2);
            ctx.fill();
            // Inner shine
            ctx.fillStyle = "rgba(255,255,200,0.4)";
            ctx.beginPath();
            ctx.arc(c.x + 7, c.y + 7, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        };

        const drawParticles = () => {
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.x += p.vx; p.y += p.vy; p.life -= 0.03;
                if (p.life <= 0) { particles.splice(i, 1); continue; }
                ctx.globalAlpha = p.life;
                ctx.fillStyle = `hsl(${p.hue}, 100%, 65%)`;
                ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
            }
            ctx.globalAlpha = 1;
        };

        const loop = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            drawStars();

            if (leftPressed) rocket.x -= 5;
            if (rightPressed) rocket.x += 5;
            rocket.x = clamp(rocket.x, 0, canvas.width - rocket.w);

            drawRocket(rocket.x, rocket.y);

            // Bullets
            for (let i = bullets.length - 1; i >= 0; i--) {
                const b = bullets[i];
                b.y -= bulletSpeed;
                b.hue = (b.hue + 2) % 360;
                if (b.y < -10) {
                    bullets.splice(i, 1);
                    misses++;
                    updateComboBar();
                    continue;
                }
                drawBullet(b);
            }

            // Spawn coins
            const now = performance.now();
            if (now - lastSpawn > 1000) {
                coins.push({ x: Math.random() * (canvas.width - 20), y: -20 });
                lastSpawn = now;
            }

            // Draw & collision
            for (let i = coins.length - 1; i >= 0; i--) {
                const c = coins[i];
                c.y += 3;
                if (c.y > canvas.height + 20) { coins.splice(i, 1); continue; }
                drawCoin(c);

                for (let j = bullets.length - 1; j >= 0; j--) {
                    const b = bullets[j];
                    if (b.x > c.x && b.x < c.x + 20 && b.y > c.y && b.y < c.y + 20) {
                        spawnParticles(c.x + 10, c.y + 10);
                        coins.splice(i, 1);
                        bullets.splice(j, 1);
                        hits++;
                        this._coins++;
                        gameCoinsEl.textContent = this._coins;
                        setCoins(this._coins);
                        updateComboBar();
                        break;
                    }
                }
            }

            drawParticles();

            rafId = requestAnimationFrame(loop);
        };

        updateComboBar();
        rafId = requestAnimationFrame(loop);
    }
}

customElements.define("rocket-game", RocketGame);
