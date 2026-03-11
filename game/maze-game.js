// game/maze-game.js
// Labyrinth: navigate a ball through a randomly generated maze using arrow keys / WASD / swipe.
// Fires CustomEvent("game-over", { bubbles: true, detail: { score, pointsEarned } })

const MZ_COLS = 11, MZ_ROWS = 11, MZ_CELL = 28;
const MZ_W = MZ_COLS * MZ_CELL, MZ_H = MZ_ROWS * MZ_CELL;

class MazeGame extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._controller = new AbortController();
        this._raf = null;
        this._level = 1;
        this._totalTime = 0;
        this._levelTime = 0;
        this._timerId = null;
    }

    connectedCallback() {
        this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          width: 100%; height: 100%; background: #0d0d1a;
          font-family: "Segoe UI", sans-serif; user-select: none;
        }
        #hud {
          color: white; font-size: 1.1rem; font-weight: bold;
          margin-bottom: 0.6rem; display: flex; gap: 2rem;
        }
        canvas { display: block; touch-action: none; }
      </style>
      <div id="hud">
        <span>🏷️ Level <span id="level">1</span></span>
        <span>⏱ <span id="time">0</span>s</span>
      </div>
      <canvas id="c" width="${MZ_W}" height="${MZ_H}"></canvas>`;

        this._cv = this.shadowRoot.getElementById("c");
        this._ctx = this._cv.getContext("2d");
        this._generateMaze();
        this._px = 0; this._py = 0;
        this._bindInput();
        this._draw();
        this._timerId = setInterval(() => {
            this._totalTime++;
            this._levelTime++;
            this.shadowRoot.getElementById("time").textContent = this._totalTime;
        }, 1000);
    }

    disconnectedCallback() {
        this._controller.abort();
        clearInterval(this._timerId);
    }

    _generateMaze() {
        // simple recursive backtracker
        const cols = MZ_COLS, rows = MZ_ROWS;
        this._walls = Array.from({ length: rows }, () =>
            Array.from({ length: cols }, () => ({ top: true, right: true, bottom: true, left: true }))
        );
        const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
        const stack = [{ x: 0, y: 0 }];
        visited[0][0] = true;

        while (stack.length > 0) {
            const { x, y } = stack[stack.length - 1];
            const neighbors = [];
            if (y > 0 && !visited[y-1][x]) neighbors.push({ x, y: y-1, dir: "top" });
            if (x < cols-1 && !visited[y][x+1]) neighbors.push({ x: x+1, y, dir: "right" });
            if (y < rows-1 && !visited[y+1][x]) neighbors.push({ x, y: y+1, dir: "bottom" });
            if (x > 0 && !visited[y][x-1]) neighbors.push({ x: x-1, y, dir: "left" });

            if (neighbors.length === 0) {
                stack.pop();
            } else {
                const next = neighbors[Math.floor(Math.random() * neighbors.length)];
                // remove walls
                if (next.dir === "top")    { this._walls[y][x].top = false; this._walls[next.y][next.x].bottom = false; }
                if (next.dir === "right")  { this._walls[y][x].right = false; this._walls[next.y][next.x].left = false; }
                if (next.dir === "bottom") { this._walls[y][x].bottom = false; this._walls[next.y][next.x].top = false; }
                if (next.dir === "left")   { this._walls[y][x].left = false; this._walls[next.y][next.x].right = false; }
                visited[next.y][next.x] = true;
                stack.push({ x: next.x, y: next.y });
            }
        }
    }

    _bindInput() {
        const sig = { signal: this._controller.signal };
        const move = (dx, dy) => {
            const nx = this._px + dx, ny = this._py + dy;
            if (nx < 0 || nx >= MZ_COLS || ny < 0 || ny >= MZ_ROWS) return;
            const w = this._walls[this._py][this._px];
            if (dx === 1 && w.right) return;
            if (dx === -1 && w.left) return;
            if (dy === 1 && w.bottom) return;
            if (dy === -1 && w.top) return;
            this._px = nx; this._py = ny;
            this._draw();
            if (nx === MZ_COLS - 1 && ny === MZ_ROWS - 1) this._nextLevel();
        };

        const dirMap = {
            ArrowUp: [0,-1], ArrowDown: [0,1], ArrowLeft: [-1,0], ArrowRight: [1,0],
            w: [0,-1], s: [0,1], a: [-1,0], d: [1,0],
        };
        document.addEventListener("keydown", e => {
            if (dirMap[e.key]) { e.preventDefault(); move(...dirMap[e.key]); }
        }, sig);

        // swipe
        let tx, ty;
        this._cv.addEventListener("touchstart", e => {
            tx = e.touches[0].clientX; ty = e.touches[0].clientY;
        }, { ...sig, passive: true });
        this._cv.addEventListener("touchend", e => {
            const dx = e.changedTouches[0].clientX - tx;
            const dy = e.changedTouches[0].clientY - ty;
            if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 1 : -1, 0);
            else move(0, dy > 0 ? 1 : -1);
        }, { ...sig, passive: true });
    }

    _nextLevel() {
        if (this._level >= 5) {
            this._end();
            return;
        }
        this._level++;
        this._levelTime = 0;
        this.shadowRoot.getElementById("level").textContent = this._level;
        this._generateMaze();
        this._px = 0; this._py = 0;
        this._draw();
    }

    _draw() {
        const ctx = this._ctx, c = MZ_CELL;
        ctx.fillStyle = "#1a1a3e";
        ctx.fillRect(0, 0, MZ_W, MZ_H);

        // walls
        ctx.strokeStyle = "#4dd0e1";
        ctx.lineWidth = 2;
        for (let y = 0; y < MZ_ROWS; y++) {
            for (let x = 0; x < MZ_COLS; x++) {
                const w = this._walls[y][x];
                const px = x * c, py = y * c;
                if (w.top)    { ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + c, py); ctx.stroke(); }
                if (w.right)  { ctx.beginPath(); ctx.moveTo(px + c, py); ctx.lineTo(px + c, py + c); ctx.stroke(); }
                if (w.bottom) { ctx.beginPath(); ctx.moveTo(px, py + c); ctx.lineTo(px + c, py + c); ctx.stroke(); }
                if (w.left)   { ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py + c); ctx.stroke(); }
            }
        }

        // goal
        ctx.fillStyle = "#66BB6A";
        ctx.beginPath();
        ctx.arc((MZ_COLS - 1) * c + c / 2, (MZ_ROWS - 1) * c + c / 2, c / 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = `${c * 0.6}px sans-serif`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("⭐", (MZ_COLS - 1) * c + c / 2, (MZ_ROWS - 1) * c + c / 2 + 1);

        // player
        ctx.fillStyle = "#FF6B6B";
        ctx.beginPath();
        ctx.arc(this._px * c + c / 2, this._py * c + c / 2, c / 3, 0, Math.PI * 2);
        ctx.fill();
    }

    _end() {
        clearInterval(this._timerId);
        setTimeout(() => {
            this.dispatchEvent(new CustomEvent("game-over", {
                bubbles: true,
                detail: { score: this._totalTime, pointsEarned: 0 },
            }));
        }, 500);
    }
}

customElements.define("maze-game", MazeGame);
