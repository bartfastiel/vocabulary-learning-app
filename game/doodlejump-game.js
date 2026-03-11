// game/doodlejump-game.js
// Hoch Springer: Doodle Jump style - bounce upwards on platforms, go as high as possible.
// Fires CustomEvent("game-over", { bubbles: true, detail: { score, pointsEarned } })

const DJ_W = 300, DJ_H = 450;

class DoodleJumpGame extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._controller = new AbortController();
        this._raf = null;
        this._lastFrame = 0;
    }

    connectedCallback() {
        this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          width: 100%; height: 100%; background: #000;
          font-family: "Segoe UI", sans-serif; user-select: none;
        }
        canvas { display: block; max-height: 84vh; max-width: 95vw;
                 aspect-ratio: ${DJ_W}/${DJ_H}; touch-action: none; }
      </style>
      <canvas id="c" width="${DJ_W}" height="${DJ_H}"></canvas>`;

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
        this._px = DJ_W / 2 - 15;
        this._py = DJ_H - 80;
        this._pvx = 0;
        this._pvy = 0;
        this._pw = 30;
        this._ph = 30;
        this._score = 0;
        this._maxHeight = 0;
        this._alive = true;
        this._facingRight = true;

        // generate initial platforms
        this._platforms = [];
        for (let i = 0; i < 8; i++) {
            this._platforms.push({
                x: Math.random() * (DJ_W - 60),
                y: DJ_H - 60 - i * 55,
                w: 60, type: "normal",
            });
        }
        // ensure a platform under player
        this._platforms[0].x = this._px - 15;
        this._platforms[0].y = this._py + this._ph + 5;

        this._camY = 0;
    }

    _bindInput() {
        const sig = { signal: this._controller.signal };

        document.addEventListener("keydown", e => {
            if (e.key === "ArrowLeft" || e.key === "a") { this._pvx = -200; this._facingRight = false; }
            if (e.key === "ArrowRight" || e.key === "d") { this._pvx = 200; this._facingRight = true; }
        }, sig);
        document.addEventListener("keyup", e => {
            if ((e.key === "ArrowLeft" || e.key === "a") && this._pvx < 0) this._pvx = 0;
            if ((e.key === "ArrowRight" || e.key === "d") && this._pvx > 0) this._pvx = 0;
        }, sig);

        // tilt / touch
        this._touchX = null;
        this._cv.addEventListener("touchstart", e => {
            const r = this._cv.getBoundingClientRect();
            this._touchX = ((e.touches[0].clientX - r.left) / r.width) * DJ_W;
        }, { ...sig, passive: true });
        this._cv.addEventListener("touchmove", e => {
            const r = this._cv.getBoundingClientRect();
            this._touchX = ((e.touches[0].clientX - r.left) / r.width) * DJ_W;
        }, { ...sig, passive: true });
        this._cv.addEventListener("touchend", () => { this._touchX = null; }, { ...sig, passive: true });
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
        // touch input
        if (this._touchX !== null) {
            const center = this._px + this._pw / 2;
            if (this._touchX < center - 15) { this._pvx = -200; this._facingRight = false; }
            else if (this._touchX > center + 15) { this._pvx = 200; this._facingRight = true; }
            else this._pvx = 0;
        }

        // gravity
        this._pvy += 800 * dt;
        this._px += this._pvx * dt;
        this._py += this._pvy * dt;

        // wrap horizontally
        if (this._px + this._pw < 0) this._px = DJ_W;
        if (this._px > DJ_W) this._px = -this._pw;

        // platform collision (only when falling)
        if (this._pvy > 0) {
            for (const p of this._platforms) {
                const relY = p.y - this._camY;
                if (this._px + this._pw > p.x && this._px < p.x + p.w &&
                    this._py + this._ph > relY && this._py + this._ph < relY + 12 &&
                    this._pvy > 0) {
                    if (p.type === "break") {
                        p.broken = true;
                    } else {
                        this._pvy = -450;
                        if (p.type === "spring") this._pvy = -650;
                    }
                }
            }
        }

        // scroll camera up
        const screenY = this._py;
        if (screenY < DJ_H * 0.35) {
            const shift = DJ_H * 0.35 - screenY;
            this._camY -= shift;
            this._py += shift;

            const heightGained = Math.floor(-this._camY / 10);
            if (heightGained > this._score) this._score = heightGained;
        }

        // generate new platforms above
        const topWorld = this._camY;
        const highestPlatY = Math.min(...this._platforms.map(p => p.y));
        if (highestPlatY > topWorld - 100) {
            const gap = 40 + Math.random() * 30;
            const types = ["normal", "normal", "normal", "normal", "spring", "break"];
            this._platforms.push({
                x: Math.random() * (DJ_W - 60),
                y: highestPlatY - gap,
                w: 50 + Math.random() * 20,
                type: types[Math.floor(Math.random() * types.length)],
            });
        }

        // remove platforms far below
        this._platforms = this._platforms.filter(p => p.y - this._camY < DJ_H + 50 && !p.broken);

        // fell off bottom
        if (this._py > DJ_H + 50) {
            this._alive = false;
            this._end();
        }
    }

    _draw() {
        const ctx = this._ctx;

        // background
        const bg = ctx.createLinearGradient(0, 0, 0, DJ_H);
        bg.addColorStop(0, "#e8f5e9");
        bg.addColorStop(1, "#c8e6c9");
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, DJ_W, DJ_H);

        // grid lines
        ctx.strokeStyle = "rgba(0,0,0,0.04)";
        ctx.lineWidth = 1;
        for (let y = 0; y < DJ_H; y += 30) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(DJ_W, y); ctx.stroke();
        }

        // platforms
        for (const p of this._platforms) {
            const py = p.y - this._camY;
            if (py < -20 || py > DJ_H + 20) continue;

            if (p.type === "normal") {
                ctx.fillStyle = "#4CAF50";
                ctx.beginPath(); ctx.roundRect(p.x, py, p.w, 10, 4); ctx.fill();
            } else if (p.type === "spring") {
                ctx.fillStyle = "#FF9800";
                ctx.beginPath(); ctx.roundRect(p.x, py, p.w, 10, 4); ctx.fill();
                ctx.fillStyle = "#F44336";
                ctx.beginPath(); ctx.roundRect(p.x + p.w / 2 - 5, py - 6, 10, 8, 2); ctx.fill();
            } else if (p.type === "break") {
                ctx.fillStyle = "#8D6E63";
                ctx.setLineDash([4, 3]);
                ctx.strokeStyle = "#5D4037";
                ctx.lineWidth = 1;
                ctx.beginPath(); ctx.roundRect(p.x, py, p.w, 10, 4); ctx.fill(); ctx.stroke();
                ctx.setLineDash([]);
            }
        }

        // player (doodle character)
        const px = this._px, ppY = this._py;
        // body
        ctx.fillStyle = "#FFE082";
        ctx.beginPath();
        ctx.roundRect(px + 4, ppY + 6, this._pw - 8, this._ph - 10, 6);
        ctx.fill();
        // head
        ctx.fillStyle = "#FFE082";
        ctx.beginPath();
        ctx.arc(px + this._pw / 2, ppY + 4, 10, 0, Math.PI * 2);
        ctx.fill();
        // eyes
        ctx.fillStyle = "#333";
        const eo = this._facingRight ? 3 : -3;
        ctx.beginPath(); ctx.arc(px + this._pw / 2 + eo, ppY + 2, 2.5, 0, Math.PI * 2); ctx.fill();
        // nose
        ctx.fillStyle = "#FF8A65";
        ctx.beginPath();
        ctx.arc(px + this._pw / 2 + (this._facingRight ? 6 : -6), ppY + 6, 2, 0, Math.PI * 2);
        ctx.fill();
        // legs
        ctx.fillStyle = "#FFE082";
        ctx.fillRect(px + 6, ppY + this._ph - 6, 6, 8);
        ctx.fillRect(px + this._pw - 12, ppY + this._ph - 6, 6, 8);
        // feet
        ctx.fillStyle = "#8D6E63";
        ctx.fillRect(px + 4, ppY + this._ph + 1, 9, 4);
        ctx.fillRect(px + this._pw - 13, ppY + this._ph + 1, 9, 4);

        // HUD
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.beginPath(); ctx.roundRect(4, 4, 100, 26, 6); ctx.fill();
        ctx.fillStyle = "white"; ctx.font = "bold 14px 'Segoe UI',sans-serif";
        ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
        ctx.fillText(`⬆ ${this._score} m`, 12, 22);
    }

    _end() {
        cancelAnimationFrame(this._raf);
        // death overlay
        const ctx = this._ctx;
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(0, 0, DJ_W, DJ_H);
        ctx.fillStyle = "white"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.font = "bold 22px 'Segoe UI',sans-serif";
        ctx.fillText("💀 Abgestürzt!", DJ_W / 2, DJ_H / 2 - 10);
        ctx.font = "16px 'Segoe UI',sans-serif";
        ctx.fillText(`Höhe: ${this._score} m`, DJ_W / 2, DJ_H / 2 + 16);

        setTimeout(() => {
            this.dispatchEvent(new CustomEvent("game-over", {
                bubbles: true, detail: { score: this._score, pointsEarned: 0 },
            }));
        }, 1000);
    }
}

customElements.define("doodlejump-game", DoodleJumpGame);
