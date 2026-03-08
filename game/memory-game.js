// game/memory-game.js
// Flip emoji cards, find all 8 matching pairs.
// Fires CustomEvent("game-over", { bubbles: true, detail: { score (moves), pointsEarned } })

const EMOJIS = ["🐶","🐱","🦊","🐸","🐧","🦋","🌸","🍕"];
const PAIRS  = 8;
const COLS   = 4;

class MemoryGame extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._moves   = 0;
        this._matched = 0;
        this._flipped = [];
        this._locked  = false;
        this._seconds = 0;
        this._timerId = null;
    }

    connectedCallback() {
        this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100%; height: 100%;
          background: radial-gradient(ellipse at top, #1b2838 0%, #0d0d1a 100%);
          font-family: "Segoe UI", sans-serif;
          user-select: none;
        }
        #hud {
          color: white;
          font-size: 1rem;
          margin-bottom: 0.8rem;
          display: flex;
          gap: 1.8rem;
          opacity: 0.9;
        }
        #board {
          display: grid;
          grid-template-columns: repeat(${COLS}, 1fr);
          gap: clamp(6px, 1.5vw, 10px);
          padding: 0.5rem;
          width: min(380px, 92vw);
        }
        .card {
          aspect-ratio: 1;
          cursor: pointer;
          perspective: 700px;
        }
        .inner {
          width: 100%; height: 100%;
          position: relative;
          transform-style: preserve-3d;
          transition: transform 0.35s ease;
        }
        .card.flipped .inner,
        .card.matched .inner { transform: rotateY(180deg); }
        .face, .back {
          position: absolute;
          inset: 0;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: clamp(1.4rem, 5vw, 2.2rem);
          backface-visibility: hidden;
        }
        .face {
          background: linear-gradient(135deg, #26c6da, #0077a8);
          color: rgba(255,255,255,0.5);
          font-size: 1.4rem;
          box-shadow: 0 3px 10px rgba(0,0,0,0.3);
        }
        .back {
          background: white;
          transform: rotateY(180deg);
          box-shadow: 0 3px 10px rgba(0,0,0,0.2);
        }
        .card.matched .back {
          background: #e8f5e9;
          border: 2px solid #66BB6A;
        }
        #give-up-btn {
          margin-top: 1rem;
          padding: 0.45rem 1.2rem;
          background: rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.7);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.85rem;
          transition: background 0.2s;
        }
        #give-up-btn:hover { background: rgba(255,255,255,0.2); }
      </style>
      <div id="hud">
        <span>🔄 <span id="moves">0</span> Züge</span>
        <span>✅ <span id="pairs">0</span>/${PAIRS} Paare</span>
        <span>⏱ <span id="time">0</span>s</span>
      </div>
      <div id="board"></div>
      <button id="give-up-btn">Aufgeben</button>
    `;
        this._buildBoard();
        this._timerId = setInterval(() => {
            this._seconds++;
            this.shadowRoot.getElementById("time").textContent = this._seconds;
        }, 1000);
        this.shadowRoot.getElementById("give-up-btn").onclick = () => this._end(true);
    }

    disconnectedCallback() {
        clearInterval(this._timerId);
    }

    _buildBoard() {
        const cards = [...EMOJIS, ...EMOJIS].sort(() => Math.random() - 0.5);
        const board = this.shadowRoot.getElementById("board");
        board.innerHTML = "";
        cards.forEach((emoji, i) => {
            const card = document.createElement("div");
            card.className = "card";
            card.dataset.emoji = emoji;
            card.innerHTML = `
        <div class="inner">
          <div class="face">?</div>
          <div class="back">${emoji}</div>
        </div>`;
            card.onclick = () => this._flip(card);
            board.appendChild(card);
        });
    }

    _flip(card) {
        if (this._locked || card.classList.contains("flipped") || card.classList.contains("matched")) return;
        card.classList.add("flipped");
        this._flipped.push(card);
        if (this._flipped.length === 2) {
            this._moves++;
            this.shadowRoot.getElementById("moves").textContent = this._moves;
            this._check();
        }
    }

    _check() {
        this._locked = true;
        const [a, b] = this._flipped;
        if (a.dataset.emoji === b.dataset.emoji) {
            a.classList.replace("flipped", "matched");
            b.classList.replace("flipped", "matched");
            this._matched++;
            this.shadowRoot.getElementById("pairs").textContent = this._matched;
            this._flipped = [];
            this._locked  = false;
            if (this._matched === PAIRS) setTimeout(() => this._end(false), 400);
        } else {
            setTimeout(() => {
                a.classList.remove("flipped");
                b.classList.remove("flipped");
                this._flipped = [];
                this._locked  = false;
            }, 900);
        }
    }

    _end(gaveUp) {
        clearInterval(this._timerId);
        const pointsEarned = gaveUp ? 0 : Math.max(2, 12 - Math.max(0, this._moves - PAIRS));
        this.dispatchEvent(new CustomEvent("game-over", {
            bubbles: true,
            detail: { score: this._moves, pointsEarned },
        }));
    }
}

customElements.define("memory-game", MemoryGame);
