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
import "./answer/answer-typewordgerman.js";

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
    {
        question: "vocab-question-wordenglish",
        answer: "vocab-answer-typewordgerman",
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
        this.attachShadow({mode: "open"});
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
          justify-content: center;
          font-family: "Segoe UI", sans-serif;
        }
        #quiz-box {
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
      <div id="quiz-box">
        <div id="question"></div>
        <div id="answer"></div>
      </div>
    `;

        fetch("vocab/vocab.json")
            .then(r => r.json())
            .then(data => {
                this.vocab = shuffle(data);
                this.nextRound();
            })
            .catch(err => {
                this.shadowRoot.querySelector("#question").textContent =
                    "❌ Fehler beim Laden von vocab.json";
                console.error(err);
            });
    }

    nextRound() {
        if (this.index >= this.vocab.length) {
            alert("Alle Vokabeln geschafft!");
            this.index = 0;
            this.vocab = shuffle(this.vocab);
        }

        const word = this.vocab[this.index];
        const mode = MODES[Math.floor(Math.random() * MODES.length)];

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
