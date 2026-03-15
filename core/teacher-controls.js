// core/teacher-controls.js
// Teacher dashboard — control which games are allowed, set play times, manage students.
// Protected by a 4-digit PIN. Settings stored in localStorage + synced to Supabase when available.

const TC_KEY = "teacherControls";
const TC_PIN_KEY = "teacherPin";

function loadControls() {
    // If no teacher PIN is set, always return defaults (no restrictions)
    if (!localStorage.getItem(TC_PIN_KEY)) {
        localStorage.removeItem(TC_KEY); // clean up any accidental settings
        return getDefaults();
    }
    try { return JSON.parse(localStorage.getItem(TC_KEY)) || getDefaults(); }
    catch { return getDefaults(); }
}

function saveControls(ctrl) {
    localStorage.setItem(TC_KEY, JSON.stringify(ctrl));
}

function getDefaults() {
    return {
        gamesEnabled: true,          // games globally on/off
        allowedGames: {},             // { gameId: true/false } — empty = all allowed
        timeLimitEnabled: false,      // daily time limit on/off
        timeLimitMinutes: 30,         // max minutes per day
        scheduleEnabled: false,       // play schedule on/off
        scheduleFrom: "14:00",        // earliest play time
        scheduleTo: "18:00",          // latest play time
        weekendOnly: false,           // only allow games on weekends
    };
}

/** Check if playing games is currently allowed */
export function isPlayAllowed() {
    // Only enforce restrictions if a teacher PIN has been set
    if (!localStorage.getItem(TC_PIN_KEY)) return { allowed: true };
    const ctrl = loadControls();
    if (!ctrl.gamesEnabled) return { allowed: false, reason: "Spiele sind deaktiviert." };

    if (ctrl.scheduleEnabled) {
        const now = new Date();
        const day = now.getDay(); // 0=Sun, 6=Sat
        if (ctrl.weekendOnly && day >= 1 && day <= 5) {
            return { allowed: false, reason: "Spiele nur am Wochenende erlaubt." };
        }
        const timeStr = now.getHours().toString().padStart(2, "0") + ":" + now.getMinutes().toString().padStart(2, "0");
        if (timeStr < ctrl.scheduleFrom || timeStr > ctrl.scheduleTo) {
            return { allowed: false, reason: `Spielzeit: ${ctrl.scheduleFrom} – ${ctrl.scheduleTo} Uhr` };
        }
    }

    if (ctrl.timeLimitEnabled) {
        const today = new Date().toISOString().slice(0, 10);
        const played = parseInt(localStorage.getItem("playedMinutes_" + today) || "0");
        if (played >= ctrl.timeLimitMinutes) {
            return { allowed: false, reason: `Tägliches Limit erreicht (${ctrl.timeLimitMinutes} Min.)` };
        }
    }

    return { allowed: true };
}

/** Check if a specific game is allowed */
export function isGameAllowed(gameId) {
    // Only enforce restrictions if a teacher PIN has been set
    if (!localStorage.getItem(TC_PIN_KEY)) return true;
    const ctrl = loadControls();
    if (Object.keys(ctrl.allowedGames).length === 0) return true;
    return ctrl.allowedGames[gameId] !== false;
}

/** Track play time (call when a game starts) */
export function trackPlayStart() {
    const now = Date.now();
    localStorage.setItem("gamePlayStart", String(now));
}

/** Track play end (call when a game ends) */
export function trackPlayEnd() {
    const start = parseInt(localStorage.getItem("gamePlayStart") || "0");
    if (!start) return;
    const minutes = Math.round((Date.now() - start) / 60000);
    const today = new Date().toISOString().slice(0, 10);
    const played = parseInt(localStorage.getItem("playedMinutes_" + today) || "0");
    localStorage.setItem("playedMinutes_" + today, String(played + minutes));
    localStorage.removeItem("gamePlayStart");
}

// ── Teacher Dashboard Component ──

