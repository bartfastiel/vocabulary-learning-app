// game/quiz-game.js
// "Vokabel-Millionär" — Who Wants to Be a Millionaire style vocab quiz.
// Fires CustomEvent("game-over", { bubbles:true, detail:{ score, pointsEarned } })

const LADDER = [
    50, 100, 200, 300, 500,          // Stufe 1-5
    1000, 2000, 4000, 8000, 16000,   // Stufe 6-10
    32000, 64000, 125000, 500000, 1000000 // Stufe 11-15
];
const SAFE_NETS = [4, 9]; // indices (question 5 and 10 are safe)

class QuizGame extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    connectedCallback() {
        this._start();
    }

    disconnectedCallback() {
        clearTimeout(this._timer);
    }

    async _start() {
        // Load vocabulary
        try {
            const resp = await fetch("vocab/vocab.json");
            const lessons = await resp.json();
            this._allWords = lessons.flatMap(l => l.words || []);
        } catch {
            this._allWords = [];
        }
        if (this._allWords.length < 8) {
            this._allWords = [
                { de: "Hund", en: "dog" }, { de: "Katze", en: "cat" },
                { de: "Haus", en: "house" }, { de: "Baum", en: "tree" },
                { de: "Wasser", en: "water" }, { de: "Buch", en: "book" },
                { de: "Schule", en: "school" }, { de: "Apfel", en: "apple" },
                { de: "Blume", en: "flower" }, { de: "Stern", en: "star" },
            ];
        }

        this._level = 0;
        this._jokers = { fifty: true, audience: true, phone: true };
        this._won = 0;
        this._questions = this._generateQuestions();
        this._render();
        this._showQuestion();
    }

    _generateQuestions() {
        const shuffled = [...this._allWords].sort(() => Math.random() - 0.5);
        const questions = [];
        const used = new Set();
        for (const w of shuffled) {
            if (questions.length >= 15) break;
            const key = w.de + "|" + w.en;
            if (used.has(key)) continue;
            used.add(key);
            // Generate 3 wrong answers
            const others = this._allWords.filter(o => o.en !== w.en && o.de !== w.de);
            const wrongPool = [...others].sort(() => Math.random() - 0.5).slice(0, 3);
            if (wrongPool.length < 3) continue;
            const options = [
                { text: w.en, correct: true },
                ...wrongPool.map(o => ({ text: o.en, correct: false }))
            ].sort(() => Math.random() - 0.5);
            questions.push({ word: w.de, info: w.en_info || "", correct: w.en, options });
        }
        return questions;
    }

    _render() {
        this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: flex; flex-direction: column;
          width: 100%; height: 100%;
          background: radial-gradient(ellipse at center top, #1a1a3e 0%, #0a0a1a 70%);
          font-family: "Segoe UI", sans-serif;
          user-select: none; overflow: hidden;
          color: white;
        }
        .game-area {
          flex: 1; display: flex; flex-direction: column;
          max-width: 600px; width: 100%; margin: 0 auto;
          padding: 0.8rem; position: relative;
        }

        /* Top bar */
        .topbar {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 0.6rem;
        }
        .level-badge {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          padding: 0.3rem 0.8rem; border-radius: 20px;
          font-weight: 800; font-size: 0.85rem;
          box-shadow: 0 2px 10px rgba(245,158,11,0.4);
        }
        .prize {
          font-size: 1.1rem; font-weight: 800;
          color: #fbbf24;
          text-shadow: 0 0 15px rgba(251,191,36,0.5);
        }

        /* Jokers */
        .jokers {
          display: flex; gap: 0.5rem; justify-content: center;
          margin-bottom: 0.8rem;
        }
        .joker {
          width: 52px; height: 52px; border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.3);
          background: rgba(255,255,255,0.08);
          display: flex; align-items: center; justify-content: center;
          font-size: 1.3rem; cursor: pointer;
          transition: all 0.3s; position: relative;
        }
        .joker:hover:not(.used) {
          border-color: #fbbf24; background: rgba(251,191,36,0.15);
          transform: scale(1.1);
        }
        .joker.used {
          opacity: 0.25; cursor: default;
          border-color: transparent;
        }
        .joker-label {
          position: absolute; bottom: -16px; font-size: 0.6rem;
          white-space: nowrap; opacity: 0.6;
        }

        /* Question */
        .question-box {
          background: linear-gradient(135deg, rgba(99,102,241,0.3), rgba(139,92,246,0.3));
          border: 1px solid rgba(139,92,246,0.4);
          border-radius: 16px; padding: 1.2rem;
          text-align: center; margin-bottom: 0.8rem;
          min-height: 80px; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          backdrop-filter: blur(8px);
        }
        .question-word {
          font-size: 1.8rem; font-weight: 800;
          background: linear-gradient(to right, #c084fc, #818cf8, #60a5fa);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .question-hint {
          font-size: 0.78rem; opacity: 0.5; margin-top: 0.3rem;
          font-style: italic;
        }
        .question-sub {
          font-size: 0.82rem; opacity: 0.6; margin-top: 0.3rem;
        }

        /* Answers */
        .answers {
          display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;
          flex: 1;
        }
        .answer-btn {
          border: 2px solid rgba(255,255,255,0.15);
          background: linear-gradient(135deg, rgba(30,30,60,0.8), rgba(20,20,50,0.9));
          border-radius: 14px; padding: 0.9rem 0.6rem;
          color: white; font-size: 1rem; font-weight: 700;
          cursor: pointer; transition: all 0.3s;
          display: flex; align-items: center; gap: 0.5rem;
          min-height: 56px; position: relative; overflow: hidden;
        }
        .answer-btn:hover:not(.revealed) {
          border-color: rgba(251,191,36,0.6);
          background: linear-gradient(135deg, rgba(50,50,90,0.9), rgba(40,40,70,0.95));
          transform: scale(1.02);
        }
        .answer-btn .letter {
          background: rgba(255,255,255,0.12); width: 28px; height: 28px;
          border-radius: 8px; display: flex; align-items: center; justify-content: center;
          font-size: 0.8rem; font-weight: 800; flex-shrink: 0;
        }
        .answer-btn .text { flex: 1; text-align: left; }
        .answer-btn.correct {
          border-color: #34d399 !important;
          background: linear-gradient(135deg, rgba(16,185,129,0.4), rgba(5,150,105,0.5)) !important;
          animation: correctPulse 0.6s ease;
        }
        .answer-btn.wrong {
          border-color: #f87171 !important;
          background: linear-gradient(135deg, rgba(239,68,68,0.4), rgba(185,28,28,0.5)) !important;
          animation: shake 0.5s ease;
        }
        .answer-btn.dimmed {
          opacity: 0.2; pointer-events: none;
        }
        .answer-btn.highlighted {
          border-color: #fbbf24;
          box-shadow: 0 0 20px rgba(251,191,36,0.3);
        }

        @keyframes correctPulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-5px); }
          80% { transform: translateX(5px); }
        }

        /* Money ladder (side panel) */
        .ladder-btn {
          position: absolute; top: 0.5rem; right: 0.5rem;
          background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);
          border-radius: 8px; color: white; padding: 0.3rem 0.6rem;
          font-size: 0.75rem; cursor: pointer;
        }
        .ladder-overlay {
          display: none; position: absolute; inset: 0;
          background: rgba(0,0,0,0.85); backdrop-filter: blur(6px);
          z-index: 10; flex-direction: column; align-items: center;
          justify-content: center; padding: 1rem;
        }
        .ladder-overlay.open { display: flex; }
        .ladder-close {
          position: absolute; top: 0.8rem; right: 0.8rem;
          background: none; border: none; color: white;
          font-size: 1.5rem; cursor: pointer;
        }
        .ladder-list {
          display: flex; flex-direction: column-reverse; gap: 0.35rem;
          width: 100%; max-width: 300px;
        }
        .ladder-step {
          display: flex; justify-content: space-between; align-items: center;
          padding: 0.4rem 0.8rem; border-radius: 8px; font-size: 0.82rem;
          background: rgba(255,255,255,0.05); border: 1px solid transparent;
          transition: all 0.3s;
        }
        .ladder-step .num { opacity: 0.5; font-weight: 600; }
        .ladder-step .amount { font-weight: 700; }
        .ladder-step.current {
          border-color: #fbbf24; background: rgba(251,191,36,0.15);
          box-shadow: 0 0 15px rgba(251,191,36,0.2);
        }
        .ladder-step.current .amount { color: #fbbf24; }
        .ladder-step.safe { border-left: 3px solid #34d399; }
        .ladder-step.safe .amount { color: #34d399; }
        .ladder-step.done { opacity: 0.4; }

        /* Audience overlay */
        .audience-overlay {
          display: none; position: absolute; inset: 0;
          background: rgba(0,0,0,0.8); backdrop-filter: blur(4px);
          z-index: 15; flex-direction: column; align-items: center;
          justify-content: center; padding: 1.5rem; gap: 1rem;
        }
        .audience-overlay.open { display: flex; }
        .audience-title { font-size: 1rem; font-weight: 700; opacity: 0.8; }
        .audience-bars { display: flex; gap: 1rem; align-items: flex-end; height: 150px; }
        .audience-bar {
          display: flex; flex-direction: column; align-items: center; gap: 0.3rem;
          width: 50px;
        }
        .audience-bar .bar {
          width: 40px; border-radius: 6px 6px 0 0;
          background: linear-gradient(to top, #6366f1, #818cf8);
          transition: height 1s ease;
        }
        .audience-bar .bar.winner { background: linear-gradient(to top, #10b981, #34d399); }
        .audience-bar .pct { font-size: 0.8rem; font-weight: 700; }
        .audience-bar .lbl { font-size: 0.85rem; font-weight: 700; opacity: 0.6; }

        /* Phone overlay */
        .phone-overlay {
          display: none; position: absolute; inset: 0;
          background: rgba(0,0,0,0.8); backdrop-filter: blur(4px);
          z-index: 15; flex-direction: column; align-items: center;
          justify-content: center; padding: 1.5rem; gap: 0.8rem;
        }
        .phone-overlay.open { display: flex; }
        .phone-bubble {
          background: rgba(99,102,241,0.3); border: 1px solid rgba(99,102,241,0.5);
          border-radius: 16px; padding: 1.2rem; max-width: 300px;
          text-align: center; font-size: 0.95rem; line-height: 1.5;
        }
        .phone-name { font-weight: 800; color: #c084fc; margin-bottom: 0.3rem; }
        .phone-answer { font-size: 1.2rem; font-weight: 800; color: #fbbf24; margin-top: 0.5rem; }

        /* Result screen */
        .result {
          display: none; position: absolute; inset: 0;
          background: radial-gradient(ellipse at center, #1a1a3e, #0a0a1a);
          z-index: 20; flex-direction: column; align-items: center;
          justify-content: center; padding: 1.5rem; gap: 0.8rem;
        }
        .result.open { display: flex; }
        .result-icon { font-size: 4rem; }
        .result-title {
          font-size: 1.5rem; font-weight: 800;
          background: linear-gradient(to right, #fbbf24, #f59e0b);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .result-amount {
          font-size: 2.5rem; font-weight: 900; color: #fbbf24;
          text-shadow: 0 0 30px rgba(251,191,36,0.5);
        }
        .result-sub { opacity: 0.6; font-size: 0.9rem; }
        .result-detail { font-size: 0.85rem; opacity: 0.5; margin-top: 0.5rem; }

        /* Confetti */
        .confetti-container {
          position: absolute; inset: 0; pointer-events: none; overflow: hidden; z-index: 25;
        }
        .confetti {
          position: absolute; width: 8px; height: 8px; border-radius: 2px;
          animation: confettiFall linear forwards;
        }
        @keyframes confettiFall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }

        /* Spotlight sweep */
        .spotlight {
          position: absolute; inset: 0; pointer-events: none;
          background: radial-gradient(circle 200px at var(--sx, 50%) var(--sy, 30%),
            rgba(139,92,246,0.08), transparent 70%);
          transition: --sx 3s, --sy 3s;
        }

        /* Particles */
        .particles {
          position: absolute; inset: 0; pointer-events: none; overflow: hidden; z-index: 1;
        }
        .particle {
          position: absolute; border-radius: 50%; opacity: 0;
          animation: floatUp linear infinite;
        }
        @keyframes floatUp {
          0% { transform: translateY(0) scale(0); opacity: 0; }
          10% { opacity: 0.6; }
          90% { opacity: 0.3; }
          100% { transform: translateY(-100vh) scale(1); opacity: 0; }
        }
      </style>

      <div class="game-area" id="game">
        <div class="particles" id="particles"></div>

        <div class="topbar">
          <div class="level-badge" id="level-badge">Frage 1/15</div>
          <div class="prize" id="prize">${LADDER[0].toLocaleString("de-DE")} Punkte</div>
          <button class="ladder-btn" id="ladder-btn">Leiter</button>
        </div>

        <div class="jokers" id="jokers">
          <div class="joker" id="joker-fifty" title="50:50">
            <span>50:50</span>
            <span class="joker-label">50:50</span>
          </div>
          <div class="joker" id="joker-audience" title="Publikumsjoker">
            <span>\uD83D\uDC65</span>
            <span class="joker-label">Publikum</span>
          </div>
          <div class="joker" id="joker-phone" title="Telefonjoker">
            <span>\uD83D\uDCDE</span>
            <span class="joker-label">Telefon</span>
          </div>
        </div>

        <div class="question-box" id="question-box">
          <div class="question-sub">Was hei\u00dft...</div>
          <div class="question-word" id="question-word"></div>
          <div class="question-hint" id="question-hint"></div>
        </div>

        <div class="answers" id="answers"></div>

        <!-- Ladder overlay -->
        <div class="ladder-overlay" id="ladder-overlay">
          <button class="ladder-close" id="ladder-close">\u2715</button>
          <div class="ladder-list" id="ladder-list"></div>
        </div>

        <!-- Audience overlay -->
        <div class="audience-overlay" id="audience-overlay">
          <div class="audience-title">\uD83D\uDC65 Das Publikum sagt...</div>
          <div class="audience-bars" id="audience-bars"></div>
        </div>

        <!-- Phone overlay -->
        <div class="phone-overlay" id="phone-overlay">
          <div class="phone-bubble" id="phone-bubble"></div>
        </div>

        <!-- Result -->
        <div class="result" id="result">
          <div class="result-icon" id="result-icon"></div>
          <div class="result-title" id="result-title"></div>
          <div class="result-amount" id="result-amount"></div>
          <div class="result-sub" id="result-sub"></div>
          <div class="result-detail" id="result-detail"></div>
        </div>

        <div class="confetti-container" id="confetti"></div>
      </div>`;

        // Ambient particles
        this._spawnParticles();

        // Ladder toggle
        const ladderOverlay = this.shadowRoot.getElementById("ladder-overlay");
        this.shadowRoot.getElementById("ladder-btn").onclick = () => {
            this._renderLadder();
            ladderOverlay.classList.add("open");
        };
        this.shadowRoot.getElementById("ladder-close").onclick = () => ladderOverlay.classList.remove("open");

        // Jokers
        this.shadowRoot.getElementById("joker-fifty").onclick = () => this._useFifty();
        this.shadowRoot.getElementById("joker-audience").onclick = () => this._useAudience();
        this.shadowRoot.getElementById("joker-phone").onclick = () => this._usePhone();
    }

    _spawnParticles() {
        const container = this.shadowRoot.getElementById("particles");
        const colors = ["#6366f1", "#8b5cf6", "#c084fc", "#fbbf24", "#60a5fa"];
        for (let i = 0; i < 15; i++) {
            const p = document.createElement("div");
            p.className = "particle";
            const size = 3 + Math.random() * 5;
            p.style.cssText = `
                width: ${size}px; height: ${size}px;
                left: ${Math.random() * 100}%;
                bottom: ${-Math.random() * 20}%;
                background: ${colors[Math.floor(Math.random() * colors.length)]};
                animation-duration: ${8 + Math.random() * 12}s;
                animation-delay: ${Math.random() * 10}s;
            `;
            container.appendChild(p);
        }
    }

    _showQuestion() {
        if (this._level >= this._questions.length) {
            this._endGame(true);
            return;
        }

        const q = this._questions[this._level];
        this.shadowRoot.getElementById("level-badge").textContent = `Frage ${this._level + 1}/15`;
        this.shadowRoot.getElementById("prize").textContent = `${LADDER[this._level].toLocaleString("de-DE")} Punkte`;
        this.shadowRoot.getElementById("question-word").textContent = q.word;
        this.shadowRoot.getElementById("question-hint").textContent = q.info ? `(${q.info})` : "";

        const answersEl = this.shadowRoot.getElementById("answers");
        answersEl.innerHTML = "";
        const letters = ["A", "B", "C", "D"];
        q.options.forEach((opt, i) => {
            const btn = document.createElement("button");
            btn.className = "answer-btn";
            btn.innerHTML = `<span class="letter">${letters[i]}</span><span class="text">${opt.text}</span>`;
            btn.dataset.correct = opt.correct;
            btn.dataset.index = i;
            btn.onclick = () => this._selectAnswer(btn, opt);
            answersEl.appendChild(btn);
        });

        // Reset joker overlays
        this.shadowRoot.getElementById("audience-overlay").classList.remove("open");
        this.shadowRoot.getElementById("phone-overlay").classList.remove("open");
    }

    _selectAnswer(btn, opt) {
        // Prevent double-click
        const btns = this.shadowRoot.querySelectorAll(".answer-btn");
        btns.forEach(b => b.style.pointerEvents = "none");

        if (opt.correct) {
            btn.classList.add("correct");
            this._won = LADDER[this._level];

            this._timer = setTimeout(() => {
                this._level++;
                if (this._level >= 15 || this._level >= this._questions.length) {
                    this._endGame(true);
                } else {
                    this._showQuestion();
                }
            }, 1200);
        } else {
            btn.classList.add("wrong");
            // Reveal correct answer
            btns.forEach(b => {
                if (b.dataset.correct === "true") b.classList.add("correct");
            });

            // Fall back to last safety net
            let safeAmount = 0;
            for (const s of SAFE_NETS) {
                if (s < this._level) safeAmount = LADDER[s];
            }
            this._won = safeAmount;

            this._timer = setTimeout(() => this._endGame(false), 1800);
        }
    }

    _useFifty() {
        if (!this._jokers.fifty) return;
        this._jokers.fifty = false;
        this.shadowRoot.getElementById("joker-fifty").classList.add("used");

        const q = this._questions[this._level];
        const btns = [...this.shadowRoot.querySelectorAll(".answer-btn")];
        const wrongBtns = btns.filter(b => b.dataset.correct === "false" && !b.classList.contains("dimmed"));
        // Remove 2 wrong answers
        const toRemove = wrongBtns.sort(() => Math.random() - 0.5).slice(0, 2);
        toRemove.forEach(b => b.classList.add("dimmed"));
    }

    _useAudience() {
        if (!this._jokers.audience) return;
        this._jokers.audience = false;
        this.shadowRoot.getElementById("joker-audience").classList.add("used");

        const q = this._questions[this._level];
        const letters = ["A", "B", "C", "D"];
        const correctIdx = q.options.findIndex(o => o.correct);

        // Generate biased percentages
        const pcts = [0, 0, 0, 0];
        pcts[correctIdx] = 45 + Math.floor(Math.random() * 30); // 45-74%
        let remaining = 100 - pcts[correctIdx];
        for (let i = 0; i < 4; i++) {
            if (i === correctIdx) continue;
            const dimmed = this.shadowRoot.querySelectorAll(".answer-btn")[i]?.classList.contains("dimmed");
            if (dimmed) continue;
            const share = i === 3 || remaining < 5 ? remaining : Math.floor(Math.random() * remaining * 0.6);
            pcts[i] = share;
            remaining -= share;
        }
        // Give leftover to a random wrong answer
        if (remaining > 0) {
            const wrongVisible = [0,1,2,3].filter(i => i !== correctIdx &&
                !this.shadowRoot.querySelectorAll(".answer-btn")[i]?.classList.contains("dimmed"));
            if (wrongVisible.length) pcts[wrongVisible[0]] += remaining;
        }

        const overlay = this.shadowRoot.getElementById("audience-overlay");
        const barsEl = this.shadowRoot.getElementById("audience-bars");
        barsEl.innerHTML = "";
        overlay.classList.add("open");

        q.options.forEach((opt, i) => {
            const dimmed = this.shadowRoot.querySelectorAll(".answer-btn")[i]?.classList.contains("dimmed");
            if (dimmed) return;
            const bar = document.createElement("div");
            bar.className = "audience-bar";
            bar.innerHTML = `
                <div class="pct">${pcts[i]}%</div>
                <div class="bar ${opt.correct ? "winner" : ""}" style="height: 0px"></div>
                <div class="lbl">${letters[i]}</div>`;
            barsEl.appendChild(bar);
            setTimeout(() => {
                bar.querySelector(".bar").style.height = `${Math.max(pcts[i] * 1.3, 5)}px`;
            }, 100);
        });

        setTimeout(() => overlay.classList.remove("open"), 3500);
    }

    _usePhone() {
        if (!this._jokers.phone) return;
        this._jokers.phone = false;
        this.shadowRoot.getElementById("joker-phone").classList.add("used");

        const q = this._questions[this._level];
        const correctIdx = q.options.findIndex(o => o.correct);
        const letters = ["A", "B", "C", "D"];

        const names = ["Oma Helga", "Onkel Tom", "Tante Lisa", "Prof. Schmidt", "Nachbar Klaus"];
        const name = names[Math.floor(Math.random() * names.length)];

        // 85% chance of correct answer
        const isRight = Math.random() < 0.85;
        let answerIdx = correctIdx;
        if (!isRight) {
            const wrongs = [0,1,2,3].filter(i => i !== correctIdx);
            answerIdx = wrongs[Math.floor(Math.random() * wrongs.length)];
        }

        const phrases = [
            `Hmm, ich bin mir ziemlich sicher... Ich w\u00fcrde <b>${letters[answerIdx]}</b> sagen!`,
            `Also, ich denke das ist <b>${letters[answerIdx]}: ${q.options[answerIdx].text}</b>.`,
            `Oh, das wei\u00df ich! Nimm <b>${letters[answerIdx]}</b>!`,
            `Puh, schwierig... Aber ich tippe auf <b>${letters[answerIdx]}</b>.`,
        ];

        const overlay = this.shadowRoot.getElementById("phone-overlay");
        const bubble = this.shadowRoot.getElementById("phone-bubble");
        bubble.innerHTML = `
            <div class="phone-name">\uD83D\uDCDE ${name}</div>
            ${phrases[Math.floor(Math.random() * phrases.length)]}
            <div class="phone-answer">${letters[answerIdx]}: ${q.options[answerIdx].text}</div>`;

        overlay.classList.add("open");

        // Also highlight the suggested answer
        const btns = this.shadowRoot.querySelectorAll(".answer-btn");
        btns[answerIdx]?.classList.add("highlighted");

        setTimeout(() => overlay.classList.remove("open"), 4000);
    }

    _renderLadder() {
        const list = this.shadowRoot.getElementById("ladder-list");
        list.innerHTML = "";
        for (let i = 0; i < 15; i++) {
            const step = document.createElement("div");
            step.className = "ladder-step";
            if (i === this._level) step.classList.add("current");
            if (SAFE_NETS.includes(i)) step.classList.add("safe");
            if (i < this._level) step.classList.add("done");
            step.innerHTML = `
                <span class="num">${i + 1}</span>
                <span class="amount">${LADDER[i].toLocaleString("de-DE")}</span>`;
            list.appendChild(step);
        }
    }

    _endGame(won) {
        const result = this.shadowRoot.getElementById("result");
        const icon = this.shadowRoot.getElementById("result-icon");
        const title = this.shadowRoot.getElementById("result-title");
        const amount = this.shadowRoot.getElementById("result-amount");
        const sub = this.shadowRoot.getElementById("result-sub");
        const detail = this.shadowRoot.getElementById("result-detail");

        if (won && this._level >= 15) {
            icon.textContent = "\uD83C\uDFC6";
            title.textContent = "MILLION\u00C4R!";
            amount.textContent = "1.000.000";
            sub.textContent = "Du hast alle 15 Fragen richtig beantwortet!";
            detail.textContent = "Absolut genial!";
            this._spawnConfetti(80);
        } else if (won) {
            icon.textContent = "\uD83C\uDF1F";
            title.textContent = "Gewonnen!";
            amount.textContent = this._won.toLocaleString("de-DE");
            sub.textContent = `${this._level} von 15 Fragen beantwortet`;
            detail.textContent = "Super gemacht!";
            this._spawnConfetti(40);
        } else {
            icon.textContent = this._won > 0 ? "\uD83D\uDCAA" : "\uD83D\uDE14";
            title.textContent = this._won > 0 ? "Sicherheitsnetz!" : "Leider falsch!";
            amount.textContent = this._won.toLocaleString("de-DE");
            sub.textContent = `Bei Frage ${this._level + 1} gescheitert`;
            detail.textContent = this._won > 0
                ? `Dank Sicherheitsnetz ${this._won.toLocaleString("de-DE")} Punkte gesichert!`
                : "Beim n\u00e4chsten Mal wird es besser!";
            if (this._won > 0) this._spawnConfetti(15);
        }

        result.classList.add("open");

        // Map the quiz score to a game score (0-10 range for pointsEarned calc)
        const gameScore = this._level;

        setTimeout(() => {
            this.dispatchEvent(new CustomEvent("game-over", {
                bubbles: true,
                detail: { score: gameScore, pointsEarned: 0 }
            }));
        }, 3000);
    }

    _spawnConfetti(count) {
        const container = this.shadowRoot.getElementById("confetti");
        const colors = ["#fbbf24", "#f43f5e", "#6366f1", "#10b981", "#f97316", "#ec4899", "#3b82f6"];
        for (let i = 0; i < count; i++) {
            const c = document.createElement("div");
            c.className = "confetti";
            const color = colors[Math.floor(Math.random() * colors.length)];
            const left = Math.random() * 100;
            const dur = 2 + Math.random() * 3;
            const delay = Math.random() * 1.5;
            const size = 5 + Math.random() * 8;
            c.style.cssText = `
                left: ${left}%; top: -10px;
                width: ${size}px; height: ${size * 0.6}px;
                background: ${color};
                animation-duration: ${dur}s;
                animation-delay: ${delay}s;
                border-radius: ${Math.random() > 0.5 ? "50%" : "2px"};
            `;
            container.appendChild(c);
        }
    }
}

customElements.define("quiz-game", QuizGame);
