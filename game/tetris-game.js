// game/tetris-game.js
// Full-featured Tetris with ghost piece, hold, 7-bag randomiser, level progression

const TB = 28;                        // block size in px
const TC = 10, TR = 20;               // cols, rows
const TBX = 6, TBY = 6;              // board offsets
const TPX = TBX + TC * TB + 10;       // panel x = 306
const TPW = 148;                      // panel width
const TCW = TPX + TPW + 4;            // canvas width  = 458
const TCH = TBY + TR * TB + TBY;      // canvas height = 572

// Pieces: color, highlight color, 4 rotations (each rotation = array of [col,row] offsets)
const T_PIECES = [
  { c:'#00BCD4', h:'#80DEEA', r:[[[0,1],[1,1],[2,1],[3,1]],[[2,0],[2,1],[2,2],[2,3]],[[0,2],[1,2],[2,2],[3,2]],[[1,0],[1,1],[1,2],[1,3]]] }, // I
  { c:'#FFD600', h:'#FFE57F', r:[[[1,0],[2,0],[1,1],[2,1]],[[1,0],[2,0],[1,1],[2,1]],[[1,0],[2,0],[1,1],[2,1]],[[1,0],[2,0],[1,1],[2,1]]] }, // O
  { c:'#AB47BC', h:'#CE93D8', r:[[[1,0],[0,1],[1,1],[2,1]],[[1,0],[1,1],[2,1],[1,2]],[[0,1],[1,1],[2,1],[1,2]],[[1,0],[0,1],[1,1],[1,2]]] }, // T
  { c:'#43A047', h:'#A5D6A7', r:[[[1,0],[2,0],[0,1],[1,1]],[[1,0],[1,1],[2,1],[2,2]],[[1,1],[2,1],[0,2],[1,2]],[[0,0],[0,1],[1,1],[1,2]]] }, // S
  { c:'#EF5350', h:'#EF9A9A', r:[[[0,0],[1,0],[1,1],[2,1]],[[2,0],[1,1],[2,1],[1,2]],[[0,1],[1,1],[1,2],[2,2]],[[1,0],[0,1],[1,1],[0,2]]] }, // Z
  { c:'#FF7043', h:'#FFCCBC', r:[[[2,0],[0,1],[1,1],[2,1]],[[1,0],[1,1],[1,2],[2,2]],[[0,1],[1,1],[2,1],[0,2]],[[0,0],[1,0],[1,1],[1,2]]] }, // L
  { c:'#1E88E5', h:'#90CAF9', r:[[[0,0],[0,1],[1,1],[2,1]],[[1,0],[2,0],[1,1],[1,2]],[[0,1],[1,1],[2,1],[2,2]],[[1,0],[1,1],[0,2],[1,2]]] }, // J
];

