// vocab/answer/answer-choosewordgerman.js
//
// Reverse-mode answer component: choose the correct German word
// for a given English question.

import "./elements/next-button.js";
import {playVoice} from "../../core/audio.js";

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

    shuffle(arr) {
        return arr.sort(() => Math.random() - 0.5);
    }

    render() {
        let correct = this.word.de;
        const wrong = this.shuffle(
            this.vocabulary.filter(v => v.de !== correct)
                .slice(0, 3)
                .map(v => v.de)
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
      <next-button>Nächste Frage</next-button>
    `;

        const optionsDiv = this.shadowRoot.querySelector(".options");
        const nextBtn = this.shadowRoot.querySelector("next-button");

        nextBtn.addEventListener("next", () => {
            this.dispatchEvent(new CustomEvent("answered", {
                bubbles: true,
                detail: { correct: true }
            }));
        });

        options.forEach(opt => {
            const btn = document.createElement("button");
            btn.className = "option-btn";
            btn.textContent = opt;
            btn.onclick = () => {
                const isCorrect = opt === correct;
                btn.classList.add(isCorrect ? "correct" : "wrong");
                (isCorrect ? this.soundCorrect : this.soundWrong).play();
                playVoice(this.word.en);
                this.updatePoints(isCorrect ? +1 : -1);
                this.updateStreak(isCorrect);

                Array.from(optionsDiv.children).forEach(b => (b.disabled = true));

                if (!isCorrect) {
                    const correctBtn = Array.from(optionsDiv.children).find(b => b.textContent === correct);
                    if (correctBtn) correctBtn.classList.add("correct");
                }

                nextBtn.show();
            };
            optionsDiv.appendChild(btn);
        });
    }
}

customElements.define("vocab-answer-choosewordgerman", VocabAnswerChooseWordGerman);
