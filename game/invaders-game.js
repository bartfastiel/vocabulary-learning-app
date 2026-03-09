// game/invaders-game.js
// Space Invaders: enemy formation, enemy fire, shields, UFO bonus, wave system

const IW = 480, IH = 560;

// Alien sprite shapes (simple pixel art via filled rects)
const ALIEN_TYPES = [
    { color: '#ef5350', hi: '#ff8a80', pts: 30, w: 32, h: 22 }, // top row    (row 0)
    { color: '#ab47bc', hi: '#ea80fc', pts: 20, w: 32, h: 22 }, // middle row (rows 1-2)
    { color: '#42a5f5', hi: '#80d8ff', pts: 10, w: 32, h: 22 }, // bottom row (rows 3-4)
];

// Shield block: 4 shields, each made of a grid of cells
const SH_COLS = 10, SH_ROWS = 6, SH_B = 5; // shield cell size
const SHIELDS_X = [62, 158, 254, 350];       // x position of each shield
const SHIELD_Y  = IH - 110;

function makeShield() {
    // 6 rows × 10 cols, with arch cutout at bottom center
    const cells = [];
    for (let r = 0; r < SH_ROWS; r++) {
        for (let c = 0; c < SH_COLS; c++) {
            // arch cutout: bottom 2 rows, center 4 cols
            if (r >= SH_ROWS - 2 && c >= 3 && c <= 6) continue;
            cells.push({ r, c, hp: 3 });
        }
    }
    return cells;
}

