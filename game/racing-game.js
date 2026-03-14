// game/racing-game.js
// Turbo Racer: endless pseudo-3D highway racing game.
// Dodge traffic, collect coins, go as far as possible!
// Fires CustomEvent("game-over", { bubbles: true, detail: { score } })

const RC_W = 400, RC_H = 300;

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
        #mobile-controls {
          display: none; margin-top: 0.5rem; gap: 0.8rem;
        }
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
        this._distance = 0;
        this._speed = 180;       // pixels/sec scrolling speed
        this._maxSpeed = 500;
        this._playerX = RC_W / 2; // center of player car
        this._playerLane = 0;     // -1 to 1 smooth
        this._steerSpeed = 220;

        // Road geometry
        this._roadWidth = 200;
        this._laneCount = 3;
        this._roadCurve = 0;     // current curve amount
        this._targetCurve = 0;
        this._curveTimer = 0;

        // Traffic cars
        this._traffic = [];
        this._trafficTimer = 0;
        this._trafficInterval = 1.2;

        // Coins
        this._coins = [];
        this._coinTimer = 0;
        this._coinCount = 0;

        // Scenery (trees, buildings)
        this._scenery = [];
        for (let i = 0; i < 30; i++) {
            this._scenery.push(this._makeScenery(Math.random() * RC_H));
        }

        // Particles (exhaust, sparks)
        this._particles = [];
        this._popups = [];

        // Time of day
        this._timeOfDay = 0; // 0-1, affects colors

        // Nitro boost
        this._nitro = 0;
        this._nitroFlash = 0;
    }

    _makeScenery(y) {
        const side = Math.random() < 0.5 ? -1 : 1;
        const types = ["tree", "tree", "tree", "bush", "rock", "sign", "building"];
        const type = types[Math.floor(Math.random() * types.length)];
        return { y, side, type, x: 0.6 + Math.random() * 0.4 }; // x = distance from road edge (0.6-1.0)
    }

    _makeTraffic() {
        const lane = Math.floor(Math.random() * this._laneCount);
        const colors = [
            { body: "#e03020", roof: "#b01810", stripe: "#ff6050" },
            { body: "#2060d0", roof: "#1040a0", stripe: "#60a0ff" },
            { body: "#f0c020", roof: "#c09010", stripe: "#ffe060" },
            { body: "#30b030", roof: "#208020", stripe: "#60e060" },
            { body: "#8030c0", roof: "#601090", stripe: "#b060f0" },
            { body: "#ff6600", roof: "#cc4400", stripe: "#ffaa44" },
            { body: "#ffffff", roof: "#cccccc", stripe: "#eeeeee" },
        ];
        const color = colors[Math.floor(Math.random() * colors.length)];
        const isTruck = Math.random() < 0.2;
        return {
            lane, y: -60, color,
            speed: 60 + Math.random() * 80,
            w: isTruck ? 36 : 28,
            h: isTruck ? 55 : 42,
            isTruck,
        };
    }

    _makeCoin(y) {
        const lane = Math.floor(Math.random() * this._laneCount);
        return { lane, y: y || -20, collected: false, phase: Math.random() * Math.PI * 2 };
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

        // Touch controls
        const wire = (id, key) => {
            const btn = this.shadowRoot.getElementById(id);
            btn.addEventListener("touchstart", e => { e.preventDefault(); this._keys[key] = true; }, { ...sig, passive: false });
            btn.addEventListener("touchend", e => { e.preventDefault(); this._keys[key] = false; }, { ...sig, passive: false });
        };
        wire("btn-left", "left");
        wire("btn-right", "right");

        // Swipe / tilt support on canvas
        let touchStartX = null;
        this._cv.addEventListener("touchstart", e => {
            touchStartX = e.touches[0].clientX;
        }, sig);
        this._cv.addEventListener("touchmove", e => {
            if (touchStartX !== null) {
                const dx = e.touches[0].clientX - touchStartX;
                this._keys.left = dx < -15;
                this._keys.right = dx > 15;
            }
        }, sig);
        this._cv.addEventListener("touchend", () => {
            touchStartX = null;
            this._keys.left = false;
            this._keys.right = false;
        }, sig);
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
        // Increase speed over time
        this._speed = Math.min(this._maxSpeed, this._speed + dt * 8);
        this._distance += this._speed * dt;
        this._score = Math.floor(this._distance / 10);

        // Time of day cycles
        this._timeOfDay = (this._timeOfDay + dt * 0.01) % 1;

        // Road curves
        this._curveTimer -= dt;
        if (this._curveTimer <= 0) {
            this._targetCurve = (Math.random() - 0.5) * 100;
            this._curveTimer = 2 + Math.random() * 4;
        }
        this._roadCurve += (this._targetCurve - this._roadCurve) * dt * 1.5;

        // Steering
        if (this._keys.left) this._playerX -= this._steerSpeed * dt;
        if (this._keys.right) this._playerX += this._steerSpeed * dt;

        // Road boundaries
        const roadLeft = RC_W / 2 - this._roadWidth / 2 + this._roadCurve * 0.3;
        const roadRight = RC_W / 2 + this._roadWidth / 2 + this._roadCurve * 0.3;
        const margin = 18;

        // Clamp to road with slight rumble if touching edge
        if (this._playerX - margin < roadLeft) {
            this._playerX = roadLeft + margin;
            // Rumble particles
            if (Math.random() < 0.5) this._spawnSparks(this._playerX - 10, RC_H - 55);
        }
        if (this._playerX + margin > roadRight) {
            this._playerX = roadRight - margin;
            if (Math.random() < 0.5) this._spawnSparks(this._playerX + 10, RC_H - 55);
        }

        // Exhaust particles
        if (Math.random() < 0.3) {
            this._particles.push({
                x: this._playerX - 4 + Math.random() * 8,
                y: RC_H - 20,
                vx: (Math.random() - 0.5) * 15,
                vy: 20 + Math.random() * 30,
                life: 0.4 + Math.random() * 0.3,
                size: 2 + Math.random() * 2,
                color: `rgba(180,180,180,`,
            });
        }

        // Traffic
        this._trafficTimer -= dt;
        if (this._trafficTimer <= 0) {
            this._traffic.push(this._makeTraffic());
            this._trafficTimer = this._trafficInterval * (0.6 + Math.random() * 0.8);
            // Speed up traffic spawning
            this._trafficInterval = Math.max(0.35, this._trafficInterval - 0.003);
        }

        const laneW = this._roadWidth / this._laneCount;
        for (const car of this._traffic) {
            car.y += (this._speed - car.speed) * dt;
            // Car X position based on lane + curve
            const curveFactor = (car.y / RC_H) * this._roadCurve * 0.3;
            car.screenX = roadLeft + laneW * (car.lane + 0.5) + curveFactor;

            // Collision with player
            const playerW = 24, playerH = 40;
            const playerY = RC_H - 65;
            if (car.y > playerY - car.h && car.y < playerY + playerH &&
                Math.abs(car.screenX - this._playerX) < (car.w / 2 + playerW / 2 - 4)) {
                this._crash();
                return;
            }
        }
        this._traffic = this._traffic.filter(c => c.y < RC_H + 80);

        // Coins
        this._coinTimer -= dt;
        if (this._coinTimer <= 0) {
            const count = 1 + Math.floor(Math.random() * 3);
            for (let i = 0; i < count; i++) {
                this._coins.push(this._makeCoin(-20 - i * 30));
            }
            this._coinTimer = 1.5 + Math.random() * 2;
        }

        for (const coin of this._coins) {
            coin.y += this._speed * dt;
            coin.phase += dt * 5;
            const curveFactor = (coin.y / RC_H) * this._roadCurve * 0.3;
            coin.screenX = roadLeft + laneW * (coin.lane + 0.5) + curveFactor;

            if (!coin.collected) {
                const playerY = RC_H - 65;
                if (coin.y > playerY - 15 && coin.y < playerY + 30 &&
                    Math.abs(coin.screenX - this._playerX) < 22) {
                    coin.collected = true;
                    this._coinCount++;
                    this._score += 50;
                    this._popups.push({ x: coin.screenX, y: coin.y, text: "+50", life: 0.8 });
                    // coin sparkle
                    for (let i = 0; i < 6; i++) {
                        this._particles.push({
                            x: coin.screenX, y: coin.y,
                            vx: (Math.random() - 0.5) * 80, vy: (Math.random() - 0.5) * 80,
                            life: 0.5, size: 2, color: "rgba(255,215,0,",
                        });
                    }
                }
            }
        }
        this._coins = this._coins.filter(c => c.y < RC_H + 40 && !c.collected);

        // Scenery scrolling
        for (const s of this._scenery) {
            s.y += this._speed * 0.7 * dt;
        }
        this._scenery = this._scenery.filter(s => s.y < RC_H + 60);
        while (this._scenery.length < 30) {
            this._scenery.push(this._makeScenery(-10 - Math.random() * 40));
        }

        // Particles
        for (const p of this._particles) {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
        }
        this._particles = this._particles.filter(p => p.life > 0);

        // Popups
        for (const p of this._popups) {
            p.y -= 40 * dt;
            p.life -= dt;
        }
        this._popups = this._popups.filter(p => p.life > 0);

        // Nitro flash decay
        if (this._nitroFlash > 0) this._nitroFlash -= dt;
    }

    _spawnSparks(x, y) {
        for (let i = 0; i < 3; i++) {
            this._particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 60,
                vy: 20 + Math.random() * 40,
                life: 0.3, size: 1.5, color: "rgba(255,200,50,",
            });
        }
    }

    _crash() {
        this._alive = false;
        cancelAnimationFrame(this._raf);

        // Explosion particles
        for (let i = 0; i < 30; i++) {
            this._particles.push({
                x: this._playerX, y: RC_H - 50,
                vx: (Math.random() - 0.5) * 200,
                vy: (Math.random() - 0.5) * 200,
                life: 1, size: 3 + Math.random() * 4,
                color: Math.random() < 0.5 ? "rgba(255,100,0," : "rgba(255,50,0,",
            });
        }

        // Animate explosion then fire event
        const animateCrash = () => {
            for (const p of this._particles) {
                p.x += p.vx * 0.016;
                p.y += p.vy * 0.016;
                p.vy += 200 * 0.016;
                p.life -= 0.016;
            }
            this._particles = this._particles.filter(p => p.life > 0);
            this._draw();
            if (this._particles.length > 0) {
                requestAnimationFrame(animateCrash);
            } else {
                setTimeout(() => {
                    this.dispatchEvent(new CustomEvent("game-over", {
                        bubbles: true,
                        detail: { score: this._score },
                    }));
                }, 500);
            }
        };
        this._draw();
        requestAnimationFrame(animateCrash);
    }

    // ── Drawing ──────────────────────────────────────────────────

    _draw() {
        const ctx = this._ctx;
        const now = performance.now();

        // Sky
        const skyTop = this._getSkyColor(0);
        const skyBot = this._getSkyColor(1);
        const skyGrad = ctx.createLinearGradient(0, 0, 0, RC_H * 0.45);
        skyGrad.addColorStop(0, skyTop);
        skyGrad.addColorStop(1, skyBot);
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, RC_W, RC_H * 0.45);

        // Horizon mountains
        this._drawMountains(ctx, now);

        // Grass
        const grassGrad = ctx.createLinearGradient(0, RC_H * 0.4, 0, RC_H);
        grassGrad.addColorStop(0, "#4a8c3f");
        grassGrad.addColorStop(1, "#2d6b25");
        ctx.fillStyle = grassGrad;
        ctx.fillRect(0, RC_H * 0.4, RC_W, RC_H * 0.6);

        // Grass stripes (speed lines)
        const stripePhase = (this._distance * 0.5) % 30;
        ctx.fillStyle = "#3d7a34";
        for (let y = RC_H * 0.45; y < RC_H; y += 30) {
            const sy = y + stripePhase;
            if (sy > RC_H * 0.4 && sy < RC_H) {
                ctx.fillRect(0, sy, RC_W, 2);
            }
        }

        // Road
        this._drawRoad(ctx, now);

        // Scenery (behind traffic)
        this._drawScenery(ctx);

        // Coins
        for (const coin of this._coins) {
            if (coin.collected) continue;
            const stretch = Math.abs(Math.cos(coin.phase));
            ctx.fillStyle = "#ffd700";
            ctx.beginPath();
            ctx.ellipse(coin.screenX, coin.y, 7 * Math.max(0.3, stretch), 7, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#ffed4a";
            ctx.beginPath();
            ctx.ellipse(coin.screenX, coin.y, 4 * Math.max(0.3, stretch), 4, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Traffic cars
        for (const car of this._traffic) {
            this._drawCar(ctx, car.screenX, car.y, car.w, car.h, car.color, car.isTruck, false);
        }

        // Player car
        if (this._alive) {
            this._drawPlayerCar(ctx, now);
        }

        // Particles
        for (const p of this._particles) {
            ctx.globalAlpha = Math.min(1, p.life * 3);
            ctx.fillStyle = p.color + Math.min(1, p.life * 3).toFixed(2) + ")";
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Popups
        ctx.font = "bold 12px 'Segoe UI',sans-serif";
        ctx.textAlign = "center";
        for (const p of this._popups) {
            ctx.globalAlpha = Math.min(1, p.life * 3);
            ctx.fillStyle = "#fff";
            ctx.strokeStyle = "#000";
            ctx.lineWidth = 2;
            ctx.strokeText(p.text, p.x, p.y);
            ctx.fillText(p.text, p.x, p.y);
        }
        ctx.globalAlpha = 1;

        // HUD
        this._drawHUD(ctx);

        // Game over overlay
        if (!this._alive) {
            ctx.fillStyle = "rgba(0,0,0,0.5)";
            ctx.fillRect(0, 0, RC_W, RC_H);
            ctx.fillStyle = "white";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.font = "bold 24px 'Segoe UI',sans-serif";
            ctx.fillText("Crash!", RC_W / 2, RC_H / 2 - 25);
            ctx.font = "16px 'Segoe UI',sans-serif";
            ctx.fillText("Punkte: " + this._score, RC_W / 2, RC_H / 2 + 10);
            ctx.font = "13px 'Segoe UI',sans-serif";
            ctx.fillText("Coins: " + this._coinCount + "  Distanz: " + Math.floor(this._distance) + "m", RC_W / 2, RC_H / 2 + 35);
        }
    }

    _getSkyColor(pos) {
        // Simple day sky
        return pos === 0 ? "#4488cc" : "#88bbee";
    }

    _drawMountains(ctx, now) {
        const scroll = (this._distance * 0.02) % 300;
        // Far mountains
        ctx.fillStyle = "#5a7a9a";
        ctx.beginPath();
        ctx.moveTo(0, RC_H * 0.45);
        for (let x = -20; x <= RC_W + 20; x += 5) {
            const h = 25 + Math.sin((x + scroll) * 0.015) * 20 + Math.sin((x + scroll) * 0.03) * 10;
            ctx.lineTo(x, RC_H * 0.45 - h);
        }
        ctx.lineTo(RC_W + 20, RC_H * 0.45);
        ctx.fill();

        // Near mountains
        ctx.fillStyle = "#4a6a4a";
        ctx.beginPath();
        ctx.moveTo(0, RC_H * 0.45);
        for (let x = -20; x <= RC_W + 20; x += 5) {
            const h = 15 + Math.sin((x + scroll * 2) * 0.02) * 15 + Math.sin((x + scroll * 2) * 0.05) * 8;
            ctx.lineTo(x, RC_H * 0.45 - h);
        }
        ctx.lineTo(RC_W + 20, RC_H * 0.45);
        ctx.fill();
    }

    _drawRoad(ctx, now) {
        const roadCX = RC_W / 2 + this._roadCurve * 0.3;
        const rw = this._roadWidth;
        const laneW = rw / this._laneCount;

        // Road surface
        const roadGrad = ctx.createLinearGradient(0, RC_H * 0.4, 0, RC_H);
        roadGrad.addColorStop(0, "#555");
        roadGrad.addColorStop(1, "#333");
        ctx.fillStyle = roadGrad;

        // Trapezoid road (perspective)
        const topW = rw * 0.3;
        const topY = RC_H * 0.42;
        const botY = RC_H;
        const curveFar = this._roadCurve * 0.8;
        ctx.beginPath();
        ctx.moveTo(roadCX - rw / 2, botY);
        ctx.lineTo(RC_W / 2 + curveFar - topW / 2, topY);
        ctx.lineTo(RC_W / 2 + curveFar + topW / 2, topY);
        ctx.lineTo(roadCX + rw / 2, botY);
        ctx.fill();

        // Road edge lines (white)
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(roadCX - rw / 2, botY);
        ctx.lineTo(RC_W / 2 + curveFar - topW / 2, topY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(roadCX + rw / 2, botY);
        ctx.lineTo(RC_W / 2 + curveFar + topW / 2, topY);
        ctx.stroke();

        // Lane dashes
        const dashPhase = (this._distance * 2) % 40;
        ctx.strokeStyle = "#ddd";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([12, 12]);
        ctx.lineDashOffset = -dashPhase;
        for (let l = 1; l < this._laneCount; l++) {
            const frac = l / this._laneCount;
            const bx = roadCX - rw / 2 + frac * rw;
            const tx = RC_W / 2 + curveFar - topW / 2 + frac * topW;
            ctx.beginPath();
            ctx.moveTo(bx, botY);
            ctx.lineTo(tx, topY);
            ctx.stroke();
        }
        ctx.setLineDash([]);

        // Road shoulder (red-white curbs)
        const curbPhase = (this._distance * 2) % 24;
        for (let side = -1; side <= 1; side += 2) {
            for (let y = RC_H; y > topY; y -= 12) {
                const t = (y - topY) / (botY - topY); // 0 at top, 1 at bottom
                const edgeX = roadCX + side * (rw / 2) * t + (1 - t) * side * (topW / 2) + (1 - t) * curveFar;
                const cw = 4 * t + 1;
                const idx = Math.floor((y + curbPhase) / 12) % 2;
                ctx.fillStyle = idx ? "#e03020" : "#fff";
                ctx.fillRect(edgeX - cw / 2, y - 6, cw, 6);
            }
        }
    }

    _drawScenery(ctx) {
        const roadCX = RC_W / 2 + this._roadCurve * 0.3;
        const rw = this._roadWidth;

        for (const s of this._scenery) {
            const side = s.side;
            const edgeX = roadCX + side * rw / 2;
            const sx = edgeX + side * s.x * 80;
            const sy = s.y;

            if (sy < RC_H * 0.4 || sy > RC_H + 20) continue;

            const scale = 0.4 + (sy - RC_H * 0.4) / (RC_H * 0.6) * 0.6;

            if (s.type === "tree") {
                // trunk
                ctx.fillStyle = "#5a3a1a";
                ctx.fillRect(sx - 2 * scale, sy - 25 * scale, 4 * scale, 25 * scale);
                // foliage
                ctx.fillStyle = "#2d8c2d";
                ctx.beginPath();
                ctx.arc(sx, sy - 28 * scale, 12 * scale, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = "#3aaa3a";
                ctx.beginPath();
                ctx.arc(sx - 4 * scale, sy - 24 * scale, 8 * scale, 0, Math.PI * 2);
                ctx.fill();
            } else if (s.type === "bush") {
                ctx.fillStyle = "#2d7a2d";
                ctx.beginPath();
                ctx.ellipse(sx, sy - 5 * scale, 10 * scale, 7 * scale, 0, 0, Math.PI * 2);
                ctx.fill();
            } else if (s.type === "rock") {
                ctx.fillStyle = "#888";
                ctx.beginPath();
                ctx.ellipse(sx, sy - 3 * scale, 8 * scale, 5 * scale, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = "#999";
                ctx.beginPath();
                ctx.ellipse(sx - 2 * scale, sy - 5 * scale, 5 * scale, 3 * scale, -0.3, 0, Math.PI * 2);
                ctx.fill();
            } else if (s.type === "sign") {
                ctx.fillStyle = "#888";
                ctx.fillRect(sx - 1, sy - 20 * scale, 2, 20 * scale);
                ctx.fillStyle = "#336699";
                ctx.fillRect(sx - 8 * scale, sy - 22 * scale, 16 * scale, 10 * scale);
                ctx.fillStyle = "#fff";
                ctx.font = `${Math.floor(6 * scale)}px sans-serif`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(Math.floor(this._distance / 100) + "km", sx, sy - 17 * scale);
            } else if (s.type === "building") {
                const bw = 20 * scale, bh = 35 * scale;
                ctx.fillStyle = "#8a8070";
                ctx.fillRect(sx - bw / 2, sy - bh, bw, bh);
                // windows
                ctx.fillStyle = "#ffe080";
                for (let wy = 0; wy < 3; wy++) {
                    for (let wx = 0; wx < 2; wx++) {
                        ctx.fillRect(
                            sx - bw / 2 + 3 * scale + wx * 8 * scale,
                            sy - bh + 4 * scale + wy * 10 * scale,
                            4 * scale, 5 * scale
                        );
                    }
                }
                // roof
                ctx.fillStyle = "#6a4a3a";
                ctx.beginPath();
                ctx.moveTo(sx - bw / 2 - 2, sy - bh);
                ctx.lineTo(sx, sy - bh - 8 * scale);
                ctx.lineTo(sx + bw / 2 + 2, sy - bh);
                ctx.fill();
            }
        }
    }

    _drawCar(ctx, x, y, w, h, color, isTruck, isPlayer) {
        // Shadow
        ctx.fillStyle = "rgba(0,0,0,0.2)";
        ctx.beginPath();
        ctx.ellipse(x, y + h / 2 + 2, w / 2 + 3, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        if (isTruck) {
            // Truck body
            ctx.fillStyle = color.body;
            ctx.beginPath();
            ctx.roundRect(x - w / 2, y - h / 2, w, h, 3);
            ctx.fill();
            // Cargo area
            ctx.fillStyle = color.roof;
            ctx.fillRect(x - w / 2 + 2, y - h / 2 + 5, w - 4, h * 0.55);
            // Cab
            ctx.fillStyle = color.stripe;
            ctx.fillRect(x - w / 2 + 4, y - h / 2 + 2, w - 8, 8);
            // Headlights
            ctx.fillStyle = "#ffee88";
            ctx.fillRect(x - w / 2 + 2, y + h / 2 - 4, 5, 3);
            ctx.fillRect(x + w / 2 - 7, y + h / 2 - 4, 5, 3);
        } else {
            // Car body
            ctx.fillStyle = color.body;
            ctx.beginPath();
            ctx.roundRect(x - w / 2, y - h / 2, w, h, 5);
            ctx.fill();
            // Roof / windshield
            ctx.fillStyle = color.roof;
            ctx.beginPath();
            ctx.roundRect(x - w / 2 + 3, y - h / 2 + 6, w - 6, h * 0.35, 3);
            ctx.fill();
            // Windshield (glass)
            ctx.fillStyle = "rgba(150,200,255,0.5)";
            ctx.beginPath();
            ctx.roundRect(x - w / 2 + 5, y - h / 2 + 4, w - 10, 8, 2);
            ctx.fill();
            // Rear window
            ctx.fillStyle = "rgba(150,200,255,0.3)";
            ctx.beginPath();
            ctx.roundRect(x - w / 2 + 5, y + h / 2 - 12, w - 10, 6, 2);
            ctx.fill();
            // Stripe
            ctx.fillStyle = color.stripe;
            ctx.fillRect(x - w / 2 + 2, y, w - 4, 2);
            // Headlights
            ctx.fillStyle = "#ffee88";
            ctx.beginPath();
            ctx.arc(x - w / 2 + 5, y + h / 2 - 2, 2.5, 0, Math.PI * 2);
            ctx.arc(x + w / 2 - 5, y + h / 2 - 2, 2.5, 0, Math.PI * 2);
            ctx.fill();
            // Tail lights
            ctx.fillStyle = "#ff3333";
            ctx.fillRect(x - w / 2 + 1, y - h / 2 + 1, 4, 3);
            ctx.fillRect(x + w / 2 - 5, y - h / 2 + 1, 4, 3);
        }
    }

    _drawPlayerCar(ctx, now) {
        const x = this._playerX;
        const y = RC_H - 50;
        const w = 28, h = 44;
        const tilt = ((this._keys.left ? -1 : 0) + (this._keys.right ? 1 : 0)) * 2;

        // Shadow
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        ctx.beginPath();
        ctx.ellipse(x, y + h / 2 + 4, w / 2 + 5, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Car body (sporty red)
        ctx.fillStyle = "#e03020";
        ctx.beginPath();
        ctx.roundRect(x - w / 2 + tilt, y - h / 2, w, h, 6);
        ctx.fill();

        // Hood highlight
        const hoodGrad = ctx.createLinearGradient(x - w / 2, y + h / 4, x + w / 2, y + h / 4);
        hoodGrad.addColorStop(0, "rgba(255,255,255,0.05)");
        hoodGrad.addColorStop(0.5, "rgba(255,255,255,0.15)");
        hoodGrad.addColorStop(1, "rgba(255,255,255,0.05)");
        ctx.fillStyle = hoodGrad;
        ctx.fillRect(x - w / 2 + 2 + tilt, y, w - 4, h / 2);

        // Roof
        ctx.fillStyle = "#c02818";
        ctx.beginPath();
        ctx.roundRect(x - w / 2 + 4 + tilt, y - h / 2 + 8, w - 8, h * 0.3, 3);
        ctx.fill();

        // Windshield
        ctx.fillStyle = "rgba(150,210,255,0.6)";
        ctx.beginPath();
        ctx.roundRect(x - w / 2 + 5 + tilt, y + h / 2 - 14, w - 10, 8, 2);
        ctx.fill();

        // Rear window
        ctx.fillStyle = "rgba(150,210,255,0.4)";
        ctx.beginPath();
        ctx.roundRect(x - w / 2 + 5 + tilt, y - h / 2 + 4, w - 10, 7, 2);
        ctx.fill();

        // Racing stripe
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        ctx.fillRect(x - 2 + tilt, y - h / 2, 4, h);

        // Headlights (bright)
        ctx.fillStyle = "#ffffcc";
        ctx.beginPath();
        ctx.ellipse(x - w / 2 + 5 + tilt, y + h / 2 - 2, 3, 2.5, 0, 0, Math.PI * 2);
        ctx.ellipse(x + w / 2 - 5 + tilt, y + h / 2 - 2, 3, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Headlight beams
        ctx.fillStyle = "rgba(255,255,200,0.06)";
        ctx.beginPath();
        ctx.moveTo(x - w / 2 + 3 + tilt, y + h / 2);
        ctx.lineTo(x - w / 2 - 8, y + h / 2 + 40);
        ctx.lineTo(x - w / 2 + 18, y + h / 2 + 40);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x + w / 2 - 3 + tilt, y + h / 2);
        ctx.lineTo(x + w / 2 - 18, y + h / 2 + 40);
        ctx.lineTo(x + w / 2 + 8, y + h / 2 + 40);
        ctx.fill();

        // Tail lights
        ctx.fillStyle = "#ff2222";
        ctx.fillRect(x - w / 2 + 1 + tilt, y - h / 2 + 1, 5, 3);
        ctx.fillRect(x + w / 2 - 6 + tilt, y - h / 2 + 1, 5, 3);

        // Wheels
        ctx.fillStyle = "#222";
        ctx.fillRect(x - w / 2 - 2 + tilt, y + h / 4, 3, 8);
        ctx.fillRect(x + w / 2 - 1 + tilt, y + h / 4, 3, 8);
        ctx.fillRect(x - w / 2 - 2 + tilt, y - h / 4 - 4, 3, 8);
        ctx.fillRect(x + w / 2 - 1 + tilt, y - h / 4 - 4, 3, 8);
    }

    _drawHUD(ctx) {
        // Speed gauge background
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.beginPath();
        ctx.roundRect(4, 4, 180, 28, 8);
        ctx.fill();

        ctx.fillStyle = "white";
        ctx.font = "bold 12px 'Segoe UI',sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";
        ctx.fillText("\uD83C\uDFC1 " + this._score + "   \uD83E\uDE99 " + this._coinCount + "   " + Math.floor(this._speed) + " km/h", 12, 22);

        // Speed bar
        const barW = 60, barH = 6;
        const barX = RC_W - barW - 10, barY = 10;
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.beginPath();
        ctx.roundRect(barX - 4, barY - 2, barW + 8, barH + 14, 6);
        ctx.fill();
        ctx.fillStyle = "#aaa";
        ctx.font = "bold 8px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("SPEED", barX + barW / 2, barY + 4);
        ctx.fillStyle = "rgba(255,255,255,0.2)";
        ctx.fillRect(barX, barY + 8, barW, barH);
        const speedPct = (this._speed - 180) / (this._maxSpeed - 180);
        const sColor = speedPct > 0.7 ? "#e03020" : speedPct > 0.4 ? "#f0c020" : "#30b030";
        ctx.fillStyle = sColor;
        ctx.fillRect(barX, barY + 8, barW * speedPct, barH);
    }
}

customElements.define("racing-game", RacingGame);
