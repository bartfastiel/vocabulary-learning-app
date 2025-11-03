// vocab/answer/answer-choosewordgerman.js
//
// Reverse-mode answer component: choose the correct German word
// for a given English question. Behavior identical to choosewordenglish.
//

class VocabAnswerChooseWordGerman extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    set data({ word, vocabulary, updatePoints, updateStreak, soundCorrect, soundWrong }) {
        this.word = word;
        this.vocabulary = vocabulary;
        this.updatePoints = updatePoints;
        this.updateStreak = updateStreak;
        this.soundCorrect = soundCorrect;
        this.soundWrong = soundWrong;
        this.render();
    }

    render() {
        const correct = this.word.de.toLowerCase();
        const wrong = this.shuffle(
            this.vocabulary
                .filter(v => v.de.toLowerCase() !== correct)
                .slice(0, 3)
                .map(v => v.de.toLowerCase())
        );
        const options = this.shuffle([correct, ...wrong]);

        this.shadowRoot.innerHTML = `
      <style>
        .options {
          display: grid;
          gap: 0.6rem;
          margin-top: 1rem;
        }
        .option-btn {
          background-color: #ffb347;
          border: none;
          border-radius: 8px;
          padding: 0.9rem;
          font-size: 1.05rem;
          cursor: pointer;
        }
        .option-btn:hover { background-color: #ffcc80; }
        .correct { background-color: #81c784 !important; }
        .wrong { background-color: #e57373 !important; }
      </style>

      <div class="options"></div>
    `;

        const optionsDiv = this.shadowRoot.querySelector(".options");
        const nextBtn = this.shadowRoot.querySelector("#next-btn");

        nextBtn.onclick = () => {
            this.dispatchEvent(new CustomEvent("answered", {
                bubbles: true,
                detail: {correct: true} // correctness is handled by updatePoints already
            }));
        };

        options.forEach(opt => {
            const btn = document.createElement("button");
            btn.className = "option-btn";
            btn.textContent = opt;
            btn.onclick = () => {
                const isCorrect = opt === correct;
                btn.classList.add(isCorrect ? "correct" : "wrong");

                (isCorrect ? this.soundCorrect : this.soundWrong).play();

                this.updatePoints(isCorrect ? +1 : -1);
                this.updateStreak(isCorrect);

                // disable further clicks
                Array.from(optionsDiv.children).forEach(b => (b.disabled = true));

                // highlight correct answer if wrong
                if (!isCorrect) {
                    Array.from(optionsDiv.children).forEach(b => {
                        if (b.textContent === correct) {
                            b.classList.add("correct");
                        }
                    });
                }

                nextBtn.style.display = "inline-block";
            };
            optionsDiv.appendChild(btn);
        });
    }

    shuffle(arr) {
        return arr.sort(() => Math.random() - 0.5);
    }
}

customElements.define("vocab-answer-choosewordgerman", VocabAnswerChooseWordGerman);
