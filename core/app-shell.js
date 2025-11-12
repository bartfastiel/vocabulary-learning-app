// core/app-shell.js
//
// Layout: headline on top, below a two-column grid with equal-height
// score and streak boxes.
//

import "../vocab/vocab.js";
import "../game/rocket-game.js";
import { PointsManager } from "../vocab/points.js";

class AppShell extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    connectedCallback() {
        this.shadowRoot.innerHTML = `
      <style>
        html, :host, body {
          margin: 0;
          padding: 0;
          height: 100%;
          overflow: hidden;
          font-family: "Segoe UI", sans-serif;
          background: linear-gradient(to right, #74ebd5, #acb6e5);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        #quiz-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        h1 {
          font-size: 2rem;
          margin: 0 0 0.6rem 0;
        }

        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.8rem;
          width: 100%;
          max-width: 420px;
        }

        #score, #streak-box {
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #ffffff88;
          border-radius: 12px;
          padding: 0.6rem 1rem;
          font-size: 1rem;
          min-height: 2.5rem;
          box-sizing: border-box;
          white-space: nowrap;
        }

        #treasure {
          margin-left: 10px;
          cursor: pointer;
          display: none;
        }

        #ship {
          font-size: 1.3rem;
          margin-left: 0.5rem;
        }

        .streak-10 #ship { transform: scale(1.3); }
        .streak-15 #ship { transform: scale(1.6) rotate(15deg); }
        .streak-20 #ship { transform: scale(2) rotate(360deg); }
        .streak-broken #ship { animation: shake 0.5s; color: #e53935; }

        @keyframes shake {
          0% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          50% { transform: translateX(5px); }
          75% { transform: translateX(-5px); }
          100% { transform: translateX(0); }
        }

        #game-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 999;
          display: none;
        }
      </style>

      <div id="quiz-container">
        <h1>🎓 Vokabeltrainer</h1>

        <div class="info-grid">
          <div id="score">
            Punkte: <span id="points">0</span>
            <span id="treasure">🪙</span>
          </div>

          <div id="streak-box">
            Streak: <span id="streak">0</span>&nbsp;
            Rekord: <span id="streak-record">0</span>
            <span id="ship">🚀</span>
          </div>
        </div>

        <vocab-trainer></vocab-trainer>
      </div>

      <div id="game-container"></div>
    `;

        this.init();
    }

    init() {
        const treasureEl = this.shadowRoot.getElementById("treasure");
        const gameContainer = this.shadowRoot.getElementById("game-container");
        const pointsEl = this.shadowRoot.getElementById("points");

        const pointsManager = new PointsManager(this.shadowRoot);

        // Connect trainer with points manager
        const trainer = this.shadowRoot.querySelector("vocab-trainer");
        trainer.points = pointsManager;

        // Placeholder handlers (points.ts will attach real ones)
        const getPoints = () => parseInt(pointsEl.textContent || "0");
        const setPoints = (value) => (pointsEl.textContent = value);

        treasureEl.addEventListener("click", () => {
            const currentPoints = getPoints();
            if (currentPoints < 5) return;

            setPoints(currentPoints - 5);

            // Start game overlay
            gameContainer.style.display = "block";
            const game = document.createElement("rocket-game");
            gameContainer.innerHTML = "";
            gameContainer.append(game);

            // Automatically close overlay when <rocket-game> is removed
            game.addEventListener("remove", () => {
                gameContainer.style.display = "none";
            });
        });
    }
}

customElements.define("app-shell", AppShell);
