// game/drift-game.js
// Neon Drift Racer — night racing through a neon city.
// OutRun-style pseudo-3D with drift mechanics, nitro boost, rain, and stunning visuals.
// Fires CustomEvent("game-over", { bubbles:true, detail:{ score, pointsEarned } })

const W = 400, H = 300;
const SEG = 200, DRAW = 80, ROAD_W = 2200, CAM_H = 1600;
const FOV = Math.tan(80 * Math.PI / 360);
const COLORS = {
    road1: "#1a1a2e", road2: "#16213e", rumble1: "#e94560", rumble2: "#0f3460",
    grass1: "#0a0a15", grass2: "#0d0d1a", lane: "rgba(255,255,255,0.15)",
    neonPink: "#ff2d95", neonBlue: "#00d4ff", neonPurple: "#b14eff",
    neonGreen: "#39ff14", neonYellow: "#ffe600",
};

class DriftGame extends HTMLElement {
    constructor() { super(); this.attachShadow({ mode: "open" }); }

    connectedCallback() {
        this.shadowRoot.innerHTML = `<style>:host{display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:#000}canvas{width:100%;height:100%;image-rendering:pixelated}</style><canvas></canvas>`;
        const c = this.shadowRoot.querySelector("canvas");
        c.width = W; c.height = H;
        this._ctx = c.getContext("2d");
        this._init();
        this._bind();
        this._lastT = performance.now();
        this._raf = requestAnimationFrame(t => this._loop(t));
    }

    disconnectedCallback() {
        cancelAnimationFrame(this._raf);
        this._ctrl?.abort();
    }

    _init() {
        this._speed = 0; this._maxSpeed = 12000;
        this._pos = 0; this._playerX = 0;
        this._steer = 0; this._drift = 0; this._driftSmoke = [];
        this._nitro = 100; this._nitroActive = false; this._nitroParticles = [];
        this._score = 0; this._combo = 1; this._comboTimer = 0;
        this._rain = []; this._sparks = [];
        this._shakeX = 0; this._shakeY = 0;
        this._gameOver = false; this._crashTimer = 0;
        this._distance = 0; this._time = 60;

        // Build road
        this._segments = [];
        for (let i = 0; i < 1600; i++) {
            const curve = i > 50 ? Math.sin(i * 0.01) * 4 + Math.cos(i * 0.007) * 2 : 0;
            const hill = Math.sin(i * 0.008) * 40 + Math.cos(i * 0.003) * 20;
            this._segments.push({ curve, y: hill, sprites: [], traffic: null });
        }

        // Place scenery
        const buildings = ["building", "tower", "neonSign", "lamppost", "billboard", "tree"];
        for (let i = 10; i < 1600; i += 2 + Math.floor(Math.random() * 4)) {
            const side = Math.random() < 0.5 ? -1 : 1;
            const type = buildings[Math.floor(Math.random() * buildings.length)];
            const offset = ROAD_W * 0.6 + Math.random() * ROAD_W * 0.8;
            this._segments[i].sprites.push({ type, offset: offset * side, scale: 0.8 + Math.random() * 0.6 });
        }

        // Place traffic
        for (let i = 50; i < 1600; i += 15 + Math.floor(Math.random() * 25)) {
            const lane = (Math.random() - 0.5) * ROAD_W * 0.6;
            const type = Math.random() < 0.15 ? "truck" : "car";
            const neonColor = [COLORS.neonPink, COLORS.neonBlue, COLORS.neonPurple, COLORS.neonGreen][Math.floor(Math.random() * 4)];
            this._segments[i].traffic = { x: lane, type, color: neonColor, w: type === "truck" ? 220 : 160, passed: false };
        }

        // Rain
        for (let i = 0; i < 120; i++) {
            this._rain.push({ x: Math.random() * W, y: Math.random() * H, speed: 4 + Math.random() * 8, len: 3 + Math.random() * 5 });
        }
    }

