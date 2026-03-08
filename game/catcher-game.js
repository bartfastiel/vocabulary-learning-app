// game/catcher-game.js
// Catch falling stars ⭐ with a basket, avoid bombs 💣. 30 seconds, 3 lives.
// Fires CustomEvent("game-over", { bubbles: true, detail: { score, pointsEarned } })

const CW = 400, CH = 500;
const BASKET_W = 70, BASKET_H = 40;
const ITEM_R = 20;
const GOOD = ["⭐","🍀","💎","🌟","🎁"];
const BAD  = ["💣","☠️","🔥"];

class CatcherGame extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._raf = null;
        this._controller = new AbortController();
    }

    connectedCallback() {
        this.shadowRoot.innerHTML = `
      <style>
        :host { display:flex; justify-content:center; align-items:center;
                width:100%; height:100%; background:#000; }
        canvas { display:block; max-height:85vh; max-width:92vw;
                 aspect-ratio:${CW}/${CH}; touch-action:none; }
      </style>
      <canvas id="c" width="${CW}" height="${CH}"></canvas>`;

        this._cv  = this.shadowRoot.getElementById("c");
        this._ctx = this._cv.getContext("2d");
        this._init();
        this._bindInput();
        this._loop();
    }

    disconnectedCallback() {
        cancelAnimationFrame(this._raf);
        clearInterval(this._timerInterval);
        this._controller.abort();
    }

    _init() {
        this._basketX = CW / 2 - BASKET_W / 2;
        this._items   = [];
        this._score   = 0;
        this._lives   = 3;
        this._timeLeft = 30;
        this._frame   = 0;
        this._dead    = false;
        this._ended   = false;
        this._particles = [];
        this._timerInterval = setInterval(() => {
            if (this._dead) return;
            this._timeLeft--;
            if (this._timeLeft <= 0) this._end();
        }, 1000);
    }

    _bindInput() {
        const sig = { signal: this._controller.signal };
        // mouse
        this._cv.addEventListener("mousemove", e => {
            const r  = this._cv.getBoundingClientRect();
            const mx = (e.clientX - r.left) * (CW / r.width);
            this._basketX = Math.max(0, Math.min(CW - BASKET_W, mx - BASKET_W / 2));
        }, sig);
        // touch
        this._cv.addEventListener("touchmove", e => {
            e.preventDefault();
            const r  = this._cv.getBoundingClientRect();
            const mx = (e.touches[0].clientX - r.left) * (CW / r.width);
            this._basketX = Math.max(0, Math.min(CW - BASKET_W, mx - BASKET_W / 2));
        }, { ...sig, passive: false });
        // arrow keys
        document.addEventListener("keydown", e => {
            if (e.key === "ArrowLeft")  this._basketX = Math.max(0, this._basketX - 24);
            if (e.key === "ArrowRight") this._basketX = Math.min(CW - BASKET_W, this._basketX + 24);
        }, sig);
    }

    _spawnItem() {
        const isGood = Math.random() < 0.72;
        const emojis = isGood ? GOOD : BAD;
        this._items.push({
            x:    20 + Math.random() * (CW - 40),
            y:    -ITEM_R,
            vy:   2.8 + Math.random() * 1.8,
            emoji: emojis[Math.floor(Math.random() * emojis.length)],
            good: isGood,
        });
    }

    _update() {
        if (this._dead) return;
        this._frame++;
        if (this._frame % 45 === 0) this._spawnItem();

        const basketY = CH - BASKET_H - 14;
        for (let i = this._items.length - 1; i >= 0; i--) {
            const it = this._items[i];
            it.y += it.vy;

            // catch check
            if (it.y + ITEM_R >= basketY &&
                it.x >= this._basketX - ITEM_R &&
                it.x <= this._basketX + BASKET_W + ITEM_R) {
                this._items.splice(i, 1);
                if (it.good) {
                    this._score++;
                    this._burst(it.x, it.y, "#FFD700");
                } else {
                    this._lives--;
                    this._burst(it.x, it.y, "#FF5252");
                    if (this._lives <= 0) { this._end(); return; }
                }
                continue;
            }
            // fell off
            if (it.y - ITEM_R > CH) {
                this._items.splice(i, 1);
                if (it.good) {
                    this._lives--;
                    if (this._lives <= 0) { this._end(); return; }
                }
            }
        }

        // particles
        for (let i = this._particles.length - 1; i >= 0; i--) {
            const p = this._particles[i];
            p.x += p.vx; p.y += p.vy; p.life--;
            if (p.life <= 0) this._particles.splice(i, 1);
        }
    }

    _burst(x, y, color) {
        for (let i = 0; i < 12; i++) {
            const a = (i / 12) * Math.PI * 2;
            this._particles.push({
                x, y,
                vx: Math.cos(a) * (2 + Math.random() * 3),
                vy: Math.sin(a) * (2 + Math.random() * 3) - 1,
                life: 20, color,
            });
        }
    }

    _end() {
        if (this._ended) return;
        this._ended = true;
        this._dead  = true;
        clearInterval(this._timerInterval);
        setTimeout(() => {
            const pointsEarned = Math.min(10, Math.floor(this._score / 3));
            this.dispatchEvent(new CustomEvent("game-over", {
                bubbles: true,
                detail: { score: this._score, pointsEarned },
            }));
        }, 900);
    }

    _draw() {
        const ctx = this._ctx;
        // bg gradient — night sky
        const bg = ctx.createLinearGradient(0, 0, 0, CH);
        bg.addColorStop(0, "#0a0a2e"); bg.addColorStop(1, "#1a1060");
        ctx.fillStyle = bg; ctx.fillRect(0, 0, CW, CH);

        // twinkling stars background
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        [[30,40],[80,80],[150,20],[220,60],[300,35],[360,90],[50,140],[180,110]].forEach(([x,y]) => {
            const r = 0.5 + ((this._frame * 0.07 + x) % 1) * 1;
            ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
        });

        // particles
        for (const p of this._particles) {
            ctx.globalAlpha = p.life / 20;
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI*2); ctx.fill();
        }
        ctx.globalAlpha = 1;

        // items
        ctx.font = `${ITEM_R * 2}px sans-serif`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        for (const it of this._items) ctx.fillText(it.emoji, it.x, it.y);

        // basket
        const basketY = CH - BASKET_H - 14;
        const bx = this._basketX;
        ctx.fillStyle = "#8D6E63";
        ctx.beginPath();
        ctx.moveTo(bx, basketY);
        ctx.lineTo(bx + BASKET_W, basketY);
        ctx.lineTo(bx + BASKET_W - 8, basketY + BASKET_H);
        ctx.lineTo(bx + 8, basketY + BASKET_H);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#A1887F";
        ctx.beginPath(); ctx.roundRect(bx - 4, basketY - 6, BASKET_W + 8, 12, 4); ctx.fill();

        // HUD
        ctx.fillStyle = "white"; ctx.font = "bold 18px 'Segoe UI',sans-serif";
        ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
        ctx.fillText(`⭐ ${this._score}`, 10, 30);
        ctx.textAlign = "center";
        ctx.fillText(`⏱ ${this._timeLeft}s`, CW/2, 30);
        ctx.textAlign = "right";
        ctx.fillText("❤️".repeat(Math.max(0, this._lives)), CW - 8, 30);

        if (this._dead) {
            ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(0,0,CW,CH);
            ctx.fillStyle = "white"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.font = "bold 38px 'Segoe UI',sans-serif";
            ctx.fillText(this._lives <= 0 ? "💥 Verloren!" : "⏱ Zeit ist um!", CW/2, CH/2 - 14);
            ctx.font = "22px 'Segoe UI',sans-serif";
            ctx.fillText(`Gefangen: ${this._score}`, CW/2, CH/2 + 22);
        }
    }

    _loop() {
        this._update();
        this._draw();
        if (!this._ended) this._raf = requestAnimationFrame(() => this._loop());
    }
}

customElements.define("catcher-game", CatcherGame);
