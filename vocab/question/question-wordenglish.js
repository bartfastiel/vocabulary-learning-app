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

        // Mirror phrasing from the German→English question,
        // now asking for the German translation.
        q.textContent = `Wie heißt „${this.vocab.en}” auf Deutsch?`;
    }
}

customElements.define("vocab-question-wordenglish", VocabQuestionWordEnglish);
