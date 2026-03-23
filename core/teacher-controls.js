import { supabaseGet, supabaseUpsert, supabaseInsert, supabaseUpdate } from "./supabase.js";
import { getActiveProfile, getActiveId } from "./profiles.js";

export async function getMyClassSettings() {
    try {
        const id = getActiveId();
        if (!id) return null;
        const members = await supabaseGet("group_members", `profile_id=eq.${encodeURIComponent(id)}&select=group_id`);
        if (!members || members.length === 0) return null;
        const gid = members[0].group_id;
        const groups = await supabaseGet("groups", `id=eq.${encodeURIComponent(gid)}&select=settings,teacher_id`);
        if (!groups || groups.length === 0) return null;
        const group = groups[0];
        if (group.teacher_id === id) return null;
        return group.settings || {};
    } catch { return null; }
}

export async function isGameAllowedCloud(gameId) {
    const settings = await getMyClassSettings();
    if (!settings) return true;
    if (settings.gamesEnabled === false) return false;
    if (settings.allowedGames && settings.allowedGames[gameId] === false) return false;
    if (settings.scheduleEnabled) {
        const now = new Date();
        const day = now.getDay();
        if (settings.weekendOnly && day >= 1 && day <= 5) return false;
        const timeStr = now.getHours().toString().padStart(2, "0") + ":" + now.getMinutes().toString().padStart(2, "0");
        if (timeStr < (settings.scheduleFrom || "00:00") || timeStr > (settings.scheduleTo || "23:59")) return false;
    }
    return true;
}

export async function isPlayAllowedCloud() {
    const settings = await getMyClassSettings();
    if (!settings) return { allowed: true };
    if (settings.gamesEnabled === false) return { allowed: false, reason: "Vom Lehrer deaktiviert" };
    if (settings.scheduleEnabled) {
        const now = new Date();
        const day = now.getDay();
        if (settings.weekendOnly && day >= 1 && day <= 5)
            return { allowed: false, reason: "Spiele nur am Wochenende" };
        const timeStr = now.getHours().toString().padStart(2, "0") + ":" + now.getMinutes().toString().padStart(2, "0");
        if (timeStr < (settings.scheduleFrom || "00:00") || timeStr > (settings.scheduleTo || "23:59"))
            return { allowed: false, reason: `Spielzeit: ${settings.scheduleFrom} \u2013 ${settings.scheduleTo} Uhr` };
    }
    return { allowed: true };
}

export function isPlayAllowed() { return { allowed: true }; }
export function isGameAllowed() { return true; }
export function trackPlayStart() {}
export function trackPlayEnd() {}

const GAME_LIST = [
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
    { id: "whack", label: "Maulwurf", emoji: "\uD83D\uDD28" },
    { id: "colormatch", label: "Farben", emoji: "\uD83C\uDFA8" },
    { id: "maze", label: "Labyrinth", emoji: "\uD83E\uDDE9" },
    { id: "bubble", label: "Blasen", emoji: "\uD83E\uDEE7" },
    { id: "platformer", label: "H\u00fcpfelt", emoji: "\uD83E\uDDB8" },
    { id: "pacman", label: "Pac-Man", emoji: "\uD83D\uDFE1" },
    { id: "doodlejump", label: "Springer", emoji: "\uD83D\uDC38" },
    { id: "racing", label: "Racer", emoji: "\uD83C\uDFCE\uFE0F" },
    { id: "quiz", label: "Million\u00e4r", emoji: "\uD83C\uDFC6" },
    { id: "craft", label: "Blockwelt", emoji: "\u26CF\uFE0F" },
];

