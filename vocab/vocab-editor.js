// vocab/vocab-editor.js
//
// Full-screen overlay to create and edit custom vocabulary lessons.
// Custom lessons are stored in localStorage key "customVocab" as
// [{ name, words: [{ de, en, allowImage: false }] }]
//
// Fires CustomEvent("vocab-updated", { bubbles: true, composed: true }) after saving.
// Usage (from app-shell):
//   editor.open();

const LS_KEY = "customVocab";

function loadCustom() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; }
}
function saveCustom(data) {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
}

// ─── component ────────────────────────────────────────────────────────────────

class VocabEditor extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._data    = [];
        this._editIdx = -1;   // -1 = new lesson
    }

    connectedCallback() {
        this._renderShell();
    }

    open() {
        this._data = loadCustom();
        this.shadowRoot.querySelector(".overlay").classList.add("active");
        this._showLessons();
    }

    close() {
        this.shadowRoot.querySelector(".overlay").classList.remove("active");
    }

    // ── shell ─────────────────────────────────────────────────────────────────

    _renderShell() {
        this.shadowRoot.innerHTML = `
      <style>
        * { box-sizing: border-box; }

        .overlay {
          display: none;
          position: fixed; inset: 0; z-index: 1200;
          background: rgba(0,0,0,0.55);
          align-items: center; justify-content: center;
        }
        .overlay.active { display: flex; }

        .panel {
          background: white; border-radius: 18px;
          width: min(440px, 96vw); max-height: 92vh;
          display: flex; flex-direction: column;
          box-shadow: 0 20px 60px rgba(0,0,0,0.35);
          overflow: hidden;
        }

        /* header */
        .ph {
          display: flex; align-items: center; gap: 0.5rem;
          background: linear-gradient(135deg, #007ea7, #26c6da);
          color: white; padding: 0.9rem 1rem; flex-shrink: 0;
        }
        .ph-back {
          background: rgba(255,255,255,0.2); border: none; color: white;
          font-size: 1.2rem; border-radius: 8px; padding: 0.3rem 0.6rem;
          cursor: pointer; transition: background 0.2s; flex-shrink: 0;
        }
        .ph-back:hover { background: rgba(255,255,255,0.35); }
        .ph-title { font-size: 1.1rem; font-weight: bold; flex: 1; }
        .ph-close {
          background: rgba(255,255,255,0.2); border: none; color: white;
          font-size: 1.2rem; border-radius: 8px; padding: 0.3rem 0.6rem;
          cursor: pointer; transition: background 0.2s; flex-shrink: 0;
        }
        .ph-close:hover { background: rgba(255,255,255,0.35); }

        /* body */
        .body { flex: 1; overflow-y: auto; padding: 1rem; display: flex; flex-direction: column; gap: 0.7rem; }

        /* lesson list */
        .lesson-item {
          display: flex; align-items: center; gap: 0.5rem;
          border: 2px solid #e0e0e0; border-radius: 10px; padding: 0.7rem 0.8rem;
          transition: border-color 0.15s;
        }
        .lesson-item:hover { border-color: #4dd0e1; }
        .lesson-info { flex: 1; cursor: pointer; }
        .lesson-name  { font-weight: bold; font-size: 1rem; color: #222; }
        .lesson-count { font-size: 0.8rem; color: #888; margin-top: 1px; }
        .btn-icon {
          background: none; border: none; font-size: 1.2rem;
          cursor: pointer; padding: 0.3rem; border-radius: 6px;
          transition: background 0.15s;
        }
        .btn-icon:hover { background: #f0f0f0; }
        .btn-icon.del:hover { background: #fde8e8; }

        .empty-hint {
          text-align: center; color: #aaa; font-size: 0.9rem;
          padding: 1.5rem 0; border: 2px dashed #e0e0e0; border-radius: 10px;
        }

        .btn-primary {
          width: 100%; padding: 0.75rem; border: none; border-radius: 10px;
          background: linear-gradient(to right, #4dd0e1, #26c6da);
          color: white; font-size: 1rem; font-weight: bold;
          cursor: pointer; transition: filter 0.2s; flex-shrink: 0;
        }
        .btn-primary:hover { filter: brightness(1.08); }

        /* edit screen */
        label { font-size: 0.85rem; font-weight: bold; color: #555; display: block; margin-bottom: 3px; }

        input[type=text] {
          width: 100%; padding: 0.6rem 0.8rem; border: 2px solid #e0e0e0;
          border-radius: 8px; font-size: 0.95rem; outline: none;
          transition: border-color 0.15s;
        }
        input[type=text]:focus { border-color: #4dd0e1; }

        .quick-textarea {
          width: 100%; min-height: 220px; padding: 0.7rem 0.8rem;
          border: 2px solid #e0e0e0; border-radius: 8px;
          font-size: 0.95rem; font-family: monospace; outline: none;
          resize: vertical; transition: border-color 0.15s; line-height: 1.7;
        }
        .quick-textarea:focus { border-color: #4dd0e1; }

        .format-hint {
          font-size: 0.78rem; color: #aaa; margin-top: 0.3rem;
          line-height: 1.5;
        }
        .format-hint b { color: #007ea7; }

        .word-list { display: flex; flex-direction: column; gap: 0.4rem; }
        .word-row {
          display: grid; grid-template-columns: 1fr 1fr auto;
          gap: 0.4rem; align-items: center;
          background: #f8f8f8; border-radius: 8px; padding: 0.45rem 0.6rem;
          font-size: 0.9rem;
        }
        .word-de { color: #333; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .word-en { color: #007ea7; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        .divider { border: none; border-top: 1px solid #eee; margin: 0.2rem 0; }

        .footer { display: flex; gap: 0.6rem; padding: 0.8rem 1rem; flex-shrink: 0; border-top: 1px solid #eee; }
        .btn-del-lesson {
          flex: 1; padding: 0.65rem; border: 2px solid #f44336; background: white;
          color: #f44336; border-radius: 10px; font-size: 0.9rem; font-weight: bold;
          cursor: pointer; transition: all 0.15s;
        }
        .btn-del-lesson:hover { background: #f44336; color: white; }
        .btn-save {
          flex: 2; padding: 0.65rem; border: none;
          background: linear-gradient(to right, #4dd0e1, #26c6da);
          color: white; border-radius: 10px; font-size: 0.95rem; font-weight: bold;
          cursor: pointer; transition: filter 0.2s;
        }
        .btn-save:hover { filter: brightness(1.08); }

        .section-title {
          font-size: 0.78rem; font-weight: bold; text-transform: uppercase;
          letter-spacing: 0.05em; color: #aaa; margin-top: 0.3rem;
        }

        [hidden] { display: none !important; }
      </style>

      <div class="overlay">
        <div class="panel">

          <!-- LESSONS SCREEN -->
          <div id="screen-lessons">
            <div class="ph">
              <span class="ph-title">✏️ Meine Vokabeln</span>
              <button class="ph-close">✕</button>
            </div>
            <div class="body" id="lessons-body"></div>
          </div>

          <!-- EDIT SCREEN -->
          <div id="screen-edit" hidden>
            <div class="ph">
              <button class="ph-back" id="btn-back">←</button>
              <span class="ph-title" id="edit-header-title">Lektion</span>
              <button class="ph-close">✕</button>
            </div>
            <div class="body" id="edit-body">
              <div>
                <label for="lesson-name-input">Lektionsname</label>
                <input id="lesson-name-input" type="text" placeholder="z.B. Meine Wörter"
                       autocomplete="off" autocorrect="off" spellcheck="false"/>
              </div>
              <hr class="divider"/>
              <div class="section-title">Wörter eingeben</div>
              <textarea id="quick-input" class="quick-textarea"
                placeholder="Hund = dog&#10;Katze = cat&#10;Haus = house&#10;Auto = car"
                autocomplete="off" autocorrect="off" spellcheck="false"></textarea>
              <div class="format-hint">
                Ein Wortpaar pro Zeile: <b>Deutsch = Englisch</b>
              </div>
            </div>
            <div class="footer">
              <button class="btn-del-lesson" id="btn-del-lesson">🗑 Löschen</button>
              <button class="btn-save" id="btn-save">💾 Speichern</button>
            </div>
          </div>

        </div>
      </div>`;

        // static listeners
        this.shadowRoot.querySelectorAll(".ph-close").forEach(b => b.onclick = () => this.close());
        this.shadowRoot.getElementById("btn-back").onclick       = () => this._showLessons();
        this.shadowRoot.getElementById("btn-save").onclick       = () => this._saveLesson();
        this.shadowRoot.getElementById("btn-del-lesson").onclick = () => this._deleteLesson();
    }

    // ── lesson list screen ────────────────────────────────────────────────────

    _showLessons() {
        this.shadowRoot.getElementById("screen-lessons").hidden = false;
        this.shadowRoot.getElementById("screen-edit").hidden    = true;
        this._renderLessonList();
    }

    _renderLessonList() {
        const body = this.shadowRoot.getElementById("lessons-body");
        body.innerHTML = "";

        if (this._data.length === 0) {
            const empty = document.createElement("div");
            empty.className = "empty-hint";
            empty.innerHTML = "Noch keine eigenen Lektionen.<br>Erstelle deine erste Lektion!";
            body.appendChild(empty);
        } else {
            this._data.forEach((lesson, i) => {
                const row = document.createElement("div");
                row.className = "lesson-item";
                row.innerHTML = `
          <div class="lesson-info">
            <div class="lesson-name">${this._esc(lesson.name || "Unbenannte Lektion")}</div>
            <div class="lesson-count">${lesson.words.length} Wörter</div>
          </div>
          <button class="btn-icon" title="Bearbeiten">✏️</button>
          <button class="btn-icon del" title="Löschen">🗑</button>`;
                row.querySelector(".lesson-info").onclick = () => this._showEdit(i);
                row.querySelectorAll(".btn-icon")[0].onclick = (e) => { e.stopPropagation(); this._showEdit(i); };
                row.querySelectorAll(".btn-icon")[1].onclick = (e) => {
                    e.stopPropagation();
                    if (confirm(`Lektion „${lesson.name}" wirklich löschen?`)) {
                        this._data.splice(i, 1);
                        saveCustom(this._data);
                        this.dispatchEvent(new CustomEvent("vocab-updated", { bubbles: true, composed: true }));
                        this._renderLessonList();
                    }
                };
                body.appendChild(row);
            });
        }

        const addBtn = document.createElement("button");
        addBtn.className = "btn-primary";
        addBtn.textContent = "+ Neue Lektion";
        addBtn.onclick = () => this._showEdit(-1);
        body.appendChild(addBtn);
    }

    // ── lesson edit screen ────────────────────────────────────────────────────

    _showEdit(idx) {
        this._editIdx = idx;
        const isNew  = idx === -1;
        const lesson = isNew ? { name: "", words: [] } : this._data[idx];

        this.shadowRoot.getElementById("screen-lessons").hidden = true;
        this.shadowRoot.getElementById("screen-edit").hidden    = false;

        this.shadowRoot.getElementById("edit-header-title").textContent =
            isNew ? "Neue Lektion" : lesson.name || "Lektion";
        this.shadowRoot.getElementById("lesson-name-input").value = lesson.name;
        this.shadowRoot.getElementById("btn-del-lesson").hidden = isNew;

        // Fill textarea with existing words
        const ta = this.shadowRoot.getElementById("quick-input");
        ta.value = lesson.words.map(w => `${w.de} = ${w.en}`).join("\n");
        ta.focus();
    }

    _parseTextarea() {
        const ta = this.shadowRoot.getElementById("quick-input");
        return ta.value.split("\n")
            .map(line => line.trim())
            .filter(line => line.includes("="))
            .map(line => {
                const sep = line.indexOf("=");
                return {
                    de: line.slice(0, sep).trim(),
                    en: line.slice(sep + 1).trim(),
                    allowImage: false
                };
            })
            .filter(w => w.de && w.en);
    }

    _saveLesson() {
        const name = this.shadowRoot.getElementById("lesson-name-input").value.trim();
        if (!name) {
            this.shadowRoot.getElementById("lesson-name-input").focus();
            return;
        }
        const words = this._parseTextarea();
        if (words.length === 0) {
            alert("Füge mindestens ein Wortpaar hinzu.\nFormat: Hund = dog");
            return;
        }
        const lesson = { name, words };
        if (this._editIdx === -1) {
            this._data.push(lesson);
        } else {
            this._data[this._editIdx] = lesson;
        }
        saveCustom(this._data);
        this.dispatchEvent(new CustomEvent("vocab-updated", { bubbles: true, composed: true }));
        this.close();
        if (typeof this.onSaved === "function") this.onSaved();
    }

    _deleteLesson() {
        if (this._editIdx < 0) return;
        const name = this._data[this._editIdx]?.name || "diese Lektion";
        if (!confirm(`Lektion „${name}" wirklich löschen?`)) return;
        this._data.splice(this._editIdx, 1);
        saveCustom(this._data);
        this.dispatchEvent(new CustomEvent("vocab-updated", { bubbles: true, composed: true }));
        this._showLessons();
    }

    _esc(str) {
        return String(str ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
    }
}

customElements.define("vocab-editor", VocabEditor);
