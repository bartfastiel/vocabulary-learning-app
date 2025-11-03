// vocab/question/question-voiceenglish.js
//
// Question mode that plays an English word aloud and
// offers a "Replay" button. Mirrors the original audio question behavior.
//

import { playVoice } from "../../core/audio.js";

class VocabQuestionVoiceEnglish extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this.currentAudio = null;
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
        #replay-btn {
          background: #90caf9;
          border: none;
          border-radius: 6px;
          padding: 0.4rem 1rem;
          margin-top: 0.5rem;
          cursor: pointer;
        }
      </style>

      <div class="question">
        <p>🔈 Höre das Wort</p>
        <button id="replay-btn">🔁 Anhören</button>
      </div>
    `;

        const replayBtn = this.shadowRoot.getElementById("replay-btn");

        // Play once automatically after render
        this.currentAudio = playVoice(this.vocab.en);

        // Allow replay on demand
        replayBtn.onclick = () => {
            if (this.currentAudio) this.currentAudio.pause();
            this.currentAudio = playVoice(this.vocab.en);
        };
    }
}

customElements.define("vocab-question-voiceenglish", VocabQuestionVoiceEnglish);
