// game/quickmath-game.js
// Blitz-Rechnen: Solve math problems as fast as possible. Gets harder every 5 correct.
// Fires CustomEvent("game-over", { bubbles:true, detail:{ score, pointsEarned } })

const W = 400, H = 300;

class QuickMathGame extends HTMLElement {
    constructor() { super(); this.attachShadow({ mode: "open" }); }

    connectedCallback() {
        this.shadowRoot.innerHTML = `<style>
            :host{display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;height:100%;background:linear-gradient(135deg,#1a1a2e,#16213e);font-family:"Segoe UI",sans-serif;color:white;user-select:none}
            .top{display:flex;justify-content:space-between;width:min(360px,90vw);margin-bottom:0.5rem}
            .score{font-size:1.1rem;font-weight:700}.timer-bar{width:min(360px,90vw);height:8px;background:rgba(255,255,255,0.1);border-radius:4px;overflow:hidden;margin-bottom:1rem}
            .timer-fill{height:100%;background:linear-gradient(90deg,#48bb78,#38a169);border-radius:4px;transition:width 0.1s}
            .timer-fill.danger{background:linear-gradient(90deg,#e53e3e,#fc8181)}
            .problem{font-size:2.5rem;font-weight:900;margin:0.5rem 0;min-height:3rem;text-align:center}
            .choices{display:grid;grid-template-columns:1fr 1fr;gap:10px;width:min(360px,90vw)}
            .choice{padding:1rem;border:3px solid rgba(255,255,255,0.15);border-radius:14px;background:rgba(255,255,255,0.05);font-size:1.3rem;font-weight:700;color:white;cursor:pointer;transition:all 0.15s;touch-action:manipulation;text-align:center}
            .choice:hover{border-color:rgba(255,255,255,0.4);background:rgba(255,255,255,0.1)}
            .choice.correct{border-color:#48bb78;background:rgba(72,187,120,0.3)}
            .choice.wrong{border-color:#e53e3e;background:rgba(229,62,62,0.3)}
            .level-txt{font-size:0.8rem;opacity:0.5}
            .streak{font-size:0.9rem;color:#fbbf24}
            .result{display:none;text-align:center}
            .result.show{display:block}
            .result h2{font-size:1.8rem;color:#fbbf24;margin:0.5rem 0}
            .result p{opacity:0.7}
        </style>
        <div id="game">
            <div class="top">
                <span class="score" id="score">0 Punkte</span>
                <span class="streak" id="streak"></span>
                <span class="level-txt" id="level">Level 1</span>
            </div>
            <div class="timer-bar"><div class="timer-fill" id="timer"></div></div>
            <div class="problem" id="problem"></div>
            <div class="choices" id="choices"></div>
        </div>
        <div class="result" id="result">
            <h2 id="r-score"></h2>
            <p id="r-detail"></p>
        </div>`;

        this._score = 0;
        this._streak = 0;
        this._level = 1;
        this._timeLeft = 100;
        this._timeMax = 100;
        this._correct = 0;
        this._gameOver = false;

        this._nextProblem();
        this._interval = setInterval(() => this._tick(), 100);
    }

    disconnectedCallback() { clearInterval(this._interval); }

    _tick() {
        if (this._gameOver) return;
        this._timeLeft -= 1.5 + this._level * 0.3;
        if (this._timeLeft <= 0) { this._timeLeft = 0; this._end(); }
        const pct = Math.max(0, this._timeLeft / this._timeMax * 100);
        const bar = this.shadowRoot.getElementById("timer");
        bar.style.width = pct + "%";
        bar.className = pct < 25 ? "timer-fill danger" : "timer-fill";
    }

    _nextProblem() {
        // Level up every 5 correct
        this._level = Math.floor(this._correct / 5) + 1;
        this.shadowRoot.getElementById("level").textContent = `Level ${this._level}`;

        const { question, answer, choices } = this._generate();
        this.shadowRoot.getElementById("problem").textContent = question;

        const container = this.shadowRoot.getElementById("choices");
        container.innerHTML = "";
        for (const c of choices) {
            const btn = document.createElement("button");
            btn.className = "choice";
            btn.textContent = c;
            btn.onclick = () => this._answer(btn, c, answer);
            container.appendChild(btn);
        }
    }

