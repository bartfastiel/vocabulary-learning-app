// game/pacman-game.js
// Punktefresser: Pac-Man style maze game. Eat all dots, avoid ghosts.
// Fires CustomEvent("game-over", { bubbles: true, detail: { score, pointsEarned } })

const PM_CELL = 20;
const PM_MAP = [
    "#####################",
    "#.........#.........#",
    "#.###.###.#.###.###.#",
    "#.#...#.......#...#.#",
    "#.#.#.#.#####.#.#.#.#",
    "#...#.....#.....#...#",
    "###.#####.#.#####.###",
    "#.........P.........#",
    "#.###.#.#####.#.###.#",
    "#.#...#...#...#...#.#",
    "#.#.#####.#.#####.#.#",
    "#...#.....#.....#...#",
    "#.###.###.#.###.###.#",
    "#.........#.........#",
    "#####################",
];

const PM_W = PM_MAP[0].length * PM_CELL;
const PM_H = PM_MAP.length * PM_CELL;

const GHOST_COLORS = ["#FF1744", "#E040FB", "#00BCD4", "#FF9100"];

class PacmanGame extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._controller = new AbortController();
        this._raf = null;
        this._score = 0;
        this._alive = true;
        this._lastFrame = 0;
        this._mouthAngle = 0;
        this._mouthDir = 1;
    }

    connectedCallback() {
        this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          width: 100%; height: 100%; background: #000;
          font-family: "Segoe UI", sans-serif;
        }
        canvas { display: block; max-height: 82vh; max-width: 95vw;
                 aspect-ratio: ${PM_W}/${PM_H}; touch-action: none; }
      </style>
      <canvas id="c" width="${PM_W}" height="${PM_H}"></canvas>`;

        this._cv = this.shadowRoot.getElementById("c");
        this._ctx = this._cv.getContext("2d");
        this._initGame();
        this._bindInput();
        this._lastFrame = performance.now();
        this._loop();
    }

    disconnectedCallback() {
        cancelAnimationFrame(this._raf);
        this._controller.abort();
    }

    _initGame() {
        this._dots = [];
        this._walls = [];
        this._px = 0; this._py = 0;
        this._dir = { x: 0, y: 0 };
        this._nextDir = { x: 0, y: 0 };
        this._totalDots = 0;

        for (let r = 0; r < PM_MAP.length; r++) {
            for (let c = 0; c < PM_MAP[r].length; c++) {
                const ch = PM_MAP[r][c];
                if (ch === "#") this._walls.push({ x: c, y: r });
                if (ch === "." || ch === "P") {
                    this._dots.push({ x: c, y: r, eaten: false });
                    this._totalDots++;
                }
                if (ch === "P") { this._px = c; this._py = r; }
            }
        }

        // ghosts
        this._ghosts = GHOST_COLORS.map((color, i) => ({
            x: 9 + (i % 2) * 2, y: 5 + Math.floor(i / 2) * 2,
            color, dir: { x: 0, y: 0 },
            moveTimer: 0,
        }));

        this._moveTimer = 0;
        this._ghostSpeed = 0.18;
    }

    _isWall(x, y) {
        return x < 0 || y < 0 || y >= PM_MAP.length || x >= PM_MAP[0].length || PM_MAP[y][x] === "#";
    }

    _bindInput() {
        const sig = { signal: this._controller.signal };
        const dirs = {
            ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 },
            ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
            w: { x: 0, y: -1 }, s: { x: 0, y: 1 },
            a: { x: -1, y: 0 }, d: { x: 1, y: 0 },
        };
        document.addEventListener("keydown", e => {
            if (dirs[e.key]) { e.preventDefault(); this._nextDir = dirs[e.key]; }
        }, sig);

        let tx, ty;
        this._cv.addEventListener("touchstart", e => {
            tx = e.touches[0].clientX; ty = e.touches[0].clientY;
        }, { ...sig, passive: true });
        this._cv.addEventListener("touchend", e => {
            const dx = e.changedTouches[0].clientX - tx;
            const dy = e.changedTouches[0].clientY - ty;
            if (Math.abs(dx) > Math.abs(dy)) this._nextDir = dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 };
            else this._nextDir = dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 };
        }, { ...sig, passive: true });
    }

    _loop() {
        if (!this._alive) return;
        const now = performance.now();
        const dt = Math.min((now - this._lastFrame) / 1000, 0.05);
        this._lastFrame = now;
        this._update(dt);
        this._draw();
        this._raf = requestAnimationFrame(() => this._loop());
    }

    _update(dt) {
        // mouth animation
        this._mouthAngle += this._mouthDir * dt * 8;
        if (this._mouthAngle > 0.8) this._mouthDir = -1;
        if (this._mouthAngle < 0.05) this._mouthDir = 1;

        // player movement (grid-based)
        this._moveTimer += dt;
        if (this._moveTimer >= 0.15) {
            this._moveTimer = 0;
            // try next direction first
            const nx = this._px + this._nextDir.x;
            const ny = this._py + this._nextDir.y;
            if (!this._isWall(nx, ny)) {
                this._dir = { ...this._nextDir };
            }
            const mx = this._px + this._dir.x;
            const my = this._py + this._dir.y;
            if (!this._isWall(mx, my)) {
                this._px = mx;
                this._py = my;
            }

            // eat dot
            const dot = this._dots.find(d => d.x === this._px && d.y === this._py && !d.eaten);
            if (dot) { dot.eaten = true; this._score++; }

            // win check
            if (this._score >= this._totalDots) {
                this._end();
                return;
            }
        }

        // ghost movement
        for (const g of this._ghosts) {
            g.moveTimer += dt;
            if (g.moveTimer >= this._ghostSpeed) {
                g.moveTimer = 0;
                this._moveGhost(g);
            }
            if (g.x === this._px && g.y === this._py) {
                this._alive = false;
                this._endDeath();
                return;
            }
        }
    }

    _moveGhost(g) {
        // simple chase AI: prefer direction toward player, random otherwise
        const possibleDirs = [
            { x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 },
        ].filter(d => {
            const nx = g.x + d.x, ny = g.y + d.y;
            return !this._isWall(nx, ny) && !(d.x === -g.dir.x && d.y === -g.dir.y);
        });

        if (possibleDirs.length === 0) {
            // reverse if stuck
            if (!this._isWall(g.x - g.dir.x, g.y - g.dir.y)) {
                g.dir = { x: -g.dir.x, y: -g.dir.y };
                g.x += g.dir.x; g.y += g.dir.y;
            }
            return;
        }

        // 60% chance to chase, 40% random
        if (Math.random() < 0.6) {
            possibleDirs.sort((a, b) => {
                const da = Math.abs(g.x + a.x - this._px) + Math.abs(g.y + a.y - this._py);
                const db = Math.abs(g.x + b.x - this._px) + Math.abs(g.y + b.y - this._py);
                return da - db;
            });
        } else {
            for (let i = possibleDirs.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [possibleDirs[i], possibleDirs[j]] = [possibleDirs[j], possibleDirs[i]];
            }
        }

        g.dir = possibleDirs[0];
        g.x += g.dir.x;
        g.y += g.dir.y;
    }

    _draw() {
        const ctx = this._ctx, c = PM_CELL;
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, PM_W, PM_H);

        // walls
        ctx.fillStyle = "#1a237e";
        ctx.strokeStyle = "#304FFE";
        ctx.lineWidth = 2;
        for (const w of this._walls) {
            ctx.fillRect(w.x * c, w.y * c, c, c);
            ctx.strokeRect(w.x * c + 1, w.y * c + 1, c - 2, c - 2);
        }

        // dots
        for (const d of this._dots) {
            if (d.eaten) continue;
            ctx.fillStyle = "#FFEB3B";
            ctx.beginPath();
            ctx.arc(d.x * c + c / 2, d.y * c + c / 2, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // player (pac-man)
        const angle = this._mouthAngle;
        let startAngle = angle;
        if (this._dir.x === -1) startAngle = Math.PI + angle;
        else if (this._dir.y === -1) startAngle = -Math.PI / 2 + angle;
        else if (this._dir.y === 1) startAngle = Math.PI / 2 + angle;

        ctx.fillStyle = "#FFD600";
        ctx.beginPath();
        ctx.arc(this._px * c + c / 2, this._py * c + c / 2, c / 2 - 2,
            startAngle, startAngle + Math.PI * 2 - angle * 2);
        ctx.lineTo(this._px * c + c / 2, this._py * c + c / 2);
        ctx.fill();

        // ghosts
        for (const g of this._ghosts) {
            const gx = g.x * c + c / 2, gy = g.y * c + c / 2;
            ctx.fillStyle = g.color;
            ctx.beginPath();
            ctx.arc(gx, gy - 2, c / 2 - 2, Math.PI, 0);
            ctx.lineTo(gx + c / 2 - 2, gy + c / 2 - 2);
            // wavy bottom
            for (let i = 0; i < 3; i++) {
                const wx = gx + c / 2 - 2 - (i + 1) * ((c - 4) / 3);
                ctx.lineTo(wx + (c - 4) / 6, gy + c / 2 - 6);
                ctx.lineTo(wx, gy + c / 2 - 2);
            }
            ctx.fill();
            // eyes
            ctx.fillStyle = "white";
            ctx.beginPath(); ctx.arc(gx - 3, gy - 3, 3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(gx + 3, gy - 3, 3, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#111";
            ctx.beginPath(); ctx.arc(gx - 2, gy - 3, 1.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(gx + 4, gy - 3, 1.5, 0, Math.PI * 2); ctx.fill();
        }

        // HUD
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.beginPath(); ctx.roundRect(4, 4, 120, 22, 5); ctx.fill();
        ctx.fillStyle = "white"; ctx.font = "bold 12px 'Segoe UI',sans-serif";
        ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
        ctx.fillText(`🟡 ${this._score} / ${this._totalDots}`, 10, 20);
    }

    _end() {
        this._alive = false;
        cancelAnimationFrame(this._raf);
        setTimeout(() => {
            this.dispatchEvent(new CustomEvent("game-over", {
                bubbles: true, detail: { score: this._score, pointsEarned: 0 },
            }));
        }, 800);
    }

    _endDeath() {
        cancelAnimationFrame(this._raf);
        // flash red
        this._ctx.fillStyle = "rgba(255,0,0,0.4)";
        this._ctx.fillRect(0, 0, PM_W, PM_H);
        setTimeout(() => {
            this.dispatchEvent(new CustomEvent("game-over", {
                bubbles: true, detail: { score: this._score, pointsEarned: 0 },
            }));
        }, 800);
    }
}

customElements.define("pacman-game", PacmanGame);
