// vocab/vocab.js
//
// Pure orchestration: connects question and answer components.
// No points, streaks, or treasure logic.
// No mode-specific behavior — just flow control.
//

// --- imports (all lowercase names and explicit paths) ---
import "./points.js";

// Question types
import "./question/question-wordgerman.js";
import "./question/question-wordenglish.js";
import "./question/question-voiceenglish.js";
import "./question/question-image.js";

// Answer types
import "./answer/answer-choosewordenglish.js";
import "./answer/answer-choosewordgerman.js";
import "./answer/answer-choosevoiceenglish.js";
import "./answer/answer-typewordenglish.js";
import "./answer/answer-chooseimage.js";

// === CONSTANTS ===
// All available question–answer combinations
const MODES = [
    // === Text-based (German → English) ===
    {
        question: "vocab-question-wordgerman",
        answer: "vocab-answer-choosewordenglish",
    },
    {
        question: "vocab-question-wordgerman",
        answer: "vocab-answer-typewordenglish",
    },

    // === Text-based (English → German) ===
    {
        question: "vocab-question-wordenglish",
        answer: "vocab-answer-choosewordgerman",
    },

    // === Audio question → English answers ===
    {
        question: "vocab-question-voiceenglish",
        answer: "vocab-answer-choosewordenglish",
    },
    {
        question: "vocab-question-voiceenglish",
        answer: "vocab-answer-typewordenglish",
    },
    {
        question: "vocab-question-voiceenglish",
        answer: "vocab-answer-choosevoiceenglish",
    },

    // === Image question → English answers ===
    {
        question: "vocab-question-image",
        answer: "vocab-answer-choosewordenglish",
    },
    {
        question: "vocab-question-image",
        answer: "vocab-answer-typewordenglish",
    },

    // === Audio question → Image answers ===
    {
        question: "vocab-question-voiceenglish",
        answer: "vocab-answer-chooseimage",
    },

    // === Text question → Image answers ===
    {
        question: "vocab-question-wordenglish",
        answer: "vocab-answer-chooseimage",
    },

    // === Future slots (planned / optional) ===
    // { question: "vocab-question-descriptionenglish", answer: "vocab-answer-choosewordenglish" },
    // { question: "vocab-question-wordgerman", answer: "vocab-answer-fillmissinglettersenglish" },
    // { question: "vocab-question-wordenglish", answer: "vocab-answer-chooseimage" },
];

function shuffle(arr) {
    return arr.sort(() => Math.random() - 0.5);
}

