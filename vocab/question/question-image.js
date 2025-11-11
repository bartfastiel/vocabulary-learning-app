// vocab/question/question-image.js
//
// Question mode: shows an image corresponding to the English word.
// The answer mode decides how the user responds (e.g., chooseWordEnglish, typeWordEnglish, etc.)
//

class VocabQuestionImage extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    set word(vocab) {
        this.vocab = vocab;
        this.render();
    }

    render() {
        const fileSafe = this.vocab.en
            .toLowerCase()
            .replaceAll(/[^a-z0-9]/g, "_");

        this.shadowRoot.innerHTML = `
      <style>
        .question {
          font-size: 1.3rem;
          margin-bottom: 1rem;
          text-align: center;
        }

        img.vocab-image {
          max-width: 100%;
          height: auto;
          border-radius: 12px;
          margin-bottom: 1rem;
          max-height: 50vh;
        }
      </style>

      <div class="question">
        <img src="assets/img/${fileSafe}.png" alt="" class="vocab-image" />
      </div>
    `;
    }
}

customElements.define("vocab-question-image", VocabQuestionImage);
