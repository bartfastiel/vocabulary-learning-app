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

// === HELPERS ===
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
        }

        #set-bar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          display: flex;
          justify-content: center;
          gap: 0.5rem;
          background: rgba(255, 255, 255, 0.8);
          padding: 0.4rem;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
          z-index: 10;
        }

        .set-btn {
          background: #4dd0e1;
          border: none;
          border-radius: 8px;
          padding: 0.4rem 0.9rem;
          font-size: 0.95rem;
          cursor: pointer;
        }

        .set-btn.active {
          background: #26c6da;
          font-weight: bold;
        }

        #quiz-box {
          margin-top: 3.2rem;
          background-color: white;
          border-radius: 16px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.2);
          padding: 1.5rem;
          max-width: 90vw;
          width: 400px;
          text-align: center;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
      </style>

      <div id="set-bar"></div>
      <div id="quiz-box">
        <div id="question"></div>
        <div id="answer"></div>
      </div>
    `;

        this.loadSets();
    }

    async loadSets() {
        try {
            // Robust relativ zur Moduldatei (vocab/vocab.js) auflösen:
            const url = new URL('./vocab.json', import.meta.url).href;

            // Optional: no-cache, um Safari/S3-Caching-Fallen zu vermeiden
            const res = await fetch(url, { cache: 'no-cache' });
            const data = await res.json();

            this.vocabSets = data;
            this.renderSetButtons();
            if (this.vocabSets.length > 0) this.loadSet(0);
        } catch (err) {
            this.shadowRoot.querySelector("#question").textContent =
                "❌ Fehler beim Laden von vocab.json";
            console.error("Fehler beim Laden von vocab.json:", err);
        }
    }

    renderSetButtons() {
        const bar = this.shadowRoot.querySelector("#set-bar");
        bar.innerHTML = "";
        this.vocabSets.forEach((set, i) => {
            const btn = document.createElement("button");
            btn.textContent = set.name;
            btn.className = "set-btn";
            btn.onclick = () => this.loadSet(i);
            bar.appendChild(btn);
        });
    }

    loadSet(index) {
        const bar = this.shadowRoot.querySelector("#set-bar");
        bar.querySelectorAll(".set-btn").forEach((b, i) => {
            b.classList.toggle("active", i === index);
        });

        this.currentSet = this.vocabSets[index];
        this.vocab = shuffle([...this.currentSet.words]);
        this.index = 0;
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