class TeacherControls extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    connectedCallback() { this._render(); }

    open() {
        // Check PIN
        const savedPin = localStorage.getItem(TC_PIN_KEY);
        if (savedPin) {
            this._showPinPrompt(() => { this._render(); this.style.display = "flex"; });
        } else {
            this._showPinSetup(() => { this._render(); this.style.display = "flex"; });
        }
    }

    close() { this.style.display = "none"; }

    _showPinPrompt(onSuccess) {
        this.style.display = "flex";
        this.shadowRoot.innerHTML = `
        <style>${this._baseCSS()}</style>
        <div class="panel pin-panel">
            <h2>Lehrer-PIN eingeben</h2>
            <p class="hint">Gib deinen 4-stelligen PIN ein:</p>
            <div class="pin-row">
                <input type="password" maxlength="4" inputmode="numeric" class="pin-input" id="pin" autofocus />
            </div>
            <button class="btn primary" id="btn-ok">Bestätigen</button>
            <div class="msg" id="msg"></div>
            <button class="btn secondary" id="btn-cancel">Abbrechen</button>
        </div>`;
        const pinEl = this.shadowRoot.getElementById("pin");
        const msg = this.shadowRoot.getElementById("msg");
        this.shadowRoot.getElementById("btn-ok").onclick = () => {
            if (pinEl.value === localStorage.getItem(TC_PIN_KEY)) {
                onSuccess();
            } else {
                msg.textContent = "Falscher PIN!";
                msg.style.color = "#e53e3e";
                pinEl.value = "";
                pinEl.focus();
            }
        };
        pinEl.onkeydown = (e) => { if (e.key === "Enter") this.shadowRoot.getElementById("btn-ok").click(); };
        this.shadowRoot.getElementById("btn-cancel").onclick = () => this.close();
        setTimeout(() => pinEl.focus(), 100);
    }

    _showPinSetup(onSuccess) {
        this.style.display = "flex";
        this.shadowRoot.innerHTML = `
        <style>${this._baseCSS()}</style>
        <div class="panel pin-panel">
            <h2>Lehrer-PIN erstellen</h2>
            <p class="hint">Erstelle einen 4-stelligen PIN, damit nur du die Einstellungen ändern kannst:</p>
            <div class="pin-row">
                <input type="password" maxlength="4" inputmode="numeric" class="pin-input" id="pin" placeholder="PIN" autofocus />
            </div>
            <div class="pin-row">
                <input type="password" maxlength="4" inputmode="numeric" class="pin-input" id="pin2" placeholder="PIN wiederholen" />
            </div>
            <button class="btn primary" id="btn-ok">PIN setzen</button>
            <div class="msg" id="msg"></div>
            <button class="btn secondary" id="btn-cancel">Abbrechen</button>
        </div>`;
        const pin1 = this.shadowRoot.getElementById("pin");
        const pin2 = this.shadowRoot.getElementById("pin2");
        const msg = this.shadowRoot.getElementById("msg");
        this.shadowRoot.getElementById("btn-ok").onclick = () => {
            if (pin1.value.length < 4) { msg.textContent = "PIN muss 4 Stellen haben!"; msg.style.color = "#e53e3e"; return; }
            if (pin1.value !== pin2.value) { msg.textContent = "PINs stimmen nicht überein!"; msg.style.color = "#e53e3e"; return; }
            localStorage.setItem(TC_PIN_KEY, pin1.value);
            onSuccess();
        };
        pin2.onkeydown = (e) => { if (e.key === "Enter") this.shadowRoot.getElementById("btn-ok").click(); };
        this.shadowRoot.getElementById("btn-cancel").onclick = () => this.close();
        setTimeout(() => pin1.focus(), 100);
    }

    _render() {
        const ctrl = loadControls();
        // Get game list from game-lobby
        const GAME_LIST = this._getGameList();
        const playedToday = parseInt(localStorage.getItem("playedMinutes_" + new Date().toISOString().slice(0, 10)) || "0");

        this.shadowRoot.innerHTML = `
        <style>${this._baseCSS()}
            .section { margin-bottom: 1rem; }
            .section-title {
                font-size: 0.85rem; font-weight: 700; color: #718096;
                text-transform: uppercase; letter-spacing: 0.5px;
                margin: 0 0 0.5rem; display: flex; align-items: center; gap: 0.5rem;
            }
            .toggle-row {
                display: flex; align-items: center; justify-content: space-between;
                padding: 0.5rem 0; border-bottom: 1px solid #edf2f7;
            }
            .toggle-row:last-child { border-bottom: none; }
            .toggle-label { font-size: 0.9rem; font-weight: 600; }
            .toggle-sub { font-size: 0.75rem; color: #888; }
            .switch {
                position: relative; width: 44px; height: 24px;
                background: #cbd5e0; border-radius: 12px; cursor: pointer;
                transition: background 0.3s; flex-shrink: 0;
            }
            .switch.on { background: #48bb78; }
            .switch::after {
                content: ""; position: absolute; top: 2px; left: 2px;
                width: 20px; height: 20px; border-radius: 50%;
                background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.2);
                transition: transform 0.3s;
            }
            .switch.on::after { transform: translateX(20px); }
            .time-inputs {
                display: flex; gap: 0.5rem; align-items: center;
                margin-top: 0.3rem;
            }
            .time-input {
                padding: 0.35rem 0.5rem; border: 2px solid #e2e8f0;
                border-radius: 8px; font-size: 0.9rem; width: 90px;
                font-weight: 600; text-align: center;
            }
            .time-input:focus { outline: none; border-color: #4299e1; }
            .limit-input {
                width: 60px; padding: 0.35rem; border: 2px solid #e2e8f0;
                border-radius: 8px; font-size: 0.9rem; text-align: center; font-weight: 600;
            }
            .game-grid {
                display: grid; grid-template-columns: 1fr 1fr; gap: 0.3rem;
            }
            .game-chip {
                display: flex; align-items: center; gap: 0.4rem;
                padding: 0.4rem 0.5rem; border-radius: 8px;
                background: #f7fafc; font-size: 0.8rem; font-weight: 600;
                cursor: pointer; transition: all 0.2s; border: 2px solid transparent;
            }
            .game-chip.blocked { background: #fff5f5; color: #e53e3e; border-color: #fed7d7; text-decoration: line-through; opacity: 0.6; }
            .game-chip .emoji { font-size: 1rem; }
            .stat-box {
                background: #f7fafc; border-radius: 10px; padding: 0.6rem;
                text-align: center; margin-bottom: 0.5rem;
            }
            .stat-value { font-size: 1.5rem; font-weight: 800; color: #4299e1; }
            .stat-label { font-size: 0.75rem; color: #888; }
            .danger-zone { margin-top: 1rem; padding-top: 0.8rem; border-top: 2px solid #fed7d7; }
            .btn-danger {
                width: 100%; padding: 0.5rem; border: 2px solid #fed7d7; border-radius: 10px;
                background: #fff5f5; color: #e53e3e; font-size: 0.85rem; font-weight: 600;
                cursor: pointer; transition: all 0.2s;
            }
            .btn-danger:hover { background: #e53e3e; color: white; }
        </style>
        <div class="panel">
            <div class="header">
                <h2>Lehrer-Einstellungen</h2>
                <button class="close-btn" id="close-btn">\u2715</button>
            </div>

            <div class="stat-box">
                <div class="stat-value">${playedToday}</div>
                <div class="stat-label">Minuten heute gespielt</div>
            </div>

            <div class="section">
                <div class="section-title">Allgemein</div>
                <div class="toggle-row">
                    <div>
                        <div class="toggle-label">Spiele erlauben</div>
                        <div class="toggle-sub">Alle Spiele ein/ausschalten</div>
                    </div>
                    <div class="switch ${ctrl.gamesEnabled ? "on" : ""}" data-key="gamesEnabled"></div>
                </div>
            </div>

            <div class="section">
                <div class="section-title">Zeitlimit</div>
                <div class="toggle-row">
                    <div>
                        <div class="toggle-label">T\u00e4gliches Limit</div>
                        <div class="toggle-sub">Maximale Spielzeit pro Tag</div>
                    </div>
                    <div class="switch ${ctrl.timeLimitEnabled ? "on" : ""}" data-key="timeLimitEnabled"></div>
                </div>
                ${ctrl.timeLimitEnabled ? `
                <div class="time-inputs">
                    <span style="font-size:0.85rem;color:#666">Max.</span>
                    <input type="number" class="limit-input" id="limit-min" value="${ctrl.timeLimitMinutes}" min="5" max="180" step="5" />
                    <span style="font-size:0.85rem;color:#666">Minuten</span>
                </div>` : ""}
            </div>

            <div class="section">
                <div class="section-title">Spielzeiten</div>
                <div class="toggle-row">
                    <div>
                        <div class="toggle-label">Uhrzeiten festlegen</div>
                        <div class="toggle-sub">Wann darf gespielt werden?</div>
                    </div>
                    <div class="switch ${ctrl.scheduleEnabled ? "on" : ""}" data-key="scheduleEnabled"></div>
                </div>
                ${ctrl.scheduleEnabled ? `
                <div class="time-inputs">
                    <span style="font-size:0.85rem;color:#666">Von</span>
                    <input type="time" class="time-input" id="sched-from" value="${ctrl.scheduleFrom}" />
                    <span style="font-size:0.85rem;color:#666">bis</span>
                    <input type="time" class="time-input" id="sched-to" value="${ctrl.scheduleTo}" />
                </div>
                <div class="toggle-row" style="margin-top:0.3rem">
                    <div>
                        <div class="toggle-label">Nur am Wochenende</div>
                    </div>
                    <div class="switch ${ctrl.weekendOnly ? "on" : ""}" data-key="weekendOnly"></div>
                </div>` : ""}
            </div>

            <div class="section">
                <div class="section-title">Erlaubte Spiele</div>
                <div class="hint" style="font-size:0.78rem;color:#888;margin-bottom:0.4rem">Tippe auf ein Spiel um es zu sperren/erlauben:</div>
                <div class="game-grid" id="game-grid">
                    ${GAME_LIST.map(g => {
                        const blocked = ctrl.allowedGames[g.id] === false;
                        return `<div class="game-chip ${blocked ? "blocked" : ""}" data-game="${g.id}">
                            <span class="emoji">${g.emoji}</span>
                            <span>${g.label}</span>
                        </div>`;
                    }).join("")}
                </div>
            </div>

            <div class="danger-zone">
                <button class="btn-danger" id="btn-reset-pin">PIN \u00e4ndern</button>
            </div>
        </div>`;

        // Events
        this.shadowRoot.getElementById("close-btn").onclick = () => this.close();

        // Toggle switches
        this.shadowRoot.querySelectorAll(".switch").forEach(sw => {
            sw.onclick = () => {
                const key = sw.dataset.key;
                const c = loadControls();
                c[key] = !c[key];
                saveControls(c);
                this._render();
            };
        });

        // Time limit input
        const limitInput = this.shadowRoot.getElementById("limit-min");
        if (limitInput) {
            limitInput.onchange = () => {
                const c = loadControls();
                c.timeLimitMinutes = Math.max(5, Math.min(180, parseInt(limitInput.value) || 30));
                saveControls(c);
            };
        }

        // Schedule inputs
        const schedFrom = this.shadowRoot.getElementById("sched-from");
        const schedTo = this.shadowRoot.getElementById("sched-to");
        if (schedFrom) {
            schedFrom.onchange = () => { const c = loadControls(); c.scheduleFrom = schedFrom.value; saveControls(c); };
        }
        if (schedTo) {
            schedTo.onchange = () => { const c = loadControls(); c.scheduleTo = schedTo.value; saveControls(c); };
        }

        // Game chips
        this.shadowRoot.querySelectorAll(".game-chip").forEach(chip => {
            chip.onclick = () => {
                const c = loadControls();
                const id = chip.dataset.game;
                if (c.allowedGames[id] === false) {
                    delete c.allowedGames[id]; // re-allow
                } else {
                    c.allowedGames[id] = false; // block
                }
                saveControls(c);
                chip.classList.toggle("blocked");
            };
        });

        // Reset PIN
        this.shadowRoot.getElementById("btn-reset-pin").onclick = () => {
            localStorage.removeItem(TC_PIN_KEY);
            this._showPinSetup(() => this._render());
        };
    }

    _getGameList() {
        // Hardcoded game list matching game-lobby.js GAMES array
        return [
            { id: "reaction", label: "Reaktion", emoji: "\u26A1" },
            { id: "memory", label: "Paare Finden", emoji: "\uD83C\uDCCF" },
            { id: "jump", label: "Endlos Lauf", emoji: "\uD83C\uDFC3" },
            { id: "flappy", label: "Flatter Vogel", emoji: "\uD83D\uDC26" },
            { id: "snake", label: "Schlange", emoji: "\uD83D\uDC0D" },
            { id: "breakout", label: "Mauer Brecher", emoji: "\uD83E\uDDF1" },
            { id: "catcher", label: "F\u00e4nger", emoji: "\uD83E\uDDFA" },
            { id: "rocket", label: "Rakete", emoji: "\uD83D\uDE80" },
            { id: "tetris", label: "Bl\u00f6cke Stapeln", emoji: "\uD83D\uDFE6" },
            { id: "invaders", label: "Weltraum Angriff", emoji: "\uD83D\uDC7E" },
            { id: "pong", label: "Tischtennis", emoji: "\uD83C\uDFD3" },
            { id: "whack", label: "Maulwurf Klopfen", emoji: "\uD83D\uDD28" },
            { id: "colormatch", label: "Farben-R\u00e4tsel", emoji: "\uD83C\uDFA8" },
            { id: "maze", label: "Labyrinth", emoji: "\uD83E\uDDE9" },
            { id: "bubble", label: "Blasen Platzen", emoji: "\uD83E\uDEE7" },
            { id: "numbertap", label: "Zahlen Tippen", emoji: "\uD83D\uDD22" },
            { id: "dodge", label: "Ausweichen", emoji: "\uD83D\uDEE1\uFE0F" },
            { id: "platformer", label: "H\u00fcpfelt", emoji: "\uD83E\uDDB8" },
            { id: "pacman", label: "Punktefresser", emoji: "\uD83D\uDFE1" },
            { id: "doodlejump", label: "Hoch Springer", emoji: "\uD83D\uDC38" },
            { id: "2048", label: "Zahlen Schieben", emoji: "\uD83D\uDD22" },
            { id: "minesweeper", label: "Minenfeld", emoji: "\uD83D\uDCA3" },
            { id: "asteroids", label: "Weltraum Pilot", emoji: "\u2604\uFE0F" },
            { id: "racing", label: "Turbo Racer", emoji: "\uD83C\uDFCE\uFE0F" },
            { id: "quiz", label: "Vokabel-Million\u00e4r", emoji: "\uD83C\uDFC6" },
        ];
    }

    _baseCSS() {
        return `
            *, *::before, *::after { box-sizing: border-box; }
            :host {
                display: none; position: fixed; inset: 0; z-index: 9999;
                background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
                justify-content: center; align-items: center;
                font-family: "Segoe UI", sans-serif;
            }
            .panel {
                background: white; border-radius: 20px;
                width: 92%; max-width: 440px; max-height: 90vh;
                overflow-y: auto; padding: 1.4rem;
                box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            }
            .pin-panel { text-align: center; max-width: 320px; }
            .header {
                display: flex; justify-content: space-between; align-items: center;
                margin-bottom: 1rem;
            }
            .header h2 { margin: 0; font-size: 1.15rem; }
            .close-btn {
                background: none; border: none; font-size: 1.4rem; cursor: pointer;
                color: #666; padding: 0.2rem 0.5rem; border-radius: 6px;
            }
            .close-btn:hover { background: #f0f0f0; }
            h2 { margin: 0 0 0.8rem; font-size: 1.15rem; }
            .hint { font-size: 0.82rem; color: #666; margin: 0.3rem 0 0.8rem; }
            .pin-row { margin: 0.5rem 0; }
            .pin-input {
                width: 140px; padding: 0.7rem; border: 2px solid #e2e8f0;
                border-radius: 12px; font-size: 1.5rem; text-align: center;
                letter-spacing: 8px; font-weight: 800;
            }
            .pin-input:focus { outline: none; border-color: #4299e1; }
            .btn {
                display: block; width: 100%; padding: 0.65rem; border: none;
                border-radius: 10px; font-size: 0.95rem; font-weight: 700;
                cursor: pointer; margin-top: 0.5rem; transition: all 0.2s;
            }
            .btn.primary { background: #4299e1; color: white; }
            .btn.primary:hover { background: #3182ce; }
            .btn.secondary { background: #edf2f7; color: #666; }
            .btn.secondary:hover { background: #e2e8f0; }
            .msg { font-size: 0.85rem; min-height: 1.2em; margin: 0.4rem 0; }
        `;
    }
}

customElements.define("teacher-controls", TeacherControls);
