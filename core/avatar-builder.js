// core/avatar-builder.js
//
// Avatar builder as a native Web Component.
// All artwork is inline SVG — no external asset files required.
// Exposes open() / close() methods and fires "avatar-saved" on save.
// Also exports getAvatarSVG() for use in other components.

const LS_KEY = "avatarSelection";

// ─── artwork ──────────────────────────────────────────────────────────────────
// Canvas: 200×200.  Face oval: cx=100 cy=120 rx=54 ry=60 (top≈60, bottom≈180).
// Layer order (bottom→top): background, face, hair, eyes, mouth, glasses, accessory.

const LAYERS = {
    background: [
        { label: "Blau",     svg: `<rect width="200" height="200" fill="#7EC8E3"/>` },
        { label: "Grün",     svg: `<rect width="200" height="200" fill="#98D982"/>` },
        { label: "Lila",     svg: `<rect width="200" height="200" fill="#C9A0DC"/>` },
        { label: "Rosa",     svg: `<rect width="200" height="200" fill="#FFB7C5"/>` },
        { label: "Gelb",     svg: `<rect width="200" height="200" fill="#FFD580"/>` },
        { label: "Orange",   svg: `<rect width="200" height="200" fill="#FFB347"/>` },
        { label: "Punkte",   svg: `<rect width="200" height="200" fill="#E8F4F8"/>
          <circle cx="20"  cy="20"  r="6" fill="#B0D4E8"/>
          <circle cx="60"  cy="20"  r="6" fill="#B0D4E8"/>
          <circle cx="100" cy="20"  r="6" fill="#B0D4E8"/>
          <circle cx="140" cy="20"  r="6" fill="#B0D4E8"/>
          <circle cx="180" cy="20"  r="6" fill="#B0D4E8"/>
          <circle cx="40"  cy="55"  r="6" fill="#B0D4E8"/>
          <circle cx="80"  cy="55"  r="6" fill="#B0D4E8"/>
          <circle cx="120" cy="55"  r="6" fill="#B0D4E8"/>
          <circle cx="160" cy="55"  r="6" fill="#B0D4E8"/>
          <circle cx="20"  cy="90"  r="6" fill="#B0D4E8"/>
          <circle cx="60"  cy="90"  r="6" fill="#B0D4E8"/>
          <circle cx="100" cy="90"  r="6" fill="#B0D4E8"/>
          <circle cx="140" cy="90"  r="6" fill="#B0D4E8"/>
          <circle cx="180" cy="90"  r="6" fill="#B0D4E8"/>
          <circle cx="40"  cy="125" r="6" fill="#B0D4E8"/>
          <circle cx="80"  cy="125" r="6" fill="#B0D4E8"/>
          <circle cx="120" cy="125" r="6" fill="#B0D4E8"/>
          <circle cx="160" cy="125" r="6" fill="#B0D4E8"/>
          <circle cx="20"  cy="160" r="6" fill="#B0D4E8"/>
          <circle cx="60"  cy="160" r="6" fill="#B0D4E8"/>
          <circle cx="100" cy="160" r="6" fill="#B0D4E8"/>
          <circle cx="140" cy="160" r="6" fill="#B0D4E8"/>
          <circle cx="180" cy="160" r="6" fill="#B0D4E8"/>` },
        { label: "Streifen", svg: `<rect width="200" height="200" fill="#FFF5E6"/>
          <rect x="0" y="0"   width="200" height="26" fill="#FFE4B5" opacity="0.7"/>
          <rect x="0" y="52"  width="200" height="26" fill="#FFE4B5" opacity="0.7"/>
          <rect x="0" y="104" width="200" height="26" fill="#FFE4B5" opacity="0.7"/>
          <rect x="0" y="156" width="200" height="26" fill="#FFE4B5" opacity="0.7"/>` },
    ],

    face: [
        { label: "Sehr hell",   svg: `<ellipse cx="100" cy="120" rx="54" ry="60" fill="#FFDBB4"/>` },
        { label: "Hell",        svg: `<ellipse cx="100" cy="120" rx="54" ry="60" fill="#F1C27D"/>` },
        { label: "Mittel",      svg: `<ellipse cx="100" cy="120" rx="54" ry="60" fill="#E0AC69"/>` },
        { label: "Olive",       svg: `<ellipse cx="100" cy="120" rx="54" ry="60" fill="#C68642"/>` },
        { label: "Dunkel",      svg: `<ellipse cx="100" cy="120" rx="54" ry="60" fill="#8D5524"/>` },
        { label: "Sehr dunkel", svg: `<ellipse cx="100" cy="120" rx="54" ry="60" fill="#4A2912"/>` },
    ],

    // Hair drawn on top of face; designed to cover only the top/sides of the head.
    hair: [
        { label: "Kurz braun",    svg: `<ellipse cx="100" cy="66" rx="58" ry="36" fill="#4A3728"/>` },
        { label: "Lang braun",    svg: `<ellipse cx="100" cy="66" rx="58" ry="36" fill="#4A3728"/>
          <rect x="42"  y="82" width="17" height="90" rx="8" fill="#4A3728"/>
          <rect x="141" y="82" width="17" height="90" rx="8" fill="#4A3728"/>` },
        { label: "Lockig",        svg: `<ellipse cx="100" cy="62" rx="60" ry="32" fill="#6B4226"/>
          <circle cx="46"  cy="82" r="17" fill="#6B4226"/>
          <circle cx="154" cy="82" r="17" fill="#6B4226"/>
          <circle cx="68"  cy="56" r="20" fill="#6B4226"/>
          <circle cx="132" cy="56" r="20" fill="#6B4226"/>
          <circle cx="100" cy="48" r="22" fill="#6B4226"/>` },
        { label: "Dutt",          svg: `<ellipse cx="100" cy="68" rx="58" ry="34" fill="#8B6914"/>
          <circle cx="100" cy="38" r="24" fill="#8B6914"/>` },
        { label: "Mohawk",        svg: `<ellipse cx="100" cy="72" rx="58" ry="30" fill="#222"/>
          <rect x="88" y="26" width="24" height="52" rx="12" fill="#222"/>` },
        { label: "Blond lang",    svg: `<ellipse cx="100" cy="66" rx="58" ry="36" fill="#E8C84A"/>
          <rect x="42"  y="82" width="17" height="95" rx="8" fill="#E8C84A"/>
          <rect x="141" y="82" width="17" height="95" rx="8" fill="#E8C84A"/>` },
        { label: "Rot kurz",      svg: `<ellipse cx="100" cy="66" rx="58" ry="34" fill="#C0392B"/>` },
        { label: "Pferdeschwanz", svg: `<ellipse cx="100" cy="68" rx="58" ry="34" fill="#4A3728"/>
          <rect x="93" y="42" width="14" height="72" rx="7" fill="#4A3728"/>
          <ellipse cx="100" cy="114" rx="11" ry="7" fill="#4A3728"/>` },
    ],

    eyes: [
        { label: "Normal",     svg: `
          <circle cx="78"  cy="107" r="10" fill="white"/>
          <circle cx="78"  cy="107" r="6"  fill="#3D2B1F"/>
          <circle cx="81"  cy="104" r="2"  fill="white"/>
          <circle cx="122" cy="107" r="10" fill="white"/>
          <circle cx="122" cy="107" r="6"  fill="#3D2B1F"/>
          <circle cx="125" cy="104" r="2"  fill="white"/>` },
        { label: "Froh",       svg: `
          <path d="M68,107 Q78,99 88,107"   stroke="#3D2B1F" stroke-width="3" fill="none" stroke-linecap="round"/>
          <path d="M112,107 Q122,99 132,107" stroke="#3D2B1F" stroke-width="3" fill="none" stroke-linecap="round"/>` },
        { label: "Überrascht", svg: `
          <circle cx="78"  cy="107" r="12" fill="white"/>
          <circle cx="78"  cy="107" r="8"  fill="#3D2B1F"/>
          <circle cx="82"  cy="103" r="3"  fill="white"/>
          <circle cx="122" cy="107" r="12" fill="white"/>
          <circle cx="122" cy="107" r="8"  fill="#3D2B1F"/>
          <circle cx="126" cy="103" r="3"  fill="white"/>` },
        { label: "Zwinkern",   svg: `
          <circle cx="78"  cy="107" r="10" fill="white"/>
          <circle cx="78"  cy="107" r="6"  fill="#3D2B1F"/>
          <circle cx="81"  cy="104" r="2"  fill="white"/>
          <path d="M112,107 Q122,101 132,107" stroke="#3D2B1F" stroke-width="3.5" fill="none" stroke-linecap="round"/>` },
        { label: "Müde",       svg: `
          <circle cx="78"  cy="109" r="9" fill="white"/>
          <circle cx="78"  cy="111" r="5" fill="#3D2B1F"/>
          <path d="M68,107 Q78,103 88,107"   stroke="#4A3728" stroke-width="5" fill="none"/>
          <circle cx="122" cy="109" r="9" fill="white"/>
          <circle cx="122" cy="111" r="5" fill="#3D2B1F"/>
          <path d="M112,107 Q122,103 132,107" stroke="#4A3728" stroke-width="5" fill="none"/>` },
        { label: "Sternaugen", svg: `
          <circle cx="78"  cy="107" r="11" fill="white"/>
          <text x="71"  y="112" font-size="13" fill="#FFD700">★</text>
          <circle cx="122" cy="107" r="11" fill="white"/>
          <text x="115" y="112" font-size="13" fill="#FFD700">★</text>` },
    ],

    mouth: [
        { label: "Lächeln",  svg: `<path d="M82,136 Q100,150 118,136" stroke="#C0836A" stroke-width="3" fill="none" stroke-linecap="round"/>` },
        { label: "Lachen",   svg: `<path d="M78,133 Q100,156 122,133" stroke="#333" stroke-width="2" fill="#FF6B6B" stroke-linecap="round"/>` },
        { label: "Neutral",  svg: `<line x1="85" y1="138" x2="115" y2="138" stroke="#C0836A" stroke-width="3" stroke-linecap="round"/>` },
        { label: "Traurig",  svg: `<path d="M82,146 Q100,133 118,146" stroke="#C0836A" stroke-width="3" fill="none" stroke-linecap="round"/>` },
        { label: "Staunen",  svg: `<ellipse cx="100" cy="140" rx="10" ry="12" fill="#CC7B5C"/>` },
        { label: "Grinsen",  svg: `<path d="M85,138 Q100,148 115,134" stroke="#C0836A" stroke-width="3" fill="none" stroke-linecap="round"/>` },
        { label: "Zunge",    svg: `<path d="M82,133 Q100,148 118,133" stroke="#333" stroke-width="2" fill="#FF6B6B"/>
          <ellipse cx="100" cy="148" rx="10" ry="8" fill="#FF8FA3"/>` },
    ],

    // Index 0 = "Keine" (empty layer)
    glasses: [
        { label: "Keine",        svg: `` },
        { label: "Rund",         svg: `
          <circle cx="78"  cy="107" r="15" fill="none" stroke="#333" stroke-width="3"/>
          <circle cx="122" cy="107" r="15" fill="none" stroke="#333" stroke-width="3"/>
          <line x1="93"  y1="107" x2="107" y2="107" stroke="#333" stroke-width="3"/>
          <line x1="63"  y1="107" x2="54"  y2="103" stroke="#333" stroke-width="3"/>
          <line x1="137" y1="107" x2="146" y2="103" stroke="#333" stroke-width="3"/>` },
        { label: "Eckig",        svg: `
          <rect x="63" y="97" width="30" height="20" rx="4" fill="none" stroke="#333" stroke-width="3"/>
          <rect x="107" y="97" width="30" height="20" rx="4" fill="none" stroke="#333" stroke-width="3"/>
          <line x1="93"  y1="107" x2="107" y2="107" stroke="#333" stroke-width="3"/>
          <line x1="63"  y1="107" x2="54"  y2="103" stroke="#333" stroke-width="3"/>
          <line x1="137" y1="107" x2="146" y2="103" stroke="#333" stroke-width="3"/>` },
        { label: "Sonnenbrille", svg: `
          <rect x="60"  y="98" width="36" height="18" rx="9" fill="#222" opacity="0.9"/>
          <rect x="104" y="98" width="36" height="18" rx="9" fill="#222" opacity="0.9"/>
          <line x1="96"  y1="107" x2="104" y2="107" stroke="#555" stroke-width="3"/>
          <line x1="60"  y1="107" x2="52"  y2="103" stroke="#555" stroke-width="3"/>
          <line x1="140" y1="107" x2="148" y2="103" stroke="#555" stroke-width="3"/>` },
        { label: "Herz",         svg: `
          <path d="M64,108 C64,102 71,97 78,102 C85,97 92,102 92,108 C92,114 78,121 78,121Z" fill="#FF6B9D"/>
          <path d="M108,108 C108,102 115,97 122,102 C129,97 136,102 136,108 C136,114 122,121 122,121Z" fill="#FF6B9D"/>
          <line x1="92"  y1="108" x2="108" y2="108" stroke="#FF6B9D" stroke-width="3"/>
          <line x1="64"  y1="108" x2="55"  y2="104" stroke="#FF6B9D" stroke-width="3"/>
          <line x1="136" y1="108" x2="145" y2="104" stroke="#FF6B9D" stroke-width="3"/>` },
    ],

    // Index 0 = "Keines" (empty layer)
    accessory: [
        { label: "Keines",     svg: `` },
        { label: "Cap",        svg: `
          <path d="M38,80 Q38,52 100,52 Q162,52 162,80" fill="#2980B9"/>
          <ellipse cx="100" cy="80" rx="62" ry="16" fill="#2471A3"/>
          <rect x="140" y="74" width="32" height="10" rx="5" fill="#1A5276"/>` },
        { label: "Krone",      svg: `
          <polygon points="54,82 54,48 70,64 100,42 130,64 146,48 146,82" fill="#FFD700" stroke="#E6AC00" stroke-width="2"/>
          <circle cx="100" cy="52" r="7" fill="#E74C3C"/>
          <circle cx="72"  cy="66" r="5" fill="#27AE60"/>
          <circle cx="128" cy="66" r="5" fill="#3498DB"/>` },
        { label: "Kopfhörer",  svg: `
          <path d="M42,108 C42,68 66,44 100,44 C134,44 158,68 158,108" fill="none" stroke="#555" stroke-width="9" stroke-linecap="round"/>
          <rect x="35"  y="100" width="18" height="26" rx="9" fill="#444"/>
          <rect x="147" y="100" width="18" height="26" rx="9" fill="#444"/>` },
        { label: "Hexenhut",   svg: `
          <polygon points="100,16 58,82 142,82" fill="#2C3E50"/>
          <ellipse cx="100" cy="82" rx="52" ry="12" fill="#2C3E50"/>
          <ellipse cx="100" cy="82" rx="52" ry="12" fill="none" stroke="#8E44AD" stroke-width="5"/>` },
        { label: "Doktorhut",  svg: `
          <rect x="64" y="68" width="72" height="16" rx="2" fill="#222"/>
          <polygon points="100,40 52,66 148,66" fill="#222"/>
          <line x1="140" y1="66" x2="148" y2="88" stroke="#FFD700" stroke-width="3"/>
          <circle cx="148" cy="92" r="6" fill="#FFD700"/>` },
        { label: "Hasenohren", svg: `
          <ellipse cx="74"  cy="52" rx="13" ry="32" fill="#F0C0D0"/>
          <ellipse cx="74"  cy="52" rx="8"  ry="22" fill="#FFB6C1"/>
          <ellipse cx="126" cy="52" rx="13" ry="32" fill="#F0C0D0"/>
          <ellipse cx="126" cy="52" rx="8"  ry="22" fill="#FFB6C1"/>` },
    ],
};

