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

// === MASCOT MESSAGES ===
const MASCOT_CORRECT = [
    "Super gemacht! 🎉", "Richtig! Weiter so! 💪", "Genau! Du bist toll! ⭐",
    "Perfekt! 👏", "Klasse! Das sitzt! 🔥", "Yeah! Volltreffer! 🎯",
    "Wow, du kannst das! 🌟", "Stark! Weiter so! 💫",
];
const MASCOT_WRONG = [
    "Nicht schlimm, versuch's nochmal! 💪", "Fast! Nächstes Mal klappt's! 🍀",
    "Kopf hoch! Übung macht den Meister! 📚", "Das wird schon! Bleib dran! 💪",
];
const MASCOT_STREAK = [
    { min: 3, msg: "3er Streak! Du bist auf Kurs! 🚀" },
    { min: 5, msg: "5er Streak! Unaufhaltsam! 🔥" },
    { min: 10, msg: "10er Streak! Du bist ein Profi! 🏆" },
    { min: 15, msg: "15er Streak! Einfach unglaublich! 🌈" },
    { min: 20, msg: "20er Streak! LEGENDÄR! 👑" },
];

function randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// === COMPONENT ===
class VocabTrainer extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this.vocabSets = [];
        this.vocab = [];
        this.index = 0;
        // lesson stats
        this._correct = 0;
        this._wrong = 0;
        this._bestStreak = 0;
        this._currentStreak = 0;
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
          display: flex; align-items: center; justify-content: space-between;
          position: relative; overflow: hidden;
          background: linear-gradient(135deg, rgba(3,60,110,0.92) 0%, rgba(7,100,160,0.92) 100%);
          backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
          border: 1px solid rgba(56,189,248,0.45);
          color: #bae6fd; border-radius: 16px 16px 0 0;
          padding: 0.9rem 1.2rem; cursor: pointer; user-select: none;
          font-size: 1.1rem; font-weight: 600;
          width: 400px; max-width: 90vw; margin-top: 1.2rem;
          box-shadow: 0 0 24px rgba(14,165,233,0.5), 0 0 50px rgba(56,189,248,0.2);
          transition: box-shadow 0.3s, transform 0.2s;
        }
        .lesson-header::after {
          content: ""; position: absolute; inset: 0;
          background: linear-gradient(90deg, transparent, rgba(56,189,248,0.2), transparent);
          transform: translateX(-100%);
          transition: transform 0.6s ease;
        }
        .lesson-header:hover::after { transform: translateX(100%); }
        .lesson-header:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 36px rgba(14,165,233,0.9), 0 0 70px rgba(56,189,248,0.5);
        }
        .lesson-header span.title {
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap; z-index: 1;
        }
        .lesson-header .burger {
          font-size: 1.4rem; margin-left: 0.8rem; line-height: 1;
          transition: transform 0.3s, filter 0.3s; z-index: 1;
        }
        .lesson-header:hover .burger {
          transform: rotate(90deg) scale(1.2);
          filter: drop-shadow(0 0 8px #38bdf8);
        }

        #quiz-box {
          background: rgba(4,20,45,0.75);
          backdrop-filter: blur(22px); -webkit-backdrop-filter: blur(22px);
          border: 1px solid rgba(56,189,248,0.3);
          border-top: none;
          border-radius: 0 0 18px 18px;
          box-shadow: 0 20px 60px rgba(14,165,233,0.2), inset 0 1px 0 rgba(56,189,248,0.15);
          padding: 1.5rem; max-width: 90vw; width: 400px;
          text-align: center; color: #e0f2fe;
          display: flex; flex-direction: column; justify-content: space-between;
        }

        /* Mascot */
        .mascot {
          display: flex; align-items: center; gap: 0.6rem;
          background: rgba(14,165,233,0.15);
          border: 1px solid rgba(56,189,248,0.3);
          border-radius: 12px; padding: 0.5rem 0.8rem;
          margin-bottom: 0.8rem; min-height: 48px;
          transition: all 0.3s ease;
        }
        .mascot-face {
          font-size: 2rem; flex-shrink: 0;
          animation: mascot-bounce 0.6s ease;
        }
        .mascot-bubble {
          font-size: 0.85rem; color: #bae6fd;
          line-height: 1.3; text-align: left;
        }
        .mascot.correct { background: rgba(34,197,94,0.2); border-color: rgba(34,197,94,0.4); }
        .mascot.wrong { background: rgba(239,68,68,0.2); border-color: rgba(239,68,68,0.4); }
        .mascot.streak { background: rgba(251,191,36,0.2); border-color: rgba(251,191,36,0.4); }
        @keyframes mascot-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }

        /* Progress bar */
        .progress-wrap {
          width: 100%; height: 6px; background: rgba(56,189,248,0.15);
          border-radius: 3px; margin-bottom: 0.6rem; overflow: hidden;
        }
        .progress-bar {
          height: 100%; background: linear-gradient(90deg, #38bdf8, #22d3ee);
          border-radius: 3px; transition: width 0.4s ease;
        }

        /* Summary overlay */
        .summary-overlay {
          position: fixed; inset: 0; z-index: 300;
          background: rgba(0,5,15,0.85);
          backdrop-filter: blur(10px);
          display: flex; align-items: center; justify-content: center;
        }
        .summary-overlay.hidden { display: none; }
        .summary-box {
          background: linear-gradient(135deg, rgba(3,60,110,0.95), rgba(7,100,160,0.95));
          border: 1px solid rgba(56,189,248,0.5);
          border-radius: 20px; padding: 2rem 1.5rem;
          width: 340px; max-width: 92vw; text-align: center;
          box-shadow: 0 0 40px rgba(14,165,233,0.4);
          color: #e0f2fe;
        }
        .summary-box h2 {
          font-size: 1.5rem; margin: 0 0 0.3rem;
          color: #38bdf8;
        }
        .summary-sub { color: #7dd3fc; font-size: 0.9rem; margin: 0 0 1.2rem; }
        .summary-trophy { font-size: 4rem; margin-bottom: 0.8rem; }
        .summary-stats {
          display: flex; gap: 0.6rem; justify-content: center;
          margin-bottom: 1.2rem;
        }
        .summary-stat {
          flex: 1; background: rgba(14,165,233,0.15);
          border: 1px solid rgba(56,189,248,0.3);
          border-radius: 12px; padding: 0.7rem 0.4rem;
        }
        .summary-stat-value {
          font-size: 1.6rem; font-weight: 800;
        }
        .summary-stat-value.green { color: #4ade80; }
        .summary-stat-value.red { color: #f87171; }
        .summary-stat-value.gold { color: #fbbf24; }
        .summary-stat-value.blue { color: #38bdf8; }
        .summary-stat-label {
          font-size: 0.7rem; color: #7dd3fc; margin-top: 0.2rem;
        }
        .summary-btn {
          width: 100%; padding: 0.8rem;
          background: linear-gradient(90deg, #0ea5e9, #22d3ee);
          border: none; border-radius: 12px;
          color: white; font-size: 1rem; font-weight: 700;
          cursor: pointer; transition: filter 0.2s;
        }
        .summary-btn:hover { filter: brightness(1.15); }

        /* Popup */
        .lesson-popup {
          position: fixed; top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(4,20,45,0.96);
          backdrop-filter: blur(22px); -webkit-backdrop-filter: blur(22px);
          border: 1px solid rgba(56,189,248,0.4);
          border-radius: 16px;
          box-shadow: 0 0 40px rgba(14,165,233,0.4), 0 20px 60px rgba(0,0,0,0.5);
          padding: 1rem; width: 320px; max-width: 90vw;
          z-index: 200; display: none; color: #bae6fd;
        }

        .lesson-popup.active { display: block; }

        .lesson-popup h2 {
          font-size: 1.1rem; margin: 0 0 0.8rem 0;
          text-align: center; color: #38bdf8;
        }

        .lesson-popup .set-list {
          display: flex; flex-direction: column;
          gap: 0.6rem; max-height: 50vh; overflow-y: auto;
        }

        .lesson-popup button {
          background: rgba(14,105,163,0.3);
          color: #bae6fd; border: 1px solid rgba(56,189,248,0.35);
          border-radius: 10px; padding: 0.6rem 1rem;
          font-size: 1rem; cursor: pointer;
          transition: background 0.2s, box-shadow 0.2s, transform 0.15s;
        }
        .lesson-popup button:hover {
          background: rgba(14,165,233,0.4);
          box-shadow: 0 0 16px rgba(56,189,248,0.5);
          transform: translateX(4px);
        }
        .lesson-popup button.active {
          background: rgba(3,105,161,0.8);
          box-shadow: 0 0 22px rgba(56,189,248,0.6);
          font-weight: bold; color: #e0f2fe;
        }

        .lesson-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,5,15,0.75);
          backdrop-filter: blur(6px);
          z-index: 150; display: none;
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
        <div class="mascot" id="mascot">
          <span class="mascot-face" id="mascot-face">🦉</span>
          <span class="mascot-bubble" id="mascot-bubble">Los geht's! Du schaffst das!</span>
        </div>
        <div class="progress-wrap">
          <div class="progress-bar" id="progress-bar" style="width:0%"></div>
        </div>
        <div id="question"></div>
        <div id="answer"></div>
      </div>

      <!-- Summary overlay -->
      <div class="summary-overlay hidden" id="summary-overlay">
        <div class="summary-box">
          <div class="summary-trophy" id="summary-trophy">🏆</div>
          <h2 id="summary-title">Lektion geschafft!</h2>
          <p class="summary-sub" id="summary-sub"></p>
          <div class="summary-stats">
            <div class="summary-stat">
              <div class="summary-stat-value green" id="sum-correct">0</div>
              <div class="summary-stat-label">Richtig</div>
            </div>
            <div class="summary-stat">
              <div class="summary-stat-value red" id="sum-wrong">0</div>
              <div class="summary-stat-label">Falsch</div>
            </div>
            <div class="summary-stat">
              <div class="summary-stat-value gold" id="sum-streak">0</div>
              <div class="summary-stat-label">Bester Streak</div>
            </div>
            <div class="summary-stat">
              <div class="summary-stat-value blue" id="sum-percent">0%</div>
              <div class="summary-stat-label">Ergebnis</div>
            </div>
          </div>
          <button class="summary-btn" id="summary-btn">Nochmal spielen</button>
        </div>
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

        header.addEventListener("click", () => {
            const custom = this._loadCustom();
            this.vocabSets = [...(this._builtinSets ?? []), ...custom];
            this.renderPopupButtons();
            togglePopup(true);
        });
        overlay.addEventListener("click", () => togglePopup(false));

        this.togglePopup = togglePopup;
    }

    async loadSets() {
        try {
            const data = await fetch(`vocab/vocab.json`).then(r => r.json());
            // Built-in vocab sets only show for the "englisch" subject
            this._builtinSets = (this._subject || "englisch") === "englisch" ? data : [];
            this._mergeAndRender();
        } catch (err) {
            this.shadowRoot.querySelector("#question").textContent =
                "❌ Fehler beim Laden von vocab.json";
            console.error("Fehler beim Laden von vocab.json:", err);
        }
    }

    _loadCustom() {
        try {
            const all = JSON.parse(localStorage.getItem("customVocab") || "[]");
            const subject = this._subject || "englisch";
            return all.filter(s => (s.subject || "englisch") === subject);
        } catch { return []; }
    }

    _mergeAndRender(keepCurrentSet = false) {
        const custom   = this._loadCustom();
        this.vocabSets = [...(this._builtinSets ?? []), ...custom];
        this.renderPopupButtons();
        if (!keepCurrentSet && this.vocabSets.length > 0) this.loadSet(0);
    }

    /** Called when custom vocab changes — switches to the last (newly added) lesson. */
    reload() {
        const custom = this._loadCustom();
        this.vocabSets = [...(this._builtinSets ?? []), ...custom];
        this.renderPopupButtons();
        if (this.vocabSets.length > 0) {
            this.loadSet(this.vocabSets.length - 1);
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
        this._correct = 0;
        this._wrong = 0;
        this._bestStreak = 0;
        this._currentStreak = 0;
        this._setMascot("🦉", "Los geht's! Du schaffst das!");
        this._updateProgress();
        this.updateHeaderTitle(this.currentSet.name);
        this.nextRound();
    }

    nextRound() {
        if (this.index >= this.vocab.length) {
            this._showSummary();
            return;
        }

        this._updateProgress();

        const word = this.vocab[this.index];
        const needsDistractors = [
            "vocab-answer-choosewordenglish",
            "vocab-answer-choosewordgerman",
            "vocab-answer-choosevoiceenglish",
            "vocab-answer-chooseimage",
        ];
        const availableModes = MODES.filter(mode => {
            if (!word.allowImage && (mode.question === "vocab-question-image" || mode.answer === "vocab-answer-chooseimage")) return false;
            if (this.vocab.length < 4 && needsDistractors.includes(mode.answer)) return false;
            return true;
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

        aEl.addEventListener("answered", (e) => {
            const isCorrect = e.detail?.correct;
            if (isCorrect) {
                this._correct++;
                this._currentStreak++;
                if (this._currentStreak > this._bestStreak) this._bestStreak = this._currentStreak;
                // Check streak milestone first
                const streakMsg = [...MASCOT_STREAK].reverse().find(s => this._currentStreak === s.min);
                if (streakMsg) {
                    this._setMascot("🔥", streakMsg.msg, "streak");
                } else {
                    this._setMascot("😄", randomFrom(MASCOT_CORRECT), "correct");
                }
            } else {
                this._wrong++;
                this._currentStreak = 0;
                this._setMascot("🤗", randomFrom(MASCOT_WRONG), "wrong");
            }
            this.index++;
            this.nextRound();
        });
    }

    _setMascot(face, text, mood = "") {
        const mascot = this.shadowRoot.getElementById("mascot");
        const faceEl = this.shadowRoot.getElementById("mascot-face");
        const bubbleEl = this.shadowRoot.getElementById("mascot-bubble");
        mascot.className = "mascot" + (mood ? ` ${mood}` : "");
        faceEl.textContent = face;
        bubbleEl.textContent = text;
        // re-trigger bounce animation
        faceEl.style.animation = "none";
        faceEl.offsetHeight; // reflow
        faceEl.style.animation = "";
    }

    _updateProgress() {
        const bar = this.shadowRoot.getElementById("progress-bar");
        if (bar && this.vocab.length > 0) {
            bar.style.width = `${(this.index / this.vocab.length) * 100}%`;
        }
    }

    _showSummary() {
        const total = this._correct + this._wrong;
        const percent = total > 0 ? Math.round((this._correct / total) * 100) : 0;

        this.shadowRoot.getElementById("sum-correct").textContent = this._correct;
        this.shadowRoot.getElementById("sum-wrong").textContent = this._wrong;
        this.shadowRoot.getElementById("sum-streak").textContent = this._bestStreak;
        this.shadowRoot.getElementById("sum-percent").textContent = `${percent}%`;
        this.shadowRoot.getElementById("summary-sub").textContent =
            `„${this.currentSet.name}" — ${total} Vokabeln`;

        // Trophy based on performance
        let trophy = "🏆";
        let title = "Lektion geschafft!";
        if (percent === 100) { trophy = "👑"; title = "Perfekt! Alle richtig!"; }
        else if (percent >= 80) { trophy = "🌟"; title = "Super gemacht!"; }
        else if (percent >= 50) { trophy = "💪"; title = "Gut gemacht!"; }
        else { trophy = "📚"; title = "Weiter lernen!"; }

        this.shadowRoot.getElementById("summary-trophy").textContent = trophy;
        this.shadowRoot.getElementById("summary-title").textContent = title;

        const overlay = this.shadowRoot.getElementById("summary-overlay");
        overlay.classList.remove("hidden");

        this.shadowRoot.getElementById("summary-btn").onclick = () => {
            overlay.classList.add("hidden");
            this._updateProgress();
            this.index = 0;
            this._correct = 0;
            this._wrong = 0;
            this._bestStreak = 0;
            this._currentStreak = 0;
            this.vocab = shuffle(this.vocab);
            this._setMascot("🦉", "Neue Runde! Du schaffst das!");
            this.nextRound();
        };
    }
}

customElements.define("vocab-trainer", VocabTrainer);
