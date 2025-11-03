// vocab/shared/next-button.js

class NextButton extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({mode: "open"});
    }

    connectedCallback() {
        this.render();
    }

    render() {
        this.shadowRoot.innerHTML = `
      <style>
        button {
          margin-top: 1rem;
          padding: 0.6rem 1.2rem;
          font-size: 1rem;
          border: none;
          border-radius: 6px;
          background-color: #4dd0e1;
          cursor: pointer;
          display: none;
        }
      </style>
      <button><slot>Nächste Frage</slot></button>
    `;

        const btn = this.shadowRoot.querySelector("button");

        // Allow external show/hide
        this.show = () => (btn.style.display = "inline-block");
        this.hide = () => (btn.style.display = "none");

        btn.onclick = () => {
            this.dispatchEvent(new CustomEvent("next", {bubbles: true}));
        };
    }
}

customElements.define("next-button", NextButton);