// === COMPONENT ===
class VocabTrainer extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this.vocabSets = [];
        this.vocab = [];
        this.index = 0;
    }

    connectedCallback() {
        this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          font-family: "Segoe UI", sans-serif;
          width: 100%;
          position: relative;
        }

        .lesson-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: relative;
          background: radial-gradient(circle at 20% 30%, #4dd0e1 0%, #007ea7 100%);
          color: #fff;
          border-radius: 14px 14px 0 0;
          padding: 0.9rem 1.2rem;
          cursor: pointer;
          user-select: none;
          font-size: 1.1rem;
          font-weight: 500;
          width: 400px;
          max-width: 90vw;
          margin-top: 1.2rem; /* etwas Abstand nach oben */
          box-shadow: 0 0 15px rgba(0, 200, 255, 0.25),
                      inset 0 0 12px rgba(255, 255, 255, 0.1);
          overflow: hidden;
          transition: box-shadow 0.3s ease, transform 0.2s ease;
        }
        
        .lesson-header::before {
          content: "";
          position: absolute;
          top: -100%;
          left: -100%;
          width: 300%;
          height: 300%;
          background: conic-gradient(from 180deg at 50% 50%, 
                      rgba(255, 255, 255, 0.15), 
                      transparent 30%, 
                      rgba(255, 255, 255, 0.15), 
                      transparent 60%);
          opacity: 0;
          transition: opacity 0.5s ease, transform 0.8s ease;
          z-index: 0;
        }
        
        .lesson-header:hover::before {
          opacity: 1;
          transform: rotate(20deg);
        }
        
        .lesson-header:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 25px rgba(0, 240, 255, 0.5),
                      inset 0 0 20px rgba(255, 255, 255, 0.15);
        }
        
        .lesson-header span.title {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          z-index: 1;
        }
        
        .lesson-header .burger {
          font-size: 1.5rem;
          margin-left: 0.8rem;
          line-height: 1;
          transition: transform 0.3s ease;
          z-index: 1;
        }
        
        .lesson-header:hover .burger {
          transform: rotate(90deg) scale(1.2);
          filter: drop-shadow(0 0 4px cyan);
        }

        .lesson-header span.title {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .lesson-header .burger {
          font-size: 1.4rem;
          margin-left: 0.8rem;
          line-height: 1;
          transition: transform 0.2s ease;
        }

        .lesson-header:hover .burger {
          transform: rotate(90deg);
        }

        #quiz-box {
          background-color: white;
          border-radius: 0 0 16px 16px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.2);
          padding: 1.5rem;
          max-width: 90vw;
          width: 400px;
          text-align: center;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        /* Popup */
        .lesson-popup {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
          padding: 1rem;
          width: 320px;
          max-width: 90vw;
          z-index: 200;
          display: none;
        }

        .lesson-popup.active { display: block; }

        .lesson-popup h2 {
          font-size: 1.1rem;
          margin: 0 0 0.8rem 0;
          text-align: center;
        }

        .lesson-popup .set-list {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
          max-height: 50vh;
          overflow-y: auto;
        }

        .lesson-popup button {
          background: #4dd0e1;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 0.6rem 1rem;
          font-size: 1rem;
          cursor: pointer;
          transition: background 0.2s;
        }

        .lesson-popup button:hover {
          background: #26c6da;
        }

        .lesson-popup button.active {
          background: #0097a7;
          font-weight: bold;
        }

        .lesson-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.4);
          z-index: 150;
          display: none;
        }

        .lesson-overlay.active { display: block; }
      </style>

      <!-- Lesson header -->
      <div class="lesson-header">
        <span class="title">Lektion: –</span>
        <span class="burger">☰</span>
      </div>

      <!-- Main white box -->
      <div id="quiz-box">
        <div id="question"></div>
        <div id="answer"></div>
      </div>

      <!-- Popup and overlay -->
      <div class="lesson-overlay"></div>
      <div class="lesson-popup">
        <h2>Lektion wählen</h2>
        <div class="set-list"></div>
      </div>
    `;

        this.loadSets();
        this.setupPopup();
    }

    setupPopup() {
        const header = this.shadowRoot.querySelector(".lesson-header");
        const overlay = this.shadowRoot.querySelector(".lesson-overlay");
        const popup = this.shadowRoot.querySelector(".lesson-popup");

        const togglePopup = (show) => {
            overlay.classList.toggle("active", show);
            popup.classList.toggle("active", show);
        };

        header.addEventListener("click", () => togglePopup(true));
        overlay.addEventListener("click", () => togglePopup(false));

        this.togglePopup = togglePopup;
    }

    async loadSets() {
        try {
            const base = location.origin;
            const data = await fetch(`vocab/vocab.json`).then(r => r.json());

            this.vocabSets = data;
            this.renderPopupButtons();
            if (this.vocabSets.length > 0) this.loadSet(0);
        } catch (err) {
            this.shadowRoot.querySelector("#question").textContent =
                "❌ Fehler beim Laden von vocab.json";
            console.error("Fehler beim Laden von vocab.json:", err);
        }
    }

    renderPopupButtons() {
        const list = this.shadowRoot.querySelector(".set-list");
        list.innerHTML = "";
        this.vocabSets.forEach((set, i) => {
            const btn = document.createElement("button");
            btn.textContent = set.name;
            btn.className = "set-btn";
            btn.onclick = () => {
                this.loadSet(i);
                this.togglePopup(false);
            };
            list.appendChild(btn);
        });
    }

    updateHeaderTitle(name) {
        const title = this.shadowRoot.querySelector(".lesson-header .title");
        title.textContent = `Lektion: ${name}`;
    }

    loadSet(index) {
        const list = this.shadowRoot.querySelector(".set-list");
        list.querySelectorAll("button").forEach((b, i) => {
            b.classList.toggle("active", i === index);
        });

        this.currentSet = this.vocabSets[index];
        this.vocab = shuffle([...this.currentSet.words]);
        this.index = 0;
        this.updateHeaderTitle(this.currentSet.name);
        this.nextRound();
    }

    nextRound() {
        if (this.index >= this.vocab.length) {
            alert(`Alle Vokabeln aus „${this.currentSet.name}“ geschafft!`);
            this.index = 0;
            this.vocab = shuffle(this.vocab);
        }

        const word = this.vocab[this.index];
        const availableModes = MODES.filter(mode => {
            if (word.allowImage) return true;
            return mode.question !== "vocab-question-image" &&
                mode.answer !== "vocab-answer-chooseimage";
        });
        const mode = availableModes[Math.floor(Math.random() * availableModes.length)];

        const qEl = document.createElement(mode.question);
        const aEl = document.createElement(mode.answer);

        qEl.word = word;
        aEl.data = {
            word,
            vocabulary: this.vocab,
            updatePoints: delta => this.points?.updatePoints(delta),
            updateStreak: correct => this.points?.updateStreak(correct),
            soundCorrect: new Audio("assets/audio/ding.mp3"),
            soundWrong: new Audio("assets/audio/buzz.mp3")
        };

        const questionHost = this.shadowRoot.querySelector("#question");
        const answerHost = this.shadowRoot.querySelector("#answer");
        questionHost.innerHTML = "";
        answerHost.innerHTML = "";
        questionHost.append(qEl);
        answerHost.append(aEl);

        aEl.addEventListener("answered", () => {
            this.index++;
            this.nextRound();
        });
    }
}

customElements.define("vocab-trainer", VocabTrainer);
