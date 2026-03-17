// game/simon-game.js
// Farb-Folge: Remember and repeat color sequences. Gets longer each round.
// Fires CustomEvent("game-over", { bubbles:true, detail:{ score, pointsEarned } })

const COLORS = [
    { name: "rot",   bg: "#e53e3e", light: "#fc8181" },
    { name: "blau",  bg: "#3182ce", light: "#63b3ed" },
    { name: "gruen", bg: "#38a169", light: "#68d391" },
    { name: "gelb",  bg: "#d69e2e", light: "#f6e05e" },
];

class SimonGame extends HTMLElement {
    constructor() { super(); this.attachShadow({ mode: "open" }); }

    connectedCallback() {
        this.shadowRoot.innerHTML = `<style>
            :host{display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;height:100%;background:#1a1a2e;font-family:"Segoe UI",sans-serif;color:white;user-select:none}
            .title{font-size:1.1rem;font-weight:700;margin-bottom:0.3rem;opacity:0.8}
            .level{font-size:2rem;font-weight:900;color:#fbbf24;margin-bottom:0.8rem}
            .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;width:min(280px,70vw);aspect-ratio:1}
            .btn{border-radius:16px;border:none;cursor:pointer;transition:all 0.15s;opacity:0.6;touch-action:manipulation}
            .btn.lit{opacity:1;transform:scale(1.05)}
            .btn:active{transform:scale(0.95)}
            .msg{font-size:1rem;margin-top:1rem;min-height:1.5em;text-align:center}
            .msg.ok{color:#68d391}.msg.err{color:#fc8181}
            .hint{font-size:0.8rem;opacity:0.5;margin-top:0.5rem}
        </style>
        <div class="title">Merk dir die Reihenfolge!</div>
        <div class="level" id="level">Runde 1</div>
        <div class="grid" id="grid"></div>
        <div class="msg" id="msg"></div>
        <div class="hint" id="hint">Schau zu...</div>`;

        const grid = this.shadowRoot.getElementById("grid");
        this._btns = COLORS.map((c, i) => {
            const btn = document.createElement("button");
            btn.className = "btn";
            btn.style.background = c.bg;
            btn.dataset.idx = i;
            btn.onclick = () => this._playerInput(i);
            grid.appendChild(btn);
            return btn;
        });

        this._sequence = [];
        this._playerIdx = 0;
        this._round = 0;
        this._score = 0;
        this._playing = false;
        this._gameOver = false;
        this._speed = 600;

        setTimeout(() => this._nextRound(), 800);
    }

    disconnectedCallback() { clearTimeout(this._timer); }

    _nextRound() {
        this._round++;
        this._speed = Math.max(200, 600 - this._round * 30);
        this.shadowRoot.getElementById("level").textContent = `Runde ${this._round}`;
        this.shadowRoot.getElementById("hint").textContent = "Schau zu...";
        this.shadowRoot.getElementById("msg").textContent = "";

        // Add random color
        this._sequence.push(Math.floor(Math.random() * 4));
        this._playerIdx = 0;
        this._playing = false;

        // Play sequence
        this._playSequence(0);
    }

    _playSequence(i) {
        if (i >= this._sequence.length) {
            this._playing = true;
            this.shadowRoot.getElementById("hint").textContent = "Jetzt du! Tippe die Farben!";
            return;
        }
        this._lightUp(this._sequence[i]);
        this._timer = setTimeout(() => this._playSequence(i + 1), this._speed);
    }

    _lightUp(idx) {
        const btn = this._btns[idx];
        btn.classList.add("lit");
        btn.style.background = COLORS[idx].light;
        setTimeout(() => {
            btn.classList.remove("lit");
            btn.style.background = COLORS[idx].bg;
        }, this._speed * 0.6);
    }

    _playerInput(idx) {
        if (!this._playing || this._gameOver) return;

        this._lightUp(idx);

        if (idx === this._sequence[this._playerIdx]) {
            this._playerIdx++;
            this._score += this._round;

            if (this._playerIdx >= this._sequence.length) {
                this._playing = false;
                this.shadowRoot.getElementById("msg").textContent = "Richtig!";
                this.shadowRoot.getElementById("msg").className = "msg ok";
                this._timer = setTimeout(() => this._nextRound(), 1000);
            }
        } else {
            this._gameOver = true;
            this.shadowRoot.getElementById("msg").textContent = `Falsch! ${this._round - 1} Runden geschafft!`;
            this.shadowRoot.getElementById("msg").className = "msg err";
            this.shadowRoot.getElementById("hint").textContent = "";

            // Flash correct button
            this._btns[this._sequence[this._playerIdx]].classList.add("lit");

            setTimeout(() => {
                this.dispatchEvent(new CustomEvent("game-over", {
                    bubbles: true, detail: { score: this._round - 1, pointsEarned: 0 }
                }));
            }, 2000);
        }
    }
}

customElements.define("simon-game", SimonGame);
