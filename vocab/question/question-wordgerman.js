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

        const isQuiz = this.vocab.de && this.vocab.de.includes("?");
        if (isQuiz) {
            q.textContent = this.vocab.de;
        } else {
            q.textContent = `Wie hei\u00dft \u201e${this.vocab.de}\u201c auf Englisch?`;
        }
    }
}

customElements.define("vocab-question-wordgerman", VocabQuestionWordGerman);