function t_randomBag() {
    const bag = [0,1,2,3,4,5,6];
    for (let i = 6; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    return bag;
}

class TetrisGame extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.shadowRoot.innerHTML = `
      <style>
        :host { display:flex; flex-direction:column; align-items:center; justify-content:center;
                width:100%; height:100%; background:#0d1117; user-select:none; }
        canvas { display:block; max-width:min(${TCW}px,94vw); max-height:86vh;
                 image-rendering:pixelated; touch-action:none;
                 box-shadow:0 0 40px rgba(0,200,255,0.25); border-radius:4px; }
        .msg { color:#aaa; font-size:.8rem; margin-top:.5rem; font-family:monospace;
               text-align:center; }
      </style>
      <canvas width="${TCW}" height="${TCH}"></canvas>
      <div class="msg">← → bewegen &nbsp;|&nbsp; ↑ drehen &nbsp;|&nbsp; ↓ fallen &nbsp;|&nbsp; Leertaste = Drop &nbsp;|&nbsp; C = Halten</div>`;

        this._canvas = this.shadowRoot.querySelector('canvas');
        this._ctx    = this._canvas.getContext('2d');
        this._init();
        this._bindInput();
    }

    disconnectedCallback() {
        cancelAnimationFrame(this._raf);
        this._ac?.abort();
    }

    _init() {
        this._board = Array.from({length:TR}, () => new Array(TC).fill(null));
        this._bag   = t_randomBag();
        this._next  = this._bag.pop();
        this._hold  = null;
        this._holdUsed = false;
        this._score = 0;
        this._lines = 0;
        this._level = 1;
        this._state = 'start'; // start | running | lineclear | over
        this._clearingRows = [];
        this._clearFrame   = 0;
        this._spawnPiece();
        this._raf = requestAnimationFrame(this._loop.bind(this));
    }

    _spawnPiece() {
        if (this._bag.length === 0) this._bag = t_randomBag();
        this._type = this._next;
        this._next = this._bag.pop();
        this._rot  = 0;
        this._px   = 3; // col offset (center of 10-col board)
        this._py   = -1;
        if (!this._canPlace(this._px, this._py, this._rot)) {
            this._state = 'over';
        }
        this._holdUsed = false;
    }

    _cells(type, rot) {
        return T_PIECES[type].r[rot % T_PIECES[type].r.length];
    }

    _canPlace(px, py, rot) {
        for (const [dc, dr] of this._cells(this._type ?? 0, rot)) {
            const c = px + dc, r = py + dr;
            if (c < 0 || c >= TC || r >= TR) return false;
            if (r >= 0 && this._board[r][c]) return false;
        }
        return true;
    }

    _tryRotate(dir) {
        const nr = (this._rot + dir + 4) % 4;
        const kicks = [[0,0],[1,0],[-1,0],[2,0],[-2,0],[0,-1]];
        for (const [kc,kr] of kicks) {
            if (this._canPlace(this._px + kc, this._py + kr, nr)) {
                this._px += kc; this._py += kr; this._rot = nr;
                return;
            }
        }
    }

    _ghostY() {
        let gy = this._py;
        while (this._canPlace(this._px, gy + 1, this._rot)) gy++;
        return gy;
    }

    _drop(soft = false) {
        if (this._canPlace(this._px, this._py + 1, this._rot)) {
            this._py++;
            if (soft) this._score += 1;
        } else {
            this._lock();
        }
    }

    _hardDrop() {
        const gy = this._ghostY();
        this._score += (gy - this._py) * 2;
        this._py = gy;
        this._lock();
    }

    _lock() {
        for (const [dc, dr] of this._cells(this._type, this._rot)) {
            const r = this._py + dr, c = this._px + dc;
            if (r >= 0 && r < TR) this._board[r][c] = this._type;
        }
        const full = [];
        for (let r = 0; r < TR; r++) {
            if (this._board[r].every(c => c !== null)) full.push(r);
        }
        if (full.length) {
            this._clearingRows = full;
            this._clearFrame   = 0;
            this._state = 'lineclear';
        } else {
            this._spawnPiece();
        }
    }

    _clearLines() {
        const n = this._clearingRows.length;
        const pts = [0, 100, 300, 500, 800][n] * this._level;
        this._score += pts;
        this._lines += n;
        this._level  = Math.floor(this._lines / 10) + 1;
        for (const r of this._clearingRows.sort((a,b)=>b-a)) {
            this._board.splice(r, 1);
            this._board.unshift(new Array(TC).fill(null));
        }
        this._clearingRows = [];
        this._state = 'running';
        this._spawnPiece();
    }

    _doHold() {
        if (this._holdUsed) return;
        this._holdUsed = true;
        if (this._hold === null) {
            this._hold = this._type;
            this._spawnPiece();
        } else {
            [this._type, this._hold] = [this._hold, this._type];
            this._rot = 0; this._px = 3; this._py = -1;
        }
    }

    // ── input ──────────────────────────────────────────────────────────────────

    _bindInput() {
        this._ac = new AbortController();
        const sig = { signal: this._ac.signal };

        document.addEventListener('keydown', e => {
            if (this._state === 'start') { this._state = 'running'; return; }
            if (this._state === 'over')  { this._init(); return; }
            if (this._state !== 'running') return;
            switch (e.key) {
                case 'ArrowLeft':  this._canPlace(this._px-1,this._py,this._rot) && this._px--; break;
                case 'ArrowRight': this._canPlace(this._px+1,this._py,this._rot) && this._px++; break;
                case 'ArrowDown':  this._drop(true); break;
                case 'ArrowUp': case 'x': case 'X': this._tryRotate(1); break;
                case 'z': case 'Z': this._tryRotate(-1); break;
                case ' ': e.preventDefault(); this._hardDrop(); break;
                case 'c': case 'C': this._doHold(); break;
            }
        }, sig);

        // touch swipe
        let tx0 = 0, ty0 = 0, ttime = 0;
        this._canvas.addEventListener('touchstart', e => {
            const t = e.touches[0];
            tx0 = t.clientX; ty0 = t.clientY; ttime = Date.now();
        }, { passive:true, signal:this._ac.signal });
        this._canvas.addEventListener('touchend', e => {
            const dx = e.changedTouches[0].clientX - tx0;
            const dy = e.changedTouches[0].clientY - ty0;
            const dt = Date.now() - ttime;
            if (this._state === 'start') { this._state = 'running'; return; }
            if (this._state === 'over')  { this._init(); return; }
            if (this._state !== 'running') return;
            if (Math.abs(dx) < 12 && Math.abs(dy) < 12 && dt < 300) {
                this._tryRotate(1); return; // tap = rotate
            }
            if (Math.abs(dx) > Math.abs(dy)) {
                if (dx < -20 && this._canPlace(this._px-1,this._py,this._rot)) this._px--;
                if (dx >  20 && this._canPlace(this._px+1,this._py,this._rot)) this._px++;
            } else {
                if (dy > 30) this._hardDrop();
                if (dy < -30) this._doHold();
            }
        }, sig);
    }

    // ── game loop ──────────────────────────────────────────────────────────────

    _loop(ts) {
        this._raf = requestAnimationFrame(this._loop.bind(this));
        if (!this._lastTs) this._lastTs = ts;
        const dt = ts - this._lastTs;
        this._lastTs = ts;

        if (this._state === 'running') {
            this._gravAcc = (this._gravAcc || 0) + dt;
            const speed = Math.max(80, 800 - (this._level - 1) * 70);
            if (this._gravAcc >= speed) {
                this._gravAcc -= speed;
                this._drop();
            }
        } else if (this._state === 'lineclear') {
            this._clearFrame++;
            if (this._clearFrame > 18) this._clearLines();
        }
        this._draw();
    }

    // ── rendering ─────────────────────────────────────────────────────────────

    _drawBlock(ctx, col, row, color, hi, alpha = 1) {
        const x = TBX + col * TB, y = TBY + row * TB;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.fillRect(x, y, TB, TB);
        // highlight (top-left)
        ctx.fillStyle = hi;
        ctx.fillRect(x+1, y+1, TB-2, 5);
        ctx.fillRect(x+1, y+1, 5, TB-2);
        // shadow (bottom-right)
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(x+1, y+TB-6, TB-2, 5);
        ctx.fillRect(x+TB-6, y+1, 5, TB-2);
        // gap
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x+.5, y+.5, TB-1, TB-1);
        ctx.globalAlpha = 1;
    }

    _drawMiniBlock(ctx, x, y, s, color, hi) {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, s, s);
        ctx.fillStyle = hi;
        ctx.fillRect(x+1, y+1, s-1, 3);
        ctx.fillRect(x+1, y+1, 3, s-1);
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x+.5, y+.5, s-1, s-1);
    }

    _drawPiecePreview(ctx, type, cx, cy, s = 20) {
        if (type === null) return;
        const p = T_PIECES[type];
        const cells = p.r[0];
        // bounding box
        const minC = Math.min(...cells.map(([c])=>c));
        const minR = Math.min(...cells.map(([,r])=>r));
        const maxC = Math.max(...cells.map(([c])=>c));
        const maxR = Math.max(...cells.map(([,r])=>r));
        const w = (maxC - minC + 1) * s, h = (maxR - minR + 1) * s;
        const ox = cx - w/2, oy = cy - h/2;
        for (const [c, r] of cells) {
            this._drawMiniBlock(ctx, ox+(c-minC)*s, oy+(r-minR)*s, s, p.c, p.h);
        }
    }

    _draw() {
        const ctx = this._ctx;
        ctx.clearRect(0, 0, TCW, TCH);

        // background
        const bg = ctx.createLinearGradient(0,0,0,TCH);
        bg.addColorStop(0,'#0d1117'); bg.addColorStop(1,'#161b22');
        ctx.fillStyle = bg; ctx.fillRect(0,0,TCW,TCH);

        // board background
        ctx.fillStyle = '#010409';
        ctx.fillRect(TBX, TBY, TC*TB, TR*TB);

        // grid lines
        ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 1;
        for (let c = 1; c < TC; c++) {
            ctx.beginPath(); ctx.moveTo(TBX+c*TB, TBY); ctx.lineTo(TBX+c*TB, TBY+TR*TB); ctx.stroke();
        }
        for (let r = 1; r < TR; r++) {
            ctx.beginPath(); ctx.moveTo(TBX, TBY+r*TB); ctx.lineTo(TBX+TC*TB, TBY+r*TB); ctx.stroke();
        }

        // board pieces
        for (let r = 0; r < TR; r++) {
            const flash = this._clearingRows.includes(r) && this._clearFrame % 4 < 2;
            for (let c = 0; c < TC; c++) {
                const t = this._board[r][c];
                if (t !== null) {
                    if (flash) {
                        ctx.fillStyle = '#fff'; ctx.fillRect(TBX+c*TB, TBY+r*TB, TB, TB);
                    } else {
                        this._drawBlock(ctx, c, r, T_PIECES[t].c, T_PIECES[t].h);
                    }
                }
            }
        }

        // ghost piece
        if (this._state === 'running' || this._state === 'lineclear') {
            const gy = this._ghostY();
            if (gy !== this._py) {
                const p = T_PIECES[this._type];
                for (const [dc, dr] of this._cells(this._type, this._rot)) {
                    const col = this._px+dc, row = gy+dr;
                    if (row >= 0 && row < TR) {
                        ctx.globalAlpha = 0.2;
                        ctx.fillStyle = p.c;
                        ctx.fillRect(TBX+col*TB+1, TBY+row*TB+1, TB-2, TB-2);
                        ctx.strokeStyle = p.c; ctx.lineWidth = 1;
                        ctx.strokeRect(TBX+col*TB+.5, TBY+row*TB+.5, TB-1, TB-1);
                        ctx.globalAlpha = 1;
                    }
                }
            }
        }

        // current piece
        if (this._state !== 'over' && this._state !== 'start') {
            const p = T_PIECES[this._type];
            for (const [dc, dr] of this._cells(this._type, this._rot)) {
                const col = this._px+dc, row = this._py+dr;
                if (row >= 0 && row < TR) this._drawBlock(ctx, col, row, p.c, p.h);
            }
        }

        // board border
        ctx.strokeStyle = 'rgba(56,189,248,0.4)'; ctx.lineWidth = 2;
        ctx.strokeRect(TBX-.5, TBY-.5, TC*TB+1, TR*TB+1);

        // ── side panel ──────────────────────────────────────────────────────────
        const px = TPX, pw = TPW;
        ctx.font = 'bold 11px monospace';
        ctx.fillStyle = 'rgba(56,189,248,0.6)';
        ctx.letterSpacing = '1px';

        const panelBox = (label, y, h) => {
            ctx.fillStyle = '#111827';
            ctx.beginPath();
            ctx.roundRect(px, y, pw, h, 6);
            ctx.fill();
            ctx.strokeStyle = 'rgba(56,189,248,0.25)'; ctx.lineWidth = 1;
            ctx.stroke();
            ctx.fillStyle = 'rgba(100,180,255,0.7)';
            ctx.font = 'bold 10px monospace';
            ctx.fillText(label, px+8, y+13);
        };

        // HOLD box
        panelBox('HALTEN (C)', 6, 76);
        if (this._hold !== null) {
            ctx.globalAlpha = this._holdUsed ? 0.4 : 1;
            this._drawPiecePreview(ctx, this._hold, px + pw/2, 6+44, 16);
            ctx.globalAlpha = 1;
        }

        // SCORE / LEVEL / LINES
        panelBox('PUNKTE', 90, 44);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 16px monospace';
        ctx.fillText(String(this._score), px+8, 90+30);

        panelBox('LEVEL', 142, 36);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 16px monospace';
        ctx.fillText(String(this._level), px+8, 142+24);

        panelBox('LINIEN', 186, 36);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 16px monospace';
        ctx.fillText(String(this._lines), px+8, 186+24);

        // NEXT box
        panelBox('NÄCHSTES', 232, 76);
        this._drawPiecePreview(ctx, this._next, px + pw/2, 232+44, 16);

        // speed bar
        panelBox('TEMPO', 316, 24);
        const speedPct = Math.min(1, (this._level-1)/9);
        const barW = (pw-16) * speedPct;
        const barGrad = ctx.createLinearGradient(px+8, 0, px+8+pw-16, 0);
        barGrad.addColorStop(0,'#4dd0e1'); barGrad.addColorStop(1,'#f44336');
        ctx.fillStyle = barGrad;
        ctx.fillRect(px+8, 316+12, barW, 8);

        // ── overlay messages ─────────────────────────────────────────────────────
        if (this._state === 'start') {
            this._overlay(ctx, '🎮 TETRIS', 'Tippe oder Taste zum Starten');
        } else if (this._state === 'over') {
            this._overlay(ctx, 'GAME OVER', `Punkte: ${this._score} – Tippe zum Neustarten`);
        }
    }

    _overlay(ctx, title, sub) {
        ctx.fillStyle = 'rgba(0,0,0,0.72)';
        ctx.fillRect(TBX, TBY, TC*TB, TR*TB);
        ctx.font = 'bold 28px monospace';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText(title, TBX + TC*TB/2, TBY + TR*TB/2 - 18);
        ctx.font = '13px monospace';
        ctx.fillStyle = '#90caf9';
        ctx.fillText(sub, TBX + TC*TB/2, TBY + TR*TB/2 + 12);
        ctx.textAlign = 'left';
        if (this._state === 'over') {
            setTimeout(() => {
                this.dispatchEvent(new CustomEvent('game-over', {
                    bubbles: true,
                    detail: { score: this._score, pointsEarned: Math.min(25, Math.floor(this._score/100)) }
                }));
            }, 2200);
            this._state = 'ended';
        }
    }
}

customElements.define('tetris-game', TetrisGame);
