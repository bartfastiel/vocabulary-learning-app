// vocab/answer/answer-typewordenglish.js
//
// Answer mode where the user types the English translation
// for a shown German word.

import "./elements/next-button.js";
import {playVoice} from "../../core/audio.js";

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
        .correct-answer {
          margin-top: 0.6rem;
          color: #fff;
          font-style: italic;
          font-size: 1rem;
        }
      </style>

      <div class="container">
      <input
        type="text"
        id="input"
        name="vocab-${crypto.randomUUID()}"
        placeholder="Antwort eingeben"
        autocomplete="off"
        autocorrect="off"
        autocapitalize="off"
        spellcheck="false"
        inputmode="text"
      />
        <button id="submit">Abschicken</button>
        <div id="feedback"></div>
      </div>
    `;

        const input = this.shadowRoot.getElementById("input");
        const button = this.shadowRoot.getElementById("submit");
        const feedback = this.shadowRoot.getElementById("feedback");

        document.body.addEventListener("keydown", function initType(e) {
            if (!input.disabled && /^[a-zA-Z]$/.test(e.key)) {
                input.focus();
                document.body.removeEventListener("keydown", initType);
            }
        });

        input.addEventListener("keydown", e => {
            if (e.key === "Enter" && !button.disabled) button.click();
        });

        const textColor = localStorage.getItem("textColor") || "#ffffff";
        input.style.color = textColor;

        let answered = false;
        button.onclick = () => {
            if (answered) return;
            answered = true;
            const user = input.value.trim().toLowerCase();
            const isCorrect = user === correct;
            input.style.backgroundColor = isCorrect ? "#81c784" : "#e57373";
            (isCorrect ? this.soundCorrect : this.soundWrong).play();
            playVoice(this.word.en);
            this.updatePoints(isCorrect ? +1 : -1);
            this.updateStreak(isCorrect);
            input.disabled = true;
            button.disabled = true;

            if (!isCorrect) {
                feedback.innerHTML = `<div class="correct-answer">Richtig wäre: <b>${this.word.en}</b></div>`;
            }

            this.dispatchEvent(new CustomEvent("checked", {
                bubbles: true,
                detail: { correct: isCorrect }
            }));

            const delay = isCorrect ? 2000 : 3500;
            setTimeout(() => {
                this.dispatchEvent(new CustomEvent("answered", {
                    bubbles: true,
                    detail: { correct: isCorrect }
                }));
            }, delay);
        };
    }
}

customElements.define("vocab-answer-typewordenglish", VocabAnswerTypeWordEnglish);