    _bind() {
        this._keys = { left: false, right: false, up: false, down: false, nitro: false };
        this._ctrl = new AbortController();
        const o = { signal: this._ctrl.signal };
        const km = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down", a: "left", d: "right", w: "up", s: "down", " ": "nitro", Shift: "nitro" };
        document.addEventListener("keydown", e => { if (km[e.key] !== undefined) { this._keys[km[e.key]] = true; e.preventDefault(); } }, o);
        document.addEventListener("keyup", e => { if (km[e.key] !== undefined) this._keys[km[e.key]] = false; }, o);

        // Touch
        const c = this.shadowRoot.querySelector("canvas");
        let touchX = null;
        c.addEventListener("touchstart", e => { e.preventDefault(); touchX = e.touches[0].clientX; this._keys.up = true; }, o);
        c.addEventListener("touchmove", e => {
            e.preventDefault();
            const x = e.touches[0].clientX;
            const dx = x - touchX;
            this._keys.left = dx < -15; this._keys.right = dx > 15;
            // Two finger = nitro
            this._keys.nitro = e.touches.length >= 2;
        }, o);
        c.addEventListener("touchend", e => { this._keys.up = false; this._keys.left = false; this._keys.right = false; this._keys.nitro = false; touchX = null; }, o);
    }

    _loop(t) {
        const dt = Math.min((t - this._lastT) / 1000, 0.05);
        this._lastT = t;
        if (!this._gameOver) {
            this._update(dt);
            this._time -= dt;
            if (this._time <= 0) { this._time = 0; this._endGame(); }
        }
        this._draw();
        this._raf = requestAnimationFrame(t => this._loop(t));
    }

