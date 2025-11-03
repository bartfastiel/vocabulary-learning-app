// vocab/answer/answer-typewordenglish.js
//
// Answer mode where the user types the English translation
// for a shown German word. Fully mirrors the original text_input behavior.
//

class VocabAnswerTypeWordEnglish extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    set data({ word, updatePoints, updateStreak, soundCorrect, soundWrong }) {
        this.word = word;
        this.updatePoints = updatePoints;
        this.updateStreak = updateStreak;
        this.soundCorrect = soundCorrect;
        this.soundWrong = soundWrong;
        this.render();
    }

    render() {
        const correct = this.word.en.toLowerCase();

        this.shadowRoot.innerHTML = `
      <style>
        .container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          margin-top: 1rem;
        }
        input[type="text"] {
          padding: 0.7rem;
          border-radius: 8px;
          border: 1px solid #ccc;
          font-size: 1.05rem;
          text-align: center;
          width: 80%;
          max-width: 260px;
        }
        button {
          background-color: #ffb347;
          border: none;
          border-radius: 8px;
          padding: 0.9rem;
          font-size: 1.05rem;
          cursor: pointer;
          margin-top: 0.8rem;
        }
        button:hover { background-color: #ffcc80; }
      </style>

      <div class="container">
        <input type="text" id="input" placeholder="Antwort eingeben" />
        <button id="submit">Nächste Frage</button>
      </div>
    `;

        const input = this.shadowRoot.getElementById("input");
        const button = this.shadowRoot.getElementById("submit");

        // Auto-focus when key pressed
        document.body.addEventListener("keydown", function initType(e) {
            if (!input.disabled && /^[a-zA-Z]$/.test(e.key)) {
                input.focus();
                document.body.removeEventListener("keydown", initType);
            }
        });

        // Enter key submits
        input.addEventListener("keydown", e => {
            if (e.key === "Enter" && !button.disabled) button.click();
        });

        button.onclick = () => {
            const user = input.value.trim().toLowerCase();
            const isCorrect = user === correct;

            input.style.backgroundColor = isCorrect ? "#81c784" : "#e57373";
            (isCorrect ? this.soundCorrect : this.soundWrong).play();

            this.updatePoints(isCorrect ? +1 : -1);
            this.updateStreak(isCorrect);

            input.disabled = true;
            button.disabled = true;
        };
    }
}

customElements.define("vocab-answer-typewordenglish", VocabAnswerTypeWordEnglish);
