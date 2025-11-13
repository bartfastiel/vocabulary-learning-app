// core/help-overlay.js
//
// Global tutorial/guide overlay.
// Highlights specific UI areas with arrows and explanatory text.
// Automatically appears on first run (localStorage) or when user clicks "i".
//


class VocabHelpOverlay extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this.steps = [];
        this.currentStep = 0;
    }

    connectedCallback() {
        this.shadowRoot.innerHTML = `
          <style>
            :host {
              position: fixed;
              top: 0; left: 0;
              width: 100%;
              height: 100%;
              background: rgba(0,0,0,0.55);
              backdrop-filter: blur(3px);
              display: none;
              z-index: 99999;
            }

            .bubble {
              position: absolute;
              background: #fff8c6;
              border: 2px solid #f1d76d;
              padding: 1rem;
              border-radius: 12px;
              max-width: 260px;
              font-size: 1rem;
              box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            }

            .arrow {
              position: absolute;
              width: 0;
              height: 0;
              border-left: 12px solid transparent;
              border-right: 12px solid transparent;
              border-top: 18px solid #fff8c6;
            }

            .highlight {
              position: absolute;
              border: 3px solid #fcee58;
              border-radius: 8px;
              background: rgba(255,255,0,0.15);
              pointer-events: none;
            }

            .next {
              position: fixed;
              bottom: 20px;
              left: 50%;
              transform: translateX(-50%);
              background: #26c6da;
              color: white;
              padding: 0.7rem 1.4rem;
              border-radius: 8px;
              font-size: 1rem;
              cursor: pointer;
              border: none;
              box-shadow: 0 3px 8px rgba(0,0,0,0.3);
            }

            .next:hover {
              background: #00acc1;
            }
          </style>

          <div class="highlight"></div>
          <div class="arrow"></div>
          <div class="bubble"></div>
          <button class="next">Weiter</button>
        `;

        this.hl = this.shadowRoot.querySelector(".highlight");
        this.arrow = this.shadowRoot.querySelector(".arrow");
        this.bubble = this.shadowRoot.querySelector(".bubble");
        this.next = this.shadowRoot.querySelector(".next");

        this.next.onclick = () => this.nextStep();
    }

    start(steps) {
        this.steps = steps;
        this.currentStep = 0;
        this.showStep();
        this.style.display = "block";
        localStorage.setItem("vocabHelpSeen", "1");
    }

    showStep() {
        const step = this.steps[this.currentStep];
        if (!step) { this.close(); return; }

        let target = null;

        if (typeof step.selector === "function") {
            target = step.selector();
        } else if (typeof step.selector === "string") {
            target = document.querySelector(step.selector);
        }
        if (!target) {
            console.warn("Tutorial: Ziel nicht gefunden:", step.selector);
            this.nextStep();
            return;
        }
        const rect = target.getBoundingClientRect();

        // Highlight box
        this.hl.style.top = rect.top - 8 + "px";
        this.hl.style.left = rect.left - 8 + "px";
        this.hl.style.width = rect.width + 16 + "px";
        this.hl.style.height = rect.height + 16 + "px";

        // Bubble
        this.bubble.innerHTML = step.text;
        this.bubble.style.top = rect.bottom + 12 + "px";
        this.bubble.style.left = rect.left + "px";

        // Arrow below highlight pointing up
        this.arrow.style.top = rect.bottom + "px";
        this.arrow.style.left = rect.left + rect.width / 2 - 12 + "px";

        this.style.display = "block";
    }

    nextStep() {
        this.currentStep++;
        if (this.currentStep >= this.steps.length) {
            this.close();
        } else {
            this.showStep();
        }
    }

    close() {
        this.style.display = "none";
    }
}

customElements.define("vocab-help", VocabHelpOverlay);