class TeacherControls extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    connectedCallback() {}

    open() { this._loadAndRender(); this.style.display = "flex"; }
    close() { this.style.display = "none"; }

    async _loadAndRender() {
        const profile = getActiveProfile();
        const profileId = getActiveId();

        let myClasses = [];
        try {
            myClasses = await supabaseGet("groups", `teacher_id=eq.${encodeURIComponent(profileId)}`) || [];
        } catch {}

        if (myClasses.length === 0) {
            this._renderCreate(profile);
        } else {
            await this._renderDashboard(profile, myClasses[0]);
        }
    }

    _renderCreate(profile) {
        this.shadowRoot.innerHTML = `
        <style>${this._css()}</style>
        <div class="panel">
            <div class="header">
                <h2>\uD83C\uDF93 Lehrer-Bereich</h2>
                <button class="x" id="close">\u2715</button>
            </div>
            <p class="hint">Erstelle eine Klasse. Deine Sch\u00fcler geben den Code in der App ein und werden automatisch hinzugef\u00fcgt.</p>
            <input class="input" id="class-name" placeholder="Klassenname (z.B. Klasse 5a)" style="text-transform:none;letter-spacing:0" />
            <button class="btn blue" id="btn-create">Klasse erstellen</button>
            <div class="msg" id="msg"></div>
        </div>`;
        this.shadowRoot.getElementById("close").onclick = () => this.close();
        this.shadowRoot.getElementById("btn-create").onclick = async () => {
            const name = this.shadowRoot.getElementById("class-name").value.trim();
            const msg = this.shadowRoot.getElementById("msg");
            if (!name) { msg.textContent = "Name eingeben!"; msg.className = "msg err"; return; }
            const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
            let code = ""; for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
            const group = { id: "g" + Date.now(), name, teacher_id: getActiveId(), join_code: code, teacher_name: profile?.name || "", settings: { gamesEnabled: true, allowedGames: {} } };
            await supabaseInsert("groups", [group]);
            await supabaseInsert("group_members", [{ group_id: group.id, profile_id: getActiveId() }]);
            this._loadAndRender();
        };
    }

    async _renderDashboard(profile, cls) {
        const members = await supabaseGet("group_members", `group_id=eq.${encodeURIComponent(cls.id)}&select=profile_id`) || [];
        const studentIds = members.map(m => m.profile_id).filter(id => id !== getActiveId());
        let students = [];
        if (studentIds.length > 0) {
            students = await supabaseGet("profiles", `id=in.(${studentIds.join(",")})&select=id,name,points,streak_record,avatar_svg`) || [];
        }

        const settings = cls.settings || { gamesEnabled: true, allowedGames: {} };

        this.shadowRoot.innerHTML = `
        <style>${this._css()}
            .code-box{background:linear-gradient(135deg,#667eea,#764ba2);border-radius:14px;padding:1rem;text-align:center;color:white;margin-bottom:0.8rem}
            .code-box .lbl{font-size:0.75rem;opacity:0.8}
            .code-box .code{font-size:2rem;font-weight:900;letter-spacing:5px;font-family:monospace}
            .code-box .sub{font-size:0.7rem;opacity:0.7;margin-top:0.3rem}
            .student{display:flex;align-items:center;gap:0.5rem;padding:0.5rem;border-radius:10px;background:#f7fafc;margin-bottom:0.4rem}
            .student .av{width:32px;height:32px;border-radius:50%;overflow:hidden;background:#e2e8f0;flex-shrink:0}
            .student .av svg{width:100%;height:100%}
            .student .info{flex:1}
            .student .nm{font-weight:700;font-size:0.9rem}
            .student .pts{font-size:0.75rem;color:#888}
            .no-students{text-align:center;color:#aaa;padding:1rem;font-size:0.85rem}
            .section{margin-bottom:0.8rem}
            .section-title{font-size:0.75rem;font-weight:700;color:#718096;text-transform:uppercase;letter-spacing:0.5px;margin:0.6rem 0 0.3rem}
            .toggle-row{display:flex;align-items:center;justify-content:space-between;padding:0.4rem 0}
            .toggle-label{font-size:0.85rem;font-weight:600}
            .switch{position:relative;width:40px;height:22px;background:#cbd5e0;border-radius:11px;cursor:pointer;transition:background 0.3s;flex-shrink:0}
            .switch.on{background:#48bb78}
            .switch::after{content:"";position:absolute;top:2px;left:2px;width:18px;height:18px;border-radius:50%;background:white;box-shadow:0 1px 3px rgba(0,0,0,0.2);transition:transform 0.3s}
            .switch.on::after{transform:translateX(18px)}
            .game-grid{display:flex;flex-wrap:wrap;gap:4px}
            .game-chip{padding:3px 8px;border-radius:6px;font-size:0.72rem;font-weight:600;cursor:pointer;border:2px solid transparent;background:#f0f4f8;transition:all 0.15s}
            .game-chip.blocked{background:#fff5f5;color:#e53e3e;border-color:#fed7d7;text-decoration:line-through;opacity:0.6}
            .game-chip:hover{border-color:#4299e1}
            .time-row{display:flex;gap:0.4rem;align-items:center;margin-top:0.3rem}
            .time-input{padding:0.3rem;border:2px solid #e2e8f0;border-radius:6px;font-size:0.85rem;width:80px;text-align:center}
        </style>
        <div class="panel">
            <div class="header">
                <h2>\uD83C\uDF93 ${cls.name}</h2>
                <button class="x" id="close">\u2715</button>
            </div>

            <div class="code-box">
                <div class="lbl">Klassen-Code</div>
                <div class="code">${cls.join_code}</div>
                <div class="sub">Sch\u00fcler geben diesen Code ein um beizutreten</div>
            </div>

            <div class="section">
                <div class="section-title">Sch\u00fcler (${students.length})</div>
                ${students.length === 0 ? '<div class="no-students">Noch keine Sch\u00fcler. Teile den Code!</div>' :
                students.map(s => `
                    <div class="student">
                        <div class="av">${s.avatar_svg || "\uD83D\uDC64"}</div>
                        <div class="info">
                            <div class="nm">${s.name}</div>
                            <div class="pts">\u2B50 ${s.points} Punkte | \uD83D\uDD25 ${s.streak_record} Streak</div>
                        </div>
                    </div>
                `).join("")}
            </div>

            <div class="section">
                <div class="section-title">Spiele-Steuerung</div>
                <div class="toggle-row">
                    <span class="toggle-label">Spiele erlauben</span>
                    <div class="switch ${settings.gamesEnabled !== false ? "on" : ""}" id="sw-games"></div>
                </div>
                <div class="toggle-row">
                    <span class="toggle-label">Spielzeiten festlegen</span>
                    <div class="switch ${settings.scheduleEnabled ? "on" : ""}" id="sw-schedule"></div>
                </div>
                ${settings.scheduleEnabled ? `
                <div class="time-row">
                    <span style="font-size:0.8rem;color:#666">Von</span>
                    <input type="time" class="time-input" id="sched-from" value="${settings.scheduleFrom || "14:00"}" />
                    <span style="font-size:0.8rem;color:#666">bis</span>
                    <input type="time" class="time-input" id="sched-to" value="${settings.scheduleTo || "18:00"}" />
                </div>
                <div class="toggle-row">
                    <span class="toggle-label">Nur am Wochenende</span>
                    <div class="switch ${settings.weekendOnly ? "on" : ""}" id="sw-weekend"></div>
                </div>` : ""}
            </div>

            <div class="section">
                <div class="section-title">Erlaubte Spiele (tippe zum sperren)</div>
                <div class="game-grid" id="game-grid">
                    ${GAME_LIST.map(g => `<div class="game-chip ${settings.allowedGames?.[g.id] === false ? "blocked" : ""}" data-gid="${g.id}">${g.emoji} ${g.label}</div>`).join("")}
                </div>
            </div>
        </div>`;

        this.shadowRoot.getElementById("close").onclick = () => this.close();

        const save = async (newSettings) => {
            Object.assign(settings, newSettings);
            await supabaseUpdate("groups", { id: cls.id }, { settings });
        };

        this.shadowRoot.getElementById("sw-games").onclick = async () => {
            await save({ gamesEnabled: settings.gamesEnabled === false ? true : false });
            this._loadAndRender();
        };

        this.shadowRoot.getElementById("sw-schedule").onclick = async () => {
            await save({ scheduleEnabled: !settings.scheduleEnabled });
            this._loadAndRender();
        };

        const swWeekend = this.shadowRoot.getElementById("sw-weekend");
        if (swWeekend) {
            swWeekend.onclick = async () => {
                await save({ weekendOnly: !settings.weekendOnly });
                this._loadAndRender();
            };
        }

        const sf = this.shadowRoot.getElementById("sched-from");
        const st = this.shadowRoot.getElementById("sched-to");
        if (sf) sf.onchange = () => save({ scheduleFrom: sf.value });
        if (st) st.onchange = () => save({ scheduleTo: st.value });

        this.shadowRoot.querySelectorAll(".game-chip").forEach(chip => {
            chip.onclick = async () => {
                const gid = chip.dataset.gid;
                const allowed = settings.allowedGames || {};
                if (allowed[gid] === false) delete allowed[gid];
                else allowed[gid] = false;
                await save({ allowedGames: allowed });
                chip.classList.toggle("blocked");
            };
        });
    }

    _css() {
        return `
            *,*::before,*::after{box-sizing:border-box}
            :host{display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.5);backdrop-filter:blur(4px);justify-content:center;align-items:center;font-family:"Segoe UI",sans-serif}
            .panel{background:white;border-radius:20px;width:92%;max-width:420px;max-height:90vh;overflow-y:auto;padding:1.2rem;box-shadow:0 10px 40px rgba(0,0,0,0.3)}
            .header{display:flex;justify-content:space-between;align-items:center;margin-bottom:0.8rem}
            .header h2{margin:0;font-size:1.1rem}
            .x{background:none;border:none;font-size:1.4rem;cursor:pointer;color:#666;border-radius:6px;padding:0.2rem 0.5rem}
            .x:hover{background:#f0f0f0}
            .hint{font-size:0.82rem;color:#666;margin:0.3rem 0 0.8rem;text-align:center}
            .input{width:100%;padding:0.6rem;border:2px solid #e2e8f0;border-radius:10px;font-size:1rem;font-weight:600;text-align:center;letter-spacing:2px}
            .input:focus{outline:none;border-color:#4299e1}
            .btn{display:block;width:100%;padding:0.6rem;border:none;border-radius:10px;font-size:0.95rem;font-weight:700;cursor:pointer;margin-top:0.5rem;transition:all 0.2s}
            .btn.blue{background:#4299e1;color:white}
            .btn.blue:hover{background:#3182ce}
            .msg{font-size:0.85rem;min-height:1em;margin:0.3rem 0;text-align:center}
            .msg.ok{color:#38a169}.msg.err{color:#e53e3e}
        `;
    }
}

customElements.define("teacher-controls", TeacherControls);
