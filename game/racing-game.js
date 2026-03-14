// game/racing-game.js
// Turbo Racer: OutRun-style pseudo-3D racing with hills and curves.
// Fires CustomEvent("game-over", { bubbles: true, detail: { score } })

const RC_W = 400, RC_H = 300;
const SEG_LEN = 200;      // world-space length of each road segment
const DRAW_DIST = 120;    // how many segments to draw
const ROAD_W = 2000;      // half-width of road in world units
const CAM_HEIGHT = 1500;  // camera height above road
const CAM_DEPTH = 1 / Math.tan((80 / 2) * Math.PI / 180); // camera depth (FOV 80)
const LANES = 3;

class RacingGame extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._controller = new AbortController();
        this._raf = null;
    }

    connectedCallback() {
        this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          width: 100%; height: 100%; background: #111;
          font-family: "Segoe UI", sans-serif; user-select: none;
        }
        canvas {
          display: block; max-height: 80vh; max-width: 96vw;
          aspect-ratio: ${RC_W}/${RC_H}; image-rendering: auto; touch-action: none;
        }
        #mobile-controls { display: none; margin-top: 0.5rem; gap: 0.8rem; }
        @media (pointer: coarse) { #mobile-controls { display: flex; } }
        .ctrl-btn {
          width: 56px; height: 56px; border-radius: 50%;
          background: rgba(255,255,255,0.15); border: 2px solid rgba(255,255,255,0.3);
          color: white; font-size: 1.5rem; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
        }
        .ctrl-btn:active { background: rgba(255,255,255,0.3); }
      </style>
      <canvas id="c" width="${RC_W}" height="${RC_H}"></canvas>
      <div id="mobile-controls">
        <button class="ctrl-btn" id="btn-left">\u2B05</button>
        <button class="ctrl-btn" id="btn-right">\u27A1</button>
      </div>`;

        this._cv = this.shadowRoot.getElementById("c");
        this._ctx = this._cv.getContext("2d");
        this._keys = { left: false, right: false };
        this._bindInput();
        this._init();
        this._lastFrame = performance.now();
        this._loop();
    }

    disconnectedCallback() {
        cancelAnimationFrame(this._raf);
        this._controller.abort();
    }

    // ── Initialization ───────────────────────────────────────────

    _init() {
        this._alive = true;
        this._score = 0;
        this._pos = 0;          // player Z position in world
        this._speed = 0;
        this._maxSpeed = SEG_LEN * 60;
        this._accel = this._maxSpeed / 4;
        this._decel = this._maxSpeed;
        this._braking = this._maxSpeed * 1.5;
        this._playerX = 0;      // -1 to +1 across road
        this._steerSpeed = 3;
        this._coinCount = 0;
        this._particles = [];
        this._popups = [];

        // Build road segments
        this._segments = [];
        this._totalLen = 0;
        this._buildRoad();

        // Sprinkle traffic and coins
        this._traffic = [];
        this._coins = [];
        this._spawnObjects();
    }

    _buildRoad() {
        const n = 1600;
        const addSegments = (count, curve, hill) => {
            for (let i = 0; i < count; i++) {
                this._segments.push({
                    curve,
                    y: hill ? Math.sin(i / count * Math.PI) * hill : 0,
                    // scenery placed randomly
                    sceneryL: Math.random() < 0.15 ? this._randScenery() : null,
                    sceneryR: Math.random() < 0.15 ? this._randScenery() : null,
                });
            }
        };

        // Intro straight
        addSegments(50, 0, 0);
        // Gentle curves and hills
        addSegments(50, 2, 2000);
        addSegments(30, -3, 0);
        addSegments(60, 0, 4000);
        addSegments(40, 4, 0);
        addSegments(50, -2, 3000);
        addSegments(30, 0, 0);
        addSegments(60, 3, -2000);
        addSegments(40, -4, 5000);
        addSegments(50, 0, 0);
        addSegments(60, 5, 3000);
        addSegments(40, -3, -3000);
        addSegments(50, 2, 4000);
        addSegments(30, 0, 0);
        addSegments(60, -5, 2000);
        addSegments(40, 4, -2000);

        // Fill up to n
        while (this._segments.length < n) {
            const c = (Math.random() - 0.5) * 8;
            const h = (Math.random() - 0.5) * 6000;
            addSegments(30 + Math.floor(Math.random() * 40), c, h);
        }

        // Accumulate Y positions
        let curY = 0;
        for (const s of this._segments) {
            s.worldY = curY + s.y;
            curY = s.worldY;
        }

        this._totalLen = this._segments.length * SEG_LEN;
    }

    _randScenery() {
        const types = ["tree", "tree", "pine", "pine", "bush", "rock", "sign", "building", "cactus"];
        return { type: types[Math.floor(Math.random() * types.length)], offset: 1.2 + Math.random() * 2.5 };
    }

    _spawnObjects() {
        const total = this._segments.length;
        // Traffic every ~20-40 segments
        for (let i = 80; i < total - 50; i += 15 + Math.floor(Math.random() * 30)) {
            const lane = Math.floor(Math.random() * LANES) - 1; // -1, 0, 1
            const colors = [
                { body: "#2060d0", roof: "#1040a0", win: "#8ac" },
                { body: "#e03020", roof: "#b01810", win: "#eba" },
                { body: "#f0c020", roof: "#c09010", win: "#fea" },
                { body: "#30b030", roof: "#208020", win: "#afa" },
                { body: "#8030c0", roof: "#601090", win: "#daf" },
                { body: "#ff6600", roof: "#cc4400", win: "#fca" },
                { body: "#fff",    roof: "#ccc",    win: "#def" },
            ];
            this._traffic.push({
                segIdx: i,
                lane,
                color: colors[Math.floor(Math.random() * colors.length)],
                speed: 0.3 + Math.random() * 0.4, // fraction of max speed
                isTruck: Math.random() < 0.2,
            });
        }

        // Coins
        for (let i = 40; i < total - 50; i += 5 + Math.floor(Math.random() * 12)) {
            this._coins.push({
                segIdx: i,
                lane: Math.floor(Math.random() * LANES) - 1,
                collected: false,
            });
        }
    }

    // ── Input ────────────────────────────────────────────────────

    _bindInput() {
        const sig = { signal: this._controller.signal };
        document.addEventListener("keydown", e => {
            if (e.key === "ArrowLeft" || e.key === "a") this._keys.left = true;
            if (e.key === "ArrowRight" || e.key === "d") this._keys.right = true;
        }, sig);
        document.addEventListener("keyup", e => {
            if (e.key === "ArrowLeft" || e.key === "a") this._keys.left = false;
            if (e.key === "ArrowRight" || e.key === "d") this._keys.right = false;
        }, sig);
        const wire = (id, key) => {
            const btn = this.shadowRoot.getElementById(id);
            btn.addEventListener("touchstart", e => { e.preventDefault(); this._keys[key] = true; }, { ...sig, passive: false });
            btn.addEventListener("touchend", e => { e.preventDefault(); this._keys[key] = false; }, { ...sig, passive: false });
        };
        wire("btn-left", "left");
        wire("btn-right", "right");
    }

    // ── Game loop ────────────────────────────────────────────────

    _loop() {
        if (!this._alive) return;
        const now = performance.now();
        const dt = Math.min((now - this._lastFrame) / 1000, 0.04);
        this._lastFrame = now;
        this._update(dt);
        this._draw();
        this._raf = requestAnimationFrame(() => this._loop());
    }

    _update(dt) {
        const seg = this._getSegment(this._pos);
        const speedPct = this._speed / this._maxSpeed;
        const curve = seg.curve;

        // Acceleration
        this._speed += this._accel * dt;
        this._speed = Math.min(this._speed, this._maxSpeed);

        // Off-road slowdown
        if (Math.abs(this._playerX) > 1) {
            this._speed -= this._braking * dt * 2;
            if (this._speed < this._maxSpeed * 0.1) this._speed = this._maxSpeed * 0.1;
            // Rumble particles
            if (Math.random() < 0.5) {
                this._particles.push({
                    x: RC_W / 2 + this._playerX * RC_W * 0.2 + (Math.random() - 0.5) * 20,
                    y: RC_H - 20, vx: (Math.random() - 0.5) * 40, vy: -20 - Math.random() * 20,
                    life: 0.3, size: 2, color: "#8a7a5a",
                });
            }
        }

        // Steering
        if (this._keys.left) this._playerX -= this._steerSpeed * dt;
        if (this._keys.right) this._playerX += this._steerSpeed * dt;

        // Centrifugal force from curves
        this._playerX -= curve * speedPct * dt * 0.8;

        // Clamp
        if (this._playerX < -2.5) this._playerX = -2.5;
        if (this._playerX > 2.5) this._playerX = 2.5;

        // Move forward
        this._pos += this._speed * dt;
        if (this._pos >= this._totalLen) this._pos -= this._totalLen;

        // Score
        this._score = Math.floor(this._pos / SEG_LEN);

        // Exhaust
        if (speedPct > 0.3 && Math.random() < 0.4) {
            this._particles.push({
                x: RC_W / 2 + this._playerX * RC_W * 0.15,
                y: RC_H - 15,
                vx: (Math.random() - 0.5) * 15,
                vy: 15 + Math.random() * 20,
                life: 0.3 + Math.random() * 0.2,
                size: 2 + Math.random() * 2,
                color: "#aaa",
            });
        }

        // Traffic collision
        const playerSeg = Math.floor(this._pos / SEG_LEN) % this._segments.length;
        for (const car of this._traffic) {
            const carSeg = car.segIdx % this._segments.length;
            const dist = carSeg - playerSeg;
            if (dist >= -1 && dist <= 1) {
                const laneX = car.lane * 0.6;
                if (Math.abs(this._playerX - laneX) < 0.5) {
                    this._crash();
                    return;
                }
            }
        }

        // Coin collection
        for (const c of this._coins) {
            if (c.collected) continue;
            const cSeg = c.segIdx % this._segments.length;
            const dist = cSeg - playerSeg;
            if (dist >= -1 && dist <= 1) {
                const laneX = c.lane * 0.6;
                if (Math.abs(this._playerX - laneX) < 0.5) {
                    c.collected = true;
                    this._coinCount++;
                    this._score += 50;
                    this._popups.push({ x: RC_W / 2, y: RC_H / 2, text: "+50", life: 0.8 });
                    for (let i = 0; i < 6; i++) {
                        this._particles.push({
                            x: RC_W / 2, y: RC_H * 0.6,
                            vx: (Math.random() - 0.5) * 100, vy: (Math.random() - 0.5) * 80,
                            life: 0.5, size: 2.5, color: "#ffd700",
                        });
                    }
                }
            }
        }

        // Particles
        for (const p of this._particles) {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
        }
        this._particles = this._particles.filter(p => p.life > 0);
        for (const p of this._popups) { p.y -= 40 * dt; p.life -= dt; }
        this._popups = this._popups.filter(p => p.life > 0);

        // Move traffic forward
        for (const car of this._traffic) {
            car.segIdx += car.speed * (this._maxSpeed / SEG_LEN) * dt * 0.15;
            if (car.segIdx * SEG_LEN > this._pos + DRAW_DIST * SEG_LEN) {
                // wrap behind
            }
        }
    }

    _getSegment(z) {
        const idx = Math.floor(z / SEG_LEN) % this._segments.length;
        return this._segments[idx < 0 ? idx + this._segments.length : idx];
    }

    _crash() {
        this._alive = false;
        cancelAnimationFrame(this._raf);
        for (let i = 0; i < 40; i++) {
            this._particles.push({
                x: RC_W / 2 + this._playerX * RC_W * 0.15,
                y: RC_H - 50,
                vx: (Math.random() - 0.5) * 250,
                vy: (Math.random() - 1) * 200,
                life: 1 + Math.random() * 0.5,
                size: 3 + Math.random() * 5,
                color: Math.random() < 0.5 ? "#ff6600" : "#ff2200",
            });
        }
        const animCrash = () => {
            for (const p of this._particles) {
                p.x += p.vx * 0.016; p.y += p.vy * 0.016;
                p.vy += 300 * 0.016; p.life -= 0.016;
            }
            this._particles = this._particles.filter(p => p.life > 0);
            this._draw();
            if (this._particles.length > 0) {
                requestAnimationFrame(animCrash);
            } else {
                setTimeout(() => {
                    this.dispatchEvent(new CustomEvent("game-over", {
                        bubbles: true, detail: { score: this._score },
                    }));
                }, 500);
            }
        };
        this._draw();
        requestAnimationFrame(animCrash);
    }

    // ── 3D Projection ────────────────────────────────────────────

    _project(z, camZ, camY, worldX, worldY) {
        const relZ = z - camZ;
        if (relZ <= 0) return null;
        const scale = CAM_DEPTH / relZ * RC_H;
        return {
            x: RC_W / 2 + (worldX * scale),
            y: RC_H / 2 - ((worldY - camY) * scale),
            w: ROAD_W * scale,
            scale,
        };
    }

    // ── Drawing ──────────────────────────────────────────────────

    _draw() {
        const ctx = this._ctx;
        const now = performance.now();
        const baseSeg = Math.floor(this._pos / SEG_LEN);
        const segOff = (this._pos % SEG_LEN) / SEG_LEN; // 0-1 within segment
        const camZ = this._pos;
        const startY = this._segments[baseSeg % this._segments.length].worldY;
        const camY = CAM_HEIGHT + startY;

        // Sky gradient
        ctx.fillStyle = "#2244aa";
        ctx.fillRect(0, 0, RC_W, RC_H);
        const skyGrad = ctx.createLinearGradient(0, 0, 0, RC_H / 2);
        skyGrad.addColorStop(0, "#112266");
        skyGrad.addColorStop(0.5, "#3366bb");
        skyGrad.addColorStop(1, "#88aadd");
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, RC_W, RC_H / 2 + 20);

        // Sun
        const sunX = RC_W * 0.75 + Math.sin(now / 10000) * 30;
        const sunY = 40 + Math.cos(now / 15000) * 15;
        ctx.fillStyle = "#ffdd44";
        ctx.beginPath();
        ctx.arc(sunX, sunY, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,220,80,0.15)";
        ctx.beginPath();
        ctx.arc(sunX, sunY, 40, 0, Math.PI * 2);
        ctx.fill();

        // Clouds
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        for (let i = 0; i < 6; i++) {
            const cx = ((i * 130 + now * 0.005 + this._pos * 0.001) % (RC_W + 100)) - 50;
            const cy = 25 + (i % 3) * 20;
            ctx.beginPath();
            ctx.ellipse(cx, cy, 30, 10, 0, 0, Math.PI * 2);
            ctx.ellipse(cx + 20, cy - 4, 18, 8, 0, 0, Math.PI * 2);
            ctx.ellipse(cx - 15, cy + 2, 15, 7, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Far mountains
        ctx.fillStyle = "#445577";
        ctx.beginPath();
        ctx.moveTo(0, RC_H / 2 + 10);
        for (let x = 0; x <= RC_W; x += 4) {
            const h = 20 + Math.sin(x * 0.02 + this._pos * 0.00003) * 15 + Math.sin(x * 0.05 + 1) * 8;
            ctx.lineTo(x, RC_H / 2 + 10 - h);
        }
        ctx.lineTo(RC_W, RC_H / 2 + 10);
        ctx.fill();

        // Near hills
        ctx.fillStyle = "#3a6a3a";
        ctx.beginPath();
        ctx.moveTo(0, RC_H / 2 + 10);
        for (let x = 0; x <= RC_W; x += 4) {
            const h = 10 + Math.sin(x * 0.03 + this._pos * 0.0001) * 10 + Math.sin(x * 0.07 + 2) * 5;
            ctx.lineTo(x, RC_H / 2 + 10 - h);
        }
        ctx.lineTo(RC_W, RC_H / 2 + 10);
        ctx.fill();

        // Render road segments back-to-front
        let maxY = RC_H; // clip to prevent drawing behind hills
        let curCurve = 0;
        let curX = 0;

        // Pre-project all visible segments
        const projected = [];
        for (let i = DRAW_DIST; i >= 0; i--) {
            const idx = (baseSeg + i) % this._segments.length;
            const seg = this._segments[idx];
            const segZ = (baseSeg + i) * SEG_LEN;
            curCurve += seg.curve;
            const worldX = curCurve * 0.005 - this._playerX * ROAD_W * 0.45;
            const worldY = seg.worldY;
            const p = this._project(segZ, camZ, camY, worldX, worldY);
            if (p) {
                projected[i] = { ...p, idx, seg, segZ, worldX };
            }
        }

        // Draw from far to near
        for (let i = DRAW_DIST; i > 0; i--) {
            const p1 = projected[i];
            const p2 = projected[i - 1];
            if (!p1 || !p2) continue;
            if (p2.y >= maxY) continue;

            const isEven = (Math.floor((baseSeg + i) / 3)) % 2 === 0;

            // Grass
            ctx.fillStyle = isEven ? "#3d8a3d" : "#358035";
            ctx.fillRect(0, p2.y, RC_W, p1.y - p2.y + 1);

            // Rumble strips
            const rumbleW1 = p1.w * 1.15;
            const rumbleW2 = p2.w * 1.15;
            ctx.fillStyle = isEven ? "#dd2200" : "#fff";
            this._drawTrapezoid(ctx, p1.x, p1.y, rumbleW1, p2.x, p2.y, rumbleW2);

            // Road surface
            ctx.fillStyle = isEven ? "#666" : "#6a6a6a";
            this._drawTrapezoid(ctx, p1.x, p1.y, p1.w, p2.x, p2.y, p2.w);

            // Center line
            if (isEven) {
                ctx.fillStyle = "#fff";
                this._drawTrapezoid(ctx, p1.x, p1.y, p1.w * 0.02, p2.x, p2.y, p2.w * 0.02);
            }

            // Lane dashes
            if (isEven) {
                ctx.fillStyle = "rgba(255,255,255,0.5)";
                for (let l = 1; l < LANES; l++) {
                    const frac = (l / LANES - 0.5) * 2; // -0.66, 0, 0.66
                    const lx1 = p1.x + p1.w * frac * 0.45;
                    const lx2 = p2.x + p2.w * frac * 0.45;
                    this._drawTrapezoid(ctx, lx1, p1.y, p1.w * 0.008, lx2, p2.y, p2.w * 0.008);
                }
            }

            maxY = Math.min(maxY, p2.y);
        }

        // Draw scenery, traffic, coins (sorted by distance)
        const sprites = [];

        // Scenery
        for (let i = DRAW_DIST; i > 2; i--) {
            const p = projected[i];
            if (!p) continue;
            const seg = p.seg;
            if (seg.sceneryL) {
                sprites.push({ z: i, type: "scenery", p, side: -1, info: seg.sceneryL });
            }
            if (seg.sceneryR) {
                sprites.push({ z: i, type: "scenery", p, side: 1, info: seg.sceneryR });
            }
        }

        // Traffic
        for (const car of this._traffic) {
            const carSeg = Math.floor(car.segIdx) % this._segments.length;
            const di = carSeg - baseSeg;
            if (di < 1 || di >= DRAW_DIST) continue;
            const p = projected[di];
            if (!p) continue;
            sprites.push({ z: di, type: "car", p, car });
        }

        // Coins
        for (const coin of this._coins) {
            if (coin.collected) continue;
            const di = (coin.segIdx % this._segments.length) - baseSeg;
            if (di < 1 || di >= DRAW_DIST) continue;
            const p = projected[di];
            if (!p) continue;
            sprites.push({ z: di, type: "coin", p, coin });
        }

        // Sort by distance (far first)
        sprites.sort((a, b) => b.z - a.z);

        for (const sp of sprites) {
            if (sp.type === "scenery") {
                this._drawScenerySprite(ctx, sp.p, sp.side, sp.info, now);
            } else if (sp.type === "car") {
                this._drawTrafficCar(ctx, sp.p, sp.car, now);
            } else if (sp.type === "coin") {
                this._drawCoinSprite(ctx, sp.p, sp.coin, now);
            }
        }

        // Player car
        if (this._alive) {
            this._drawPlayerCar(ctx, now);
        }

        // Particles
        for (const p of this._particles) {
            ctx.globalAlpha = Math.min(1, p.life * 3);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Popups
        ctx.font = "bold 14px 'Segoe UI',sans-serif";
        ctx.textAlign = "center";
        for (const p of this._popups) {
            ctx.globalAlpha = Math.min(1, p.life * 3);
            ctx.strokeStyle = "#000"; ctx.lineWidth = 2;
            ctx.strokeText(p.text, p.x, p.y);
            ctx.fillStyle = "#fff";
            ctx.fillText(p.text, p.x, p.y);
        }
        ctx.globalAlpha = 1;

        // HUD
        this._drawHUD(ctx);

        // Game over
        if (!this._alive) {
            ctx.fillStyle = "rgba(0,0,0,0.55)";
            ctx.fillRect(0, 0, RC_W, RC_H);
            ctx.fillStyle = "white";
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.font = "bold 26px 'Segoe UI',sans-serif";
            ctx.fillText("Crash!", RC_W / 2, RC_H / 2 - 25);
            ctx.font = "16px 'Segoe UI',sans-serif";
            ctx.fillText("Punkte: " + this._score + "  Coins: " + this._coinCount, RC_W / 2, RC_H / 2 + 10);
        }
    }

    _drawTrapezoid(ctx, x1, y1, w1, x2, y2, w2) {
        ctx.beginPath();
        ctx.moveTo(x1 - w1, y1);
        ctx.lineTo(x1 + w1, y1);
        ctx.lineTo(x2 + w2, y2);
        ctx.lineTo(x2 - w2, y2);
        ctx.fill();
    }

    _drawScenerySprite(ctx, p, side, info, now) {
        const scale = p.scale * 600;
        if (scale < 1) return;
        const x = p.x + side * (p.w + info.offset * p.w * 0.5);
        const y = p.y;
        const s = Math.max(0.5, scale);

        switch (info.type) {
            case "tree": {
                ctx.fillStyle = "#4a2a0a";
                ctx.fillRect(x - s * 0.08, y - s * 0.5, s * 0.16, s * 0.5);
                ctx.fillStyle = "#2d8a2d";
                ctx.beginPath(); ctx.arc(x, y - s * 0.55, s * 0.3, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = "#3aaa3a";
                ctx.beginPath(); ctx.arc(x - s * 0.1, y - s * 0.45, s * 0.2, 0, Math.PI * 2); ctx.fill();
                break;
            }
            case "pine": {
                ctx.fillStyle = "#4a2a0a";
                ctx.fillRect(x - s * 0.06, y - s * 0.6, s * 0.12, s * 0.6);
                ctx.fillStyle = "#1a6a2a";
                ctx.beginPath();
                ctx.moveTo(x, y - s * 0.9);
                ctx.lineTo(x - s * 0.25, y - s * 0.2);
                ctx.lineTo(x + s * 0.25, y - s * 0.2);
                ctx.fill();
                ctx.fillStyle = "#2a8a3a";
                ctx.beginPath();
                ctx.moveTo(x, y - s * 0.75);
                ctx.lineTo(x - s * 0.2, y - s * 0.35);
                ctx.lineTo(x + s * 0.2, y - s * 0.35);
                ctx.fill();
                break;
            }
            case "bush": {
                ctx.fillStyle = "#2d7a2d";
                ctx.beginPath(); ctx.ellipse(x, y - s * 0.1, s * 0.2, s * 0.13, 0, 0, Math.PI * 2); ctx.fill();
                break;
            }
            case "rock": {
                ctx.fillStyle = "#777";
                ctx.beginPath(); ctx.ellipse(x, y - s * 0.06, s * 0.15, s * 0.1, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = "#999";
                ctx.beginPath(); ctx.ellipse(x - s * 0.04, y - s * 0.1, s * 0.08, s * 0.06, 0, 0, Math.PI * 2); ctx.fill();
                break;
            }
            case "cactus": {
                ctx.fillStyle = "#2a7a2a";
                ctx.fillRect(x - s * 0.05, y - s * 0.5, s * 0.1, s * 0.5);
                ctx.fillRect(x - s * 0.2, y - s * 0.4, s * 0.1, s * 0.2);
                ctx.fillRect(x + s * 0.1, y - s * 0.35, s * 0.1, s * 0.15);
                break;
            }
            case "sign": {
                ctx.fillStyle = "#888";
                ctx.fillRect(x - s * 0.02, y - s * 0.4, s * 0.04, s * 0.4);
                ctx.fillStyle = "#2255aa";
                ctx.fillRect(x - s * 0.15, y - s * 0.45, s * 0.3, s * 0.18);
                ctx.fillStyle = "#fff";
                ctx.font = `${Math.max(6, Math.floor(s * 0.1))}px sans-serif`;
                ctx.textAlign = "center"; ctx.textBaseline = "middle";
                ctx.fillText(Math.floor(this._pos / 800) + " km", x, y - s * 0.36);
                break;
            }
            case "building": {
                const bw = s * 0.35, bh = s * 0.7;
                ctx.fillStyle = "#7a7060";
                ctx.fillRect(x - bw / 2, y - bh, bw, bh);
                ctx.fillStyle = "#ffe080";
                const winS = s * 0.06;
                for (let wy = 0; wy < 4; wy++) {
                    for (let wx = 0; wx < 2; wx++) {
                        ctx.fillRect(x - bw / 2 + s * 0.06 + wx * s * 0.14, y - bh + s * 0.08 + wy * s * 0.15, winS, winS * 1.2);
                    }
                }
                ctx.fillStyle = "#5a3a2a";
                ctx.beginPath();
                ctx.moveTo(x - bw / 2 - s * 0.02, y - bh);
                ctx.lineTo(x, y - bh - s * 0.15);
                ctx.lineTo(x + bw / 2 + s * 0.02, y - bh);
                ctx.fill();
                break;
            }
        }
    }

    _drawTrafficCar(ctx, p, car, now) {
        const scale = p.scale * 400;
        if (scale < 2) return;
        const laneX = car.lane * 0.6;
        const x = p.x + laneX * p.w * 0.45;
        const y = p.y;
        const w = scale * 0.3;
        const h = scale * (car.isTruck ? 0.55 : 0.4);

        // Shadow
        ctx.fillStyle = "rgba(0,0,0,0.2)";
        ctx.beginPath();
        ctx.ellipse(x, y + 1, w + 2, h * 0.15, 0, 0, Math.PI * 2);
        ctx.fill();

        // Body
        ctx.fillStyle = car.color.body;
        ctx.beginPath();
        ctx.roundRect(x - w, y - h, w * 2, h, Math.min(w * 0.3, 4));
        ctx.fill();

        // Roof
        ctx.fillStyle = car.color.roof;
        ctx.beginPath();
        ctx.roundRect(x - w * 0.7, y - h * 0.75, w * 1.4, h * 0.35, 2);
        ctx.fill();

        // Windshield
        ctx.fillStyle = car.color.win;
        ctx.globalAlpha = 0.5;
        ctx.fillRect(x - w * 0.6, y - h * 0.9, w * 1.2, h * 0.2);
        ctx.globalAlpha = 1;

        // Tail lights
        ctx.fillStyle = "#ff2222";
        ctx.fillRect(x - w + 1, y - h, w * 0.25, h * 0.1);
        ctx.fillRect(x + w * 0.75 - 1, y - h, w * 0.25, h * 0.1);
    }

    _drawCoinSprite(ctx, p, coin, now) {
        const scale = p.scale * 400;
        if (scale < 2) return;
        const laneX = coin.lane * 0.6;
        const x = p.x + laneX * p.w * 0.45;
        const y = p.y - scale * 0.15;
        const r = Math.max(2, scale * 0.08);
        const bob = Math.sin(now / 200 + coin.segIdx) * r * 0.3;
        const stretch = Math.abs(Math.cos(now / 150 + coin.segIdx));

        ctx.fillStyle = "#ffd700";
        ctx.beginPath();
        ctx.ellipse(x, y + bob, r * Math.max(0.3, stretch), r, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffed4a";
        ctx.beginPath();
        ctx.ellipse(x, y + bob, r * 0.6 * Math.max(0.3, stretch), r * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    _drawPlayerCar(ctx, now) {
        const x = RC_W / 2 + this._playerX * RC_W * 0.15;
        const y = RC_H - 45;
        const w = 22, h = 42;
        const tilt = ((this._keys.left ? -1 : 0) + (this._keys.right ? 1 : 0)) * 2;
        const bounce = Math.sin(now / 60) * 0.5;

        // Shadow
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.beginPath();
        ctx.ellipse(x, y + h / 2 + 6, w + 6, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        // Body
        ctx.fillStyle = "#e03020";
        ctx.beginPath();
        ctx.roundRect(x - w / 2 + tilt, y - h / 2 + bounce, w, h, 6);
        ctx.fill();

        // Hood shine
        const hg = ctx.createLinearGradient(x - w / 2, y, x + w / 2, y);
        hg.addColorStop(0, "rgba(255,255,255,0)");
        hg.addColorStop(0.4, "rgba(255,255,255,0.12)");
        hg.addColorStop(0.6, "rgba(255,255,255,0.12)");
        hg.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = hg;
        ctx.fillRect(x - w / 2 + 2 + tilt, y + bounce, w - 4, h / 2);

        // Roof
        ctx.fillStyle = "#c02818";
        ctx.beginPath();
        ctx.roundRect(x - w / 2 + 4 + tilt, y - h / 2 + 8 + bounce, w - 8, h * 0.28, 3);
        ctx.fill();

        // Windshield
        ctx.fillStyle = "rgba(140,200,255,0.6)";
        ctx.beginPath();
        ctx.roundRect(x - w / 2 + 5 + tilt, y + h / 2 - 14 + bounce, w - 10, 8, 2);
        ctx.fill();

        // Rear window
        ctx.fillStyle = "rgba(140,200,255,0.4)";
        ctx.beginPath();
        ctx.roundRect(x - w / 2 + 5 + tilt, y - h / 2 + 3 + bounce, w - 10, 7, 2);
        ctx.fill();

        // Racing stripes
        ctx.fillStyle = "rgba(255,255,255,0.25)";
        ctx.fillRect(x - 3 + tilt, y - h / 2 + bounce, 2, h);
        ctx.fillRect(x + 1 + tilt, y - h / 2 + bounce, 2, h);

        // Headlights
        ctx.fillStyle = "#ffffcc";
        ctx.beginPath();
        ctx.ellipse(x - w / 2 + 5 + tilt, y + h / 2 - 2 + bounce, 3, 2.5, 0, 0, Math.PI * 2);
        ctx.ellipse(x + w / 2 - 5 + tilt, y + h / 2 - 2 + bounce, 3, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Light beams
        ctx.fillStyle = "rgba(255,255,200,0.05)";
        ctx.beginPath();
        ctx.moveTo(x - w / 2 + 2 + tilt, y + h / 2 + bounce);
        ctx.lineTo(x - w / 2 - 12, y + h / 2 + 50);
        ctx.lineTo(x - w / 2 + 22, y + h / 2 + 50);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x + w / 2 - 2 + tilt, y + h / 2 + bounce);
        ctx.lineTo(x + w / 2 - 22, y + h / 2 + 50);
        ctx.lineTo(x + w / 2 + 12, y + h / 2 + 50);
        ctx.fill();

        // Tail lights
        ctx.fillStyle = "#ff2222";
        ctx.fillRect(x - w / 2 + 1 + tilt, y - h / 2 + 1 + bounce, 5, 3);
        ctx.fillRect(x + w / 2 - 6 + tilt, y - h / 2 + 1 + bounce, 5, 3);

        // Wheels
        ctx.fillStyle = "#111";
        const wheelW = 3, wheelH = 8;
        ctx.fillRect(x - w / 2 - 2 + tilt, y + h / 4 + bounce, wheelW, wheelH);
        ctx.fillRect(x + w / 2 - 1 + tilt, y + h / 4 + bounce, wheelW, wheelH);
        ctx.fillRect(x - w / 2 - 2 + tilt, y - h / 4 - 4 + bounce, wheelW, wheelH);
        ctx.fillRect(x + w / 2 - 1 + tilt, y - h / 4 - 4 + bounce, wheelW, wheelH);

        // Wheel rims
        ctx.fillStyle = "#555";
        ctx.fillRect(x - w / 2 - 1.5 + tilt, y + h / 4 + 2 + bounce, 2, 4);
        ctx.fillRect(x + w / 2 - 0.5 + tilt, y + h / 4 + 2 + bounce, 2, 4);
        ctx.fillRect(x - w / 2 - 1.5 + tilt, y - h / 4 - 2 + bounce, 2, 4);
        ctx.fillRect(x + w / 2 - 0.5 + tilt, y - h / 4 - 2 + bounce, 2, 4);
    }

    _drawHUD(ctx) {
        // Background
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.beginPath();
        ctx.roundRect(4, 4, 200, 28, 8);
        ctx.fill();

        ctx.fillStyle = "white";
        ctx.font = "bold 12px 'Segoe UI',sans-serif";
        ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
        const kmh = Math.floor((this._speed / this._maxSpeed) * 320 + 30);
        ctx.fillText("\uD83C\uDFC1 " + this._score + "   \uD83E\uDE99 " + this._coinCount + "   " + kmh + " km/h", 12, 22);

        // Speedometer
        const barW = 55, barH = 5;
        const barX = RC_W - barW - 12, barY = 10;
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.beginPath();
        ctx.roundRect(barX - 4, barY - 2, barW + 8, barH + 16, 6);
        ctx.fill();
        ctx.fillStyle = "#aaa"; ctx.font = "bold 7px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("SPEED", barX + barW / 2, barY + 4);
        ctx.fillStyle = "rgba(255,255,255,0.2)";
        ctx.fillRect(barX, barY + 8, barW, barH);
        const pct = this._speed / this._maxSpeed;
        ctx.fillStyle = pct > 0.7 ? "#e03020" : pct > 0.4 ? "#f0c020" : "#30b030";
        ctx.fillRect(barX, barY + 8, barW * pct, barH);
    }
}

customElements.define("racing-game", RacingGame);
