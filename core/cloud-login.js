// core/cloud-login.js
// Simple cloud login — get a code, login on any device with that code.

import { syncProfileToCloud, loginWithCode, createLoginCode,
         getMyLoginCode, createGroup, joinGroup, getGroupMembers } from "./cloud-sync.js";
import { getActiveProfile, getActiveId, activateProfile, getProfiles } from "./profiles.js";
import { supabaseGet } from "./supabase.js";

class CloudLogin extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    open() { this._render(); this.style.display = "flex"; }
    close() { this.style.display = "none"; }

    async _render() {
        const profile = getActiveProfile();
        const loginCode = await getMyLoginCode();

        let myGroups = [];
        try {
            const id = getActiveId();
            if (id) {
                const memberships = await supabaseGet("group_members", `profile_id=eq.${encodeURIComponent(id)}&select=group_id`);
                if (memberships?.length) {
                    const gids = memberships.map(m => m.group_id);
                    myGroups = await supabaseGet("groups", `id=in.(${gids.join(",")})`) || [];
                }
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
                width: 92%; max-width: 400px; max-height: 90vh;
                overflow-y: auto; padding: 1.2rem;
                box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            }
            .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.8rem; }
            .header h2 { margin: 0; font-size: 1.15rem; }
            .x { background: none; border: none; font-size: 1.4rem; cursor: pointer; color: #666; border-radius: 6px; padding: 0.2rem 0.5rem; }
            .x:hover { background: #f0f0f0; }

            .code-box {
                background: linear-gradient(135deg, #4299e1, #667eea);
                border-radius: 16px; padding: 1.2rem; text-align: center;
                color: white; margin-bottom: 0.8rem;
            }
            .code-box .lbl { font-size: 0.78rem; opacity: 0.8; }
            .code-box .code { font-size: 2.2rem; font-weight: 900; letter-spacing: 6px; font-family: monospace; margin: 0.3rem 0; }
            .code-box .sub { font-size: 0.72rem; opacity: 0.7; }
            .copy-btn {
                margin-top: 0.5rem; background: rgba(255,255,255,0.2); border: none;
                color: white; padding: 0.4rem 1rem; border-radius: 8px;
                font-size: 0.8rem; font-weight: 600; cursor: pointer;
            }
            .copy-btn:hover { background: rgba(255,255,255,0.35); }

            .divider { border: none; border-top: 1px solid #edf2f7; margin: 0.8rem 0; }

            .section-title { font-size: 0.78rem; font-weight: 700; color: #718096; text-transform: uppercase; letter-spacing: 0.5px; margin: 0.8rem 0 0.4rem; }

            .input {
                width: 100%; padding: 0.6rem; border: 2px solid #e2e8f0; border-radius: 10px;
                font-size: 1.1rem; font-weight: 700; text-align: center;
                letter-spacing: 4px; text-transform: uppercase;
            }
            .input:focus { outline: none; border-color: #4299e1; }
            .input-sm { font-size: 0.95rem; letter-spacing: 0; text-transform: none; }

            .btn {
                display: block; width: 100%; padding: 0.6rem; border: none; border-radius: 10px;
                font-size: 0.95rem; font-weight: 700; cursor: pointer; margin-top: 0.5rem;
                transition: all 0.2s;
            }
            .btn-blue { background: #4299e1; color: white; }
            .btn-blue:hover { background: #3182ce; }
            .btn-green { background: #48bb78; color: white; }
            .btn-green:hover { background: #38a169; }
            .btn-gray { background: #edf2f7; color: #555; }
            .btn-gray:hover { background: #e2e8f0; }
            .btn:disabled { opacity: 0.5; cursor: default; }

            .msg { font-size: 0.85rem; min-height: 1em; margin: 0.3rem 0; text-align: center; }
            .msg.ok { color: #38a169; } .msg.err { color: #e53e3e; }
            .hint { font-size: 0.78rem; color: #888; text-align: center; margin: 0.3rem 0; }

            .group-card {
                background: #f7fafc; border-radius: 10px; padding: 0.6rem 0.8rem;
                margin-bottom: 0.4rem; cursor: pointer; transition: background 0.2s;
            }
            .group-card:hover { background: #edf2f7; }
            .group-card .gname { font-weight: 700; font-size: 0.9rem; }
            .group-card .gcode { font-size: 0.72rem; color: #888; font-family: monospace; }
            .no-groups { text-align: center; color: #aaa; padding: 0.8rem 0; font-size: 0.85rem; }

            .member-row {
                display: flex; align-items: center; gap: 0.5rem;
                padding: 0.5rem 0; border-bottom: 1px solid #f0f4f8;
            }
            .member-av { width: 32px; height: 32px; border-radius: 50%; overflow: hidden; background: #e2e8f0; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
            .member-av svg { width: 100%; height: 100%; }
            .member-name { flex: 1; font-weight: 600; font-size: 0.9rem; }
            .member-pts { font-size: 0.75rem; color: #888; text-align: right; }
        </style>

        <div class="panel">
            <div class="header">
                <h2>Online</h2>
                <button class="x" id="close">\u2715</button>
            </div>

            ${loginCode ? this._renderHasCode(loginCode, profile) : this._renderNoCode()}

            <hr class="divider">

            <!-- Login on this device -->
            <div class="section-title">Auf diesem Ger\u00e4t einloggen</div>
            <p class="hint">Hast du schon einen Code? Gib ihn hier ein:</p>
            <input class="input" id="login-code" maxlength="10" placeholder="CODE" />
            <button class="btn btn-green" id="btn-login">Einloggen</button>
            <div class="msg" id="login-msg"></div>

            <hr class="divider">

            <!-- Groups -->
            <div class="section-title">Gruppen</div>
            <div id="groups-list">
                ${myGroups.length === 0 ? '<div class="no-groups">Noch keine Gruppen</div>' :
                myGroups.map(g => `<div class="group-card" data-gid="${g.id}"><div class="gname">${g.name}</div><div class="gcode">Code: ${g.join_code}</div></div>`).join("")}
            </div>

            <input class="input input-sm" id="join-code" maxlength="6" placeholder="Gruppen-Code eingeben" style="margin-top:0.5rem" />
            <button class="btn btn-green" id="btn-join">Gruppe beitreten</button>
            <div class="msg" id="join-msg"></div>

            <input class="input input-sm" id="group-name" maxlength="30" placeholder="Neue Gruppe erstellen..." style="margin-top:0.5rem" />
            <button class="btn btn-blue" id="btn-create">Gruppe erstellen</button>
            <div class="msg" id="create-msg"></div>

            <!-- Member detail (hidden) -->
            <div id="member-detail" style="display:none">
                <hr class="divider">
                <div class="section-title" id="member-title"></div>
                <div id="member-list"></div>
                <button class="btn btn-gray" id="btn-back" style="margin-top:0.5rem">Zur\u00fcck</button>
            </div>
        </div>`;

        // Events
        this.shadowRoot.getElementById("close").onclick = () => this.close();

        // Create login code
        const btnCreate = this.shadowRoot.getElementById("btn-create-code");
        if (btnCreate) {
            btnCreate.onclick = async () => {
                btnCreate.disabled = true; btnCreate.textContent = "Erstelle...";
                const code = await createLoginCode();
                if (code) this._render();
                else { btnCreate.disabled = false; btnCreate.textContent = "Code erstellen"; }
            };
        }

        // Copy code
        const btnCopy = this.shadowRoot.getElementById("btn-copy");
        if (btnCopy) {
            btnCopy.onclick = async () => {
                try { await navigator.clipboard.writeText(loginCode); }
                catch { /* fallback */ const t = document.createElement("textarea"); t.value = loginCode; document.body.appendChild(t); t.select(); document.execCommand("copy"); t.remove(); }
                btnCopy.textContent = "Kopiert!";
                setTimeout(() => btnCopy.textContent = "Code kopieren", 1500);
            };
        }

        // Login
        this.shadowRoot.getElementById("btn-login").onclick = async () => {
            const code = this.shadowRoot.getElementById("login-code").value.toUpperCase().trim();
            const msg = this.shadowRoot.getElementById("login-msg");
            if (code.length < 3) { msg.textContent = "Code zu kurz!"; msg.className = "msg err"; return; }
            msg.textContent = "Lade Profil..."; msg.className = "msg";
            const cloud = await loginWithCode(code);
            if (!cloud) { msg.textContent = "Code nicht gefunden!"; msg.className = "msg err"; return; }
            // Create/update local profile
            const list = JSON.parse(localStorage.getItem("allProfiles") || "[]");
            const idx = list.findIndex(p => p.id === cloud.id);
            const localProfile = {
                id: cloud.id, name: cloud.name, role: cloud.role,
                points: cloud.points, streakRecord: cloud.streakRecord,
                avatarSvg: cloud.avatarSvg, avatarSelection: cloud.avatarSelection,
                avatarUnlocked: cloud.avatarUnlocked, appBg: cloud.appBg,
            };
            if (idx >= 0) list[idx] = { ...list[idx], ...localProfile };
            else list.push(localProfile);
            localStorage.setItem("allProfiles", JSON.stringify(list));
            localStorage.setItem("myLoginCode", code);
            activateProfile(cloud.id);
            msg.textContent = "Willkommen, " + cloud.name + "!"; msg.className = "msg ok";
            setTimeout(() => location.reload(), 800);
        };

        // Join group
        this.shadowRoot.getElementById("btn-join").onclick = async () => {
            const code = this.shadowRoot.getElementById("join-code").value.toUpperCase().trim();
            const msg = this.shadowRoot.getElementById("join-msg");
            if (!code) { msg.textContent = "Code eingeben!"; msg.className = "msg err"; return; }
            await syncProfileToCloud();
            const group = await joinGroup(code);
            if (group) { msg.textContent = "Beigetreten: " + group.name; msg.className = "msg ok"; setTimeout(() => this._render(), 800); }
            else { msg.textContent = "Gruppe nicht gefunden!"; msg.className = "msg err"; }
        };

        // Create group
        this.shadowRoot.getElementById("btn-create").onclick = async () => {
            const name = this.shadowRoot.getElementById("group-name").value.trim();
            const msg = this.shadowRoot.getElementById("create-msg");
            if (!name) { msg.textContent = "Name eingeben!"; msg.className = "msg err"; return; }
            await syncProfileToCloud();
            const group = await createGroup(name);
            if (group) { msg.textContent = "Code: " + group.join_code; msg.className = "msg ok"; setTimeout(() => this._render(), 1200); }
            else { msg.textContent = "Fehler!"; msg.className = "msg err"; }
        };

        // Show group members
        for (const card of this.shadowRoot.querySelectorAll(".group-card")) {
            card.onclick = async () => {
                const gid = card.dataset.gid;
                const group = myGroups.find(g => g.id === gid);
                const members = await getGroupMembers(gid);
                this.shadowRoot.getElementById("member-detail").style.display = "block";
                this.shadowRoot.getElementById("member-title").textContent = group?.name || "Gruppe";
                this.shadowRoot.getElementById("member-list").innerHTML = (members || []).map(m => `
                    <div class="member-row">
                        <div class="member-av">${m.avatarSvg || "\uD83D\uDC64"}</div>
                        <span class="member-name">${m.name}</span>
                        <span class="member-pts">\u2B50${m.points} \uD83D\uDD25${m.streakRecord}</span>
                    </div>
                `).join("") || '<div class="hint">Keine Mitglieder</div>';
            };
        }
        const btnBack = this.shadowRoot.getElementById("btn-back");
        if (btnBack) btnBack.onclick = () => { this.shadowRoot.getElementById("member-detail").style.display = "none"; };
    }

    _renderHasCode(code, profile) {
        return `
            <div class="code-box">
                <div class="lbl">Dein Login-Code</div>
                <div class="code">${code}</div>
                <div class="sub">Gib diesen Code auf einem anderen Ger\u00e4t ein</div>
                <button class="copy-btn" id="btn-copy">Code kopieren</button>
            </div>
            <p class="hint">Dein Profil, Punkte, Avatar und Hintergrund werden automatisch synchronisiert.</p>
        `;
    }

    _renderNoCode() {
        return `
            <div style="text-align:center;padding:0.5rem 0">
                <p class="hint">Erstelle einen Code um dein Profil auf anderen Ger\u00e4ten zu nutzen.<br>
                Dein Avatar, Punkte, Streak und Hintergrund werden \u00fcbertragen!</p>
                <button class="btn btn-blue" id="btn-create-code">Code erstellen</button>
            </div>
        `;
    }
}

customElements.define("cloud-login", CloudLogin);
