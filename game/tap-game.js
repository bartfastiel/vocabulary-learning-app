// game/tap-game.js
// Ziel-Jagd: Tap targets before they vanish. They get smaller and faster.
// Fires CustomEvent("game-over", { bubbles:true, detail:{ score, pointsEarned } })

const W = 400, H = 300;

class TapGame extends HTMLElement {
    constructor() { super(); this.attachShadow({ mode: "open" }); }

    connectedCallback() {
        this.shadowRoot.innerHTML = `<style>
            :host{display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:#000}
            canvas{width:100%;height:100%;touch-action:none;cursor:crosshair}
        </style><canvas></canvas>`;
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
        this._score = 0;
        this._lives = 3;
        this._level = 1;
        this._targets = [];
        this._particles = [];
        this._combo = 0;
        this._spawnTimer = 0;
        this._gameOver = false;
        this._hitCount = 0;
    }

    _bind() {
        this._ctrl = new AbortController();
        const o = { signal: this._ctrl.signal };
        const c = this._canvas;
        const hit = (cx, cy) => {
            const r = c.getBoundingClientRect();
            const x = (cx - r.left) / r.width * W;
            const y = (cy - r.top) / r.height * H;
            this._checkHit(x, y);
        };
        c.addEventListener("mousedown", e => { e.preventDefault(); hit(e.clientX, e.clientY); }, o);
        c.addEventListener("touchstart", e => { e.preventDefault(); hit(e.touches[0].clientX, e.touches[0].clientY); }, o);
    }

    _checkHit(x, y) {
        if (this._gameOver) return;
        let hitAny = false;
        for (let i = this._targets.length - 1; i >= 0; i--) {
            const t = this._targets[i];
            const dx = x - t.x, dy = y - t.y;
            if (dx * dx + dy * dy < t.r * t.r) {
                // Hit!
                hitAny = true;
                this._hitCount++;
                this._combo++;
                const pts = Math.ceil(10 * this._level + this._combo * 3);
                this._score += pts;
                // Particles
                const col = t.color;
                for (let j = 0; j < 8; j++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = 40 + Math.random() * 80;
                    this._particles.push({
                        x: t.x, y: t.y,
                        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                        life: 0.5, color: col, size: 2 + Math.random() * 3,
                    });
                }
                // Popup
                this._particles.push({
                    x: t.x, y: t.y - 10, vx: 0, vy: -30,
                    life: 0.7, color: "#fff", size: 0, text: "+" + pts,
                });
                this._targets.splice(i, 1);
                // Level up every 8 hits
                this._level = Math.floor(this._hitCount / 8) + 1;
                break;
            }
        }
        if (!hitAny) {
            this._combo = 0;
        }
    }

    _loop(t) {
        const dt = Math.min((t - this._lastT) / 1000, 0.05);
        this._lastT = t;
        if (!this._gameOver) this._update(dt);
        this._draw();
        this._raf = requestAnimationFrame(t => this._loop(t));
    }

    _update(dt) {
        // Spawn targets
        const spawnRate = Math.max(0.3, 1.2 - this._level * 0.08);
        this._spawnTimer += dt;
        if (this._spawnTimer >= spawnRate) {
            this._spawnTimer = 0;
            this._spawnTarget();
        }

        // Update targets
        for (let i = this._targets.length - 1; i >= 0; i--) {
            const t = this._targets[i];
            t.life -= dt;
            t.x += t.vx * dt;
            t.y += t.vy * dt;
            if (t.life <= 0) {
                // Missed!
                this._targets.splice(i, 1);
                this._lives--;
                this._combo = 0;
                if (this._lives <= 0) { this._endGame(); return; }
                // Red flash particle
                for (let j = 0; j < 5; j++) {
                    this._particles.push({
                        x: t.x, y: t.y, vx: (Math.random()-0.5)*60, vy: (Math.random()-0.5)*60,
                        life: 0.3, color: "#e53e3e", size: 3,
                    });
                }
            }
        }

        // Update particles
        this._particles = this._particles.filter(p => {
            p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt;
            return p.life > 0;
        });
    }

