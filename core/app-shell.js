// core/app-shell.js
//
// Layout: headline on top, below a two-column grid with equal-height
// score and streak boxes.
//

import "./help-overlay.js";
import "../vocab/vocab.js";
import "../vocab/vocab-editor.js";
import "../game/game-lobby.js";
import { PointsManager } from "../vocab/points.js";
import { getAvatarSVG } from "./avatar-builder.js";

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
          opacity: 1;
          transition: opacity 0.2s, filter 0.2s;
        }
        
        /* Neues Verhalten, wenn nicht genug Punkte */
        #treasure.disabled {
          cursor: default;
          opacity: 0.3;
          filter: grayscale(100%);
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

.top-right-btns {
          position: absolute;
          top: 10px; right: 12px;
          display: flex; flex-direction: column; gap: 6px;
        }
        #info-btn, #edit-vocab-btn {
          font-size: 0.95rem;
          background: #26c6da;
          color: white;
          border: none;
          padding: 0.4rem 0.7rem;
          border-radius: 8px;
          cursor: pointer;
          white-space: nowrap;
        }
        #info-btn:hover, #edit-vocab-btn:hover { background: #00acc1; }

        #avatar-btn {
          position: absolute;
          top: 10px;
          left: 12px;
          width: 46px;
          height: 46px;
          border-radius: 50%;
          overflow: hidden;
          cursor: pointer;
          border: 3px solid rgba(255,255,255,0.8);
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          transition: transform 0.2s, box-shadow 0.2s;
          background: #e0f7fa;
        }
        #avatar-btn:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 14px rgba(0,0,0,0.3);
        }
        #avatar-mini { width: 100%; height: 100%; }
        #avatar-mini svg { width: 100%; height: 100%; display: block; }

      </style>

      <div class="top-right-btns">
        <button id="info-btn">ⓘ Hilfe</button>
        <button id="edit-vocab-btn">✏️ Vokabeln</button>
      </div>
      <div id="avatar-btn" title="Avatar bearbeiten">
        <div id="avatar-mini"></div>
      </div>
      <vocab-help></vocab-help>
      <avatar-builder></avatar-builder>
      <vocab-editor></vocab-editor>

      <div id="quiz-container">
        <h1>🎓 Vokabeltrainer</h1>

        <div class="info-grid">
          <div id="score">
            Punkte: <span id="points">0</span>
            <span id="treasure" title="Fun-Spiele">🎮</span>
          </div>

          <div id="streak-box">
            Streak: <span id="streak">0</span>&nbsp;
            Rekord: <span id="streak-record">0</span>
            <span id="ship">🚀</span>
          </div>
        </div>

        <vocab-trainer></vocab-trainer>
      </div>

      <game-lobby></game-lobby>
    `;

        this.init();
    }

    init() {
        const treasureEl = this.shadowRoot.getElementById("treasure");
        const pointsManager = new PointsManager(this.shadowRoot);

        // Connect trainer with points manager
        const trainer = this.shadowRoot.querySelector("vocab-trainer");
        trainer.points = pointsManager;

        // Connect game lobby with points manager
        const gameLobby = this.shadowRoot.querySelector("game-lobby");
        gameLobby.pointsManager = pointsManager;

        treasureEl.addEventListener("click", () => {
            if (treasureEl.classList.contains("disabled")) return;
            gameLobby.open();
        });

        // Avatar
        const avatarMini = this.shadowRoot.getElementById("avatar-mini");
        const avatarBuilder = this.shadowRoot.querySelector("avatar-builder");
        const refreshAvatar = () => { avatarMini.innerHTML = getAvatarSVG(); };
        refreshAvatar();
        this.shadowRoot.getElementById("avatar-btn").onclick = () => avatarBuilder.open();
        this.shadowRoot.addEventListener("avatar-saved", refreshAvatar);

        // Vocab editor
        const vocabEditor = this.shadowRoot.querySelector("vocab-editor");
        this.shadowRoot.getElementById("edit-vocab-btn").onclick = () => vocabEditor.open();
        this.shadowRoot.addEventListener("vocab-updated", () => trainer.reload());

        const help = this.shadowRoot.querySelector("vocab-help");
        const infoBtn = this.shadowRoot.getElementById("info-btn");

        infoBtn.onclick = () => this.startHelp(help);

        if (!localStorage.getItem("vocabHelpSeen")) {
            setTimeout(() => this.startHelp(help), 500);
        }
    }

    async startHelp(help) {

        // Warten bis vocab-trainer im Shadow DOM sichtbar ist
        const trainer = await this.waitFor(() =>
            this.shadowRoot.querySelector("vocab-trainer")
        );
        if (!trainer) return console.warn("Tutorial: Kein vocab-trainer gefunden");

        // Warten bis ShadowRoot existiert
        await this.waitFor(() => trainer.shadowRoot);

        // jetzt im inneren Shadow warten:
        await this.waitFor(() => trainer.shadowRoot.querySelector(".lesson-header"));
        await this.waitFor(() => trainer.shadowRoot.querySelector("#question"));
        await this.waitFor(() => trainer.shadowRoot.querySelector("#answer"));

        help.start([
            {
                selector: () =>
                    trainer.shadowRoot.querySelector(".lesson-header"),
                text: "Hier kannst du die Lesson auswählen."
            },
            {
                selector: () =>
                    trainer.shadowRoot.querySelector("#question"),
                text: "Hier steht die Aufgabe."
            },
            {
                selector: () =>
                    trainer.shadowRoot.querySelector("#answer"),
                text: "Hier gibst du deine Antwort ein."
            },
            {
                selector: () => this.shadowRoot.querySelector("#treasure"),
                text: "Hier findest du den Taler. Sobald du 5 Punkte hast, kannst du damit das Spiel starten!"
            },
        ]);
    }

    waitFor(fn, interval = 50, timeout = 2000) {
        return new Promise(resolve => {
            const start = performance.now();
            const tick = () => {
                const result = fn();
                console.log("waitFor tick:", result);
                if (result) return resolve(result);
                if (performance.now() - start > timeout) return resolve(null);
                setTimeout(tick, interval);
            };
            tick();
        });
    }
}

customElements.define("app-shell", AppShell);
