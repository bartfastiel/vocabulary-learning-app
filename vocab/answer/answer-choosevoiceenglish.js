// vocab/answer/answer-choosevoiceenglish.js
//
// Answer mode: two-column layout:
// Left: "🔈 Anhören" buttons (play audio)
// Right: "Antwort wählen" buttons (select the correct word)

import { playVoice } from "../../core/audio.js";
import "./elements/next-button.js";

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

    shuffle(arr) {
        return arr.sort(() => Math.random() - 0.5);
    }

    render() {
        const correct = this.word.en.toLowerCase();
        const wrong = this.shuffle(
            this.vocabulary.filter(v => v.en.toLowerCase() !== correct && v._hasAudio)
                .slice(0, 3)
                .map(v => v.en.toLowerCase())
        );
        const options = this.shuffle([correct, ...wrong]);

        this.shadowRoot.innerHTML = `
      <style>
        .options {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.6rem 1rem;
          margin-top: 1rem;
          align-items: center;
        }
        .listen-btn,
        .choose-btn {
          background-color: #ffb347;
          border: none;
          border-radius: 8px;
          padding: 0.8rem;
          font-size: 1rem;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        .listen-btn:hover,
        .choose-btn:hover { background-color: #ffcc80; }
        .correct { background-color: #81c784 !important; }
        .wrong { background-color: #e57373 !important; }
      </style>

      <div class="options"></div>
      <next-button>Nächste Frage</next-button>
    `;

        const optionsDiv = this.shadowRoot.querySelector(".options");
        const nextBtn = this.shadowRoot.querySelector("next-button");
        let wasCorrect = false;

        nextBtn.addEventListener("next", () => {
            this.dispatchEvent(new CustomEvent("answered", {
                bubbles: true,
                detail: { correct: wasCorrect }
            }));
        });

        options.forEach(opt => {
            const listenBtn = document.createElement("button");
            listenBtn.className = "listen-btn";
            listenBtn.textContent = "🔈 Anhören";
            listenBtn.onclick = () => playVoice(opt);

            const chooseBtn = document.createElement("button");
            chooseBtn.className = "choose-btn";
            chooseBtn.textContent = "Antwort wählen";

            chooseBtn.onclick = () => {
                const isCorrect = opt === correct;
                wasCorrect = isCorrect;
                chooseBtn.classList.add(isCorrect ? "correct" : "wrong");
                (isCorrect ? this.soundCorrect : this.soundWrong).play();
                playVoice(this.word.en);
                this.updatePoints(isCorrect ? +1 : -1);
                this.updateStreak(isCorrect);

                Array.from(optionsDiv.querySelectorAll("button")).forEach(b => (b.disabled = true));

                // Highlight correct answer if wrong
                if (!isCorrect) {
                    const pairs = Array.from(optionsDiv.children);
                    for (let i = 0; i < pairs.length; i += 2) {
                        const maybeCorrect = options[i / 2];
                        if (maybeCorrect === correct) {
                            const correctChooseBtn = pairs[i + 1];
                            if (correctChooseBtn) correctChooseBtn.classList.add("correct");
                        }
                    }
                }

                nextBtn.show();
            };

            optionsDiv.appendChild(listenBtn);
            optionsDiv.appendChild(chooseBtn);
        });
    }
}

customElements.define("vocab-answer-choosevoiceenglish", VocabAnswerChooseVoiceEnglish);
