// game/racing-game.js
// Turbo Racer: OutRun-style pseudo-3D racing with hills, curves, and guardrails.
// Fires CustomEvent("game-over", { bubbles: true, detail: { score } })

const RC_W = 400, RC_H = 300;
const SEG_LEN = 200;
const DRAW_DIST = 100;
const ROAD_W = 2000;
const CAM_HEIGHT = 1500;
const CAM_DEPTH = 1 / Math.tan((80 / 2) * Math.PI / 180);
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

    _init() {
        this._alive = true;
        this._score = 0;
        this._pos = 0;
        this._speed = 0;
        this._maxSpeed = SEG_LEN * 60;
        this._accel = this._maxSpeed / 4;
        this._braking = this._maxSpeed * 1.5;
        this._playerX = 0;
        this._steerSpeed = 3;
        this._coinCount = 0;
        this._particles = [];
        this._popups = [];
        this._steerTilt = 0;
        this._shakeX = 0;
        this._shakeY = 0;

        this._segments = [];
        this._buildRoad();
        this._traffic = [];
        this._coins = [];
        this._spawnObjects();
    }

    _buildRoad() {
        const add = (count, curve, hill) => {
            for (let i = 0; i < count; i++) {
                const hasGuard = Math.random() < 0.4;
                this._segments.push({
                    curve,
                    y: hill ? Math.sin(i / count * Math.PI) * hill : 0,
                    guardL: hasGuard || Math.random() < 0.2,
                    guardR: hasGuard || Math.random() < 0.2,
                    sceneryL: Math.random() < 0.12 ? this._randScenery() : null,
                    sceneryR: Math.random() < 0.12 ? this._randScenery() : null,
                });
            }
        };

        add(60, 0, 0);
        add(50, 2.5, 2500);
        add(40, -3, 0);
        add(60, 0, 4000);
        add(50, 4, -1500);
        add(40, -2, 3000);
        add(30, 0, 0);
        add(60, 3.5, -2500);
        add(50, -4.5, 5000);
        add(40, 0, 0);
        add(60, 5, 3000);
        add(40, -3, -3500);
        add(50, 2, 4500);
        add(30, 0, 0);
        add(60, -5, 2000);
        add(50, 4.5, -2000);

        while (this._segments.length < 1600) {
            add(30 + Math.floor(Math.random() * 40), (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 6000);
        }

        let curY = 0;
        for (const s of this._segments) {
            s.worldY = curY + s.y;
            curY = s.worldY;
        }
        this._totalLen = this._segments.length * SEG_LEN;
    }

    _randScenery() {
        const types = ["tree", "tree", "pine", "pine", "palm", "bush", "rock", "sign", "building", "lamppost"];
        return { type: types[Math.floor(Math.random() * types.length)], offset: 1.4 + Math.random() * 2.0 };
    }

    _spawnObjects() {
        const total = this._segments.length;
        for (let i = 80; i < total - 50; i += 12 + Math.floor(Math.random() * 25)) {
            const lane = Math.floor(Math.random() * LANES) - 1;
            const colors = [
                { body: "#2060d0", roof: "#1845a8", accent: "#4488ee", win: "#acd" },
                { body: "#e03020", roof: "#b82018", accent: "#ff5544", win: "#eba" },
                { body: "#f0c020", roof: "#c89818", accent: "#ffe050", win: "#fea" },
                { body: "#30b030", roof: "#228822", accent: "#55dd55", win: "#afa" },
                { body: "#8030c0", roof: "#661899", accent: "#aa55ee", win: "#daf" },
                { body: "#ff6600", roof: "#cc4400", accent: "#ff9944", win: "#fca" },
                { body: "#eee",    roof: "#bbb",    accent: "#fff",    win: "#def" },
                { body: "#222",    roof: "#111",    accent: "#444",    win: "#789" },
            ];
            this._traffic.push({
                segIdx: i, lane,
                color: colors[Math.floor(Math.random() * colors.length)],
                speed: 0.3 + Math.random() * 0.4,
                isTruck: Math.random() < 0.15,
            });
        }
        for (let i = 40; i < total - 50; i += 4 + Math.floor(Math.random() * 10)) {
            this._coins.push({ segIdx: i, lane: Math.floor(Math.random() * LANES) - 1, collected: false });
        }
    }

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

        this._speed += this._accel * dt;
        this._speed = Math.min(this._speed, this._maxSpeed);

        // Off-road
        const offroad = Math.abs(this._playerX) > 1;
        if (offroad) {
            this._speed -= this._braking * dt * 2;
            if (this._speed < this._maxSpeed * 0.1) this._speed = this._maxSpeed * 0.1;
            if (Math.random() < 0.6) {
                this._particles.push({
                    x: RC_W / 2 + this._playerX * RC_W * 0.15 + (Math.random() - 0.5) * 20,
                    y: RC_H - 18, vx: (Math.random() - 0.5) * 50, vy: -15 - Math.random() * 25,
                    life: 0.4, size: 2 + Math.random(), color: "#7a6a4a",
                });
            }
        }

        // Guardrail bounce
        if (Math.abs(this._playerX) > 1.15) {
            const side = this._playerX > 0 ? 1 : -1;
            this._playerX = side * 1.1;
            this._speed *= 0.7;
            this._shakeX = (Math.random() - 0.5) * 8;
            this._shakeY = (Math.random() - 0.5) * 4;
            for (let i = 0; i < 8; i++) {
                this._particles.push({
                    x: RC_W / 2 + side * RC_W * 0.17,
                    y: RC_H - 40 - Math.random() * 30,
                    vx: -side * (30 + Math.random() * 60), vy: -30 - Math.random() * 40,
                    life: 0.4, size: 1.5 + Math.random(), color: "#ffaa33",
                });
            }
        }

        // Steering
        const steerInput = (this._keys.left ? -1 : 0) + (this._keys.right ? 1 : 0);
        if (this._keys.left) this._playerX -= this._steerSpeed * dt;
        if (this._keys.right) this._playerX += this._steerSpeed * dt;
        this._steerTilt += (steerInput * 4 - this._steerTilt) * dt * 12;

        // Centrifugal
        this._playerX -= seg.curve * speedPct * dt * 0.8;
        this._playerX = Math.max(-2.5, Math.min(2.5, this._playerX));

        this._pos += this._speed * dt;
        if (this._pos >= this._totalLen) this._pos -= this._totalLen;
        this._score = Math.floor(this._pos / SEG_LEN);

        // Shake decay
        this._shakeX *= 0.85;
        this._shakeY *= 0.85;

        // Exhaust
        if (speedPct > 0.2 && Math.random() < 0.5) {
            const px = RC_W / 2 + this._playerX * RC_W * 0.15;
            this._particles.push({
                x: px - 6, y: RC_H - 14,
                vx: (Math.random() - 0.5) * 10, vy: 10 + Math.random() * 20,
                life: 0.25, size: 1.5 + Math.random(), color: "rgba(160,160,160,0.6)",
            });
            this._particles.push({
                x: px + 6, y: RC_H - 14,
                vx: (Math.random() - 0.5) * 10, vy: 10 + Math.random() * 20,
                life: 0.25, size: 1.5 + Math.random(), color: "rgba(160,160,160,0.6)",
            });
        }

        // Speed lines at high speed
        if (speedPct > 0.6 && Math.random() < speedPct * 0.6) {
            const sx = Math.random() * RC_W;
            this._particles.push({
                x: sx, y: RC_H * 0.5 + Math.random() * RC_H * 0.4,
                vx: (sx - RC_W / 2) * 2, vy: 200 + Math.random() * 200,
                life: 0.15, size: 1, color: "rgba(255,255,255,0.3)",
            });
        }

        // Traffic collision
        const playerSeg = Math.floor(this._pos / SEG_LEN) % this._segments.length;
        for (const car of this._traffic) {
            const carSeg = Math.floor(car.segIdx) % this._segments.length;
            const dist = carSeg - playerSeg;
            if (dist >= -1 && dist <= 1) {
                if (Math.abs(this._playerX - car.lane * 0.6) < 0.45) {
                    this._crash();
                    return;
                }
            }
        }

        // Coin collection
        for (const c of this._coins) {
            if (c.collected) continue;
            const cSeg = c.segIdx % this._segments.length;
            if (Math.abs(cSeg - playerSeg) <= 1 && Math.abs(this._playerX - c.lane * 0.6) < 0.5) {
                c.collected = true;
                this._coinCount++;
                this._score += 50;
                this._popups.push({ x: RC_W / 2, y: RC_H * 0.45, text: "+50", life: 0.8 });
                for (let i = 0; i < 8; i++) {
                    this._particles.push({
                        x: RC_W / 2, y: RC_H * 0.55,
                        vx: (Math.random() - 0.5) * 120, vy: (Math.random() - 0.5) * 100,
                        life: 0.5, size: 2.5, color: "#ffd700",
                    });
                }
            }
        }

        // Particles & popups
        for (const p of this._particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
        this._particles = this._particles.filter(p => p.life > 0);
        for (const p of this._popups) { p.y -= 40 * dt; p.life -= dt; }
        this._popups = this._popups.filter(p => p.life > 0);

        // Move traffic
        for (const car of this._traffic) {
            car.segIdx += car.speed * (this._maxSpeed / SEG_LEN) * dt * 0.15;
        }
    }

    _getSegment(z) {
        const idx = Math.floor(z / SEG_LEN) % this._segments.length;
        return this._segments[idx < 0 ? idx + this._segments.length : idx];
    }

    _crash() {
        this._alive = false;
        cancelAnimationFrame(this._raf);
        const px = RC_W / 2 + this._playerX * RC_W * 0.15;
        for (let i = 0; i < 50; i++) {
            const ang = Math.random() * Math.PI * 2;
            const spd = 50 + Math.random() * 200;
            this._particles.push({
                x: px, y: RC_H - 45,
                vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd - 100,
                life: 0.8 + Math.random() * 0.8,
                size: 2 + Math.random() * 5,
                color: ["#ff6600", "#ff2200", "#ffaa00", "#ffdd00", "#222"][Math.floor(Math.random() * 5)],
            });
        }
        const anim = () => {
            for (const p of this._particles) {
                p.x += p.vx * 0.016; p.y += p.vy * 0.016;
                p.vy += 400 * 0.016; p.life -= 0.016;
            }
            this._particles = this._particles.filter(p => p.life > 0);
            this._draw();
            if (this._particles.length > 0) {
                requestAnimationFrame(anim);
            } else {
                setTimeout(() => {
                    this.dispatchEvent(new CustomEvent("game-over", {
                        bubbles: true, detail: { score: this._score },
                    }));
                }, 600);
            }
        };
        this._draw();
        requestAnimationFrame(anim);
    }

    _project(z, camZ, camY, worldX, worldY) {
        const relZ = z - camZ;
        if (relZ <= 0) return null;
        const scale = CAM_DEPTH / relZ * RC_H;
        return {
            x: RC_W / 2 + worldX * scale,
            y: RC_H / 2 - (worldY - camY) * scale,
            w: ROAD_W * scale,
            scale,
        };
    }

    // ── Drawing ──────────────────────────────────────────────────

    _draw() {
        const ctx = this._ctx;
        const now = performance.now();
        const baseSeg = Math.floor(this._pos / SEG_LEN);
        const camZ = this._pos;
        const startY = this._segments[baseSeg % this._segments.length].worldY;
        const camY = CAM_HEIGHT + startY;
        const sx = this._shakeX, sy = this._shakeY;

        // === SKY ===
        const skyGrad = ctx.createLinearGradient(0, 0, 0, RC_H * 0.5);
        skyGrad.addColorStop(0, "#0a1a44");
        skyGrad.addColorStop(0.35, "#1a3a88");
        skyGrad.addColorStop(0.7, "#4488cc");
        skyGrad.addColorStop(1, "#99ccee");
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, RC_W, RC_H);

        // Sun with lens flare
        const sunX = RC_W * 0.72 + Math.sin(now / 12000) * 25 + sx;
        const sunY = 35 + Math.cos(now / 18000) * 10 + sy;
        // Outer glow
        const sg = ctx.createRadialGradient(sunX, sunY, 5, sunX, sunY, 60);
        sg.addColorStop(0, "rgba(255,240,180,0.4)");
        sg.addColorStop(1, "rgba(255,200,50,0)");
        ctx.fillStyle = sg;
        ctx.fillRect(sunX - 60, sunY - 60, 120, 120);
        // Sun disk
        ctx.fillStyle = "#ffee66";
        ctx.beginPath(); ctx.arc(sunX, sunY, 14, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#ffffcc";
        ctx.beginPath(); ctx.arc(sunX, sunY, 8, 0, Math.PI * 2); ctx.fill();

        // Clouds (layered, parallax)
        this._drawClouds(ctx, now, sx);

        // Mountains (3 layers)
        this._drawMountains(ctx, now, sx);

        // === ROAD SEGMENTS ===
        let maxY = RC_H;
        let curCurve = 0;

        const projected = [];
        for (let i = DRAW_DIST; i >= 0; i--) {
            const idx = (baseSeg + i) % this._segments.length;
            const seg = this._segments[idx];
            const segZ = (baseSeg + i) * SEG_LEN;
            curCurve += seg.curve;
            const worldX = curCurve * 0.005 - this._playerX * ROAD_W * 0.45;
            const p = this._project(segZ, camZ, camY, worldX, seg.worldY);
            if (p) {
                projected[i] = { ...p, idx, seg, segZ, x: p.x + sx, y: p.y + sy };
            }
        }

        for (let i = DRAW_DIST; i > 0; i--) {
            const p1 = projected[i];
            const p2 = projected[i - 1];
            if (!p1 || !p2) continue;
            if (p2.y >= maxY) continue;

            const isEven = (Math.floor((baseSeg + i) / 3)) % 2 === 0;

            // Grass with texture
            ctx.fillStyle = isEven ? "#3d8a3d" : "#358035";
            ctx.fillRect(0, p2.y, RC_W, p1.y - p2.y + 1);

            // Grass detail lines
            if (i < 30 && i % 2 === 0) {
                ctx.fillStyle = isEven ? "#45954a" : "#3d8a42";
                ctx.fillRect(0, p2.y, RC_W, 1);
            }

            // Guardrail shadow on grass
            const guardW1 = p1.w * 1.2;
            const guardW2 = p2.w * 1.2;

            // Rumble strips (red/white curbs)
            const rumbleW1 = p1.w * 1.08;
            const rumbleW2 = p2.w * 1.08;
            ctx.fillStyle = isEven ? "#cc1100" : "#ffffff";
            this._trap(ctx, p1.x, p1.y, rumbleW1, p2.x, p2.y, rumbleW2);

            // Road surface with subtle gradient feel
            ctx.fillStyle = isEven ? "#555555" : "#5e5e5e";
            this._trap(ctx, p1.x, p1.y, p1.w, p2.x, p2.y, p2.w);

            // Road surface highlights near player
            if (i < 10) {
                ctx.fillStyle = `rgba(255,255,255,${0.02 * (10 - i)})`;
                this._trap(ctx, p1.x, p1.y, p1.w * 0.95, p2.x, p2.y, p2.w * 0.95);
            }

            // Center dashed line
            if (isEven) {
                ctx.fillStyle = "#eeeeee";
                this._trap(ctx, p1.x, p1.y, p1.w * 0.015, p2.x, p2.y, p2.w * 0.015);
            }

            // Lane markers
            if (isEven) {
                ctx.fillStyle = "rgba(255,255,255,0.35)";
                for (let l = 1; l < LANES; l++) {
                    const f = (l / LANES - 0.5) * 2;
                    this._trap(ctx,
                        p1.x + p1.w * f * 0.45, p1.y, p1.w * 0.006,
                        p2.x + p2.w * f * 0.45, p2.y, p2.w * 0.006);
                }
            }

            // === GUARDRAILS ===
            const seg = p2.seg;
            if (seg.guardL || seg.guardR) {
                const railH1 = Math.max(1, p1.w * 0.035);
                const railH2 = Math.max(1, p2.w * 0.035);
                const postW1 = Math.max(0.5, p1.w * 0.008);
                const postW2 = Math.max(0.5, p2.w * 0.008);

                for (const side of [-1, 1]) {
                    if (side === -1 && !seg.guardL) continue;
                    if (side === 1 && !seg.guardR) continue;

                    const gx1 = p1.x + side * guardW1;
                    const gx2 = p2.x + side * guardW2;

                    // Metal post
                    ctx.fillStyle = isEven ? "#888888" : "#999999";
                    ctx.fillRect(gx2 - postW2, p2.y - railH2 * 3, postW2 * 2, railH2 * 3);

                    // Top rail (silver)
                    ctx.fillStyle = "#bbbbbb";
                    ctx.beginPath();
                    ctx.moveTo(gx1 - postW1 * 2, p1.y - railH1 * 2.5);
                    ctx.lineTo(gx1 + postW1 * 2, p1.y - railH1 * 2.5);
                    ctx.lineTo(gx2 + postW2 * 2, p2.y - railH2 * 2.5);
                    ctx.lineTo(gx2 - postW2 * 2, p2.y - railH2 * 2.5);
                    ctx.fill();

                    // Bottom rail
                    ctx.fillStyle = "#aaaaaa";
                    ctx.beginPath();
                    ctx.moveTo(gx1 - postW1 * 2, p1.y - railH1);
                    ctx.lineTo(gx1 + postW1 * 2, p1.y - railH1);
                    ctx.lineTo(gx2 + postW2 * 2, p2.y - railH2);
                    ctx.lineTo(gx2 - postW2 * 2, p2.y - railH2);
                    ctx.fill();

                    // Reflector (every 6 segments)
                    if (i % 6 === 0 && i < 50) {
                        ctx.fillStyle = isEven ? "#ff4422" : "#ffaa00";
                        ctx.beginPath();
                        ctx.arc(gx2, p2.y - railH2 * 1.8, Math.max(1, postW2 * 1.5), 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }

            maxY = Math.min(maxY, p2.y);
        }

        // === SPRITES (scenery, traffic, coins) sorted by distance ===
        const sprites = [];

        for (let i = DRAW_DIST; i > 2; i--) {
            const p = projected[i];
            if (!p) continue;
            if (p.seg.sceneryL) sprites.push({ z: i, type: "scenery", p, side: -1, info: p.seg.sceneryL });
            if (p.seg.sceneryR) sprites.push({ z: i, type: "scenery", p, side: 1, info: p.seg.sceneryR });
        }

        for (const car of this._traffic) {
            const di = Math.floor(car.segIdx) % this._segments.length - baseSeg;
            if (di >= 1 && di < DRAW_DIST && projected[di]) {
                sprites.push({ z: di, type: "car", p: projected[di], car });
            }
        }

        for (const coin of this._coins) {
            if (coin.collected) continue;
            const di = (coin.segIdx % this._segments.length) - baseSeg;
            if (di >= 1 && di < DRAW_DIST && projected[di]) {
                sprites.push({ z: di, type: "coin", p: projected[di], coin });
            }
        }

        sprites.sort((a, b) => b.z - a.z);
        for (const sp of sprites) {
            if (sp.type === "scenery") this._drawScenery(ctx, sp.p, sp.side, sp.info, now);
            else if (sp.type === "car") this._drawTraffic(ctx, sp.p, sp.car);
            else if (sp.type === "coin") this._drawCoin(ctx, sp.p, sp.coin, now);
        }

        // === PLAYER CAR ===
        if (this._alive) this._drawPlayer(ctx, now);

        // Particles
        for (const p of this._particles) {
            ctx.globalAlpha = Math.min(1, p.life * 3);
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Popups
        ctx.font = "bold 14px 'Segoe UI',sans-serif";
        ctx.textAlign = "center";
        for (const p of this._popups) {
            ctx.globalAlpha = Math.min(1, p.life * 3);
            ctx.strokeStyle = "#000"; ctx.lineWidth = 2.5;
            ctx.strokeText(p.text, p.x, p.y);
            ctx.fillStyle = "#ffdd00";
            ctx.fillText(p.text, p.x, p.y);
        }
        ctx.globalAlpha = 1;

        // HUD
        this._drawHUD(ctx);

        // Game over
        if (!this._alive) {
            ctx.fillStyle = "rgba(0,0,0,0.6)";
            ctx.fillRect(0, 0, RC_W, RC_H);
            ctx.fillStyle = "#ff4422";
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.font = "bold 28px 'Segoe UI',sans-serif";
            ctx.fillText("CRASH!", RC_W / 2, RC_H / 2 - 30);
            ctx.fillStyle = "white";
            ctx.font = "bold 16px 'Segoe UI',sans-serif";
            ctx.fillText("Punkte: " + this._score, RC_W / 2, RC_H / 2 + 5);
            ctx.font = "13px 'Segoe UI',sans-serif";
            ctx.fillStyle = "#ccc";
            ctx.fillText("Coins: " + this._coinCount + "   Distanz: " + Math.floor(this._pos / 50) + "m", RC_W / 2, RC_H / 2 + 30);
        }
    }

    _trap(ctx, x1, y1, w1, x2, y2, w2) {
        ctx.beginPath();
        ctx.moveTo(x1 - w1, y1); ctx.lineTo(x1 + w1, y1);
        ctx.lineTo(x2 + w2, y2); ctx.lineTo(x2 - w2, y2);
        ctx.fill();
    }

    _drawClouds(ctx, now, sx) {
        // Far clouds
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        for (let i = 0; i < 5; i++) {
            const cx = ((i * 200 + now * 0.003 + this._pos * 0.0005) % (RC_W + 120)) - 60 + sx * 0.3;
            const cy = 55 + (i % 3) * 15;
            ctx.beginPath();
            ctx.ellipse(cx, cy, 35, 8, 0, 0, Math.PI * 2);
            ctx.ellipse(cx + 22, cy - 3, 20, 7, 0, 0, Math.PI * 2);
            ctx.ellipse(cx - 18, cy + 2, 18, 6, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        // Near clouds
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        for (let i = 0; i < 4; i++) {
            const cx = ((i * 170 + 80 + now * 0.006 + this._pos * 0.001) % (RC_W + 150)) - 75 + sx * 0.5;
            const cy = 80 + (i % 2) * 20;
            ctx.beginPath();
            ctx.ellipse(cx, cy, 40, 12, 0, 0, Math.PI * 2);
            ctx.ellipse(cx + 25, cy - 5, 22, 9, 0, 0, Math.PI * 2);
            ctx.ellipse(cx - 20, cy + 3, 20, 8, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    _drawMountains(ctx, now, sx) {
        const scroll = this._pos * 0.00005;
        // Far mountains (blue-gray)
        ctx.fillStyle = "#3a4a6a";
        ctx.beginPath();
        ctx.moveTo(-10, RC_H / 2 + 10);
        for (let x = -10; x <= RC_W + 10; x += 3) {
            const h = 30 + Math.sin((x + scroll * 500) * 0.012) * 20 + Math.sin((x + scroll * 300) * 0.03) * 12;
            ctx.lineTo(x + sx * 0.15, RC_H / 2 + 10 - h);
        }
        ctx.lineTo(RC_W + 10, RC_H / 2 + 10);
        ctx.fill();

        // Mid mountains (green-gray)
        ctx.fillStyle = "#3a5a3a";
        ctx.beginPath();
        ctx.moveTo(-10, RC_H / 2 + 10);
        for (let x = -10; x <= RC_W + 10; x += 3) {
            const h = 18 + Math.sin((x + scroll * 1200) * 0.018) * 14 + Math.sin((x + scroll * 800) * 0.04) * 8;
            ctx.lineTo(x + sx * 0.25, RC_H / 2 + 10 - h);
        }
        ctx.lineTo(RC_W + 10, RC_H / 2 + 10);
        ctx.fill();

        // Near treeline
        ctx.fillStyle = "#2d6a2d";
        ctx.beginPath();
        ctx.moveTo(-10, RC_H / 2 + 10);
        for (let x = -10; x <= RC_W + 10; x += 2) {
            const h = 6 + Math.sin((x + scroll * 3000) * 0.05) * 5 + Math.sin((x * 0.15 + scroll * 2000)) * 3;
            ctx.lineTo(x + sx * 0.4, RC_H / 2 + 10 - h);
        }
        ctx.lineTo(RC_W + 10, RC_H / 2 + 10);
        ctx.fill();
    }

    _drawScenery(ctx, p, side, info, now) {
        const s = Math.max(0.5, p.scale * 600);
        if (s < 1.5) return;
        const x = p.x + side * (p.w + info.offset * p.w * 0.5);
        const y = p.y;

        switch (info.type) {
            case "tree":
                ctx.fillStyle = "#3a2010"; ctx.fillRect(x - s * 0.06, y - s * 0.5, s * 0.12, s * 0.5);
                ctx.fillStyle = "#2a7a2a"; ctx.beginPath(); ctx.arc(x, y - s * 0.55, s * 0.28, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = "#35953a"; ctx.beginPath(); ctx.arc(x - s * 0.08, y - s * 0.48, s * 0.18, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = "#40aa45"; ctx.beginPath(); ctx.arc(x + s * 0.1, y - s * 0.6, s * 0.15, 0, Math.PI * 2); ctx.fill();
                break;
            case "pine":
                ctx.fillStyle = "#3a2010"; ctx.fillRect(x - s * 0.04, y - s * 0.6, s * 0.08, s * 0.6);
                ctx.fillStyle = "#1a5a2a";
                ctx.beginPath(); ctx.moveTo(x, y - s * 0.9); ctx.lineTo(x - s * 0.22, y - s * 0.25); ctx.lineTo(x + s * 0.22, y - s * 0.25); ctx.fill();
                ctx.fillStyle = "#238a35";
                ctx.beginPath(); ctx.moveTo(x, y - s * 0.75); ctx.lineTo(x - s * 0.17, y - s * 0.4); ctx.lineTo(x + s * 0.17, y - s * 0.4); ctx.fill();
                break;
            case "palm":
                ctx.fillStyle = "#6a5030"; ctx.fillRect(x - s * 0.04, y - s * 0.65, s * 0.08, s * 0.65);
                ctx.fillStyle = "#2a8a30";
                for (let a = 0; a < 5; a++) {
                    const ang = a * 1.25 - 2.5;
                    ctx.beginPath();
                    ctx.ellipse(x + Math.cos(ang) * s * 0.2, y - s * 0.7 + Math.sin(ang) * s * 0.05, s * 0.22, s * 0.04, ang, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;
            case "bush":
                ctx.fillStyle = "#2d7a2d"; ctx.beginPath(); ctx.ellipse(x, y - s * 0.08, s * 0.18, s * 0.12, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = "#359038"; ctx.beginPath(); ctx.ellipse(x + s * 0.05, y - s * 0.12, s * 0.12, s * 0.08, 0, 0, Math.PI * 2); ctx.fill();
                break;
            case "rock":
                ctx.fillStyle = "#666"; ctx.beginPath(); ctx.ellipse(x, y - s * 0.05, s * 0.14, s * 0.09, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = "#888"; ctx.beginPath(); ctx.ellipse(x - s * 0.03, y - s * 0.09, s * 0.07, s * 0.05, -0.3, 0, Math.PI * 2); ctx.fill();
                break;
            case "sign":
                ctx.fillStyle = "#777"; ctx.fillRect(x - s * 0.015, y - s * 0.4, s * 0.03, s * 0.4);
                ctx.fillStyle = "#225599"; ctx.beginPath(); ctx.roundRect(x - s * 0.13, y - s * 0.45, s * 0.26, s * 0.15, 2); ctx.fill();
                ctx.fillStyle = "#fff"; ctx.font = `${Math.max(5, Math.floor(s * 0.08))}px sans-serif`;
                ctx.textAlign = "center"; ctx.textBaseline = "middle";
                ctx.fillText(Math.floor(this._pos / 800) + " km", x, y - s * 0.38);
                break;
            case "building":
                const bw = s * 0.3, bh = s * 0.6;
                ctx.fillStyle = "#706860"; ctx.fillRect(x - bw / 2, y - bh, bw, bh);
                ctx.fillStyle = "#ffe080";
                for (let wy = 0; wy < 3; wy++) for (let wx = 0; wx < 2; wx++)
                    ctx.fillRect(x - bw / 2 + s * 0.04 + wx * s * 0.12, y - bh + s * 0.06 + wy * s * 0.16, s * 0.05, s * 0.07);
                ctx.fillStyle = "#5a3a28";
                ctx.beginPath(); ctx.moveTo(x - bw / 2 - 2, y - bh); ctx.lineTo(x, y - bh - s * 0.12); ctx.lineTo(x + bw / 2 + 2, y - bh); ctx.fill();
                break;
            case "lamppost":
                ctx.fillStyle = "#555"; ctx.fillRect(x - s * 0.015, y - s * 0.5, s * 0.03, s * 0.5);
                ctx.fillRect(x - s * 0.06, y - s * 0.52, s * 0.12, s * 0.025);
                ctx.fillStyle = "#ffee88"; ctx.beginPath(); ctx.arc(x, y - s * 0.52, s * 0.03, 0, Math.PI * 2); ctx.fill();
                break;
        }
    }

    _drawTraffic(ctx, p, car) {
        const s = p.scale * 400;
        if (s < 2) return;
        const x = p.x + car.lane * 0.6 * p.w * 0.45;
        const y = p.y;
        const w = s * (car.isTruck ? 0.35 : 0.28);
        const h = s * (car.isTruck ? 0.55 : 0.38);
        const c = car.color;

        // Shadow
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        ctx.beginPath(); ctx.ellipse(x, y + 2, w + 3, h * 0.12 + 1, 0, 0, Math.PI * 2); ctx.fill();

        // Body
        ctx.fillStyle = c.body;
        ctx.beginPath(); ctx.roundRect(x - w, y - h, w * 2, h, Math.min(w * 0.25, 5)); ctx.fill();

        // Side accent
        ctx.fillStyle = c.accent;
        ctx.fillRect(x - w + 1, y - h * 0.45, w * 2 - 2, h * 0.06);

        // Roof
        ctx.fillStyle = c.roof;
        ctx.beginPath(); ctx.roundRect(x - w * 0.7, y - h * 0.8, w * 1.4, h * 0.35, 2); ctx.fill();

        // Windshield
        ctx.fillStyle = c.win; ctx.globalAlpha = 0.5;
        ctx.fillRect(x - w * 0.6, y - h * 0.92, w * 1.2, h * 0.18);
        ctx.globalAlpha = 1;

        // Tail lights
        ctx.fillStyle = "#ff2222";
        ctx.beginPath(); ctx.roundRect(x - w + 1, y - h, w * 0.3, h * 0.08, 1); ctx.fill();
        ctx.beginPath(); ctx.roundRect(x + w * 0.7 - 1, y - h, w * 0.3, h * 0.08, 1); ctx.fill();
    }

    _drawCoin(ctx, p, coin, now) {
        const s = p.scale * 400;
        if (s < 2) return;
        const x = p.x + coin.lane * 0.6 * p.w * 0.45;
        const y = p.y - s * 0.12;
        const r = Math.max(2, s * 0.07);
        const bob = Math.sin(now / 200 + coin.segIdx) * r * 0.4;
        const stretch = Math.abs(Math.cos(now / 150 + coin.segIdx));

        // Glow
        ctx.fillStyle = "rgba(255,215,0,0.15)";
        ctx.beginPath(); ctx.arc(x, y + bob, r * 2, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = "#ffd700";
        ctx.beginPath(); ctx.ellipse(x, y + bob, r * Math.max(0.3, stretch), r, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#ffed4a";
        ctx.beginPath(); ctx.ellipse(x, y + bob, r * 0.55 * Math.max(0.3, stretch), r * 0.55, 0, 0, Math.PI * 2); ctx.fill();
    }

    _drawPlayer(ctx, now) {
        const x = RC_W / 2 + this._playerX * RC_W * 0.15 + this._shakeX;
        const y = RC_H - 42 + this._shakeY;
        const w = 22, h = 44;
        const tilt = this._steerTilt;
        const bounce = Math.sin(now / 50) * 0.4;
        const speedPct = this._speed / this._maxSpeed;

        // Shadow
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.beginPath(); ctx.ellipse(x, y + h / 2 + 6, w + 8, 8, 0, 0, Math.PI * 2); ctx.fill();

        ctx.save();
        ctx.translate(x, y + h / 2);
        ctx.rotate(tilt * 0.015);
        ctx.translate(-x, -(y + h / 2));

        // Body
        const bodyGrad = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
        bodyGrad.addColorStop(0, "#b82018");
        bodyGrad.addColorStop(0.3, "#e03020");
        bodyGrad.addColorStop(0.7, "#e03020");
        bodyGrad.addColorStop(1, "#b82018");
        ctx.fillStyle = bodyGrad;
        ctx.beginPath(); ctx.roundRect(x - w / 2, y - h / 2 + bounce, w, h, 6); ctx.fill();

        // Hood highlight
        ctx.fillStyle = "rgba(255,255,255,0.1)";
        ctx.fillRect(x - w / 2 + 3, y + 2 + bounce, w - 6, h / 3);

        // Roof
        ctx.fillStyle = "#c02818";
        ctx.beginPath(); ctx.roundRect(x - w / 2 + 4, y - h / 2 + 8 + bounce, w - 8, h * 0.25, 3); ctx.fill();

        // Windshield
        ctx.fillStyle = "rgba(130,200,255,0.6)";
        ctx.beginPath(); ctx.roundRect(x - w / 2 + 5, y + h / 2 - 15 + bounce, w - 10, 9, 2); ctx.fill();
        // Windshield reflection
        ctx.fillStyle = "rgba(255,255,255,0.15)";
        ctx.fillRect(x - 2, y + h / 2 - 14 + bounce, 6, 7);

        // Rear window
        ctx.fillStyle = "rgba(130,200,255,0.4)";
        ctx.beginPath(); ctx.roundRect(x - w / 2 + 5, y - h / 2 + 3 + bounce, w - 10, 7, 2); ctx.fill();

        // Racing stripes
        ctx.fillStyle = "rgba(255,255,255,0.2)";
        ctx.fillRect(x - 3, y - h / 2 + bounce, 2, h);
        ctx.fillRect(x + 1, y - h / 2 + bounce, 2, h);

        // Headlights
        ctx.fillStyle = "#ffffdd";
        ctx.beginPath();
        ctx.ellipse(x - w / 2 + 5, y + h / 2 - 2 + bounce, 3.5, 2.5, 0, 0, Math.PI * 2);
        ctx.ellipse(x + w / 2 - 5, y + h / 2 - 2 + bounce, 3.5, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Light beams
        if (speedPct > 0.3) {
            ctx.fillStyle = `rgba(255,255,220,${0.03 * speedPct})`;
            ctx.beginPath();
            ctx.moveTo(x - w / 2 + 2, y + h / 2 + bounce);
            ctx.lineTo(x - w / 2 - 15, y + h / 2 + 60);
            ctx.lineTo(x - w / 2 + 25, y + h / 2 + 60);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(x + w / 2 - 2, y + h / 2 + bounce);
            ctx.lineTo(x + w / 2 - 25, y + h / 2 + 60);
            ctx.lineTo(x + w / 2 + 15, y + h / 2 + 60);
            ctx.fill();
        }

        // Tail lights
        ctx.fillStyle = "#ff2222";
        ctx.beginPath();
        ctx.roundRect(x - w / 2 + 1, y - h / 2 + 1 + bounce, 5, 3, 1); ctx.fill();
        ctx.beginPath();
        ctx.roundRect(x + w / 2 - 6, y - h / 2 + 1 + bounce, 5, 3, 1); ctx.fill();

        // Brake light glow
        ctx.fillStyle = "rgba(255,0,0,0.1)";
        ctx.beginPath(); ctx.ellipse(x, y - h / 2 - 3 + bounce, w, 6, 0, 0, Math.PI * 2); ctx.fill();

        // Wheels
        ctx.fillStyle = "#111";
        ctx.fillRect(x - w / 2 - 3, y + h / 4 + bounce, 4, 9);
        ctx.fillRect(x + w / 2 - 1, y + h / 4 + bounce, 4, 9);
        ctx.fillRect(x - w / 2 - 3, y - h / 4 - 4 + bounce, 4, 9);
        ctx.fillRect(x + w / 2 - 1, y - h / 4 - 4 + bounce, 4, 9);
        // Rims
        ctx.fillStyle = "#666";
        ctx.fillRect(x - w / 2 - 2.5, y + h / 4 + 2 + bounce, 3, 5);
        ctx.fillRect(x + w / 2 - 0.5, y + h / 4 + 2 + bounce, 3, 5);
        ctx.fillRect(x - w / 2 - 2.5, y - h / 4 - 2 + bounce, 3, 5);
        ctx.fillRect(x + w / 2 - 0.5, y - h / 4 - 2 + bounce, 3, 5);

        ctx.restore();
    }

    _drawHUD(ctx) {
        // Main HUD bar
        ctx.fillStyle = "rgba(0,0,0,0.65)";
        ctx.beginPath(); ctx.roundRect(4, 4, 210, 30, 8); ctx.fill();

        const kmh = Math.floor((this._speed / this._maxSpeed) * 320 + 30);
        ctx.fillStyle = "white";
        ctx.font = "bold 12px 'Segoe UI',sans-serif";
        ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
        ctx.fillText("\uD83C\uDFC1 " + this._score + "   \uD83E\uDE99 " + this._coinCount + "   " + kmh + " km/h", 14, 24);

        // Tachometer
        const tacho = 50;
        const tx = RC_W - tacho / 2 - 12, ty = tacho / 2 + 8;
        ctx.fillStyle = "rgba(0,0,0,0.65)";
        ctx.beginPath(); ctx.arc(tx, ty, tacho / 2 + 4, 0, Math.PI * 2); ctx.fill();

        // Dial background
        ctx.fillStyle = "#1a1a1a";
        ctx.beginPath(); ctx.arc(tx, ty, tacho / 2, 0, Math.PI * 2); ctx.fill();

        // Speed markings
        ctx.strokeStyle = "#555";
        ctx.lineWidth = 1;
        for (let a = 0; a <= 8; a++) {
            const ang = Math.PI * 0.75 + (a / 8) * Math.PI * 1.5;
            ctx.beginPath();
            ctx.moveTo(tx + Math.cos(ang) * (tacho / 2 - 2), ty + Math.sin(ang) * (tacho / 2 - 2));
            ctx.lineTo(tx + Math.cos(ang) * (tacho / 2 - 6), ty + Math.sin(ang) * (tacho / 2 - 6));
            ctx.stroke();
        }

        // Needle
        const pct = this._speed / this._maxSpeed;
        const needleAng = Math.PI * 0.75 + pct * Math.PI * 1.5;
        ctx.strokeStyle = pct > 0.8 ? "#ff3322" : "#ff8844";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(tx + Math.cos(needleAng) * (tacho / 2 - 8), ty + Math.sin(needleAng) * (tacho / 2 - 8));
        ctx.stroke();

        // Center dot
        ctx.fillStyle = "#aaa";
        ctx.beginPath(); ctx.arc(tx, ty, 3, 0, Math.PI * 2); ctx.fill();

        // km/h text
        ctx.fillStyle = "#aaa";
        ctx.font = "bold 7px sans-serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(kmh, tx, ty + 10);
    }
}

customElements.define("racing-game", RacingGame);
