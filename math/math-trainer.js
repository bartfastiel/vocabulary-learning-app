// math/math-trainer.js
// Mathe-Trainer für die 5. Klasse.
// Aufgabentypen: Grundrechenarten, Reihenfolge, Brüche, Geometrie, Dezimalzahlen

const MATH_CATEGORIES = [
    { id: "addition",       name: "➕ Addition",         generate: genAddition },
    { id: "subtraktion",    name: "➖ Subtraktion",      generate: genSubtraktion },
    { id: "multiplikation", name: "✖️ Multiplikation",   generate: genMultiplikation },
    { id: "division",       name: "➗ Division",          generate: genDivision },
    { id: "reihenfolge",    name: "🔢 Punkt vor Strich", generate: genReihenfolge },
    { id: "brueche",        name: "🍕 Brüche",           generate: genBrueche },
    { id: "dezimal",        name: "🔟 Dezimalzahlen",    generate: genDezimal },
    { id: "geometrie",      name: "📐 Geometrie",        generate: genGeometrie },
    { id: "groessen",       name: "📏 Größen umrechnen", generate: genGroessen },
    { id: "textaufgaben",   name: "📝 Textaufgaben",     generate: genTextaufgaben },
];

// ── Generators ─────────────────────────────────────────────────────────────────
// Each returns { question: string, answer: number|string, choices: string[] }

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function makeChoices(correct, count = 4) {
    const set = new Set([String(correct)]);
    const num = Number(correct);
    let tries = 0;
    while (set.size < count && tries < 50) {
        tries++;
        let wrong;
        if (!isNaN(num)) {
            const offset = randInt(1, Math.max(5, Math.abs(Math.floor(num * 0.3))));
            wrong = String(Math.random() < 0.5 ? num + offset : num - offset);
        } else {
            wrong = String(num + randInt(-5, 5));
        }
        if (wrong !== String(correct)) set.add(wrong);
    }
    return shuffle([...set]);
}

function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function genAddition() {
    const a = randInt(100, 9999), b = randInt(100, 9999);
    return { question: `${a} + ${b} = ?`, answer: String(a + b), choices: makeChoices(a + b) };
}

function genSubtraktion() {
    let a = randInt(200, 9999), b = randInt(100, a);
    return { question: `${a} − ${b} = ?`, answer: String(a - b), choices: makeChoices(a - b) };
}

function genMultiplikation() {
    const a = randInt(2, 25), b = randInt(2, 25);
    return { question: `${a} × ${b} = ?`, answer: String(a * b), choices: makeChoices(a * b) };
}

function genDivision() {
    const b = randInt(2, 15), result = randInt(2, 30);
    const a = b * result;
    return { question: `${a} ÷ ${b} = ?`, answer: String(result), choices: makeChoices(result) };
}

function genReihenfolge() {
    const templates = [
        () => { const a = randInt(2,10), b = randInt(2,10), c = randInt(1,20); const r = a*b+c; return { q: `${a} × ${b} + ${c}`, r }; },
        () => { const a = randInt(10,50), b = randInt(2,8), c = randInt(2,8); const r = a-b*c; return { q: `${a} − ${b} × ${c}`, r }; },
        () => { const a = randInt(2,10), b = randInt(2,10), c = randInt(2,10); const r = a*b*c; return { q: `${a} × ${b} × ${c}`, r }; },
        () => { const a = randInt(2,8), b = randInt(2,8), c = randInt(1,20), d = randInt(1,20); const r = a*b+c-d; return { q: `${a} × ${b} + ${c} − ${d}`, r }; },
    ];
    const t = templates[randInt(0, templates.length - 1)]();
    return { question: `${t.q} = ?`, answer: String(t.r), choices: makeChoices(t.r) };
}

function genBrueche() {
    const types = [
        // Bruch erkennen
        () => {
            const n = randInt(1, 7), d = randInt(n + 1, 12);
            return { question: `Welcher Bruch ist größer: ${n}/${d} oder ${n+1}/${d}?`, answer: `${n+1}/${d}`, choices: [`${n}/${d}`, `${n+1}/${d}`] };
        },
        // Addition gleicher Nenner
        () => {
            const d = randInt(3, 10), a = randInt(1, d - 2), b = randInt(1, d - a);
            return { question: `${a}/${d} + ${b}/${d} = ?`, answer: `${a + b}/${d}`, choices: makeChoicesFrac(a + b, d) };
        },
        // Bruch kürzen
        () => {
            const f = randInt(2, 5), n = randInt(1, 5), d = randInt(n + 1, 8);
            return { question: `Kürze: ${n * f}/${d * f}`, answer: `${n}/${d}`, choices: makeChoicesFrac(n, d) };
        },
    ];
    return types[randInt(0, types.length - 1)]();
}

