// core/app-shell.js
//
// Root-level component that reproduces the original HTML layout.
// Hosts the vocab trainer and (when triggered) the rocket mini-game.
// No logic related to scoring or vocab — only frame, layout, and toggling.
//

import "../vocab/vocab.js";
import "../game/rocket-game.js";
import {PointsManager} from "../vocab/points.js";

class AppShell extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({mode: "open"});
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

        h1 {
          font-size: 2rem;
          margin-bottom: 0.4rem;
        }

        #score, #streak-box {
          font-size: 1rem;
          margin-bottom: 0.4rem;
          background-color: #ffffff88;
          padding: 0.4rem 1rem;
          border-radius: 12px;
        }

        #treasure {
          margin-left: 10px;
          cursor: pointer;
          display: none;
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

        #quiz-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        #ship {
          font-size: 2rem;
          margin-top: 0.3rem;
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
      </style>

      <div id="quiz-container">
        <h1>🎓 Vokabeltrainer</h1>

        <div id="score">
          Punkte: <span id="points">0</span>
          <span id="treasure">🪙</span>
        </div>

        <div id="streak-box">
          Streak: <span id="streak">0</span> |
          Rekord: <span id="streak-record">0</span>
          <div id="ship">🚀</div>
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
