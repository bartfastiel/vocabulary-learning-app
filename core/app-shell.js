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
          margin: 0; padding: 0; height: 100%; overflow: hidden;
          font-family: "Segoe UI", sans-serif;
          background: #0d0d2b;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
        }

        /* ── Animated background ── */
        #bg {
          position: fixed; inset: 0; z-index: 0;
          background: linear-gradient(135deg, #0d0d2b 0%, #1a0533 50%, #0d1f3c 100%);
          animation: bgShift 12s ease-in-out infinite alternate;
        }
        @keyframes bgShift {
          0%   { background: linear-gradient(135deg, #0d0d2b, #1a0533, #0d1f3c); }
          50%  { background: linear-gradient(135deg, #0f1f40, #200d40, #0d2b1f); }
          100% { background: linear-gradient(135deg, #150d2b, #0d2040, #2b0d1a); }
        }

        .orb {
          position: absolute; border-radius: 50%;
          filter: blur(80px); opacity: 0.45;
          animation: float 14s ease-in-out infinite;
        }
        .orb1 { width: 420px; height: 420px; background: #7c3aed; top: -120px; left: -100px; animation-duration: 16s; }
        .orb2 { width: 350px; height: 350px; background: #06b6d4; bottom: -80px; right: -80px; animation-duration: 12s; animation-delay: -4s; }
        .orb3 { width: 280px; height: 280px; background: #10b981; top: 40%; left: 60%; animation-duration: 18s; animation-delay: -8s; }
        .orb4 { width: 200px; height: 200px; background: #f59e0b; top: 20%; right: 20%; animation-duration: 10s; animation-delay: -2s; }

        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33%       { transform: translate(30px, -40px) scale(1.08); }
          66%       { transform: translate(-20px, 20px) scale(0.95); }
        }

        /* ── Layout ── */
        #quiz-container {
          position: relative; z-index: 1;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
        }

        h1 {
          font-size: 2rem; margin: 0 0 0.6rem 0;
          color: #fff;
          text-shadow: 0 0 20px rgba(124,58,237,0.9), 0 0 40px rgba(6,182,212,0.6);
          animation: titleGlow 3s ease-in-out infinite alternate;
        }
        @keyframes titleGlow {
          from { text-shadow: 0 0 16px rgba(124,58,237,0.8), 0 0 32px rgba(6,182,212,0.5); }
          to   { text-shadow: 0 0 28px rgba(124,58,237,1),   0 0 56px rgba(6,182,212,0.9), 0 0 80px rgba(16,185,129,0.4); }
        }

        .info-grid {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 0.8rem; width: 100%; max-width: 420px;
        }

        #score, #streak-box {
          display: flex; align-items: center; justify-content: center;
          background: rgba(255,255,255,0.08);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255,255,255,0.18);
          border-radius: 14px;
          padding: 0.6rem 1rem; font-size: 1rem;
          min-height: 2.5rem; box-sizing: border-box;
          white-space: nowrap; color: #fff;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15);
        }

        #treasure {
          margin-left: 10px; cursor: pointer;
          transition: transform 0.2s, filter 0.2s, opacity 0.2s;
          animation: treasurePulse 2s ease-in-out infinite;
        }
        @keyframes treasurePulse {
          0%, 100% { filter: drop-shadow(0 0 4px #f59e0b); }
          50%       { filter: drop-shadow(0 0 12px #f59e0b) drop-shadow(0 0 24px #fbbf24); }
        }
        #treasure.disabled {
          cursor: default; opacity: 0.25;
          filter: grayscale(100%); animation: none;
        }
        #treasure:not(.disabled):hover { transform: scale(1.3); }

        #ship { font-size: 1.3rem; margin-left: 0.5rem; }
        .streak-10 #ship { transform: scale(1.3); }
        .streak-15 #ship { transform: scale(1.6) rotate(15deg); }
        .streak-20 #ship { transform: scale(2) rotate(360deg); }
        .streak-broken #ship { animation: shake 0.5s; color: #e53935; }

        @keyframes shake {
          0%   { transform: translateX(0); }
          25%  { transform: translateX(-5px); }
          50%  { transform: translateX(5px); }
          75%  { transform: translateX(-5px); }
          100% { transform: translateX(0); }
        }

        /* ── Buttons ── */
        .top-right-btns {
          position: absolute; top: 10px; right: 12px; z-index: 2;
          display: flex; flex-direction: column; gap: 6px;
        }
        #info-btn, #edit-vocab-btn {
          font-size: 0.95rem;
          background: rgba(99,102,241,0.75);
          backdrop-filter: blur(8px);
          color: white; border: 1px solid rgba(255,255,255,0.25);
          padding: 0.4rem 0.7rem; border-radius: 10px;
          cursor: pointer; white-space: nowrap;
          box-shadow: 0 0 12px rgba(99,102,241,0.5);
          transition: background 0.2s, box-shadow 0.2s, transform 0.15s;
        }
        #info-btn:hover, #edit-vocab-btn:hover {
          background: rgba(99,102,241,1);
          box-shadow: 0 0 20px rgba(99,102,241,0.9);
          transform: translateY(-2px);
        }

        /* ── Avatar ── */
        #avatar-btn {
          position: absolute; top: 10px; left: 12px; z-index: 2;
          width: 46px; height: 46px; border-radius: 50%;
          overflow: hidden; cursor: pointer;
          border: 2px solid rgba(255,255,255,0.4);
          box-shadow: 0 0 14px rgba(124,58,237,0.7), 0 0 28px rgba(6,182,212,0.4);
          transition: transform 0.2s, box-shadow 0.2s;
          background: #1e1b4b;
        }
        #avatar-btn:hover {
          transform: scale(1.12);
          box-shadow: 0 0 22px rgba(124,58,237,1), 0 0 44px rgba(6,182,212,0.7);
        }
        #avatar-mini { width: 100%; height: 100%; }
        #avatar-mini svg { width: 100%; height: 100%; display: block; }

      </style>

      <div id="bg">
        <div class="orb orb1"></div>
        <div class="orb orb2"></div>
        <div class="orb orb3"></div>
        <div class="orb orb4"></div>
      </div>

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
        vocabEditor.onSaved = () => {
            trainer.reload();
            trainer.togglePopup(true);
        };
        vocabEditor.addEventListener("vocab-updated", () => trainer.reload());

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