function makeChoicesFrac(n, d) {
    const correct = `${n}/${d}`;
    const set = new Set([correct]);
    let tries = 0;
    while (set.size < 4 && tries < 30) {
        tries++;
        const nn = n + randInt(-2, 3), dd = d + randInt(-2, 3);
        if (nn > 0 && dd > 1 && `${nn}/${dd}` !== correct) set.add(`${nn}/${dd}`);
    }
    return shuffle([...set]);
}

function genDezimal() {
    const types = [
        () => {
            const a = (randInt(10, 99) / 10), b = (randInt(10, 99) / 10);
            const r = Math.round((a + b) * 10) / 10;
            return { question: `${a.toFixed(1)} + ${b.toFixed(1)} = ?`, answer: r.toFixed(1), choices: makeChoices(r.toFixed(1)) };
        },
        () => {
            const a = (randInt(50, 99) / 10), b = (randInt(10, Math.floor(a * 10)) / 10);
            const r = Math.round((a - b) * 10) / 10;
            return { question: `${a.toFixed(1)} − ${b.toFixed(1)} = ?`, answer: r.toFixed(1), choices: makeChoices(r.toFixed(1)) };
        },
        () => {
            const a = randInt(1, 20) / 10;
            const b = randInt(2, 9);
            const r = Math.round(a * b * 10) / 10;
            return { question: `${a.toFixed(1)} × ${b} = ?`, answer: r.toFixed(1), choices: makeChoices(r.toFixed(1)) };
        },
    ];
    return types[randInt(0, types.length - 1)]();
}

function genGeometrie() {
    const types = [
        // Rechteck Fläche
        () => {
            const a = randInt(3, 15), b = randInt(3, 15);
            return { question: `Fläche eines Rechtecks:\n${a} cm × ${b} cm = ? cm²`, answer: String(a * b), choices: makeChoices(a * b) };
        },
        // Rechteck Umfang
        () => {
            const a = randInt(3, 20), b = randInt(3, 20);
            const u = 2 * (a + b);
            return { question: `Umfang eines Rechtecks:\na = ${a} cm, b = ${b} cm\nU = ? cm`, answer: String(u), choices: makeChoices(u) };
        },
        // Quadrat Fläche
        () => {
            const a = randInt(2, 15);
            return { question: `Fläche eines Quadrats:\nSeite = ${a} cm\nA = ? cm²`, answer: String(a * a), choices: makeChoices(a * a) };
        },
        // Dreieck Fläche
        () => {
            const g = randInt(4, 16), h = randInt(2, 12);
            // ensure integer result
            const area = (g * h) / 2;
            if (area !== Math.floor(area)) return genGeometrie(); // retry
            return { question: `Fläche eines Dreiecks:\ng = ${g} cm, h = ${h} cm\nA = ? cm²`, answer: String(area), choices: makeChoices(area) };
        },
    ];
    return types[randInt(0, types.length - 1)]();
}

function genGroessen() {
    const types = [
        () => { const v = randInt(1, 20); return { question: `${v} km = ? m`, answer: String(v * 1000), choices: makeChoices(v * 1000) }; },
        () => { const v = randInt(100, 9000); return { question: `${v} m = ? km`, answer: (v / 1000).toFixed(1).replace(/\.0$/, ""), choices: makeChoices((v / 1000).toFixed(1)) }; },
        () => { const v = randInt(1, 50); return { question: `${v} kg = ? g`, answer: String(v * 1000), choices: makeChoices(v * 1000) }; },
        () => { const v = randInt(1, 10); return { question: `${v} h = ? min`, answer: String(v * 60), choices: makeChoices(v * 60) }; },
        () => { const v = randInt(1, 30); return { question: `${v} cm = ? mm`, answer: String(v * 10), choices: makeChoices(v * 10) }; },
        () => { const v = randInt(1, 5); return { question: `${v} l = ? ml`, answer: String(v * 1000), choices: makeChoices(v * 1000) }; },
    ];
    return types[randInt(0, types.length - 1)]();
}

