// core/group-board.js
// Gruppen-Rangliste: Erstelle Gruppen, füge Profile hinzu, sieh wer der Beste ist.
// Alle Daten in localStorage.

import { getProfiles, getActiveId, saveSnapshot } from "./profiles.js";

const LS_GROUPS = "groups";

function getGroups() {
    try { return JSON.parse(localStorage.getItem(LS_GROUPS) || "[]"); } catch { return []; }
}
function saveGroups(groups) {
    localStorage.setItem(LS_GROUPS, JSON.stringify(groups));
}

class GroupBoard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    connectedCallback() {
        this._render();
    }

    open() {
        saveSnapshot();
        this._render();
        this.shadowRoot.querySelector(".overlay").classList.add("active");
    }

    close() {
        this.shadowRoot.querySelector(".overlay").classList.remove("active");
    }

    _render() {
        const groups = getGroups();
        const profiles = getProfiles();
        const activeId = getActiveId();

        this.shadowRoot.innerHTML = `
      <style>
        .overlay {
          display: none; position: fixed; inset: 0; z-index: 1600;
          background: rgba(5,13,26,0.97);
          backdrop-filter: blur(16px);
          flex-direction: column; align-items: center;
          overflow-y: auto; padding: 1rem;
        }
        .overlay.active { display: flex; }

        .header {
          display: flex; align-items: center; justify-content: space-between;
          width: min(520px, 95vw); padding: 0.8rem 0; margin-bottom: 0.5rem;
        }
        .header h2 { margin: 0; font-size: 1.4rem; color: #e0f2fe;
          text-shadow: 0 0 20px rgba(56,189,248,0.8); }
        .close-btn {
          background: rgba(255,255,255,0.12); border: none; color: white;
          font-size: 1.3rem; border-radius: 8px; padding: 0.3rem 0.7rem;
          cursor: pointer; transition: background 0.2s;
        }
        .close-btn:hover { background: rgba(255,255,255,0.25); }

        /* ── New group form ── */
        .new-group {
          display: flex; gap: 0.5rem; width: min(520px, 95vw); margin-bottom: 1rem;
        }
        .new-group input {
          flex: 1; padding: 0.6rem 1rem;
          background: rgba(3,30,60,0.8); border: 2px solid rgba(56,189,248,0.35);
          border-radius: 10px; color: #e0f2fe; font-size: 1rem; outline: none;
        }
        .new-group input::placeholder { color: rgba(186,230,253,0.4); }
        .new-group input:focus { border-color: rgba(56,189,248,0.8); }
        .new-group button {
          padding: 0.6rem 1.2rem;
          background: linear-gradient(135deg, rgba(14,165,233,0.85), rgba(56,189,248,0.85));
          border: none; border-radius: 10px; color: white;
          font-size: 0.95rem; font-weight: bold; cursor: pointer;
          transition: filter 0.2s;
        }
        .new-group button:hover { filter: brightness(1.15); }

        /* ── Group cards ── */
        .group-card {
          width: min(520px, 95vw);
          background: rgba(4,20,45,0.8);
          border: 1px solid rgba(56,189,248,0.3);
          border-radius: 16px;
          margin-bottom: 1rem;
          overflow: hidden;
          box-shadow: 0 4px 24px rgba(14,165,233,0.15);
        }
        .group-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0.8rem 1.1rem;
          background: linear-gradient(135deg, rgba(3,60,110,0.9), rgba(7,100,160,0.9));
          border-bottom: 1px solid rgba(56,189,248,0.25);
        }
        .group-name { font-size: 1.1rem; font-weight: bold; color: #e0f2fe; }
        .group-actions { display: flex; gap: 0.4rem; }
        .group-actions button {
          background: rgba(255,255,255,0.12); border: none; color: #bae6fd;
          font-size: 0.8rem; border-radius: 6px; padding: 0.3rem 0.6rem;
          cursor: pointer; transition: background 0.2s;
        }
        .group-actions button:hover { background: rgba(255,255,255,0.25); }
        .group-actions .del-btn:hover { background: rgba(220,50,50,0.6); }

        /* ── Member list / leaderboard ── */
        .members { padding: 0.5rem 0; }
        .member-row {
          display: flex; align-items: center; gap: 0.7rem;
          padding: 0.55rem 1.1rem;
          transition: background 0.15s;
        }
        .member-row:hover { background: rgba(56,189,248,0.06); }
        .member-row.is-me { background: rgba(14,165,233,0.12); }

        .rank {
          font-size: 1.3rem; font-weight: bold; width: 2rem; text-align: center;
          color: #7dd3fc;
        }
        .rank.gold { color: #FFD700; text-shadow: 0 0 8px rgba(255,215,0,0.5); }
        .rank.silver { color: #C0C0C0; text-shadow: 0 0 6px rgba(192,192,192,0.4); }
        .rank.bronze { color: #CD7F32; text-shadow: 0 0 6px rgba(205,127,50,0.4); }

        .member-avatar {
          width: 42px; height: 42px; border-radius: 50%;
          overflow: hidden; flex-shrink: 0;
          border: 2px solid rgba(56,189,248,0.4);
          background: #071a2e;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.2rem;
        }
        .member-avatar svg { width: 100%; height: 100%; display: block; }

        .member-info { flex: 1; min-width: 0; }
        .member-name {
          font-size: 0.95rem; font-weight: bold; color: #e0f2fe;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .member-stats { font-size: 0.78rem; color: #7dd3fc; }

        .member-points {
          font-size: 1.1rem; font-weight: bold; color: #38bdf8;
          text-align: right; white-space: nowrap;
        }

        /* ── Add member popup ── */
        .add-popup {
          padding: 0.8rem 1.1rem;
          border-top: 1px solid rgba(56,189,248,0.15);
          display: flex; flex-wrap: wrap; gap: 0.5rem;
        }
        .add-popup .profile-chip {
          display: flex; align-items: center; gap: 0.4rem;
          padding: 0.35rem 0.7rem; border-radius: 20px;
          background: rgba(14,105,163,0.25);
          border: 1px solid rgba(56,189,248,0.3);
          color: #bae6fd; font-size: 0.85rem;
          cursor: pointer; transition: all 0.2s;
        }
        .profile-chip:hover {
          background: rgba(14,165,233,0.4);
          border-color: rgba(56,189,248,0.7);
        }
        .profile-chip .chip-avatar {
          width: 22px; height: 22px; border-radius: 50%;
          overflow: hidden; background: #071a2e;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.7rem;
        }
        .profile-chip .chip-avatar svg { width: 100%; height: 100%; display: block; }
        .profile-chip.in-group { opacity: 0.35; pointer-events: none; }

        .no-groups {
          color: #7dd3fc; font-size: 1rem; text-align: center;
          padding: 2rem; opacity: 0.7;
        }

        .empty-group {
          color: #7dd3fc; font-size: 0.9rem; text-align: center;
          padding: 1rem; opacity: 0.6;
        }

        @font-face { font-family: inherit; }
        * { font-family: "Segoe UI", sans-serif; box-sizing: border-box; }
      </style>

      <div class="overlay">
        <div class="header">
          <h2>👥 Gruppen & Rangliste</h2>
          <button class="close-btn">✕</button>
        </div>

        <div class="new-group">
          <input id="group-name-input" type="text" placeholder="Neue Gruppe erstellen..." autocomplete="off" />
          <button id="create-group-btn">+ Erstellen</button>
        </div>

        <div id="groups-container">
          ${groups.length === 0 ? '<div class="no-groups">Noch keine Gruppen erstellt.<br>Erstelle eine Gruppe und füge Profile hinzu!</div>' : ''}
        </div>
      </div>
    `;

        // Close button
        this.shadowRoot.querySelector(".close-btn").onclick = () => this.close();

        // Create group
        const input = this.shadowRoot.getElementById("group-name-input");
        this.shadowRoot.getElementById("create-group-btn").onclick = () => {
            const name = input.value.trim();
            if (!name) { input.focus(); return; }
            const g = getGroups();
            g.push({ id: "g" + Date.now(), name, members: [] });
            saveGroups(g);
            input.value = "";
            this._renderGroups();
        };
        input.onkeydown = (e) => {
            if (e.key === "Enter") this.shadowRoot.getElementById("create-group-btn").click();
        };

        this._renderGroups();
    }

    _renderGroups() {
        const container = this.shadowRoot.getElementById("groups-container");
        const groups = getGroups();
        const profiles = getProfiles();
        const activeId = getActiveId();

        if (groups.length === 0) {
            container.innerHTML = '<div class="no-groups">Noch keine Gruppen erstellt.<br>Erstelle eine Gruppe und füge Profile hinzu!</div>';
            return;
        }

        container.innerHTML = "";

        groups.forEach(group => {
            const card = document.createElement("div");
            card.className = "group-card";

            // Get member profiles sorted by points (descending)
            const memberProfiles = group.members
                .map(id => profiles.find(p => p.id === id))
                .filter(Boolean)
                .sort((a, b) => (b.points || 0) - (a.points || 0));

            // Non-member profiles for adding
            const nonMembers = profiles.filter(p => !group.members.includes(p.id));

            card.innerHTML = `
              <div class="group-header">
                <span class="group-name">👥 ${this._esc(group.name)}</span>
                <div class="group-actions">
                  <button class="add-btn">+ Mitglied</button>
                  <button class="del-btn">🗑️</button>
                </div>
              </div>
              <div class="members">
                ${memberProfiles.length === 0 ? '<div class="empty-group">Noch keine Mitglieder. Klicke "+ Mitglied"!</div>' : ''}
                ${memberProfiles.map((p, i) => this._renderMember(p, i, activeId)).join("")}
              </div>
              <div class="add-popup" style="display:none">
                ${nonMembers.length === 0
                    ? '<span style="color:#7dd3fc;font-size:0.85rem;opacity:0.6">Alle Profile sind schon in der Gruppe</span>'
                    : nonMembers.map(p => `
                        <div class="profile-chip" data-pid="${p.id}">
                          <div class="chip-avatar">${p.avatarSvg || p.name[0].toUpperCase()}</div>
                          ${this._esc(p.name)}
                        </div>
                      `).join("")
                }
              </div>
            `;

            // Toggle add popup
            const addPopup = card.querySelector(".add-popup");
            card.querySelector(".add-btn").onclick = () => {
                addPopup.style.display = addPopup.style.display === "none" ? "flex" : "none";
            };

            // Add member chips
            card.querySelectorAll(".profile-chip").forEach(chip => {
                chip.onclick = () => {
                    const pid = chip.dataset.pid;
                    const g = getGroups();
                    const grp = g.find(x => x.id === group.id);
                    if (grp && !grp.members.includes(pid)) {
                        grp.members.push(pid);
                        saveGroups(g);
                        this._renderGroups();
                    }
                };
            });

            // Delete group
            card.querySelector(".del-btn").onclick = () => {
                if (confirm(`Gruppe "${group.name}" löschen?`)) {
                    saveGroups(getGroups().filter(g => g.id !== group.id));
                    this._renderGroups();
                }
            };

            // Remove member on long-click on member row
            card.querySelectorAll(".member-row").forEach(row => {
                let timer;
                row.addEventListener("touchstart", () => {
                    timer = setTimeout(() => {
                        const pid = row.dataset.pid;
                        if (confirm("Mitglied aus Gruppe entfernen?")) {
                            const g = getGroups();
                            const grp = g.find(x => x.id === group.id);
                            if (grp) {
                                grp.members = grp.members.filter(m => m !== pid);
                                saveGroups(g);
                                this._renderGroups();
                            }
                        }
                        timer = null;
                    }, 600);
                }, { passive: true });
                row.addEventListener("touchend", () => clearTimeout(timer), { passive: true });
                row.addEventListener("contextmenu", (e) => {
                    e.preventDefault();
                    const pid = row.dataset.pid;
                    if (confirm("Mitglied aus Gruppe entfernen?")) {
                        const g = getGroups();
                        const grp = g.find(x => x.id === group.id);
                        if (grp) {
                            grp.members = grp.members.filter(m => m !== pid);
                            saveGroups(g);
                            this._renderGroups();
                        }
                    }
                });
            });

            container.appendChild(card);
        });
    }

    _renderMember(profile, index, activeId) {
        const rank = index + 1;
        const rankClass = rank === 1 ? "gold" : rank === 2 ? "silver" : rank === 3 ? "bronze" : "";
        const rankEmoji = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `${rank}.`;
        const isMe = profile.id === activeId;
        const pts = profile.points || 0;
        const streak = profile.streakRecord || 0;
        const avatarHtml = profile.avatarSvg || profile.name[0].toUpperCase();

        return `
          <div class="member-row${isMe ? " is-me" : ""}" data-pid="${profile.id}">
            <div class="rank ${rankClass}">${rankEmoji}</div>
            <div class="member-avatar">${avatarHtml}</div>
            <div class="member-info">
              <div class="member-name">${this._esc(profile.name)}${isMe ? " (Du)" : ""}</div>
              <div class="member-stats">Rekord-Serie: ${streak}</div>
            </div>
            <div class="member-points">⭐ ${pts}</div>
          </div>
        `;
    }

    _esc(str) {
        const d = document.createElement("div");
        d.textContent = str;
        return d.innerHTML;
    }
}

customElements.define("group-board", GroupBoard);
