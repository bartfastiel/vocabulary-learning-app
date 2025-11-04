// vocab/answer/answer-chooseWordEnglish.js

import {playVoice} from "../../core/audio.js";
import "./elements/next-button.js"

class VocabAnswerChooseWordEnglish extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({mode: "open"});
        this.word = null;
        this.vocabulary = [];
    }

    set data({word, vocabulary, soundCorrect, soundWrong, updatePoints, updateStreak}) {
        this.word = word;
        this.vocabulary = vocabulary;
        this.soundCorrect = soundCorrect;
        this.soundWrong = soundWrong;
        this.updatePoints = updatePoints;
        this.updateStreak = updateStreak;
        this.render();
    }

    shuffle(arr) {
        return arr.sort(() => Math.random() - 0.5);
    }

    render() {
        let correct = this.word.en;
        const wrong = this.shuffle(this.vocabulary.filter(v => v.en !== correct))
            .slice(0, 3)
            .map(v => v.en);
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
      <next-button>Nächste Frage</next-button>
    `;

        const optionsDiv = this.shadowRoot.querySelector(".options");
        const nextBtn = this.shadowRoot.querySelector("next-button");

        nextBtn.addEventListener("next", () => {
            this.dispatchEvent(new CustomEvent("answered", {
                bubbles: true,
                detail: {correct: true}
            }));
        });

        options.forEach(opt => {
            const b = document.createElement("button");
            b.className = "option-btn";
            b.textContent = opt;
            b.onclick = () => {
                const isCorrect = opt === correct;
                b.classList.add(isCorrect ? "correct" : "wrong");
                (isCorrect ? this.soundCorrect : this.soundWrong).play();
                this.updatePoints(isCorrect ? 1 : -1);
                this.updateStreak(isCorrect);
                playVoice(this.word.en);

                // disable all
                Array.from(optionsDiv.children).forEach(btn => (btn.disabled = true));

                // use green dotted border for the correct answer if wrong
                if (!isCorrect) {
                    const correctBtn = Array.from(optionsDiv.children).find(btn => btn.textContent === correct);
                    if (correctBtn) {
                        correctBtn.style.border = "5px dotted green";
                    }
                }

                nextBtn.show();
            };
            optionsDiv.appendChild(b);
        });
    }
}

customElements.define("vocab-answer-choosewordenglish", VocabAnswerChooseWordEnglish);
