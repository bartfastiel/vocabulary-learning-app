// game/snake-game.js
// Classic Snake. Arrow keys / WASD / swipe to steer. Eat apples, avoid walls and yourself.
// Fires CustomEvent("game-over", { bubbles: true, detail: { score, pointsEarned } })

const COLS = 20, ROWS = 20, CELL = 18;
const CW = COLS * CELL, CH = ROWS * CELL;
const TICK_MS = 140;

class SnakeGame extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._controller = new AbortController();
        this._tick = null;
    }

    connectedCallback() {
        this.shadowRoot.innerHTML = `
      <style>
        :host { display:flex; justify-content:center; align-items:center;
                width:100%; height:100%; background:#000; flex-direction:column;
                font-family:"Segoe UI",sans-serif; }
        canvas { display:block; max-height:80vh; max-width:92vw;
                 aspect-ratio:${CW}/${CH}; image-rendering:pixelated; touch-action:none; }
      </style>
      <canvas id="c" width="${CW}" height="${CH}"></canvas>`;

        this._cv  = this.shadowRoot.getElementById("c");
        this._ctx = this._cv.getContext("2d");
        this._init();
        this._bindInput();
        this._draw();   // show board before start
    }

    disconnectedCallback() {
        clearInterval(this._tick);
        this._controller.abort();
    }

    _init() {
        this._snake   = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
        this._dir     = { x: 1, y: 0 };
        this._nextDir = { x: 1, y: 0 };
        this._apple   = this._spawnApple();
        this._score   = 0;
        this._alive   = false;   // wait for first input
        this._dead    = false;
        this._bonusApple = null;
        this._bonusTimer  = 0;
    }

    _spawnApple() {
        let pos;
        do {
            pos = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
        } while (this._snake?.some(s => s.x === pos.x && s.y === pos.y));
        return pos;
    }

    _bindInput() {
        const sig = { signal: this._controller.signal };
        const dirMap = {
            ArrowUp:    { x: 0, y:-1 }, ArrowDown:  { x: 0, y: 1 },
            ArrowLeft:  { x:-1, y: 0 }, ArrowRight: { x: 1, y: 0 },
            w: { x: 0, y:-1 }, s: { x: 0, y: 1 },
            a: { x:-1, y: 0 }, d: { x: 1, y: 0 },
        };
        document.addEventListener("keydown", e => {
            if (dirMap[e.key]) {
                e.preventDefault();
                const d = dirMap[e.key];
                if (d.x !== -this._dir.x || d.y !== -this._dir.y) this._nextDir = d;
                if (!this._alive && !this._dead) this._startGame();
            }
        }, sig);

        // swipe
        let tx, ty;
        this._cv.addEventListener("touchstart", e => {
            tx = e.touches[0].clientX; ty = e.touches[0].clientY;
            if (!this._alive && !this._dead) this._startGame();
        }, { ...sig, passive: true });
        this._cv.addEventListener("touchend", e => {
            const dx = e.changedTouches[0].clientX - tx;
            const dy = e.changedTouches[0].clientY - ty;
            if (Math.abs(dx) > Math.abs(dy)) {
                const d = dx > 0 ? { x:1,y:0 } : { x:-1,y:0 };
                if (d.x !== -this._dir.x) this._nextDir = d;
            } else {
                const d = dy > 0 ? { x:0,y:1 } : { x:0,y:-1 };
                if (d.y !== -this._dir.y) this._nextDir = d;
            }
        }, { ...sig, passive: true });
    }

    _startGame() {
        this._alive = true;
        this._tick = setInterval(() => this._step(), TICK_MS);
    }

    _step() {
        if (!this._alive) return;
        this._dir = this._nextDir;
        const head = { x: this._snake[0].x + this._dir.x, y: this._snake[0].y + this._dir.y };

        // wall collision
        if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) { this._die(); return; }
        // self collision
        if (this._snake.some(s => s.x === head.x && s.y === head.y)) { this._die(); return; }

        this._snake.unshift(head);

        let ate = false;
        if (head.x === this._apple.x && head.y === this._apple.y) {
            this._score++;
            this._apple = this._spawnApple();
            ate = true;
            // spawn bonus apple every 5
            if (this._score % 5 === 0) {
                this._bonusApple = this._spawnApple();
                this._bonusTimer = 20; // lasts 20 ticks
            }
        }
        if (this._bonusApple && head.x === this._bonusApple.x && head.y === this._bonusApple.y) {
            this._score += 3;
            this._bonusApple = null;
            ate = true;
        }
        if (!ate) this._snake.pop();
        if (this._bonusApple) { this._bonusTimer--; if (this._bonusTimer <= 0) this._bonusApple = null; }

        this._draw();
    }

    _die() {
        clearInterval(this._tick);
        this._dead = true; this._alive = false;
        this._draw();
        setTimeout(() => {
            const pointsEarned = Math.min(15, this._score);
            this.dispatchEvent(new CustomEvent("game-over", {
                bubbles: true,
                detail: { score: this._score, pointsEarned },
            }));
        }, 900);
    }

    _draw() {
        const ctx = this._ctx;
        // background grid
        ctx.fillStyle = "#0a1628";
        ctx.fillRect(0, 0, CW, CH);
        ctx.strokeStyle = "rgba(255,255,255,0.04)";
        ctx.lineWidth = 0.5;
        for (let x = 0; x <= COLS; x++) { ctx.beginPath(); ctx.moveTo(x*CELL,0); ctx.lineTo(x*CELL,CH); ctx.stroke(); }
        for (let y = 0; y <= ROWS; y++) { ctx.beginPath(); ctx.moveTo(0,y*CELL); ctx.lineTo(CW,y*CELL); ctx.stroke(); }

        // snake
        this._snake.forEach((seg, i) => {
            const t = i / this._snake.length;
            const r = Math.round(50  + (1 - t) * 75);
            const g = Math.round(200 + (1 - t) * 55);
            const b = Math.round(50  + (1 - t) * 20);
            ctx.fillStyle = `rgb(${r},${g},${b})`;
            ctx.beginPath();
            ctx.roundRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2, i === 0 ? 5 : 3);
            ctx.fill();
        });
        // head eyes
        if (this._snake.length) {
            const h = this._snake[0];
            ctx.fillStyle = "white";
            const ex = h.x * CELL + CELL / 2;
            const ey = h.y * CELL + CELL / 2;
            ctx.beginPath(); ctx.arc(ex - 3, ey - 2, 2, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(ex + 3, ey - 2, 2, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = "#111";
            ctx.beginPath(); ctx.arc(ex - 2.5, ey - 2, 1, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(ex + 3.5, ey - 2, 1, 0, Math.PI*2); ctx.fill();
        }

        // apple
        ctx.font = `${CELL + 2}px sans-serif`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("🍎", this._apple.x * CELL + CELL/2, this._apple.y * CELL + CELL/2 + 1);

        // bonus apple
        if (this._bonusApple) {
            ctx.fillText("⭐", this._bonusApple.x * CELL + CELL/2, this._bonusApple.y * CELL + CELL/2 + 1);
        }

        // score
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.beginPath(); ctx.roundRect(4, 4, 110, 26, 6); ctx.fill();
        ctx.fillStyle = "white"; ctx.font = "bold 14px 'Segoe UI',sans-serif";
        ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
        ctx.fillText(`🍎 ${this._score}`, 12, 22);

        // "press key to start"
        if (!this._alive && !this._dead) {
            ctx.fillStyle = "rgba(0,0,0,0.6)";
            ctx.beginPath(); ctx.roundRect(CW/2-120, CH/2-22, 240, 44, 10); ctx.fill();
            ctx.fillStyle = "white"; ctx.font = "bold 16px 'Segoe UI',sans-serif";
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText("Taste drücken / Wischen ✋", CW/2, CH/2);
        }

        // death
        if (this._dead) {
            ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(0,0,CW,CH);
            ctx.fillStyle = "white"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.font = `bold ${CELL*2}px 'Segoe UI',sans-serif`;
            ctx.fillText("💀 Game Over", CW/2, CH/2 - 14);
            ctx.font = `${CELL}px 'Segoe UI',sans-serif`;
            ctx.fillText(`Score: ${this._score}`, CW/2, CH/2 + 18);
        }
    }
}

customElements.define("snake-game", SnakeGame);
