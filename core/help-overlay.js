// core/help-overlay.js
//
// Global tutorial/guide overlay.
// Highlights specific UI areas with arrows and explanatory text.
// "Weiter"-Button sitzt direkt in der gelben Bubble neben dem Highlight.
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
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background: rgba(0,0,0,0.55);
              backdrop-filter: blur(3px);
              display: none;
              z-index: 99999;
            }

            .highlight {
              position: absolute;
              border: 3px solid #fcee58;
              border-radius: 8px;
              background: rgba(255,255,0,0.15);
              pointer-events: none;
              box-shadow: 0 0 12px rgba(0,0,0,0.5);
            }

            .arrow {
              position: absolute;
              width: 0;
              height: 0;
              border-left: 12px solid transparent;
              border-right: 12px solid transparent;
              border-top: 18px solid #fff8c6;
            }

            .bubble {
              position: absolute;
              background: #fff8c6;
              border: 2px solid #f1d76d;
              padding: 0.8rem 1rem;
              border-radius: 12px;
              max-width: 280px;
              font-size: 1rem;
              box-shadow: 0 4px 10px rgba(0,0,0,0.3);
              display: flex;
              flex-direction: column;
              gap: 0.5rem;
            }

            .bubble-text {
              line-height: 1.3;
            }

            .next {
              align-self: flex-end;
              background: #26c6da;
              color: white;
              padding: 0.4rem 0.9rem;
              border-radius: 8px;
              font-size: 0.9rem;
              cursor: pointer;
              border: none;
              box-shadow: 0 2px 6px rgba(0,0,0,0.25);
              transition: background 0.2s, transform 0.1s;
            }

            .next:hover {
              background: #00acc1;
              transform: translateY(-1px);
            }

            .next:active {
              transform: translateY(1px);
            }
          </style>

          <div class="highlight"></div>
          <div class="arrow"></div>
          <div class="bubble">
            <div class="bubble-text"></div>
            <button class="next">Weiter</button>
          </div>
        `;

        this.hl = this.shadowRoot.querySelector(".highlight");
        this.arrow = this.shadowRoot.querySelector(".arrow");
        this.bubble = this.shadowRoot.querySelector(".bubble");
        this.bubbleText = this.shadowRoot.querySelector(".bubble-text");
        this.next = this.shadowRoot.querySelector(".next");

        this.next.onclick = () => this.nextStep();
    }

    start(steps) {
        this.steps = steps || [];
        this.currentStep = 0;
        localStorage.setItem("vocabHelpSeen", "1");
        this.style.display = "block";
        this.showStep();
    }

    showStep() {
        const step = this.steps[this.currentStep];
        if (!step) {
            this.close();
            return;
        }

        // selector kann String oder Funktion sein
        let target = null;
        if (typeof step.selector === "function") {
            target = step.selector();
        } else if (typeof step.selector === "string") {
            target = document.querySelector(step.selector);
        }

        if (!target) {
            console.warn("Tutorial: Ziel nicht gefunden:", step.selector?.toString());
            this.nextStep();
            return;
        }

        const rect = target.getBoundingClientRect();

        // Highlight über Ziel legen
        this.hl.style.top = rect.top - 8 + "px";
        this.hl.style.left = rect.left - 8 + "px";
        this.hl.style.width = rect.width + 16 + "px";
        this.hl.style.height = rect.height + 16 + "px";

        // Text setzen
        this.bubbleText.innerHTML = step.text;

        // Bubble und Pfeil grob unterhalb des Elements platzieren
        const bubbleMargin = 12;
        const arrowHeight = 18;

        let bubbleTop = rect.bottom + arrowHeight + bubbleMargin;
        let bubbleLeft = rect.left;

        // ein bisschen innerhalb des Viewports halten
        const vpWidth = window.innerWidth;
        const vpHeight = window.innerHeight;

        const bubbleWidth = 280; // max-width
        if (bubbleLeft + bubbleWidth > vpWidth - 16) {
            bubbleLeft = vpWidth - bubbleWidth - 16;
        }
        if (bubbleTop > vpHeight - 140) {
            // wenn unten zu wenig Platz ist, nach oben über das Element
            bubbleTop = rect.top - bubbleMargin - 120;
            this.arrow.style.top = rect.top - arrowHeight + "px";
            this.arrow.style.borderTopColor = "#fff8c6";
            this.arrow.style.transform = "rotate(180deg)";
        } else {
            this.arrow.style.top = rect.bottom + "px";
            this.arrow.style.borderTopColor = "#fff8c6";
            this.arrow.style.transform = "rotate(0deg)";
        }

        this.bubble.style.top = bubbleTop + "px";
        this.bubble.style.left = bubbleLeft + "px";

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
