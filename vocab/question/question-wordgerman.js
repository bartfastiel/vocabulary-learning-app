// vocab/question/question-wordGerman.js

class VocabQuestionWordGerman extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    set word(vocab) {
        this.vocab = vocab;
        this.render();
    }

    render() {
        // identical visual styling to the original .question element
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

        // exactly the same text shown in the original code
        // for mode "text" (German → English)
        q.textContent = `Wie heißt „${this.vocab.de}” auf Englisch?`;
    }
}

customElements.define("vocab-question-wordgerman", VocabQuestionWordGerman);