    _generate() {
        const lv = this._level;
        let a, b, op, answer, question;

        if (lv <= 2) {
            // Simple addition/subtraction
            a = Math.floor(Math.random() * (10 * lv)) + 1;
            b = Math.floor(Math.random() * (10 * lv)) + 1;
            if (Math.random() < 0.5) {
                question = `${a} + ${b}`; answer = a + b;
            } else {
                if (a < b) [a, b] = [b, a];
                question = `${a} - ${b}`; answer = a - b;
            }
        } else if (lv <= 4) {
            // Multiplication + bigger numbers
            if (Math.random() < 0.4) {
                a = Math.floor(Math.random() * 12) + 2;
                b = Math.floor(Math.random() * 12) + 2;
                question = `${a} \u00d7 ${b}`; answer = a * b;
            } else {
                a = Math.floor(Math.random() * 100) + 10;
                b = Math.floor(Math.random() * 50) + 1;
                if (Math.random() < 0.5) {
                    question = `${a} + ${b}`; answer = a + b;
                } else {
                    question = `${a} - ${b}`; answer = a - b;
                }
            }
        } else if (lv <= 6) {
            // Division, bigger multiplication
            if (Math.random() < 0.3) {
                b = Math.floor(Math.random() * 12) + 2;
                answer = Math.floor(Math.random() * 12) + 1;
                a = b * answer;
                question = `${a} \u00f7 ${b}`;
            } else if (Math.random() < 0.5) {
                a = Math.floor(Math.random() * 20) + 2;
                b = Math.floor(Math.random() * 20) + 2;
                question = `${a} \u00d7 ${b}`; answer = a * b;
            } else {
                a = Math.floor(Math.random() * 500) + 50;
                b = Math.floor(Math.random() * 200) + 10;
                question = `${a} + ${b}`; answer = a + b;
            }
        } else {
            // Mixed hard: multi-step
            a = Math.floor(Math.random() * 20) + 2;
            b = Math.floor(Math.random() * 10) + 2;
            const c = Math.floor(Math.random() * 20) + 1;
            const ops = [
                () => { question = `${a} \u00d7 ${b} + ${c}`; answer = a * b + c; },
                () => { question = `${a * b} \u00f7 ${a}`; answer = b; },
                () => { question = `${a} \u00d7 ${b} - ${c}`; answer = a * b - c; },
                () => { const x = a * b; question = `${x} - ${a * (b-1)}`; answer = a; },
            ];
            ops[Math.floor(Math.random() * ops.length)]();
        }

        // Generate choices
        const choices = new Set([answer]);
        while (choices.size < 4) {
            const off = Math.floor(Math.random() * Math.max(5, Math.abs(answer) * 0.3)) + 1;
            const wrong = Math.random() < 0.5 ? answer + off : answer - off;
            if (wrong !== answer) choices.add(wrong);
        }

        return {
            question: question + " = ?",
            answer,
            choices: [...choices].sort(() => Math.random() - 0.5),
        };
    }

    _answer(btn, chosen, correct) {
        if (this._gameOver) return;
        const btns = this.shadowRoot.querySelectorAll(".choice");
        btns.forEach(b => b.style.pointerEvents = "none");

        if (chosen === correct) {
            btn.className = "choice correct";
            this._correct++;
            this._streak++;
            this._score += 10 * this._level + this._streak * 2;
            this._timeLeft = Math.min(this._timeMax, this._timeLeft + 15 + this._level * 2);
            this.shadowRoot.getElementById("score").textContent = this._score + " Punkte";
            this.shadowRoot.getElementById("streak").textContent = this._streak >= 3 ? `\uD83D\uDD25 ${this._streak}x` : "";
            setTimeout(() => this._nextProblem(), 300);
        } else {
            btn.className = "choice wrong";
            // Show correct
            btns.forEach(b => { if (parseInt(b.textContent) === correct) b.className = "choice correct"; });
            this._streak = 0;
            this._timeLeft -= 15;
            this.shadowRoot.getElementById("streak").textContent = "";
            if (this._timeLeft <= 0) { this._end(); return; }
            setTimeout(() => this._nextProblem(), 800);
        }
    }

    _end() {
        this._gameOver = true;
        clearInterval(this._interval);
        this.shadowRoot.getElementById("game").style.display = "none";
        const result = this.shadowRoot.getElementById("result");
        result.className = "result show";
        this.shadowRoot.getElementById("r-score").textContent = this._score + " Punkte";
        this.shadowRoot.getElementById("r-detail").textContent =
            `${this._correct} richtig | Level ${this._level} erreicht`;

        setTimeout(() => {
            this.dispatchEvent(new CustomEvent("game-over", {
                bubbles: true, detail: { score: this._score, pointsEarned: 0 }
            }));
        }, 2500);
    }
}

customElements.define("quickmath-game", QuickMathGame);