function genTextaufgaben() {
    const types = [
        () => {
            const preis = randInt(2, 15), anzahl = randInt(2, 8);
            const total = preis * anzahl;
            return { question: `Ein Heft kostet ${preis} €.\nWie viel kosten ${anzahl} Hefte?`, answer: `${total} €`, choices: shuffle([`${total} €`, `${total + preis} €`, `${total - preis} €`, `${preis + anzahl} €`]) };
        },
        () => {
            const total = randInt(20, 100), spent = randInt(5, total - 5);
            const rest = total - spent;
            return { question: `Du hast ${total} €.\nDu kaufst etwas für ${spent} €.\nWie viel hast du übrig?`, answer: `${rest} €`, choices: shuffle([`${rest} €`, `${rest + 5} €`, `${rest - 3} €`, `${total} €`]) };
        },
        () => {
            const perKm = randInt(3, 8), km = randInt(5, 20);
            const total = perKm * km;
            return { question: `Ein Fahrradfahrer fährt ${perKm} km pro Stunde.\nWie weit kommt er in ${km} Stunden?`, answer: `${total} km`, choices: shuffle([`${total} km`, `${total + perKm} km`, `${total - perKm} km`, `${perKm + km} km`]) };
        },
        () => {
            const total = randInt(20, 60), kinder = randInt(3, 8);
            const pro = Math.floor(total / kinder);
            const rest = total - pro * kinder;
            return { question: `${total} Bonbons werden auf ${kinder} Kinder verteilt.\nWie viele bekommt jedes Kind?`, answer: `${pro}`, choices: makeChoices(pro) };
        },
    ];
    return types[randInt(0, types.length - 1)]();
}

// ── Component ──────────────────────────────────────────────────────────────────

