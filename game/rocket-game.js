// game/rocket-game.js
//
// A direct modularization of the original rocket mini-game.
// Functionality, visuals, and algorithms are IDENTICAL to the inline version.
//

class RocketGame extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({mode: "open"});
    }

    connectedCallback() {
        this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
          height: 100%;
        }
        #game-overlay {
          display: flex;
          position: relative;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: radial-gradient(circle at top, #0f2027, #203a43, #2c5364);
          color: white;
          width: 100%;
          height: 100%;
          border-radius: 12px;
          box-sizing: border-box;
          padding: 12px;
        }
        #close-game {
          position: absolute;
          top: 10px;
          right: 10px;
          background: #4dd0e1;
          border: none;
          border-radius: 6px;
          padding: 0.4rem 1rem;
          cursor: pointer;
        }
        #hud {
          width: min(92vw, 440px);
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 8px;
        }
        #game-stats { font-size: 1.1rem; }
        .bar-title {
          font-size: 0.9rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          opacity: 0.9;
        }
        .bar {
          position: relative;
          width: 100%;
          height: 16px;
          background: rgba(255,255,255,0.18);
          border: 1px solid #0ff;
          border-radius: 8px;
          overflow: hidden;
          display: flex;
        }
        #combo-hits { background: #8bc34a; height: 100%; width: 0%; }
        #combo-misses { background: #f44336; height: 100%; width: 0%; }
        #combo-remaining { background: rgba(255,255,255,0.25); height: 100%; width: 100%; }
        #game-canvas {
          background: #001;
          border: 2px solid #0ff;
          border-radius: 12px;
          touch-action: none;
          width: min(92vw, 440px);
          height: calc(min(92vw, 440px) * 1.5);
          max-height: 80vh;
        }
      </style>

      <div id="game-overlay">
        <button id="close-game">Zurück</button>

        <div id="hud">
          <div id="game-stats">💰 Coins: <span id="game-coins">0</span></div>

          <div class="bar-title">
            <span>Treffer / Misses / Offen</span>
            <span id="combo-count">0 | 0 | 30</span>
          </div>
          <div id="combo-bar" class="bar">
            <div id="combo-hits"></div>
            <div id="combo-misses"></div>
            <div id="combo-remaining"></div>
          </div>
        </div>

        <canvas id="game-canvas" width="400" height="600"></canvas>
      </div>
    `;

        this.setup();
    }

    setup() {
        const shadow = this.shadowRoot;
        const canvas = shadow.getElementById("game-canvas");
        const ctx = canvas.getContext("2d");

        const closeGame = shadow.getElementById("close-game");
        const gameCoinsEl = shadow.getElementById("game-coins");

        const comboCountEl = shadow.getElementById("combo-count");
        const comboHits = shadow.getElementById("combo-hits");
        const comboMisses = shadow.getElementById("combo-misses");
        const comboRemaining = shadow.getElementById("combo-remaining");

        let rocket = {x: 200, y: 550, w: 40, h: 40};
        let bullets = [], coins = [];
        let leftPressed = false, rightPressed = false;
        let spaceDown = false;
        let lastSpawn = 0;

        const maxShots = 30;
        let shotsFired = 0, hits = 0, misses = 0;

        let gameCoins = parseInt(localStorage.getItem("gameCoins") || "0");
        gameCoinsEl.textContent = gameCoins;

        closeGame.onclick = () => {
            this.dispatchEvent(new CustomEvent("close-game", { bubbles: true }));
        };

        const clamp = (x, min, max) => (x < min ? min : (x > max ? max : x));

        const toCanvasX = (clientX) => {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            return (clientX - rect.left) * scaleX;
        };

        const placeRocketAtClientX = (clientX) => {
            const x = toCanvasX(clientX) - rocket.w / 2;
            rocket.x = clamp(x, 0, canvas.width - rocket.w);
        };

        document.addEventListener("keydown", (e) => {
            if (e.key === "ArrowLeft" || e.key === "a") leftPressed = true;
            if (e.key === "ArrowRight" || e.key === "d") rightPressed = true;

            if (e.key === " " && !spaceDown) {
                spaceDown = true;
                e.preventDefault();
                shoot();
            }
        });

        document.addEventListener("keyup", (e) => {
            if (e.key === "ArrowLeft" || e.key === "a") leftPressed = false;
            if (e.key === "ArrowRight" || e.key === "d") rightPressed = false;
            if (e.key === " ") spaceDown = false;
        });

        let touchX = null;
        let hasShotThisTouch = false;

        canvas.addEventListener("touchstart", (e) => {
            const t = e.touches[0];
            placeRocketAtClientX(t.clientX);

            if (!hasShotThisTouch) {
                shoot();
                hasShotThisTouch = true;
            }

            touchX = t.clientX;
            e.preventDefault();
        }, {passive: true});

        canvas.addEventListener("touchmove", (e) => {
            const t = e.touches[0];
            placeRocketAtClientX(t.clientX);
            touchX = t.clientX;
            e.preventDefault();
        }, {passive: true});

        canvas.addEventListener("touchend", () => {
            touchX = null;
            hasShotThisTouch = false; // wieder erlauben bei neuem Touch
            e.preventDefault();
        }, {passive: true});

        canvas.addEventListener("click", (e) => {
            placeRocketAtClientX(e.clientX);
            shoot();
            e.preventDefault();
        });

        const flashBar = (el) => {
            const prev = el.style.boxShadow;
            el.style.boxShadow = "0 0 14px 3px rgba(244,67,54,0.9)";
            setTimeout(() => (el.style.boxShadow = prev), 200);
        };

        const updateComboBar = () => {
            const remaining = maxShots - shotsFired;
            comboCountEl.textContent = `${hits} | ${misses} | ${remaining}`;
            const hp = (hits / maxShots) * 100;
            const mp = (misses / maxShots) * 100;
            const rp = (remaining / maxShots) * 100;
            comboHits.style.width = `${hp}%`;
            comboMisses.style.width = `${mp}%`;
            comboRemaining.style.width = `${rp}%`;
        };

        const shoot = () => {
            if (shotsFired < maxShots) {
                bullets.push({x: rocket.x + rocket.w / 2 - 2, y: rocket.y - 10});
                shotsFired++;
                updateComboBar();
            } else {
                flashBar(shadow.getElementById("combo-bar"));
            }
        };

        const drawRocket = (ctx, x, y) => {
            ctx.save();
            ctx.translate(x + rocket.w / 2, y + rocket.h / 2);
            ctx.scale(1.2, 1.2);

            ctx.fillStyle = "#cfd8dc";
            ctx.beginPath();
            ctx.moveTo(0, -20);
            ctx.lineTo(10, 10);
            ctx.lineTo(-10, 10);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = "#607d8b";
            ctx.beginPath();
            ctx.moveTo(-10, 10);
            ctx.lineTo(-18, 18);
            ctx.lineTo(-10, 10);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(10, 10);
            ctx.lineTo(18, 18);
            ctx.lineTo(10, 10);
            ctx.fill();

            const flame = Math.random() * 5 + 5;
            ctx.fillStyle = "#ff9800";
            ctx.beginPath();
            ctx.moveTo(-4, 10);
            ctx.lineTo(0, 10 + flame);
            ctx.lineTo(4, 10);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = "#2196f3";
            ctx.beginPath();
            ctx.arc(0, -5, 3.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        };

        const loop = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (leftPressed) rocket.x -= 5;
            if (rightPressed) rocket.x += 5;
            rocket.x = clamp(rocket.x, 0, canvas.width - rocket.w);

            drawRocket(ctx, rocket.x, rocket.y);

            ctx.fillStyle = "#fff";
            for (let i = bullets.length - 1; i >= 0; i--) {
                const b = bullets[i];
                b.y -= 8;
                if (b.y < -10) {
                    bullets.splice(i, 1);
                    misses++;
                    updateComboBar();
                    continue;
                }
                ctx.fillRect(b.x, b.y, 4, 10);
            }

            const now = performance.now();
            if (now - lastSpawn > 1000) {
                coins.push({x: Math.random() * (canvas.width - 20), y: -20});
                lastSpawn = now;
            }

            ctx.fillStyle = "gold";
            coins.forEach((c) => {
                c.y += 3;
                ctx.beginPath();
                ctx.arc(c.x + 10, c.y + 10, 10, 0, Math.PI * 2);
                ctx.fill();
            });

            for (let i = coins.length - 1; i >= 0; i--) {
                const c = coins[i];
                for (let j = bullets.length - 1; j >= 0; j--) {
                    const b = bullets[j];
                    const hit = b.x > c.x && b.x < c.x + 20 && b.y > c.y && b.y < c.y + 20;
                    if (hit) {
                        coins.splice(i, 1);
                        bullets.splice(j, 1);
                        hits++;
                        gameCoins++;
                        gameCoinsEl.textContent = gameCoins;
                        localStorage.setItem("gameCoins", gameCoins);
                        updateComboBar();
                        break;
                    }
                }
            }

            coins = coins.filter((c) => c.y < canvas.height + 20);

            requestAnimationFrame(loop);
        };

        updateComboBar();
        requestAnimationFrame(loop);
    }
}

customElements.define("rocket-game", RocketGame);
