// core/cloud-login.js
// Cloud login overlay — register a login code, login on another device, manage groups.

import { syncProfileToCloud, loadProfileFromCloud, registerCloudAccount, loginWithCode,
         getMyLoginCode, createGroup, joinGroup, getGroupMembers, getGroupByCode } from "./cloud-sync.js";
import { getActiveProfile, getActiveId, createProfile, activateProfile, saveSnapshot, getProfiles } from "./profiles.js";
import { supabaseGet } from "./supabase.js";

class CloudLogin extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    connectedCallback() { }

    open() {
        this._render();
        this.style.display = "flex";
    }

    close() { this.style.display = "none"; }

    async _render() {
        const profile = getActiveProfile();
        const loginCode = await getMyLoginCode();
        // Load groups this user is in
        let myGroups = [];
        try {
            const memberships = await supabaseGet("group_members", `profile_id=eq.${encodeURIComponent(getActiveId())}&select=group_id`);
            if (memberships?.length) {
                const gids = memberships.map(m => m.group_id);
                myGroups = await supabaseGet("groups", `id=in.(${gids.join(",")})`) || [];
            }
        } catch {}

        this.shadowRoot.innerHTML = `
        <style>
            *, *::before, *::after { box-sizing: border-box; }
            :host {
                display: none; position: fixed; inset: 0; z-index: 9999;
                background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
                justify-content: center; align-items: center;
                font-family: "Segoe UI", sans-serif;
            }
            .panel {
                background: white; border-radius: 20px;
                width: 92%; max-width: 420px; max-height: 90vh;
                overflow-y: auto; padding: 1.4rem;
                box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            }
            .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
            .header h2 { margin: 0; font-size: 1.15rem; }
            .close-btn { background: none; border: none; font-size: 1.4rem; cursor: pointer; color: #666; padding: 0.2rem 0.5rem; border-radius: 6px; }
            .close-btn:hover { background: #f0f0f0; }

            .tabs { display: flex; gap: 0.3rem; margin-bottom: 1rem; }
            .tab { flex: 1; padding: 0.5rem; border: none; border-radius: 8px; background: #f0f4f8; font-size: 0.82rem; cursor: pointer; font-weight: 600; color: #555; transition: all 0.2s; }
            .tab.active { background: #4299e1; color: white; }
            .tab-content { display: none; }
            .tab-content.active { display: block; }

            .section { margin-bottom: 1rem; }
            .section-title { font-size: 0.8rem; font-weight: 700; color: #718096; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 0.5rem; }

            .code-display {
                background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 14px;
                padding: 1rem; text-align: center; color: white; margin: 0.5rem 0;
            }
            .code-display .label { font-size: 0.8rem; opacity: 0.8; }
            .code-display .code { font-size: 1.8rem; font-weight: 900; letter-spacing: 4px; font-family: monospace; margin: 0.3rem 0; }
            .code-display .hint { font-size: 0.72rem; opacity: 0.7; }

            .input-row { margin: 0.5rem 0; }
            .input { width: 100%; padding: 0.6rem; border: 2px solid #e2e8f0; border-radius: 10px; font-size: 0.95rem; font-weight: 600; text-align: center; letter-spacing: 2px; }
            .input:focus { outline: none; border-color: #4299e1; }
            .input-label { font-size: 0.8rem; color: #666; margin-bottom: 0.3rem; display: block; }
            .pin-input { letter-spacing: 6px; font-size: 1.2rem; }

            .btn { display: block; width: 100%; padding: 0.65rem; border: none; border-radius: 10px; font-size: 0.95rem; font-weight: 700; cursor: pointer; margin-top: 0.5rem; transition: all 0.2s; }
            .btn.primary { background: #4299e1; color: white; }
            .btn.primary:hover { background: #3182ce; }
            .btn.green { background: #48bb78; color: white; }
            .btn.green:hover { background: #38a169; }
            .btn.secondary { background: #edf2f7; color: #666; }
            .btn.secondary:hover { background: #e2e8f0; }
            .btn:disabled { opacity: 0.5; cursor: default; }

            .msg { font-size: 0.85rem; min-height: 1.2em; margin: 0.4rem 0; text-align: center; }
            .msg.ok { color: #38a169; }
            .msg.err { color: #e53e3e; }
            .hint { font-size: 0.78rem; color: #888; margin: 0.3rem 0; text-align: center; }

            .group-card {
                background: #f7fafc; border-radius: 10px; padding: 0.7rem;
                margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.6rem;
            }
            .group-card .info { flex: 1; }
            .group-card .name { font-weight: 700; font-size: 0.9rem; }
            .group-card .code { font-size: 0.75rem; color: #888; font-family: monospace; }
            .group-card .members { font-size: 0.75rem; color: #4299e1; cursor: pointer; }
            .group-card .members:hover { text-decoration: underline; }

            .member-list { margin-top: 0.5rem; }
            .member-row {
                display: flex; align-items: center; gap: 0.5rem;
                padding: 0.4rem 0; border-bottom: 1px solid #edf2f7;
                font-size: 0.85rem;
            }
            .member-row .avatar { width: 28px; height: 28px; border-radius: 50%; overflow: hidden; background: #e2e8f0; flex-shrink: 0; }
            .member-row .avatar svg { width: 100%; height: 100%; }
            .member-row .pts { color: #888; font-size: 0.75rem; margin-left: auto; }
            .no-groups { text-align: center; color: #888; padding: 1rem 0; font-size: 0.9rem; }
        </style>

        <div class="panel">
            <div class="header">
                <h2>Online-Konto</h2>
                <button class="close-btn" id="close">\u2715</button>
            </div>

            <div class="tabs">
                <button class="tab active" data-tab="account">Mein Konto</button>
                <button class="tab" data-tab="login">Einloggen</button>
                <button class="tab" data-tab="groups">Gruppen</button>
            </div>

            <!-- Account Tab -->
            <div class="tab-content active" id="tab-account">
                ${loginCode ? `
                    <div class="code-display">
                        <div class="label">Dein Login-Code</div>
                        <div class="code">${loginCode}</div>
                        <div class="hint">Mit diesem Code + PIN auf jedem Ger\u00e4t einloggen</div>
                    </div>
                    <p class="hint">Dein Profil wird automatisch synchronisiert.</p>
                ` : `
                    <div class="section">
                        <p class="hint">Erstelle einen Login-Code um dein Profil auf anderen Ger\u00e4ten zu nutzen.</p>
                        <div class="input-row">
                            <span class="input-label">W\u00e4hle eine 4-stellige PIN:</span>
                            <input type="password" maxlength="4" inputmode="numeric" class="input pin-input" id="reg-pin" placeholder="PIN" />
                        </div>
                        <div class="input-row">
                            <span class="input-label">PIN wiederholen:</span>
                            <input type="password" maxlength="4" inputmode="numeric" class="input pin-input" id="reg-pin2" placeholder="PIN" />
                        </div>
                        <button class="btn primary" id="btn-register">Code erstellen</button>
                        <div class="msg" id="reg-msg"></div>
                    </div>
                `}
            </div>

            <!-- Login Tab -->
            <div class="tab-content" id="tab-login">
                <div class="section">
                    <p class="hint">Gib deinen Login-Code und PIN ein um dich auf diesem Ger\u00e4t anzumelden:</p>
                    <div class="input-row">
                        <span class="input-label">Login-Code:</span>
                        <input type="text" maxlength="8" class="input" id="login-code" placeholder="ABCD1234" style="text-transform:uppercase" />
                    </div>
                    <div class="input-row">
                        <span class="input-label">PIN:</span>
                        <input type="password" maxlength="4" inputmode="numeric" class="input pin-input" id="login-pin" placeholder="PIN" />
                    </div>
                    <button class="btn green" id="btn-login">Einloggen</button>
                    <div class="msg" id="login-msg"></div>
                </div>
            </div>

            <!-- Groups Tab -->
            <div class="tab-content" id="tab-groups">
                <div class="section">
                    <div class="section-title">Meine Gruppen</div>
                    <div id="groups-list">
                        ${myGroups.length === 0 ? '<div class="no-groups">Noch keiner Gruppe beigetreten.</div>' :
                        myGroups.map(g => `
                            <div class="group-card" data-gid="${g.id}">
                                <div class="info">
                                    <div class="name">${g.name}</div>
                                    <div class="code">Code: ${g.join_code}</div>
                                </div>
                                <span class="members" data-gid="${g.id}">Mitglieder \u203A</span>
                            </div>
                        `).join("")}
                    </div>
                </div>

                <div class="section">
                    <div class="section-title">Gruppe beitreten</div>
                    <div class="input-row">
                        <input type="text" maxlength="6" class="input" id="join-code" placeholder="Gruppen-Code" style="text-transform:uppercase" />
                    </div>
                    <button class="btn green" id="btn-join">Beitreten</button>
                    <div class="msg" id="join-msg"></div>
                </div>

                <div class="section">
                    <div class="section-title">Neue Gruppe erstellen</div>
                    <div class="input-row">
                        <input type="text" class="input" id="group-name" placeholder="Gruppenname (z.B. Klasse 5a)" />
                    </div>
                    <button class="btn primary" id="btn-create-group">Erstellen</button>
                    <div class="msg" id="create-msg"></div>
                </div>

                <div id="member-detail" style="display:none">
                    <div class="section-title" id="member-title"></div>
                    <div class="member-list" id="member-list"></div>
                    <button class="btn secondary" id="btn-back-groups">Zur\u00fcck</button>
                </div>
            </div>
        </div>`;

        // Close
        this.shadowRoot.getElementById("close").onclick = () => this.close();

        // Tabs
        for (const tab of this.shadowRoot.querySelectorAll(".tab")) {
            tab.onclick = () => {
                this.shadowRoot.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
                this.shadowRoot.querySelectorAll(".tab-content").forEach(t => t.classList.remove("active"));
                tab.classList.add("active");
                this.shadowRoot.getElementById("tab-" + tab.dataset.tab).classList.add("active");
            };
        }

        // Register
        const btnReg = this.shadowRoot.getElementById("btn-register");
        if (btnReg) {
            btnReg.onclick = async () => {
                const pin1 = this.shadowRoot.getElementById("reg-pin").value;
                const pin2 = this.shadowRoot.getElementById("reg-pin2").value;
                const msg = this.shadowRoot.getElementById("reg-msg");
                if (pin1.length < 4) { msg.textContent = "PIN muss 4 Stellen haben!"; msg.className = "msg err"; return; }
                if (pin1 !== pin2) { msg.textContent = "PINs stimmen nicht \u00fcberein!"; msg.className = "msg err"; return; }
                btnReg.disabled = true;
                btnReg.textContent = "Erstelle...";
                await syncProfileToCloud();
                const result = await registerCloudAccount(getActiveId(), pin1);
                if (result) {
                    msg.textContent = "Dein Code: " + result.loginCode;
                    msg.className = "msg ok";
                    this._render(); // re-render to show the code
                } else {
                    msg.textContent = "Fehler beim Erstellen!"; msg.className = "msg err";
                    btnReg.disabled = false; btnReg.textContent = "Code erstellen";
                }
            };
        }

        // Login
        const btnLogin = this.shadowRoot.getElementById("btn-login");
        if (btnLogin) {
            btnLogin.onclick = async () => {
                const code = this.shadowRoot.getElementById("login-code").value.toUpperCase().trim();
                const pin = this.shadowRoot.getElementById("login-pin").value;
                const msg = this.shadowRoot.getElementById("login-msg");
                if (!code || code.length < 4) { msg.textContent = "Bitte Code eingeben!"; msg.className = "msg err"; return; }
                if (!pin || pin.length < 4) { msg.textContent = "Bitte PIN eingeben!"; msg.className = "msg err"; return; }
                btnLogin.disabled = true;
                btnLogin.textContent = "Pr\u00fcfe...";
                const cloudProfile = await loginWithCode(code, pin);
                if (cloudProfile) {
                    // Create local profile from cloud data
                    const existing = getProfiles().find(p => p.id === cloudProfile.id);
                    if (!existing) {
                        const list = JSON.parse(localStorage.getItem("allProfiles") || "[]");
                        list.push({
                            id: cloudProfile.id,
                            name: cloudProfile.name,
                            role: cloudProfile.role,
                            points: cloudProfile.points,
                            streakRecord: cloudProfile.streakRecord,
                            avatarSvg: cloudProfile.avatarSvg,
                            avatarSelection: null,
                            avatarUnlocked: [],
                            appBg: "light",
                        });
                        localStorage.setItem("allProfiles", JSON.stringify(list));
                    }
                    localStorage.setItem("myLoginCode", code);
                    activateProfile(cloudProfile.id);
                    msg.textContent = "Eingeloggt als " + cloudProfile.name + "!";
                    msg.className = "msg ok";
                    setTimeout(() => location.reload(), 1000);
                } else {
                    msg.textContent = "Code oder PIN falsch!"; msg.className = "msg err";
                    btnLogin.disabled = false; btnLogin.textContent = "Einloggen";
                }
            };
        }

        // Join group
        this.shadowRoot.getElementById("btn-join").onclick = async () => {
            const code = this.shadowRoot.getElementById("join-code").value.toUpperCase().trim();
            const msg = this.shadowRoot.getElementById("join-msg");
            if (!code) { msg.textContent = "Bitte Code eingeben!"; msg.className = "msg err"; return; }
            const group = await joinGroup(code);
            if (group) {
                msg.textContent = "Gruppe \"" + group.name + "\" beigetreten!"; msg.className = "msg ok";
                setTimeout(() => this._render(), 1000);
            } else {
                msg.textContent = "Gruppe nicht gefunden!"; msg.className = "msg err";
            }
        };

        // Create group
        this.shadowRoot.getElementById("btn-create-group").onclick = async () => {
            const name = this.shadowRoot.getElementById("group-name").value.trim();
            const msg = this.shadowRoot.getElementById("create-msg");
            if (!name) { msg.textContent = "Bitte Name eingeben!"; msg.className = "msg err"; return; }
            await syncProfileToCloud();
            const group = await createGroup(name);
            if (group) {
                msg.textContent = "Erstellt! Code: " + group.join_code; msg.className = "msg ok";
                setTimeout(() => this._render(), 1000);
            } else {
                msg.textContent = "Fehler!"; msg.className = "msg err";
            }
        };

        // Show members
        for (const btn of this.shadowRoot.querySelectorAll(".members[data-gid]")) {
            btn.onclick = async () => {
                const gid = btn.dataset.gid;
                const group = myGroups.find(g => g.id === gid);
                const members = await getGroupMembers(gid);
                const detail = this.shadowRoot.getElementById("member-detail");
                const list = this.shadowRoot.getElementById("member-list");
                const title = this.shadowRoot.getElementById("member-title");
                this.shadowRoot.getElementById("groups-list").style.display = "none";
                detail.style.display = "block";
                title.textContent = (group?.name || "Gruppe") + " — Mitglieder";
                list.innerHTML = (members || []).map(m => `
                    <div class="member-row">
                        <div class="avatar">${m.avatarSvg || "\uD83D\uDC64"}</div>
                        <span>${m.name}</span>
                        <span class="pts">\u2B50 ${m.points} | \uD83D\uDD25 ${m.streakRecord}</span>
                    </div>
                `).join("") || '<div style="color:#888;padding:0.5rem">Keine Mitglieder</div>';
            };
        }

        const btnBack = this.shadowRoot.getElementById("btn-back-groups");
        if (btnBack) {
            btnBack.onclick = () => {
                this.shadowRoot.getElementById("member-detail").style.display = "none";
                this.shadowRoot.getElementById("groups-list").style.display = "block";
            };
        }
    }
}

customElements.define("cloud-login", CloudLogin);