    _update(dt) {
        if (this._crashTimer > 0) { this._crashTimer -= dt; this._speed *= 0.95; return; }

        // Acceleration
        const nitroBoost = this._nitroActive ? 1.5 : 1;
        if (this._keys.up) this._speed += 8000 * nitroBoost * dt;
        else this._speed -= 3000 * dt;
        if (this._keys.down) this._speed -= 6000 * dt;
        this._speed = Math.max(0, Math.min(this._maxSpeed * nitroBoost, this._speed));

        // Nitro
        if (this._keys.nitro && this._nitro > 0 && this._speed > 2000) {
            this._nitroActive = true;
            this._nitro -= 30 * dt;
            if (this._nitro <= 0) { this._nitro = 0; this._nitroActive = false; }
            // Nitro particles
            for (let i = 0; i < 3; i++) {
                this._nitroParticles.push({
                    x: W / 2 + (Math.random() - 0.5) * 30,
                    y: H - 10, vx: (Math.random() - 0.5) * 40,
                    vy: -80 - Math.random() * 60, life: 0.4 + Math.random() * 0.3,
                    color: Math.random() < 0.5 ? "#ff6b00" : "#ffdd00",
                });
            }
        } else {
            this._nitroActive = false;
            this._nitro = Math.min(100, this._nitro + 5 * dt);
        }

        // Steering
        const steerAmt = this._speed > 0 ? 1 : 0;
        if (this._keys.left) this._steer = -steerAmt;
        else if (this._keys.right) this._steer = steerAmt;
        else this._steer *= 0.85;

        // Road curve push
        const segIdx = Math.floor(this._pos / SEG) % this._segments.length;
        const curve = this._segments[segIdx].curve;
        this._playerX += this._steer * dt * this._speed * 0.3;
        this._playerX -= curve * dt * this._speed * 0.8;

        // Drift
        const drifting = Math.abs(this._steer) > 0.5 && this._speed > 4000;
        this._drift += (drifting ? (this._steer > 0 ? 1 : -1) * 3 : -this._drift * 4) * dt;
        this._drift = Math.max(-1, Math.min(1, this._drift));

        if (drifting && this._speed > 3000) {
            this._driftSmoke.push({
                x: W / 2 + this._drift * -20 + (Math.random() - 0.5) * 15,
                y: H - 20 + Math.random() * 10, life: 0.6, size: 2 + Math.random() * 4
            });
        }

        // Off-road
        if (Math.abs(this._playerX) > ROAD_W * 0.55) {
            this._speed *= 0.97;
            this._playerX = Math.sign(this._playerX) * ROAD_W * 0.55;
        }

        // Collision with traffic
        const pw = 160;
        for (let i = 0; i < DRAW; i++) {
            const si = (segIdx + i) % this._segments.length;
            const tr = this._segments[si].traffic;
            if (!tr) continue;
            if (i < 3 && i > 0) {
                const dx = Math.abs(this._playerX - tr.x);
                if (dx < (pw + tr.w) / 2) {
                    // Crash!
                    this._speed *= 0.2;
                    this._crashTimer = 0.8;
                    this._combo = 1;
                    this._shakeX = (Math.random() - 0.5) * 12;
                    this._shakeY = (Math.random() - 0.5) * 8;
                    for (let j = 0; j < 15; j++) {
                        this._sparks.push({
                            x: W / 2, y: H * 0.6,
                            vx: (Math.random() - 0.5) * 200, vy: -50 - Math.random() * 150,
                            life: 0.3 + Math.random() * 0.4, color: Math.random() < 0.5 ? "#ff4444" : "#ffaa00"
                        });
                    }
                } else if (dx < (pw + tr.w) * 0.8 && !tr.passed) {
                    // Close pass bonus!
                    tr.passed = true;
                    this._score += 50 * this._combo;
                    this._combo = Math.min(10, this._combo + 1);
                    this._comboTimer = 3;
                }
            }
        }

        this._comboTimer -= dt;
        if (this._comboTimer <= 0) this._combo = 1;

        this._pos += this._speed * dt;
        this._distance += this._speed * dt * 0.001;
        this._score += this._speed * dt * 0.01;

        // Shake decay
        this._shakeX *= 0.9; this._shakeY *= 0.9;

        // Update particles
        this._driftSmoke = this._driftSmoke.filter(p => { p.life -= dt; p.y -= 10 * dt; p.size += 3 * dt; return p.life > 0; });
        this._nitroParticles = this._nitroParticles.filter(p => { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; return p.life > 0; });
        this._sparks = this._sparks.filter(p => { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; return p.life > 0; });

        // Rain
        for (const r of this._rain) {
            r.y += r.speed * this._speed * 0.001 + r.speed;
            r.x -= curve * 0.5;
            if (r.y > H) { r.y = -5; r.x = Math.random() * W; }
            if (r.x < 0) r.x = W; if (r.x > W) r.x = 0;
        }
    }

    _project(z, camZ, camY, worldX, worldY) {
        const relZ = z - camZ;
        if (relZ <= 0) return null;
        const scale = FOV / relZ;
        return { x: W / 2 + worldX * scale, y: H / 2 - (worldY - camY) * scale, s: scale };
    }