    _spawnTarget() {
        const minR = Math.max(8, 25 - this._level * 1.5);
        const maxR = Math.max(12, 35 - this._level * 2);
        const r = minR + Math.random() * (maxR - minR);
        const lifeTime = Math.max(0.8, 2.5 - this._level * 0.15);
        const speed = this._level > 3 ? 10 + Math.random() * this._level * 5 : 0;
        const angle = Math.random() * Math.PI * 2;

        const hue = Math.random() * 360;
        const colors = ["#e53e3e","#dd6b20","#d69e2e","#38a169","#3182ce","#805ad5","#d53f8c"];

        // Special targets
        let type = "normal";
        if (this._level >= 4 && Math.random() < 0.15) type = "small"; // tiny fast target
        if (this._level >= 6 && Math.random() < 0.1) type = "moving"; // moving target

        const t = {
            x: r + Math.random() * (W - r * 2),
            y: r + 30 + Math.random() * (H - r * 2 - 40),
            r: type === "small" ? r * 0.5 : r,
            vx: type === "moving" ? Math.cos(angle) * speed * 2 : Math.cos(angle) * speed * 0.3,
            vy: type === "moving" ? Math.sin(angle) * speed * 2 : Math.sin(angle) * speed * 0.3,
            life: type === "small" ? lifeTime * 0.6 : lifeTime,
            maxLife: type === "small" ? lifeTime * 0.6 : lifeTime,
            color: colors[Math.floor(Math.random() * colors.length)],
            type,
        };
        this._targets.push(t);
    }

    _draw() {
        const ctx = this._ctx;
        const now = performance.now();

        // Background
        ctx.fillStyle = "#0a0a1a";
        ctx.fillRect(0, 0, W, H);

        // Grid lines
        ctx.strokeStyle = "rgba(255,255,255,0.03)";
        ctx.lineWidth = 1;
        for (let x = 0; x < W; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
        for (let y = 0; y < H; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

        // Targets
        for (const t of this._targets) {
            const pct = t.life / t.maxLife;
            ctx.save();
            ctx.globalAlpha = Math.min(1, pct * 3);

            // Outer ring (shrinks as time runs out)
            ctx.beginPath();
            ctx.arc(t.x, t.y, t.r * (0.5 + pct * 0.5), 0, Math.PI * 2);
            ctx.strokeStyle = t.color;
            ctx.lineWidth = 2 + (1 - pct) * 2;
            ctx.stroke();

            // Inner fill
            ctx.beginPath();
            ctx.arc(t.x, t.y, t.r * 0.4 * pct, 0, Math.PI * 2);
            ctx.fillStyle = t.color;
            ctx.fill();

            // Center dot
            ctx.beginPath();
            ctx.arc(t.x, t.y, 2, 0, Math.PI * 2);
            ctx.fillStyle = "white";
            ctx.fill();

            // Small target marker
            if (t.type === "small") {
                ctx.fillStyle = "#fbbf24";
                ctx.font = "bold 8px sans-serif";
                ctx.textAlign = "center";
                ctx.fillText("x2", t.x, t.y - t.r - 3);
            }

            ctx.restore();
        }

        // Particles
        for (const p of this._particles) {
            ctx.globalAlpha = Math.min(1, p.life * 3);
            if (p.text) {
                ctx.fillStyle = p.color;
                ctx.font = "bold 12px sans-serif";
                ctx.textAlign = "center";
                ctx.fillText(p.text, p.x, p.y);
            } else {
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1;

        // HUD
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.beginPath(); ctx.roundRect(5, 5, 130, 22, 6); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.font = "bold 12px sans-serif"; ctx.textAlign = "left";
        ctx.fillText(`\u2B50 ${this._score}  Lv.${this._level}`, 12, 20);

        // Lives
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.beginPath(); ctx.roundRect(W - 75, 5, 70, 22, 6); ctx.fill();
        ctx.fillStyle = "#e53e3e"; ctx.font = "bold 12px sans-serif"; ctx.textAlign = "right";
        ctx.fillText("\u2764".repeat(this._lives), W - 12, 20);

        // Combo
        if (this._combo >= 3) {
            ctx.fillStyle = "#fbbf24"; ctx.font = "bold 14px sans-serif"; ctx.textAlign = "center";
            ctx.fillText(`\uD83D\uDD25 ${this._combo}x Combo!`, W / 2, 22);
        }

        // Game over
        if (this._gameOver) {
            ctx.fillStyle = "rgba(0,0,0,0.75)";
            ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = "#fbbf24"; ctx.font = "bold 24px sans-serif"; ctx.textAlign = "center";
            ctx.fillText("Game Over!", W / 2, H / 2 - 20);
            ctx.fillStyle = "#fff"; ctx.font = "bold 16px sans-serif";
            ctx.fillText(`${this._score} Punkte | Level ${this._level}`, W / 2, H / 2 + 15);
        }
    }

    _endGame() {
        this._gameOver = true;
        setTimeout(() => {
            this.dispatchEvent(new CustomEvent("game-over", {
                bubbles: true, detail: { score: this._score, pointsEarned: 0 }
            }));
        }, 2500);
    }
}

customElements.define("tap-game", TapGame);
