// vocab/answer/answer-choosevoiceenglish.js
//
// Answer mode: plays four spoken English words,
// and the user chooses the correct one by sound.
//
// Uses the same option button look & logic as other modes,
// but each button plays its corresponding audio on click.
//

import { playVoice } from "../../core/audio.js";

class VocabAnswerChooseVoiceEnglish extends HTMLElement {
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
        const correct = this.word.en.toLowerCase();
        const wrong = this.shuffle(
            this.vocabulary
                .filter(v => v.en.toLowerCase() !== correct)
                .slice(0, 3)
                .map(v => v.en.toLowerCase())
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

        options.forEach(opt => {
            const btn = document.createElement("button");
            btn.className = "option-btn";
            btn.textContent = "🔈 Anhören";

            btn.onclick = () => {
                // Play sound for this specific option
                playVoice(opt);

                // Evaluate correctness after a second click
                if (btn.dataset.clicked) {
                    const isCorrect = opt === correct;
                    btn.classList.add(isCorrect ? "correct" : "wrong");

                    (isCorrect ? this.soundCorrect : this.soundWrong).play();
                    this.updatePoints(isCorrect ? +1 : -1);
                    this.updateStreak(isCorrect);

                    Array.from(optionsDiv.children).forEach(b => (b.disabled = true));
                } else {
                    // mark for next click
                    btn.dataset.clicked = "true";
                }
            };

            optionsDiv.appendChild(btn);
        });
    }

    shuffle(arr) {
        return arr.sort(() => Math.random() - 0.5);
    }
}

customElements.define("vocab-answer-choosevoiceenglish", VocabAnswerChooseVoiceEnglish);
