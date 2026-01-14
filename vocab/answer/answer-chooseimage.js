// vocab/answer/answer-chooseimage.js
//
// Answer mode: shows four images.
// User clicks on one image as the answer.
//
// Uses the same "next-button" pattern and point/streak logic.
//

import "./elements/next-button.js";
import {playVoice} from "../../core/audio.js";

class VocabAnswerChooseImage extends HTMLElement {
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
        const correct = this.word.en.toLowerCase();
        const wrong = this.shuffle(
            this.vocabulary
                .filter(v => v.en.toLowerCase() !== correct && v.allowImage)

        ).slice(0, 3);
        const options = this.shuffle([this.word, ...wrong]);

        this.shadowRoot.innerHTML = `
      <style>
        .options {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
          margin-top: 1rem;
        }
        .img-btn {
          border: none;
          background: none;
          cursor: pointer;
          padding: 0;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 0 4px rgba(0,0,0,0.2);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .img-btn:hover {
          transform: scale(1.05);
          box-shadow: 0 0 8px rgba(0,0,0,0.3);
        }
        .img-btn img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .correct { outline: 4px solid #81c784; }
        .would-have-been-correct { outline: 4px dotted #81c784; }
        .wrong { outline: 4px solid #e57373; }
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

        let correctElement = null;

        options.forEach(opt => {
            const btn = document.createElement("button");
            btn.className = "img-btn";
            const img = document.createElement("img");
            const fileSafe = opt.en
                .toLowerCase()
                .replaceAll(/[^a-z0-9]/g, "_");
            img.src = `assets/img/${fileSafe}.png`
            img.alt = ""; // no visible text, per your rule
            btn.appendChild(img);

            btn.onclick = () => {
                const isCorrect = opt.en.toLowerCase() === correct;
                btn.classList.add(isCorrect ? "correct" : "wrong");
                (isCorrect ? this.soundCorrect : this.soundWrong).play();
                playVoice(this.word.en);
                this.updatePoints(isCorrect ? +1 : -1);
                this.updateStreak(isCorrect);

                // Disable all buttons
                Array.from(optionsDiv.querySelectorAll("button")).forEach(b => (b.disabled = true));

                // Highlight the correct one if wrong
                if (!isCorrect) {
                    if (correctElement) {
                        correctElement.classList.add("would-have-been-correct");
                    }
                }

                nextBtn.show();
            };

            optionsDiv.appendChild(btn);
            if (opt.en.toLowerCase() === correct) {
                correctElement = btn;
            }
        });
    }
}

customElements.define("vocab-answer-chooseimage", VocabAnswerChooseImage);