class MathTrainer extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._category = null;
        this._streak = 0;
        this._total = 0;
        this._correct = 0;
    }

    set points(pm) { this._pm = pm; }

    connectedCallback() {
        this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: flex; flex-direction: column; align-items: center;
          font-family: "Segoe UI", sans-serif; width: 100%;
        }
        .lesson-header {
          display: flex; align-items: center; justify-content: space-between;
          background: linear-gradient(135deg, rgba(3,60,110,0.92), rgba(7,100,160,0.92));
          backdrop-filter: blur(14px); border: 1px solid rgba(56,189,248,0.45);
          color: #bae6fd; border-radius: 16px 16px 0 0;
          padding: 0.9rem 1.2rem; cursor: pointer; user-select: none;
          font-size: 1.1rem; font-weight: 600;
          width: 400px; max-width: 90vw; margin-top: 1.2rem;
          box-shadow: 0 0 24px rgba(14,165,233,0.5);
          transition: box-shadow 0.3s, transform 0.2s;
        }
        .lesson-header:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 36px rgba(14,165,233,0.9);
        }
        #quiz-box {
          background: rgba(4,20,45,0.75);
          backdrop-filter: blur(22px); border: 1px solid rgba(56,189,248,0.3);
          border-top: none; border-radius: 0 0 18px 18px;
          box-shadow: 0 20px 60px rgba(14,165,233,0.2);
          padding: 1.5rem; max-width: 90vw; width: 400px;
          text-align: center; color: #e0f2fe;
          display: flex; flex-direction: column; gap: 1rem;
          min-height: 200px; justify-content: center;
        }
        #question-text {
          font-size: 1.4rem; font-weight: bold; white-space: pre-line;
          line-height: 1.6; margin-bottom: 0.5rem;
        }
        .choices {
          display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem;
        }
        .choice-btn {
          padding: 0.8rem; border: 2px solid rgba(56,189,248,0.35);
          border-radius: 12px; background: rgba(14,105,163,0.2);
          color: #bae6fd; font-size: 1.1rem; font-weight: bold;
          cursor: pointer; transition: all 0.15s;
        }
        .choice-btn:hover {
          background: rgba(14,165,233,0.35);
          border-color: rgba(56,189,248,0.7);
          transform: scale(1.03);
        }
        .choice-btn.correct {
          background: rgba(76,175,80,0.5) !important;
          border-color: #66BB6A !important;
        }
        .choice-btn.wrong {
          background: rgba(244,67,54,0.4) !important;
          border-color: #EF5350 !important;
        }
        #stats {
          font-size: 0.85rem; color: #7dd3fc; margin-top: 0.3rem;
        }
        #feedback {
          font-size: 1.3rem; min-height: 2rem;
        }
        /* popup */
        .lesson-overlay {
          position: fixed; inset: 0; background: rgba(0,5,15,0.75);
          backdrop-filter: blur(6px); z-index: 150; display: none;
        }
        .lesson-overlay.active { display: block; }
        .lesson-popup {
          position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
          background: rgba(4,20,45,0.96); backdrop-filter: blur(22px);
          border: 1px solid rgba(56,189,248,0.4); border-radius: 16px;
          box-shadow: 0 0 40px rgba(14,165,233,0.4);
          padding: 1rem; width: 320px; max-width: 90vw;
          z-index: 200; display: none; color: #bae6fd;
        }
        .lesson-popup.active { display: block; }
        .lesson-popup h2 { font-size: 1.1rem; margin: 0 0 0.8rem; text-align: center; color: #38bdf8; }
        .set-list { display: flex; flex-direction: column; gap: 0.5rem; max-height: 50vh; overflow-y: auto; }
        .set-list button {
          background: rgba(14,105,163,0.3); color: #bae6fd;
          border: 1px solid rgba(56,189,248,0.35); border-radius: 10px;
          padding: 0.6rem 1rem; font-size: 1rem; cursor: pointer;
          transition: all 0.2s; text-align: left;
        }
        .set-list button:hover { background: rgba(14,165,233,0.4); transform: translateX(4px); }
        .set-list button.active { background: rgba(3,105,161,0.8); font-weight: bold; color: #e0f2fe; }
      </style>

      <div class="lesson-header">
        <span class="title">Thema wählen...</span>
        <span style="font-size:1.4rem">☰</span>
      </div>
      <div id="quiz-box">
        <div id="question-text">Wähle ein Thema oben!</div>
        <div class="choices" id="choices"></div>
        <div id="feedback"></div>
        <div id="stats"></div>
      </div>

      <div class="lesson-overlay"></div>
      <div class="lesson-popup">
        <h2>📐 Mathe-Thema wählen</h2>
        <div class="set-list"></div>
      </div>
    `;

        this._setupPopup();
        this._renderCategories();
        // auto-select first
        this._selectCategory(0);
    }

    _setupPopup() {
        const header = this.shadowRoot.querySelector(".lesson-header");
        const overlay = this.shadowRoot.querySelector(".lesson-overlay");
        const popup = this.shadowRoot.querySelector(".lesson-popup");

        const toggle = (show) => {
            overlay.classList.toggle("active", show);
            popup.classList.toggle("active", show);
        };
        header.onclick = () => toggle(true);
        overlay.onclick = () => toggle(false);
        this._togglePopup = toggle;
    }

    _renderCategories() {
        const list = this.shadowRoot.querySelector(".set-list");
        list.innerHTML = "";
        MATH_CATEGORIES.forEach((cat, i) => {
            const btn = document.createElement("button");
            btn.textContent = cat.name;
            btn.onclick = () => { this._selectCategory(i); this._togglePopup(false); };
            list.appendChild(btn);
        });
    }

    _selectCategory(i) {
        this._category = MATH_CATEGORIES[i];
        this._streak = 0; this._total = 0; this._correct = 0;
        this.shadowRoot.querySelector(".lesson-header .title").textContent = this._category.name;
        const btns = this.shadowRoot.querySelectorAll(".set-list button");
        btns.forEach((b, j) => b.classList.toggle("active", j === i));
        this._nextQuestion();
    }

    _nextQuestion() {
        const q = this._category.generate();
        this._currentAnswer = String(q.answer);
        this.shadowRoot.getElementById("question-text").textContent = q.question;
        this.shadowRoot.getElementById("feedback").textContent = "";
        this._updateStats();

        const container = this.shadowRoot.getElementById("choices");
        container.innerHTML = "";
        q.choices.forEach(c => {
            const btn = document.createElement("button");
            btn.className = "choice-btn";
            btn.textContent = c;
            btn.onclick = () => this._answer(btn, c, container);
            container.appendChild(btn);
        });
    }

    _answer(btn, chosen, container) {
        const correct = chosen === this._currentAnswer;
        this._total++;
        container.querySelectorAll(".choice-btn").forEach(b => b.style.pointerEvents = "none");

        if (correct) {
            btn.classList.add("correct");
            this._correct++;
            this._streak++;
            this.shadowRoot.getElementById("feedback").textContent = "✅ Richtig!";
            this._pm?.updatePoints(1);
            this._pm?.updateStreak(true);
        } else {
            btn.classList.add("wrong");
            // highlight correct
            container.querySelectorAll(".choice-btn").forEach(b => {
                if (b.textContent === this._currentAnswer) b.classList.add("correct");
            });
            this._streak = 0;
            this.shadowRoot.getElementById("feedback").textContent = `❌ Richtig: ${this._currentAnswer}`;
            this._pm?.updatePoints(-1);
            this._pm?.updateStreak(false);
        }

        this._updateStats();
        setTimeout(() => this._nextQuestion(), correct ? 800 : 2000);
    }

    _updateStats() {
        const pct = this._total > 0 ? Math.round(this._correct / this._total * 100) : 0;
        this.shadowRoot.getElementById("stats").textContent =
            `${this._correct}/${this._total} richtig (${pct}%) · Serie: ${this._streak}`;
    }
}

customElements.define("math-trainer", MathTrainer);