class InvadersGame extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.shadowRoot.innerHTML = `
      <style>
        :host { display:flex; flex-direction:column; align-items:center; justify-content:center;
                width:100%; height:100%; background:#000; }
        canvas { display:block; max-width:min(${IW}px, 96vw); max-height:88vh;
                 image-rendering:pixelated; touch-action:none; cursor:none; }
        .hint { color:#333; font-size:.75rem; margin-top:.3rem; font-family:monospace; }
      </style>
      <canvas width="${IW}" height="${IH}"></canvas>
      <div class="hint">← → bewegen | Leertaste / Tippen = schießen</div>`;

        this._cv  = this.shadowRoot.querySelector('canvas');
        this._ctx = this._cv.getContext('2d');
        this._init();
        this._bindInput();
    }

    disconnectedCallback() {
        cancelAnimationFrame(this._raf);
        this._ac?.abort();
    }

    _init() {
        this._state    = 'start';
        this._score    = 0;
        this._lives    = 3;
        this._wave     = 1;
        this._frame    = 0;
        this._shields  = SHIELDS_X.map(() => makeShield());
        this._bullets  = [];   // player bullets
        this._bombs    = [];   // enemy bombs
        this._particles = [];
        this._ufo      = null;
        this._ufoTimer = 0;
        this._ended    = false;
        this._flashTimer = 0;

        // Player
        this._px  = IW / 2;
        this._py  = IH - 50;
        this._pw  = 40;
        this._pFireCool = 0;
        this._pHit      = 0; // invincibility frames after being hit

        // Aliens: 5 rows × 11 cols
        this._aliens = [];
        const startX = 48, startY = 60, gapX = 40, gapY = 32;
        for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 11; c++) {
                const typeIdx = r === 0 ? 0 : r <= 2 ? 1 : 2;
                this._aliens.push({
                    r, c, type: typeIdx,
                    x: startX + c * gapX,
                    y: startY + r * gapY,
                    alive: true,
                });
            }
        }
        this._alienDir   = 1;   // 1 = right, -1 = left
        this._alienStep  = 0;   // animation frame (0 or 1)
        this._alienMoveTimer = 0;
        this._alienDropNext  = false;
        this._alienSpeed     = Math.max(8, 30 - this._wave * 2); // frames per move
        this._alienFireTimer = 0;

        this._raf = requestAnimationFrame(this._loop.bind(this));
    }

    _nextWave() {
        this._wave++;
        cancelAnimationFrame(this._raf);
        this._init();
        this._wave = arguments[0] ?? this._wave; // preserve wave count
    }

    // ── input ─────────────────────────────────────────────────────────────────

    _bindInput() {
        this._ac = new AbortController();
        const sig = { signal: this._ac.signal };
        this._keys = {};

        document.addEventListener('keydown', e => { this._keys[e.key] = true;
            if (e.key === ' ') { e.preventDefault(); this._shoot(); }
            if (this._state === 'start' || this._state === 'over') this._startOrRestart();
        }, sig);
        document.addEventListener('keyup', e => { this._keys[e.key] = false; }, sig);

        this._cv.addEventListener('pointerdown', e => {
            if (this._state === 'start' || this._state === 'over') { this._startOrRestart(); return; }
            // tap right side = move right, left side = move left, center = shoot
            const rect = this._cv.getBoundingClientRect();
            const tx = (e.clientX - rect.left) / rect.width * IW;
            if (tx < IW * 0.3) this._keys._tapLeft = true;
            else if (tx > IW * 0.7) this._keys._tapRight = true;
            else this._shoot();
        }, sig);
        this._cv.addEventListener('pointerup', () => {
            this._keys._tapLeft = false; this._keys._tapRight = false;
        }, sig);
    }

    _startOrRestart() {
        if (this._state === 'over') {
            cancelAnimationFrame(this._raf);
            this._wave = 1;
            this._score = 0;
            this._lives = 3;
            this._init();
        }
        this._state = 'running';
    }

    _shoot() {
        if (this._state !== 'running') return;
        if (this._pFireCool > 0) return;
        this._bullets.push({ x: this._px, y: this._py - 14, vy: -9 });
        this._pFireCool = 18;
    }

    // ── game logic ─────────────────────────────────────────────────────────────

    _loop() {
        this._raf = requestAnimationFrame(this._loop.bind(this));
        if (this._state !== 'running') { this._draw(); return; }
        this._frame++;
        this._update();
        this._draw();
    }

    _update() {
        // Player movement
        const spd = 3.5;
        if ((this._keys['ArrowLeft'] || this._keys['a'] || this._keys['A'] || this._keys._tapLeft)
            && this._px > this._pw/2 + 2) this._px -= spd;
        if ((this._keys['ArrowRight'] || this._keys['d'] || this._keys['D'] || this._keys._tapRight)
            && this._px < IW - this._pw/2 - 2) this._px += spd;

        if (this._pFireCool > 0) this._pFireCool--;
        if (this._pHit > 0) this._pHit--;
        if (this._flashTimer > 0) this._flashTimer--;

        // Player bullets
        this._bullets = this._bullets.filter(b => {
            b.y += b.vy;
            if (b.y < 0) return false;
            // hit shield
            for (let si = 0; si < this._shields.length; si++) {
                const sx = SHIELDS_X[si];
                for (let i = this._shields[si].length - 1; i >= 0; i--) {
                    const cell = this._shields[si][i];
                    const cx = sx + cell.c * SH_B, cy = SHIELD_Y + cell.r * SH_B;
                    if (b.x >= cx && b.x <= cx+SH_B && b.y >= cy && b.y <= cy+SH_B) {
                        cell.hp--;
                        if (cell.hp <= 0) this._shields[si].splice(i, 1);
                        return false;
                    }
                }
            }
            // hit alien
            for (const a of this._aliens) {
                if (!a.alive) continue;
                const at = ALIEN_TYPES[a.type];
                if (b.x >= a.x && b.x <= a.x + at.w && b.y >= a.y && b.y <= a.y + at.h) {
                    a.alive = false;
                    this._score += at.pts;
                    this._spawnParticles(a.x + at.w/2, a.y + at.h/2, ALIEN_TYPES[a.type].color, 12);
                    return false;
                }
            }
            // hit ufo
            if (this._ufo) {
                if (b.x >= this._ufo.x && b.x <= this._ufo.x+56 && b.y >= this._ufo.y && b.y <= this._ufo.y+20) {
                    const bonus = [50,100,150,300][Math.floor(Math.random()*4)];
                    this._score += bonus;
                    this._spawnText(this._ufo.x+28, this._ufo.y, `+${bonus}`, '#ffd600');
                    this._spawnParticles(this._ufo.x+28, this._ufo.y+10, '#f44336', 16);
                    this._ufo = null;
                    return false;
                }
            }
            return true;
        });

        // Alien movement
        this._alienMoveTimer++;
        const alive = this._aliens.filter(a => a.alive);
        if (alive.length === 0) {
            // Wave clear!
            this._flashTimer = 60;
            const nextWave = this._wave + 1;
            const curScore = this._score;
            const curLives = this._lives;
            setTimeout(() => {
                cancelAnimationFrame(this._raf);
                this._wave  = nextWave;
                this._score = curScore;
                this._lives = curLives;
                this._init();
                this._state = 'running';
            }, 1400);
            this._state = 'waveclear';
            return;
        }
        const speedNow = Math.max(4, this._alienSpeed - Math.floor((55 - alive.length) * 0.4));
        if (this._alienMoveTimer >= speedNow) {
            this._alienMoveTimer = 0;
            this._alienStep = 1 - this._alienStep;

            if (this._alienDropNext) {
                for (const a of this._aliens) a.y += 16;
                this._alienDir *= -1;
                this._alienDropNext = false;
            } else {
                let edgeHit = false;
                for (const a of this._aliens) {
                    if (!a.alive) continue;
                    a.x += this._alienDir * 10;
                    if (a.x <= 8 || a.x + 32 >= IW - 8) edgeHit = true;
                }
                if (edgeHit) this._alienDropNext = true;
            }

            // Check if aliens reached player level
            for (const a of this._aliens) {
                if (a.alive && a.y + 22 >= SHIELD_Y - 10) {
                    this._state = 'over';
                    setTimeout(() => this._endGame(), 800);
                }
            }
        }

        // Alien fire
        this._alienFireTimer++;
        const fireRate = Math.max(30, 120 - this._wave * 8);
        if (this._alienFireTimer >= fireRate) {
            this._alienFireTimer = 0;
            // Find bottom-most alien in each column
            const cols = {};
            for (const a of this._aliens) {
                if (!a.alive) continue;
                if (!cols[a.c] || a.r > cols[a.c].r) cols[a.c] = a;
            }
            const shooters = Object.values(cols);
            if (shooters.length) {
                const s = shooters[Math.floor(Math.random() * shooters.length)];
                const at = ALIEN_TYPES[s.type];
                this._bombs.push({ x: s.x + at.w/2, y: s.y + at.h, vy: 3.5 + this._wave * 0.3 });
            }
        }

        // Enemy bombs
        this._bombs = this._bombs.filter(b => {
            b.y += b.vy;
            if (b.y > IH) return false;
            // hit shield
            for (let si = 0; si < this._shields.length; si++) {
                const sx = SHIELDS_X[si];
                for (let i = this._shields[si].length - 1; i >= 0; i--) {
                    const cell = this._shields[si][i];
                    const cx = sx + cell.c * SH_B, cy = SHIELD_Y + cell.r * SH_B;
                    if (b.x >= cx && b.x <= cx+SH_B && b.y >= cy && b.y <= cy+SH_B) {
                        cell.hp--;
                        if (cell.hp <= 0) this._shields[si].splice(i, 1);
                        return false;
                    }
                }
            }
            // hit player
            if (this._pHit === 0 &&
                b.x >= this._px - this._pw/2 && b.x <= this._px + this._pw/2 &&
                b.y >= this._py - 16 && b.y <= this._py + 10) {
                this._lives--;
                this._pHit = 90;
                this._spawnParticles(this._px, this._py, '#42a5f5', 10);
                if (this._lives <= 0) {
                    this._state = 'over';
                    setTimeout(() => this._endGame(), 1200);
                }
                return false;
            }
            return true;
        });

        // UFO
        this._ufoTimer++;
        if (!this._ufo && this._ufoTimer > 480 + Math.random() * 480) {
            this._ufoTimer = 0;
            this._ufo = { x: -60, y: 22, dir: 1 };
            if (Math.random() < 0.5) { this._ufo.x = IW + 60; this._ufo.dir = -1; }
        }
        if (this._ufo) {
            this._ufo.x += this._ufo.dir * 2.5;
            if (this._ufo.x < -70 || this._ufo.x > IW + 70) this._ufo = null;
        }

        // Particles & floating texts
        this._particles = this._particles.filter(p => {
            p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life--;
            return p.life > 0;
        });
        this._floatTexts = (this._floatTexts || []).filter(t => {
            t.y -= 0.8; t.life--;
            return t.life > 0;
        });
    }

    _spawnParticles(x, y, color, n) {
        for (let i = 0; i < n; i++) {
            const a = Math.random() * Math.PI * 2;
            const s = 1.5 + Math.random() * 3;
            this._particles.push({ x, y, vx: Math.cos(a)*s, vy: Math.sin(a)*s,
                                    color, life: 20 + Math.random()*20|0, size: 2+Math.random()*3 });
        }
    }

    _spawnText(x, y, text, color) {
        this._floatTexts = this._floatTexts || [];
        this._floatTexts.push({ x, y, text, color, life: 50 });
    }

    _endGame() {
        if (this._ended) return;
        this._ended = true;
        this.dispatchEvent(new CustomEvent('game-over', {
            bubbles: true,
            detail: { score: this._score, pointsEarned: Math.min(30, Math.floor(this._score / 50)) }
        }));
    }

    // ── rendering ─────────────────────────────────────────────────────────────

    _draw() {
        const ctx = this._ctx;
        ctx.clearRect(0, 0, IW, IH);
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, IW, IH);

        // Stars background
        if (!this._stars) {
            this._stars = Array.from({length:80}, () => ({
                x: Math.random()*IW, y: Math.random()*IH,
                r: Math.random()*1.2+0.3, b: Math.random()
            }));
        }
        for (const s of this._stars) {
            ctx.globalAlpha = 0.4 + 0.4 * Math.sin(this._frame * 0.03 + s.b * 6);
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2); ctx.fill();
        }
        ctx.globalAlpha = 1;

        if (this._state === 'start') {
            this._drawStart(ctx);
            return;
        }

        // HUD
        ctx.fillStyle = '#00e5ff'; ctx.font = 'bold 14px monospace';
        ctx.fillText(`PUNKTE: ${this._score}`, 10, 18);
        ctx.fillText(`WELLE: ${this._wave}`, IW/2 - 40, 18);
        // Lives
        for (let i = 0; i < this._lives; i++) {
            this._drawShip(ctx, IW - 30 - i * 28, 12, 20, '#42a5f5', true);
        }
        // Divider
        ctx.strokeStyle = '#00e5ff44'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, 26); ctx.lineTo(IW, 26); ctx.stroke();

        // Shields
        for (let si = 0; si < this._shields.length; si++) {
            const sx = SHIELDS_X[si];
            for (const cell of this._shields[si]) {
                const hpColors = ['#4caf50','#ffeb3b','#f44336'];
                ctx.fillStyle = hpColors[cell.hp - 1] || '#4caf50';
                ctx.globalAlpha = 0.85;
                ctx.fillRect(sx + cell.c * SH_B, SHIELD_Y + cell.r * SH_B, SH_B, SH_B);
            }
            ctx.globalAlpha = 1;
        }

        // Wave clear flash
        if (this._flashTimer > 0 && this._flashTimer % 8 < 4) {
            ctx.fillStyle = 'rgba(0,229,255,0.08)'; ctx.fillRect(0,0,IW,IH);
        }

        // Aliens
        for (const a of this._aliens) {
            if (!a.alive) continue;
            this._drawAlien(ctx, a, this._alienStep);
        }

        // UFO
        if (this._ufo) this._drawUFO(ctx, this._ufo.x, this._ufo.y);

        // Player
        const pAlpha = this._pHit > 0 ? (this._frame % 6 < 3 ? 0.35 : 1) : 1;
        ctx.globalAlpha = pAlpha;
        this._drawShip(ctx, this._px, this._py, this._pw, '#42a5f5', false);
        ctx.globalAlpha = 1;

        // Bullets
        for (const b of this._bullets) {
            ctx.fillStyle = '#fff';
            ctx.fillRect(b.x - 2, b.y, 3, 10);
            ctx.shadowColor = '#fff'; ctx.shadowBlur = 6;
            ctx.fillRect(b.x - 2, b.y, 3, 10);
            ctx.shadowBlur = 0;
        }

        // Enemy bombs (zig-zag shape)
        for (const b of this._bombs) {
            ctx.strokeStyle = '#ff5252'; ctx.lineWidth = 2;
            ctx.shadowColor = '#ff5252'; ctx.shadowBlur = 4;
            ctx.beginPath();
            ctx.moveTo(b.x-2, b.y-6);
            ctx.lineTo(b.x+2, b.y-2);
            ctx.lineTo(b.x-2, b.y+2);
            ctx.lineTo(b.x+2, b.y+6);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        // Particles
        for (const p of this._particles) {
            ctx.globalAlpha = p.life / 40;
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Floating score texts
        for (const t of (this._floatTexts || [])) {
            ctx.globalAlpha = t.life / 50;
            ctx.fillStyle = t.color;
            ctx.font = 'bold 14px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(t.text, t.x, t.y);
        }
        ctx.textAlign = 'left'; ctx.globalAlpha = 1;

        // Game Over overlay
        if (this._state === 'over') {
            ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0,0,IW,IH);
            ctx.font = 'bold 36px monospace'; ctx.fillStyle = '#f44336';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', IW/2, IH/2 - 20);
            ctx.font = '14px monospace'; ctx.fillStyle = '#aaa';
            ctx.fillText(`Punkte: ${this._score}`, IW/2, IH/2 + 12);
            ctx.fillText('Tippe zum Neustarten', IW/2, IH/2 + 34);
            ctx.textAlign = 'left';
        }

        // Wave clear
        if (this._state === 'waveclear') {
            ctx.font = 'bold 26px monospace'; ctx.fillStyle = '#00e5ff';
            ctx.textAlign = 'center';
            ctx.fillText(`WELLE ${this._wave} GESCHAFFT!`, IW/2, IH/2);
            ctx.textAlign = 'left';
        }

        // Bottom border
        ctx.strokeStyle = '#00e5ff44'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, IH-18); ctx.lineTo(IW, IH-18); ctx.stroke();
    }

    _drawAlien(ctx, a, step) {
        const t = ALIEN_TYPES[a.type];
        const x = a.x, y = a.y, w = t.w, h = t.h;
        ctx.fillStyle = t.color;
        ctx.shadowColor = t.color;
        ctx.shadowBlur = 6;

        if (a.type === 0) {
            // Top alien: UFO-like
            ctx.beginPath();
            ctx.ellipse(x+w/2, y+h*0.5, w*0.45, h*0.35, 0, 0, Math.PI*2); ctx.fill();
            ctx.beginPath();
            ctx.ellipse(x+w/2, y+h*0.35, w*0.25, h*0.25, 0, 0, Math.PI*2); ctx.fill();
            // legs
            const legX = step ? [x+4, x+w-4] : [x+6, x+w-6];
            ctx.strokeStyle = t.color; ctx.lineWidth = 2;
            for (const lx of legX) {
                ctx.beginPath(); ctx.moveTo(lx, y+h*0.72); ctx.lineTo(lx, y+h);
                ctx.lineTo(lx + (lx < x+w/2 ? -4 : 4), y+h); ctx.stroke();
            }
        } else if (a.type === 1) {
            // Middle alien: crab-like
            ctx.fillRect(x+6, y+4, w-12, h-8);
            ctx.fillRect(x+2, y+8, w-4, h-16);
            // claws
            const claw = step ? 0 : 4;
            ctx.fillRect(x + claw, y+h-8, 6, 8);
            ctx.fillRect(x+w-6-claw, y+h-8, 6, 8);
            // eyes
            ctx.fillStyle = '#000';
            ctx.fillRect(x+8, y+8, 4, 4);
            ctx.fillRect(x+w-12, y+8, 4, 4);
        } else {
            // Bottom alien: squid-like
            ctx.beginPath();
            ctx.moveTo(x+w/2, y);
            ctx.bezierCurveTo(x+w, y, x+w, y+h*0.6, x+w*0.8, y+h*0.6);
            ctx.lineTo(x+w, y+h); ctx.lineTo(x+w*0.7, y+h*0.6);
            ctx.lineTo(x+w*0.55, y+h); ctx.lineTo(x+w/2, y+h*0.7);
            ctx.lineTo(x+w*0.45, y+h); ctx.lineTo(x+w*0.3, y+h*0.6);
            ctx.lineTo(x, y+h); ctx.lineTo(x+w*0.2, y+h*0.6);
            ctx.bezierCurveTo(x, y+h*0.6, x, y, x+w/2, y);
            ctx.fill();
            // eyes
            ctx.fillStyle = '#000';
            const eyeOff = step ? 2 : 0;
            ctx.fillRect(x+8+eyeOff, y+8, 5, 5);
            ctx.fillRect(x+w-13-eyeOff, y+8, 5, 5);
        }
        ctx.shadowBlur = 0;
    }

    _drawShip(ctx, x, y, w, color, mini) {
        ctx.fillStyle = color;
        ctx.shadowColor = color; ctx.shadowBlur = mini ? 4 : 8;
        // body
        ctx.beginPath();
        ctx.moveTo(x, y - (mini ? 6 : 12));
        ctx.lineTo(x + w/2, y + (mini ? 4 : 8));
        ctx.lineTo(x - w/2, y + (mini ? 4 : 8));
        ctx.closePath(); ctx.fill();
        // wings
        if (!mini) {
            ctx.fillRect(x - w/2 - 6, y + 2, 10, 6);
            ctx.fillRect(x + w/2 - 4, y + 2, 10, 6);
            // cockpit
            ctx.fillStyle = '#80d8ff';
            ctx.beginPath(); ctx.arc(x, y - 4, 5, 0, Math.PI*2); ctx.fill();
        }
        ctx.shadowBlur = 0;
    }

    _drawUFO(ctx, x, y) {
        ctx.fillStyle = '#f44336';
        ctx.shadowColor = '#f44336'; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.ellipse(x+28, y+12, 28, 10, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#ff8a80';
        ctx.beginPath(); ctx.ellipse(x+28, y+8, 16, 7, 0, 0, Math.PI*2); ctx.fill();
        // lights
        for (let i = 0; i < 5; i++) {
            ctx.fillStyle = this._frame % 8 < 4 && i % 2 === 0 ? '#fff' : '#ff5252';
            ctx.beginPath(); ctx.arc(x+8+i*10, y+12, 3, 0, Math.PI*2); ctx.fill();
        }
        ctx.shadowBlur = 0;
    }

    _drawStart(ctx) {
        // Title
        ctx.textAlign = 'center';
        ctx.font = 'bold 42px monospace';
        const g = ctx.createLinearGradient(0, IH/2-80, 0, IH/2-40);
        g.addColorStop(0,'#f44336'); g.addColorStop(1,'#ff8a80');
        ctx.fillStyle = g;
        ctx.shadowColor = '#f44336'; ctx.shadowBlur = 20;
        ctx.fillText('SPACE', IW/2, IH/2 - 50);
        ctx.fillText('INVADERS', IW/2, IH/2 - 8);
        ctx.shadowBlur = 0;

        // Demo aliens
        for (let i = 0; i < 3; i++) {
            this._drawAlien(ctx, {
                x: IW/2 - 64 + i*64 - 16, y: IH/2 + 20, type: i, alive: true
            }, this._frame % 2);
        }
        ctx.font = '14px monospace'; ctx.fillStyle = '#aaa';
        ctx.shadowBlur = 0;
        ctx.fillText('Tippe oder Leertaste zum Starten', IW/2, IH/2 + 100);
        ctx.fillText('← → bewegen  |  Leertaste / Tap = schießen', IW/2, IH/2 + 124);
        ctx.textAlign = 'left';
    }
}

customElements.define('invaders-game', InvadersGame);
