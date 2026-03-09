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
        this._data      = [];
        this._editIdx   = -1;   // -1 = new lesson
        this._stream    = null; // active camera stream
        this._scanPairs = [];   // OCR result pairs
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
        this._stopCamera();
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

        /* scan button in edit screen */
        .btn-scan-open {
          width: 100%; padding: 0.65rem; border: 2px solid #4dd0e1;
          background: white; color: #007ea7; border-radius: 10px;
          font-size: 0.9rem; font-weight: bold; cursor: pointer;
          transition: all 0.15s; margin-top: 0.2rem;
        }
        .btn-scan-open:hover { background: #e0f7fa; }

        /* ── scan screen ─────────────────────────────────────────────────── */

        .scan-upload-area {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 1rem; text-align: center; padding: 1rem;
        }
        .scan-upload-icon { font-size: 4rem; line-height: 1; }
        .scan-upload-hint { color: #666; font-size: 0.9rem; line-height: 1.5; margin: 0; }
        .btn-upload-label {
          display: block; width: 100%; padding: 0.75rem; text-align: center;
          border: none; background: linear-gradient(to right, #4dd0e1, #26c6da);
          color: white; border-radius: 10px; font-size: 1rem; font-weight: bold;
          cursor: pointer; transition: filter 0.2s;
        }
        .btn-upload-label:hover { filter: brightness(1.08); }

        .scan-status-wrap {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 0.8rem;
          padding: 1.5rem; text-align: center;
        }
        .scan-spinner {
          width: 40px; height: 40px; border: 4px solid #e0f7fa;
          border-top-color: #26c6da; border-radius: 50%;
          animation: spin 0.9s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .scan-status-text { color: #007ea7; font-size: 0.95rem; line-height: 1.6; }

        .scan-result-header {
          font-size: 0.85rem; font-weight: bold; color: #555;
        }
        .scan-result-row {
          display: grid; grid-template-columns: auto 1fr 1fr;
          gap: 0.5rem; align-items: center;
          background: #f8f8f8; border-radius: 8px; padding: 0.45rem 0.6rem;
          font-size: 0.9rem; cursor: pointer;
        }
        .scan-result-row:hover { background: #e8f7fa; }
        .scan-result-row input[type=checkbox] { width: auto; cursor: pointer; }
        .scan-cb-de { color: #333; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .scan-cb-en { color: #007ea7; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        .scan-empty {
          text-align: center; color: #aaa; font-size: 0.9rem;
          padding: 1.5rem 0.5rem; line-height: 1.6;
          border: 2px dashed #e0e0e0; border-radius: 10px;
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
              <button class="btn-scan-open" id="btn-scan-open">📷 Aus Foto einscannen</button>
            </div>
            <div class="footer">
              <button class="btn-del-lesson" id="btn-del-lesson">🗑 Löschen</button>
              <button class="btn-save" id="btn-save">💾 Speichern</button>
            </div>
          </div>

          <!-- SCAN SCREEN -->
          <div id="screen-scan" hidden>
            <div class="ph">
              <button class="ph-back" id="btn-scan-back">←</button>
              <span class="ph-title">📷 Vokabeln scannen</span>
              <button class="ph-close">✕</button>
            </div>

            <!-- Phase: capture -->
            <div class="body" id="scan-phase-capture">
              <div class="scan-upload-area">
                <div class="scan-upload-icon">📄</div>
                <p class="scan-upload-hint">
                  Foto der Vokabelliste aufnehmen<br>oder Bild aus der Galerie auswählen.
                </p>
                <label class="btn-upload-label">
                  📷 Foto / Bild auswählen
                  <input type="file" id="scan-file" accept="image/*" hidden>
                </label>
              </div>
            </div>

            <!-- Phase: processing -->
            <div class="body scan-status-wrap" id="scan-phase-processing" hidden>
              <div class="scan-spinner"></div>
              <div class="scan-status-text" id="scan-status-text">Lade OCR-Modul…</div>
            </div>

            <!-- Phase: results -->
            <div class="body" id="scan-phase-results" hidden>
              <div class="scan-result-header" id="scan-result-header"></div>
              <div class="word-list" id="scan-results-list"></div>
            </div>

            <div class="footer" id="scan-footer" hidden>
              <button class="btn-del-lesson" id="btn-scan-retry">↩ Nochmal</button>
              <button class="btn-save" id="btn-scan-add">✅ Übernehmen</button>
            </div>
          </div>

        </div>
      </div>`;

        // static listeners
        this.shadowRoot.querySelectorAll(".ph-close").forEach(b => b.onclick = () => this.close());
        this.shadowRoot.getElementById("btn-back").onclick          = () => this._showLessons();
        this.shadowRoot.getElementById("btn-save").onclick          = () => this._saveLesson();
        this.shadowRoot.getElementById("btn-del-lesson").onclick    = () => this._deleteLesson();
        this.shadowRoot.getElementById("btn-scan-open").onclick     = () => this._showScan();
        this.shadowRoot.getElementById("btn-scan-back").onclick     = () => this._hideScan();
        this.shadowRoot.getElementById("btn-scan-retry").onclick    = () => this._showScan();
        this.shadowRoot.getElementById("btn-scan-add").onclick      = () => this._addScannedWords();
        this.shadowRoot.getElementById("scan-file").onchange        = (e) => {
            if (e.target.files[0]) this._loadFile(e.target.files[0]);
        };
    }

    // ── lesson list screen ────────────────────────────────────────────────────

    _showLessons() {
        this.shadowRoot.getElementById("screen-lessons").hidden = false;
        this.shadowRoot.getElementById("screen-edit").hidden    = true;
        this.shadowRoot.getElementById("screen-scan").hidden    = true;
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
        this.shadowRoot.getElementById("screen-scan").hidden    = true;

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

    // ── scan screen ───────────────────────────────────────────────────────────

    _showScan() {
        this._scanPhase("capture");
        this.shadowRoot.getElementById("screen-edit").hidden = true;
        this.shadowRoot.getElementById("screen-scan").hidden = false;
        // Reset file input so the same file can be re-selected
        this.shadowRoot.getElementById("scan-file").value = "";
    }

    _hideScan() {
        this.shadowRoot.getElementById("screen-scan").hidden = true;
        this.shadowRoot.getElementById("screen-edit").hidden = false;
    }

    _scanPhase(phase) {
        this.shadowRoot.getElementById("scan-phase-capture").hidden    = phase !== "capture";
        this.shadowRoot.getElementById("scan-phase-processing").hidden = phase !== "processing";
        this.shadowRoot.getElementById("scan-phase-results").hidden    = phase !== "results";
        this.shadowRoot.getElementById("scan-footer").hidden           = phase !== "results";
    }

    async _loadFile(file) {
        const url = URL.createObjectURL(file);
        const img = new Image();
        await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
        URL.revokeObjectURL(url);
        const canvas = document.createElement("canvas");
        canvas.width  = img.width;
        canvas.height = img.height;
        canvas.getContext("2d").drawImage(img, 0, 0);
        await this._processImage(canvas);
    }

    async _processImage(canvas) {
        this._scanPhase("processing");
        const status = this.shadowRoot.getElementById("scan-status-text");

        try {
            // Load Tesseract.js on first use
            if (!window.Tesseract) {
                status.textContent = "Lade OCR-Modul…";
                await new Promise((resolve, reject) => {
                    const s = document.createElement("script");
                    s.src     = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
                    s.onload  = resolve;
                    s.onerror = () => reject(new Error("Tesseract.js konnte nicht geladen werden."));
                    document.head.appendChild(s);
                });
            }

            status.textContent = "Erkenne Text… 0 %";
            const { data: { text } } = await Tesseract.recognize(canvas, "deu+eng", {
                logger: m => {
                    if (m.status === "recognizing text") {
                        status.textContent = `Erkenne Text… ${Math.round(m.progress * 100)} %`;
                    }
                }
            });

            const pairs = this._parseOCRText(text);
            this._showScanResults(pairs);
        } catch (err) {
            status.innerHTML =
                `<b>Fehler:</b> ${this._esc(err.message || "Texterkennung fehlgeschlagen.")}<br>
                 <small>Bitte erneut versuchen.</small>`;
        }
    }

    _parseOCRText(rawText) {
        const pairs = [];
        const seen  = new Set();

        for (const line of rawText.split("\n")) {
            const l = line.trim();
            if (l.length < 3) continue;

            let de = "", en = "";

            if (l.includes("=")) {
                const sep = l.indexOf("=");
                de = l.slice(0, sep).trim();
                en = l.slice(sep + 1).trim();
            } else if (/\s[-–—]\s/.test(l)) {
                const m = l.match(/^(.+?)\s[-–—]\s(.+)$/);
                if (m) { de = m[1].trim(); en = m[2].trim(); }
            } else if (l.includes("|")) {
                const parts = l.split("|");
                if (parts.length >= 2) { de = parts[0].trim(); en = parts[1].trim(); }
            } else if (l.includes("\t")) {
                const parts = l.split("\t");
                if (parts.length >= 2) { de = parts[0].trim(); en = parts[1].trim(); }
            }

            // Strip leading numbers / bullets (e.g. "1. Hund = dog")
            de = de.replace(/^\d+[\.\)\s]+/, "").trim();
            en = en.replace(/^\d+[\.\)\s]+/, "").trim();

            const key = `${de}|${en}`;
            if (de.length > 1 && en.length > 1 && !seen.has(key)) {
                seen.add(key);
                pairs.push({ de, en });
            }
        }

        return pairs;
    }

    _showScanResults(pairs) {
        const header = this.shadowRoot.getElementById("scan-result-header");
        const list   = this.shadowRoot.getElementById("scan-results-list");
        list.innerHTML = "";

        if (pairs.length === 0) {
            header.textContent = "";
            const hint = document.createElement("div");
            hint.className = "scan-empty";
            hint.innerHTML =
                "Keine Wortpaare erkannt.<br>" +
                "<small>Tipps: Klares Foto, gute Beleuchtung,<br>" +
                "Format <b>Deutsch = Englisch</b> oder <b>Deutsch – Englisch</b>.</small>";
            list.appendChild(hint);
            this._scanPhase("results");
            this.shadowRoot.getElementById("scan-footer").hidden = true;
            return;
        }

        header.textContent = `${pairs.length} Wortpaar${pairs.length === 1 ? "" : "e"} erkannt — bitte prüfen:`;

        this._scanPairs = pairs;
        pairs.forEach((pair, i) => {
            const row = document.createElement("div");
            row.className = "scan-result-row";
            row.innerHTML = `
              <input type="checkbox" id="sp-${i}" checked>
              <label for="sp-${i}" class="scan-cb-de">${this._esc(pair.de)}</label>
              <label for="sp-${i}" class="scan-cb-en">${this._esc(pair.en)}</label>`;
            row.onclick = (e) => {
                if (e.target.tagName !== "INPUT") {
                    const cb = row.querySelector("input");
                    cb.checked = !cb.checked;
                }
            };
            list.appendChild(row);
        });

        this._scanPhase("results");
    }

    _addScannedWords() {
        const list     = this.shadowRoot.getElementById("scan-results-list");
        const selected = [];
        list.querySelectorAll("input[type=checkbox]").forEach((cb, i) => {
            if (cb.checked) selected.push(this._scanPairs[i]);
        });

        if (selected.length === 0) {
            alert("Bitte wähle mindestens ein Wortpaar aus.");
            return;
        }

        const ta       = this.shadowRoot.getElementById("quick-input");
        const existing = ta.value.trim();
        const newText  = selected.map(p => `${p.de} = ${p.en}`).join("\n");
        ta.value       = existing ? `${existing}\n${newText}` : newText;

        this._hideScan();
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    _esc(str) {
        return String(str ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
    }
}

customElements.define("vocab-editor", VocabEditor);