    _draw() {
        const ctx = this._ctx;
        const now = performance.now();
        const segIdx = Math.floor(this._pos / SEG) % this._segments.length;
        const segOff = (this._pos % SEG) / SEG;
        const camZ = this._pos - SEG;

        // Night sky
        const grad = ctx.createLinearGradient(0, 0, 0, H * 0.5);
        grad.addColorStop(0, "#050510");
        grad.addColorStop(0.5, "#0a0a20");
        grad.addColorStop(1, "#151530");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        // Stars
        ctx.fillStyle = "white";
        for (let i = 0; i < 40; i++) {
            const sx = (i * 137.5 + now * 0.001) % W;
            const sy = (i * 97.3) % (H * 0.35);
            const sz = 0.5 + Math.sin(now * 0.003 + i) * 0.5;
            ctx.globalAlpha = 0.3 + Math.sin(now * 0.002 + i * 7) * 0.3;
            ctx.fillRect(sx, sy, sz, sz);
        }
        ctx.globalAlpha = 1;

        // Moon
        ctx.fillStyle = "#ffe4b5";
        ctx.beginPath(); ctx.arc(320, 30, 15, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#050510";
        ctx.beginPath(); ctx.arc(325, 26, 13, 0, Math.PI * 2); ctx.fill();

        // City skyline
        this._drawSkyline(ctx, now);

        // Road segments
        ctx.save();
        ctx.translate(this._shakeX, this._shakeY);
        let cumCurve = 0;
        const projected = [];
        for (let i = 0; i < DRAW; i++) {
            const si = (segIdx + i) % this._segments.length;
            const seg = this._segments[si];
            const z = (i - segOff) * SEG;
            cumCurve += seg.curve;
            const p = this._project(z + SEG, camZ, CAM_H, cumCurve * SEG - this._playerX, seg.y * SEG);
            projected.push({ p, seg, si, i });
        }

        // Draw back to front
        for (let i = projected.length - 1; i > 0; i--) {
            const cur = projected[i], prev = projected[i - 1];
            if (!cur.p || !prev.p) continue;
            const odd = (cur.si >> 1) & 1;

            // Road
            const rw1 = ROAD_W * cur.p.s, rw2 = ROAD_W * prev.p.s;
            const rum1 = rw1 * 1.15, rum2 = rw2 * 1.15;

            // Grass
            ctx.fillStyle = odd ? COLORS.grass1 : COLORS.grass2;
            ctx.fillRect(0, cur.p.y, W, prev.p.y - cur.p.y + 1);

            // Rumble strips (neon!)
            ctx.fillStyle = odd ? COLORS.rumble1 : COLORS.rumble2;
            this._drawTrap(ctx, cur.p.x - rum1, cur.p.y, rum1 * 2, prev.p.x - rum2, prev.p.y, rum2 * 2);

            // Road surface
            ctx.fillStyle = odd ? COLORS.road1 : COLORS.road2;
            this._drawTrap(ctx, cur.p.x - rw1, cur.p.y, rw1 * 2, prev.p.x - rw2, prev.p.y, rw2 * 2);

            // Neon lane markers
            if (!odd) {
                ctx.fillStyle = "rgba(0,212,255,0.25)";
                const lw1 = rw1 * 0.01, lw2 = rw2 * 0.01;
                for (let lane = -2; lane <= 2; lane++) {
                    if (lane === 0) continue;
                    const lx1 = cur.p.x + lane * rw1 * 0.25 - lw1;
                    const lx2 = prev.p.x + lane * rw2 * 0.25 - lw2;
                    this._drawTrap(ctx, lx1, cur.p.y, lw1 * 2, lx2, prev.p.y, lw2 * 2);
                }
            }

            // Neon center line
            if (odd && cur.i < 40) {
                ctx.fillStyle = COLORS.neonPink;
                ctx.globalAlpha = 0.6;
                const cw1 = rw1 * 0.005, cw2 = rw2 * 0.005;
                this._drawTrap(ctx, cur.p.x - cw1, cur.p.y, cw1 * 2, prev.p.x - cw2, prev.p.y, cw2 * 2);
                ctx.globalAlpha = 1;
            }

            // Road reflection (wet road effect)
            if (!odd && cur.i < 30) {
                ctx.fillStyle = `rgba(0,212,255,${0.03 * (1 - cur.i / 30)})`;
                this._drawTrap(ctx, cur.p.x - rw1, cur.p.y, rw1 * 2, prev.p.x - rw2, prev.p.y, rw2 * 2);
            }

            // Traffic
            const tr = cur.seg.traffic;
            if (tr && cur.p.s > 0.001) {
                this._drawTraffic(ctx, cur.p, tr, now);
            }

            // Scenery sprites
            for (const sp of cur.seg.sprites) {
                if (cur.p.s < 0.001) continue;
                this._drawScenery(ctx, cur.p, sp, now);
            }
        }

        // Player car
        this._drawPlayerCar(ctx, now);

        // Drift smoke
        for (const p of this._driftSmoke) {
            ctx.globalAlpha = p.life * 0.5;
            ctx.fillStyle = "#aaa";
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Nitro particles
        for (const p of this._nitroParticles) {
            ctx.globalAlpha = p.life * 2;
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Sparks
        for (const p of this._sparks) {
            ctx.globalAlpha = p.life * 2;
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, 2, 2);
        }
        ctx.globalAlpha = 1;

        // Rain
        ctx.strokeStyle = "rgba(180,200,255,0.3)";
        ctx.lineWidth = 0.5;
        for (const r of this._rain) {
            ctx.beginPath(); ctx.moveTo(r.x, r.y); ctx.lineTo(r.x - 0.5, r.y + r.len); ctx.stroke();
        }

        ctx.restore();

        // HUD
        this._drawHUD(ctx, now);
    }

    _drawSkyline(ctx, now) {
        const colors = ["#1a1a2e", "#16213e", "#0f3460", "#1a1a3e"];
        for (let layer = 0; layer < 3; layer++) {
            const yBase = H * 0.25 + layer * 15;
            ctx.fillStyle = colors[layer];
            for (let i = 0; i < 20; i++) {
                const x = (i * 45 + layer * 20 + now * (0.002 + layer * 0.001)) % (W + 60) - 30;
                const h = 20 + Math.sin(i * 3.7 + layer) * 25 + layer * 10;
                const w = 8 + Math.sin(i * 2.3) * 6;
                ctx.fillRect(x, yBase - h, w, h + 5);
                // Windows
                if (layer < 2) {
                    const wc = i % 2 === 0 ? COLORS.neonPink : COLORS.neonBlue;
                    ctx.fillStyle = wc;
                    ctx.globalAlpha = 0.3 + Math.sin(now * 0.005 + i * 4) * 0.2;
                    for (let wy = yBase - h + 3; wy < yBase - 2; wy += 5) {
                        for (let wx = x + 2; wx < x + w - 2; wx += 4) {
                            if (Math.sin(i * 7 + wy + wx) > 0.2) ctx.fillRect(wx, wy, 2, 2);
                        }
                    }
                    ctx.globalAlpha = 1;
                    ctx.fillStyle = colors[layer];
                }
            }
        }
    }

    _drawTrap(ctx, x1, y1, w1, x2, y2, w2) {
        ctx.beginPath();
        ctx.moveTo(x1, y1); ctx.lineTo(x1 + w1, y1);
        ctx.lineTo(x2 + w2, y2); ctx.lineTo(x2, y2);
        ctx.fill();
    }

    _drawTraffic(ctx, p, tr, now) {
        const sx = p.x + tr.x * p.s;
        const w = tr.w * p.s;
        const h = w * 0.5;
        const sy = p.y - h;

        if (sx < -50 || sx > W + 50 || w < 2) return;

        // Car body
        ctx.fillStyle = tr.color;
        ctx.beginPath();
        ctx.roundRect(sx - w / 2, sy, w, h * 0.7, w * 0.1);
        ctx.fill();

        // Roof
        ctx.fillStyle = "#111";
        ctx.beginPath();
        ctx.roundRect(sx - w * 0.3, sy - h * 0.2, w * 0.6, h * 0.4, w * 0.08);
        ctx.fill();

        // Tail lights
        ctx.fillStyle = "#ff0040";
        ctx.fillRect(sx - w / 2, sy + h * 0.2, w * 0.08, h * 0.15);
        ctx.fillRect(sx + w / 2 - w * 0.08, sy + h * 0.2, w * 0.08, h * 0.15);

        // Neon underglow
        ctx.fillStyle = tr.color;
        ctx.globalAlpha = 0.15 + Math.sin(now * 0.005) * 0.05;
        ctx.beginPath();
        ctx.ellipse(sx, sy + h * 0.75, w * 0.6, h * 0.15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    _drawScenery(ctx, p, sp, now) {
        const sx = p.x + sp.offset * p.s;
        const sz = p.s * sp.scale * 500;
        if (sx < -100 || sx > W + 100 || sz < 1) return;

        if (sp.type === "building") {
            const bh = sz * 3;
            ctx.fillStyle = "#0a0a1a";
            ctx.fillRect(sx - sz * 0.4, p.y - bh, sz * 0.8, bh);
            // Neon windows
            const nc = Math.random() < 0.5 ? COLORS.neonBlue : COLORS.neonPink;
            ctx.fillStyle = nc;
            ctx.globalAlpha = 0.4;
            for (let wy = p.y - bh + sz * 0.2; wy < p.y - sz * 0.1; wy += sz * 0.15) {
                for (let wx = sx - sz * 0.3; wx < sx + sz * 0.3; wx += sz * 0.12) {
                    if (Math.sin(wx * 13 + wy * 7) > 0) ctx.fillRect(wx, wy, sz * 0.06, sz * 0.08);
                }
            }
            ctx.globalAlpha = 1;
        } else if (sp.type === "lamppost") {
            ctx.fillStyle = "#333";
            ctx.fillRect(sx - 1, p.y - sz * 2, 2, sz * 2);
            // Light
            ctx.fillStyle = COLORS.neonYellow;
            ctx.globalAlpha = 0.6;
            ctx.beginPath(); ctx.arc(sx, p.y - sz * 2, sz * 0.15, 0, Math.PI * 2); ctx.fill();
            // Light cone
            ctx.fillStyle = COLORS.neonYellow;
            ctx.globalAlpha = 0.04;
            ctx.beginPath(); ctx.moveTo(sx, p.y - sz * 1.8);
            ctx.lineTo(sx - sz * 0.8, p.y); ctx.lineTo(sx + sz * 0.8, p.y); ctx.fill();
            ctx.globalAlpha = 1;
        } else if (sp.type === "neonSign") {
            const color = [COLORS.neonPink, COLORS.neonBlue, COLORS.neonGreen][Math.floor(Math.abs(Math.sin(sx)) * 3)];
            ctx.fillStyle = "#111";
            ctx.fillRect(sx - sz * 0.5, p.y - sz * 1.5, sz, sz * 0.6);
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.7 + Math.sin(now * 0.008 + sx) * 0.3;
            ctx.fillRect(sx - sz * 0.45, p.y - sz * 1.45, sz * 0.9, sz * 0.5);
            ctx.globalAlpha = 1;
        } else if (sp.type === "billboard") {
            ctx.fillStyle = "#1a1a2e";
            ctx.fillRect(sx - sz * 0.8, p.y - sz * 2, sz * 1.6, sz * 0.8);
            const grd = ctx.createLinearGradient(sx - sz * 0.7, 0, sx + sz * 0.7, 0);
            grd.addColorStop(0, COLORS.neonPink); grd.addColorStop(1, COLORS.neonBlue);
            ctx.fillStyle = grd;
            ctx.globalAlpha = 0.5;
            ctx.fillRect(sx - sz * 0.75, p.y - sz * 1.95, sz * 1.5, sz * 0.7);
            ctx.globalAlpha = 1;
            // Support poles
            ctx.fillStyle = "#333";
            ctx.fillRect(sx - sz * 0.6, p.y - sz * 1.2, 2, sz * 1.2);
            ctx.fillRect(sx + sz * 0.6, p.y - sz * 1.2, 2, sz * 1.2);
        }
    }

    _drawPlayerCar(ctx, now) {
        const cx = W / 2, cy = H - 40;
        const tilt = this._drift * 8;
        const bounce = Math.sin(now * 0.02) * (this._speed / this._maxSpeed);

        ctx.save();
        ctx.translate(cx, cy + bounce);
        ctx.rotate(tilt * Math.PI / 180);

        // Neon underglow
        const glowColor = this._nitroActive ? "#ff6b00" : COLORS.neonBlue;
        ctx.fillStyle = glowColor;
        ctx.globalAlpha = 0.15;
        ctx.beginPath(); ctx.ellipse(0, 12, 35, 6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;

        // Shadow
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.beginPath(); ctx.ellipse(2, 14, 28, 5, 0, 0, Math.PI * 2); ctx.fill();

        // Car body
        const bodyGrad = ctx.createLinearGradient(-20, -20, 20, 10);
        bodyGrad.addColorStop(0, "#e63946"); bodyGrad.addColorStop(0.5, "#c1121f"); bodyGrad.addColorStop(1, "#780000");
        ctx.fillStyle = bodyGrad;
        ctx.beginPath(); ctx.roundRect(-22, -18, 44, 30, 4); ctx.fill();

        // Roof
        ctx.fillStyle = "#1a1a2e";
        ctx.beginPath(); ctx.roundRect(-14, -12, 28, 14, 3); ctx.fill();

        // Windshield reflection
        ctx.fillStyle = "rgba(100,180,255,0.25)";
        ctx.beginPath(); ctx.roundRect(-12, -10, 24, 6, 2); ctx.fill();

        // Headlights
        ctx.fillStyle = "#fff";
        ctx.fillRect(-20, -18, 5, 3);
        ctx.fillRect(15, -18, 5, 3);

        // Headlight beams
        if (this._speed > 1000) {
            ctx.fillStyle = "rgba(255,255,200,0.04)";
            ctx.beginPath();
            ctx.moveTo(-18, -20); ctx.lineTo(-60, -120); ctx.lineTo(60, -120); ctx.lineTo(18, -20);
            ctx.fill();
        }

        // Tail lights
        ctx.fillStyle = "#ff0040";
        ctx.fillRect(-22, 8, 5, 3);
        ctx.fillRect(17, 8, 5, 3);

        // Nitro exhaust
        if (this._nitroActive) {
            const fl = 10 + Math.random() * 15;
            const fw = 4 + Math.random() * 4;
            ctx.fillStyle = "#ff6b00";
            ctx.beginPath(); ctx.moveTo(-8, 12); ctx.lineTo(-8 - fw / 2, 12 + fl); ctx.lineTo(-8 + fw / 2, 12 + fl); ctx.fill();
            ctx.beginPath(); ctx.moveTo(8, 12); ctx.lineTo(8 - fw / 2, 12 + fl); ctx.lineTo(8 + fw / 2, 12 + fl); ctx.fill();
            ctx.fillStyle = "#ffdd00";
            ctx.beginPath(); ctx.moveTo(-8, 12); ctx.lineTo(-8 - fw / 4, 12 + fl * 0.6); ctx.lineTo(-8 + fw / 4, 12 + fl * 0.6); ctx.fill();
            ctx.beginPath(); ctx.moveTo(8, 12); ctx.lineTo(8 - fw / 4, 12 + fl * 0.6); ctx.lineTo(8 + fw / 4, 12 + fl * 0.6); ctx.fill();
        }

        // Racing stripes
        ctx.fillStyle = "rgba(255,255,255,0.15)";
        ctx.fillRect(-3, -18, 2, 30);
        ctx.fillRect(1, -18, 2, 30);

        ctx.restore();

        // Speed lines
        if (this._speed > 8000) {
            const alpha = (this._speed - 8000) / 4000 * 0.3;
            ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
            ctx.lineWidth = 1;
            for (let i = 0; i < 8; i++) {
                const lx = Math.random() * W;
                const ly = H * 0.3 + Math.random() * H * 0.5;
                ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx, ly + 15 + Math.random() * 20); ctx.stroke();
            }
        }
    }

    _drawHUD(ctx, now) {
        // Speed
        const speedKmh = Math.floor(this._speed * 0.036);
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.beginPath(); ctx.roundRect(W - 85, H - 40, 80, 35, 6); ctx.fill();
        ctx.fillStyle = this._nitroActive ? "#ff6b00" : "#fff";
        ctx.font = "bold 16px monospace"; ctx.textAlign = "right";
        ctx.fillText(speedKmh, W - 20, H - 18);
        ctx.fillStyle = "#888"; ctx.font = "9px sans-serif";
        ctx.fillText("km/h", W - 18, H - 10);

        // Nitro bar
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.beginPath(); ctx.roundRect(W - 85, H - 52, 80, 8, 3); ctx.fill();
        const nitroGrad = ctx.createLinearGradient(W - 83, 0, W - 7, 0);
        nitroGrad.addColorStop(0, "#00d4ff"); nitroGrad.addColorStop(1, "#b14eff");
        ctx.fillStyle = nitroGrad;
        ctx.beginPath(); ctx.roundRect(W - 83, H - 50, 76 * (this._nitro / 100), 4, 2); ctx.fill();

        // Score + combo
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.beginPath(); ctx.roundRect(5, 5, 120, 32, 6); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.font = "bold 14px sans-serif"; ctx.textAlign = "left";
        ctx.fillText(Math.floor(this._score), 12, 22);
        if (this._combo > 1) {
            ctx.fillStyle = COLORS.neonYellow;
            ctx.font = "bold 10px sans-serif";
            ctx.fillText("x" + this._combo, 12, 33);
        }

        // Timer
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.beginPath(); ctx.roundRect(W / 2 - 25, 5, 50, 22, 6); ctx.fill();
        ctx.fillStyle = this._time < 10 ? "#ff4444" : "#fff";
        ctx.font = "bold 13px monospace"; ctx.textAlign = "center";
        ctx.fillText(Math.ceil(this._time) + "s", W / 2, 21);

        // Distance
        ctx.fillStyle = "#888"; ctx.font = "9px sans-serif"; ctx.textAlign = "left";
        ctx.fillText(this._distance.toFixed(1) + " km", 12, 45);

        // Controls hint
        if (this._speed < 100 && !this._gameOver) {
            ctx.fillStyle = "rgba(0,0,0,0.7)";
            ctx.beginPath(); ctx.roundRect(W / 2 - 80, H / 2 - 15, 160, 30, 8); ctx.fill();
            ctx.fillStyle = "#fff"; ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center";
            ctx.fillText("\u2191 Gas  \u2190\u2192 Lenken  Space Nitro", W / 2, H / 2 + 4);
        }

        // Game over
        if (this._gameOver) {
            ctx.fillStyle = "rgba(0,0,0,0.7)";
            ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = COLORS.neonPink; ctx.font = "bold 28px sans-serif"; ctx.textAlign = "center";
            ctx.fillText("ZEIT VORBEI", W / 2, H / 2 - 25);
            ctx.fillStyle = "#fff"; ctx.font = "bold 18px sans-serif";
            ctx.fillText(Math.floor(this._score) + " Punkte", W / 2, H / 2 + 10);
            ctx.fillStyle = "#888"; ctx.font = "12px sans-serif";
            ctx.fillText(this._distance.toFixed(1) + " km gefahren", W / 2, H / 2 + 35);
        }
    }

    _endGame() {
        this._gameOver = true;
        this._speed = 0;
        setTimeout(() => {
            this.dispatchEvent(new CustomEvent("game-over", {
                bubbles: true, detail: { score: Math.floor(this._score), pointsEarned: 0 }
            }));
        }, 3000);
    }
}

customElements.define("drift-game", DriftGame);
