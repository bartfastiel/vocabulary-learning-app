// vocab/question/question-wordenglish.js
//
// Reverse-mode question component.
// Displays the English word as the prompt,
// matching the original "Wie heißt X auf Englisch?" behavior but reversed.
//

class VocabQuestionWordEnglish extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    set word(vocab) {
        this.vocab = vocab;
        this.render();
    }

    render() {
        this.shadowRoot.innerHTML = `
      <style>
        .question {
          font-size: 1.3rem;
          margin-bottom: 1rem;
          text-align: center;
        }
      </style>
      <div class="question"></div>
    `;

        const q = this.shadowRoot.querySelector(".question");

        // For English vocab: “Wie heißt X auf Deutsch?”
        // For other subjects: show the answer as a question to match back
        const isQuiz = this.vocab.de && this.vocab.de.includes(“?”);
        if (isQuiz) {
            q.textContent = `Was passt zu: \u201e${this.vocab.en}\u201c?`;
        } else {
            q.textContent = `Wie hei\u00dft \u201e${this.vocab.en}\u201c auf Deutsch?`;
        }
    }
}

customElements.define("vocab-question-wordenglish", VocabQuestionWordEnglish);
