// vocab/answer/answer-chooseWordEnglish.js

import {playVoice} from "../../core/audio.js";

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
        const correct = this.word.en.toLowerCase();
        const wrong = this.shuffle(this.vocabulary.filter(v => v.en.toLowerCase() !== correct))
            .slice(0, 3)
            .map(v => v.en.toLowerCase());
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
        #next-btn {
          margin-top: 1rem;
          padding: 0.6rem 1.2rem;
          font-size: 1rem;
          border: none;
          border-radius: 6px;
          background-color: #4dd0e1;
          cursor: pointer;
          display: none;
        }
        .feedback { margin-top: 0.6rem; }
      </style>

      <div class="options"></div>
      <div class="feedback" id="feedback"></div>
      <button id="next-btn">Nächste Frage</button>
    `;

        const optionsDiv = this.shadowRoot.querySelector(".options");
        const feedbackDiv = this.shadowRoot.querySelector("#feedback");
        const nextBtn = this.shadowRoot.querySelector("#next-btn");

        // build option buttons
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
                nextBtn.style.display = "inline-block";

                // identical to original flow — wait for “next” click
            };
            optionsDiv.appendChild(b);
        });

        nextBtn.onclick = () => {
            this.dispatchEvent(new CustomEvent("answered", {
                bubbles: true,
                detail: {correct: true} // correctness is handled by updatePoints already
            }));
        };
    }
}

customElements.define("vocab-answer-choosewordenglish", VocabAnswerChooseWordEnglish);