const CATEGORIES = [
    { id: "background", label: "Hintergrund" },
    { id: "face",       label: "Gesicht" },
    { id: "hair",       label: "Haare" },
    { id: "eyes",       label: "Augen" },
    { id: "mouth",      label: "Mund" },
    { id: "glasses",    label: "Brille" },
    { id: "accessory",  label: "Accessoire" },
];

const DEFAULT_SEL = { background: 0, face: 0, hair: 0, eyes: 0, mouth: 0, glasses: 0, accessory: 0 };

// ─── helpers ──────────────────────────────────────────────────────────────────

function composeSVG(sel) {
    const parts = CATEGORIES.map(cat => LAYERS[cat.id][sel[cat.id] ?? 0]?.svg ?? "");
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">${parts.join("")}</svg>`;
}

/** Returns the current avatar as an SVG string (for embedding in other components). */
export function getAvatarSVG() {
    try {
        const sel = { ...DEFAULT_SEL, ...JSON.parse(localStorage.getItem(LS_KEY) || "{}") };
        return composeSVG(sel);
    } catch {
        return composeSVG(DEFAULT_SEL);
    }
}

// ─── component ────────────────────────────────────────────────────────────────

class AvatarBuilder extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._sel = this._load();
        this._activeCategory = "background";
    }

    _load() {
        try {
            return { ...DEFAULT_SEL, ...JSON.parse(localStorage.getItem(LS_KEY) || "{}") };
        } catch {
            return { ...DEFAULT_SEL };
        }
    }

    connectedCallback() {
        this._renderShell();
        this._updatePreview();
        this._renderTabs();
        this._renderOptions();
    }

    open() {
        this._sel = this._load();
        this._updatePreview();
        this._renderOptions();
        this.shadowRoot.querySelector(".overlay").classList.add("active");
    }

    close() {
        this.shadowRoot.querySelector(".overlay").classList.remove("active");
    }

    _save() {
        localStorage.setItem(LS_KEY, JSON.stringify(this._sel));
        this.dispatchEvent(new CustomEvent("avatar-saved", { bubbles: true, detail: { ...this._sel } }));
    }

    _renderShell() {
        this.shadowRoot.innerHTML = `
      <style>
        .overlay {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.52);
          z-index: 1000;
          align-items: center;
          justify-content: center;
        }
        .overlay.active { display: flex; }

        .panel {
          background: white;
          border-radius: 18px;
          padding: 1.2rem;
          width: min(420px, 95vw);
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          gap: 0.8rem;
          box-shadow: 0 20px 60px rgba(0,0,0,0.35);
          overflow: hidden;
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 1.15rem;
          font-weight: bold;
          color: #333;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 1.4rem;
          cursor: pointer;
          color: #888;
          padding: 0.2rem 0.5rem;
          border-radius: 6px;
          line-height: 1;
        }
        .close-btn:hover { background: #f0f0f0; color: #333; }

        .preview-area {
          display: flex;
          justify-content: center;
          padding: 0.4rem 0;
        }

        .avatar-preview {
          width: 150px;
          height: 150px;
          border-radius: 50%;
          overflow: hidden;
          border: 3px solid #e0e0e0;
          box-shadow: 0 4px 14px rgba(0,0,0,0.12);
          flex-shrink: 0;
        }
        .avatar-preview svg { width: 100%; height: 100%; display: block; }

        .category-tabs {
          display: flex;
          gap: 0.4rem;
          overflow-x: auto;
          padding-bottom: 0.25rem;
          scrollbar-width: thin;
        }

        .tab-btn {
          white-space: nowrap;
          padding: 0.35rem 0.75rem;
          border: 2px solid #e0e0e0;
          border-radius: 20px;
          background: white;
          cursor: pointer;
          font-size: 0.82rem;
          color: #555;
          transition: all 0.15s;
          flex-shrink: 0;
        }
        .tab-btn:hover { border-color: #4dd0e1; color: #007ea7; }
        .tab-btn.active {
          background: #4dd0e1;
          border-color: #4dd0e1;
          color: white;
          font-weight: bold;
        }

        .options-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(78px, 1fr));
          gap: 0.5rem;
          overflow-y: auto;
          max-height: 220px;
          padding: 0.2rem 0.1rem;
        }

        .option-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
          padding: 0.35rem 0.25rem;
          border: 2px solid #e0e0e0;
          border-radius: 10px;
          background: white;
          cursor: pointer;
          transition: all 0.15s;
        }
        .option-btn:hover { border-color: #4dd0e1; transform: scale(1.04); }
        .option-btn.selected {
          border-color: #007ea7;
          background: #e0f7fa;
          box-shadow: 0 0 0 2px #4dd0e1;
        }

        .opt-thumb {
          width: 58px;
          height: 58px;
          display: block;
          border-radius: 50%;
          overflow: hidden;
          flex-shrink: 0;
        }
        .opt-thumb svg { width: 100%; height: 100%; display: block; }

        .opt-label {
          font-size: 0.68rem;
          color: #555;
          text-align: center;
          line-height: 1.2;
          word-break: break-word;
        }

        .save-btn {
          background: linear-gradient(to right, #4dd0e1, #26c6da);
          color: white;
          border: none;
          border-radius: 10px;
          padding: 0.72rem;
          font-size: 1rem;
          font-weight: bold;
          cursor: pointer;
          width: 100%;
          transition: filter 0.2s;
          flex-shrink: 0;
        }
        .save-btn:hover  { filter: brightness(1.08); }
        .save-btn:active { filter: brightness(0.92); }
      </style>

      <div class="overlay">
        <div class="panel">
          <div class="panel-header">
            <span>Avatar erstellen</span>
            <button class="close-btn" aria-label="Schließen">✕</button>
          </div>
          <div class="preview-area">
            <div class="avatar-preview"></div>
          </div>
          <div class="category-tabs"></div>
          <div class="options-grid"></div>
          <button class="save-btn">Avatar speichern</button>
        </div>
      </div>
    `;

        this.shadowRoot.querySelector(".close-btn").onclick = () => this.close();
        this.shadowRoot.querySelector(".save-btn").onclick = () => { this._save(); this.close(); };
        this.shadowRoot.querySelector(".overlay").addEventListener("click", e => {
            if (e.target === e.currentTarget) this.close();
        });
    }

    _updatePreview() {
        const el = this.shadowRoot.querySelector(".avatar-preview");
        if (el) el.innerHTML = composeSVG(this._sel);
    }

    _renderTabs() {
        const container = this.shadowRoot.querySelector(".category-tabs");
        if (!container) return;
        container.innerHTML = CATEGORIES.map(cat =>
            `<button class="tab-btn${cat.id === this._activeCategory ? " active" : ""}" data-cat="${cat.id}">${cat.label}</button>`
        ).join("");
        container.querySelectorAll(".tab-btn").forEach(btn => {
            btn.onclick = () => {
                this._activeCategory = btn.dataset.cat;
                container.querySelectorAll(".tab-btn").forEach(b => b.classList.toggle("active", b === btn));
                this._renderOptions();
            };
        });
    }

    _renderOptions() {
        const container = this.shadowRoot.querySelector(".options-grid");
        if (!container) return;
        const catId = this._activeCategory;
        container.innerHTML = LAYERS[catId].map((opt, i) => {
            const thumb = composeSVG({ ...this._sel, [catId]: i });
            return `<button class="option-btn${this._sel[catId] === i ? " selected" : ""}" data-idx="${i}" data-cat="${catId}">
          <span class="opt-thumb">${thumb}</span>
          <span class="opt-label">${opt.label}</span>
        </button>`;
        }).join("");
        container.querySelectorAll(".option-btn").forEach(btn => {
            btn.onclick = () => {
                this._sel[btn.dataset.cat] = parseInt(btn.dataset.idx);
                this._updatePreview();
                container.querySelectorAll(".option-btn").forEach(b =>
                    b.classList.toggle("selected", b === btn)
                );
            };
        });
    }
}

customElements.define("avatar-builder", AvatarBuilder);
