// game/asteroids-game.js
// Weltraum Pilot: Asteroids-style. Rotate and thrust your ship, shoot asteroids.
// Fires CustomEvent("game-over", { bubbles: true, detail: { score, pointsEarned } })

const AS_W = 400, AS_H = 400;

class AsteroidsGame extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._controller = new AbortController();
        this._raf = null;
        this._lastFrame = 0;
        this._score = 0;
        this._alive = true;
        this._lives = 3;
        this._invincible = 0;
    }

    connectedCallback() {
        this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          width: 100%; height: 100%; background: #000;
          font-family: "Segoe UI", sans-serif; user-select: none;
        }
        canvas { display: block; max-height: 82vh; max-width: 95vw;
                 aspect-ratio: 1; touch-action: none; }
        #mobile-controls {
          display: none; margin-top: 0.5rem; gap: 0.6rem;
        }
        @media (pointer: coarse) {
          #mobile-controls { display: flex; }
        }
        .ctrl-btn {
          width: 50px; height: 50px; border-radius: 50%;
          background: rgba(255,255,255,0.12); border: 2px solid rgba(255,255,255,0.25);
          color: white; font-size: 1.3rem; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
        }
        .ctrl-btn:active { background: rgba(255,255,255,0.25); }
      </style>
      <canvas id="c" width="${AS_W}" height="${AS_H}"></canvas>
      <div id="mobile-controls">
        <button class="ctrl-btn" id="btn-ccw">↺</button>
        <button class="ctrl-btn" id="btn-thrust">🔥</button>
        <button class="ctrl-btn" id="btn-cw">↻</button>
        <button class="ctrl-btn" id="btn-fire">💥</button>
      </div>`;

        this._cv = this.shadowRoot.getElementById("c");
        this._ctx = this._cv.getContext("2d");
        this._init();
        this._bindInput();
        this._lastFrame = performance.now();
        this._loop();
    }

    disconnectedCallback() {
        cancelAnimationFrame(this._raf);
        this._controller.abort();
    }

    _init() {
        this._ship = { x: AS_W / 2, y: AS_H / 2, angle: -Math.PI / 2, vx: 0, vy: 0 };
        this._bullets = [];
        this._asteroids = [];
        this._keys = { left: false, right: false, up: false, fire: false };
        this._fireCooldown = 0;

        // initial asteroids
        for (let i = 0; i < 5; i++) {
            this._spawnAsteroid(3);
        }
    }

    _spawnAsteroid(size, x, y) {
        const r = size * 14;
        if (x === undefined) {
            do {
                x = Math.random() * AS_W;
                y = Math.random() * AS_H;
            } while (Math.hypot(x - this._ship.x, y - this._ship.y) < 80);
        }
        const speed = (1.5 + Math.random() * 1.5) * (4 - size);
        const angle = Math.random() * Math.PI * 2;
        // random polygon
        const verts = [];
        const n = 7 + Math.floor(Math.random() * 4);
        for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2;
            const dist = r * (0.7 + Math.random() * 0.3);
            verts.push({ x: Math.cos(a) * dist, y: Math.sin(a) * dist });
        }
        this._asteroids.push({
            x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
            r, size, verts,
        });
    }

    _bindInput() {
        const sig = { signal: this._controller.signal };

        document.addEventListener("keydown", e => {
            if (e.key === "ArrowLeft" || e.key === "a") this._keys.left = true;
            if (e.key === "ArrowRight" || e.key === "d") this._keys.right = true;
            if (e.key === "ArrowUp" || e.key === "w") this._keys.up = true;
            if (e.key === " " || e.key === "Enter") { e.preventDefault(); this._keys.fire = true; }
        }, sig);
        document.addEventListener("keyup", e => {
            if (e.key === "ArrowLeft" || e.key === "a") this._keys.left = false;
            if (e.key === "ArrowRight" || e.key === "d") this._keys.right = false;
            if (e.key === "ArrowUp" || e.key === "w") this._keys.up = false;
            if (e.key === " " || e.key === "Enter") this._keys.fire = false;
        }, sig);

        // mobile
        const wire = (id, key) => {
            const btn = this.shadowRoot.getElementById(id);
            btn.addEventListener("touchstart", e => { e.preventDefault(); this._keys[key] = true; }, { ...sig, passive: false });
            btn.addEventListener("touchend", e => { e.preventDefault(); this._keys[key] = false; }, { ...sig, passive: false });
        };
        wire("btn-ccw", "left"); wire("btn-cw", "right");
        wire("btn-thrust", "up"); wire("btn-fire", "fire");
    }

    _loop() {
        const now = performance.now();
        const dt = Math.min((now - this._lastFrame) / 1000, 0.04);
        this._lastFrame = now;
        if (this._alive) this._update(dt);
        this._draw();
        this._raf = requestAnimationFrame(() => this._loop());
    }

    _update(dt) {
        const s = this._ship;
        this._invincible -= dt;

        // rotate
        if (this._keys.left) s.angle -= 4 * dt;
        if (this._keys.right) s.angle += 4 * dt;

        // thrust
        if (this._keys.up) {
            s.vx += Math.cos(s.angle) * 200 * dt;
            s.vy += Math.sin(s.angle) * 200 * dt;
        }

        // drag
        s.vx *= 0.995; s.vy *= 0.995;
        s.x += s.vx * dt; s.y += s.vy * dt;

        // wrap
        if (s.x < 0) s.x = AS_W; if (s.x > AS_W) s.x = 0;
        if (s.y < 0) s.y = AS_H; if (s.y > AS_H) s.y = 0;

        // fire
        this._fireCooldown -= dt;
        if (this._keys.fire && this._fireCooldown <= 0) {
            this._fireCooldown = 0.2;
            this._bullets.push({
                x: s.x + Math.cos(s.angle) * 14,
                y: s.y + Math.sin(s.angle) * 14,
                vx: Math.cos(s.angle) * 300 + s.vx * 0.3,
                vy: Math.sin(s.angle) * 300 + s.vy * 0.3,
                life: 1.5,
            });
        }

        // bullets
        for (let i = this._bullets.length - 1; i >= 0; i--) {
            const b = this._bullets[i];
            b.x += b.vx * dt; b.y += b.vy * dt;
            b.life -= dt;
            if (b.x < 0) b.x = AS_W; if (b.x > AS_W) b.x = 0;
            if (b.y < 0) b.y = AS_H; if (b.y > AS_H) b.y = 0;
            if (b.life <= 0) { this._bullets.splice(i, 1); continue; }

            // hit asteroid
            for (let j = this._asteroids.length - 1; j >= 0; j--) {
                const a = this._asteroids[j];
                if (Math.hypot(b.x - a.x, b.y - a.y) < a.r) {
                    this._bullets.splice(i, 1);
                    this._score += (4 - a.size) * 10;
                    if (a.size > 1) {
                        this._spawnAsteroid(a.size - 1, a.x, a.y);
                        this._spawnAsteroid(a.size - 1, a.x, a.y);
                    }
                    this._asteroids.splice(j, 1);
                    break;
                }
            }
        }

        // asteroids movement
        for (const a of this._asteroids) {
            a.x += a.vx * dt; a.y += a.vy * dt;
            if (a.x < -a.r) a.x = AS_W + a.r; if (a.x > AS_W + a.r) a.x = -a.r;
            if (a.y < -a.r) a.y = AS_H + a.r; if (a.y > AS_H + a.r) a.y = -a.r;
        }

        // ship-asteroid collision
        if (this._invincible <= 0) {
            for (const a of this._asteroids) {
                if (Math.hypot(s.x - a.x, s.y - a.y) < a.r + 10) {
                    this._lives--;
                    if (this._lives <= 0) {
                        this._alive = false;
                        this._end();
                        return;
                    }
                    this._invincible = 2;
                    s.x = AS_W / 2; s.y = AS_H / 2; s.vx = 0; s.vy = 0;
                    break;
                }
            }
        }

        // spawn more if empty
        if (this._asteroids.length === 0) {
            for (let i = 0; i < 5 + Math.floor(this._score / 100); i++) {
                this._spawnAsteroid(3);
            }
        }
    }

    _draw() {
        const ctx = this._ctx, s = this._ship;
        ctx.fillStyle = "#0a0a1a";
        ctx.fillRect(0, 0, AS_W, AS_H);

        // stars
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        for (let i = 0; i < 50; i++) {
            ctx.fillRect((i * 97 + 13) % AS_W, (i * 53 + 7) % AS_H, 1.5, 1.5);
        }

        // asteroids
        ctx.strokeStyle = "#aaa";
        ctx.lineWidth = 1.5;
        for (const a of this._asteroids) {
            ctx.beginPath();
            ctx.moveTo(a.x + a.verts[0].x, a.y + a.verts[0].y);
            for (let i = 1; i < a.verts.length; i++) {
                ctx.lineTo(a.x + a.verts[i].x, a.y + a.verts[i].y);
            }
            ctx.closePath();
            ctx.stroke();
        }

        // bullets
        ctx.fillStyle = "#FFD600";
        for (const b of this._bullets) {
            ctx.beginPath(); ctx.arc(b.x, b.y, 2, 0, Math.PI * 2); ctx.fill();
        }

        // ship
        if (this._alive) {
            const blink = this._invincible > 0 && Math.floor(performance.now() / 100) % 2;
            if (!blink) {
                ctx.save();
                ctx.translate(s.x, s.y);
                ctx.rotate(s.angle);
                ctx.strokeStyle = "#4dd0e1";
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(14, 0);
                ctx.lineTo(-10, -8);
                ctx.lineTo(-6, 0);
                ctx.lineTo(-10, 8);
                ctx.closePath();
                ctx.stroke();
                // thrust flame
                if (this._keys.up) {
                    ctx.strokeStyle = "#FF6D00";
                    ctx.beginPath();
                    ctx.moveTo(-8, -4);
                    ctx.lineTo(-16 - Math.random() * 6, 0);
                    ctx.lineTo(-8, 4);
                    ctx.stroke();
                }
                ctx.restore();
            }
        }

        // HUD
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.beginPath(); ctx.roundRect(4, 4, 160, 26, 6); ctx.fill();
        ctx.fillStyle = "white"; ctx.font = "bold 13px 'Segoe UI',sans-serif";
        ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
        ctx.fillText(`⭐ ${this._score}   ❤️ ${this._lives}`, 12, 22);

        if (!this._alive) {
            ctx.fillStyle = "rgba(0,0,0,0.6)";
            ctx.fillRect(0, 0, AS_W, AS_H);
            ctx.fillStyle = "white"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.font = "bold 24px 'Segoe UI',sans-serif";
            ctx.fillText("💀 Game Over", AS_W / 2, AS_H / 2 - 10);
            ctx.font = "16px 'Segoe UI',sans-serif";
            ctx.fillText(`Punkte: ${this._score}`, AS_W / 2, AS_H / 2 + 16);
        }
    }

    _end() {
        setTimeout(() => {
            cancelAnimationFrame(this._raf);
            this.dispatchEvent(new CustomEvent("game-over", {
                bubbles: true, detail: { score: this._score, pointsEarned: 0 },
            }));
        }, 1500);
    }
}

customElements.define("asteroids-game", AsteroidsGame);
