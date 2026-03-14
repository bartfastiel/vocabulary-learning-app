// core/invite-qr.js
// Simple QR code invite overlay — shows a static QR code that links to the app.

import { getActiveProfile, saveSnapshot } from "./profiles.js";
import { getAvatarSVG } from "./avatar-builder.js";

const APP_URL = "https://bartfastiel.github.io/vocabulary-learing-app/";
const FRIENDS_KEY = "friendsList";

export function loadFriends() {
    try { return JSON.parse(localStorage.getItem(FRIENDS_KEY) || "[]"); } catch { return []; }
}
function saveFriends(list) {
    localStorage.setItem(FRIENDS_KEY, JSON.stringify(list));
}
export function addFriend(data) {
    const list = loadFriends();
    const idx = list.findIndex(f => f.code === data.code);
    if (idx >= 0) list[idx] = data;
    else list.push(data);
    saveFriends(list);
}

function generateCode() {
    return "VK-" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

function getMyCode() {
    let code = localStorage.getItem("myFriendCode");
    if (!code) { code = generateCode(); localStorage.setItem("myFriendCode", code); }
    return code;
}

export function checkIncomingFriend() {
    const params = new URLSearchParams(window.location.search);
    const friendData = params.get("friend");
    if (!friendData) return null;
    try {
        const data = JSON.parse(decodeURIComponent(escape(atob(friendData))));
        window.history.replaceState({}, "", window.location.pathname);
        return data;
    } catch { return null; }
}

class InviteQR extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    connectedCallback() {
        this._render();
    }

    open() {
        this._render();
        this.style.display = "flex";
    }

    close() {
        this.style.display = "none";
    }

    _render() {
        saveSnapshot();
        const prof = getActiveProfile();
        const myName = prof?.name || "Unbekannt";
        const myCode = getMyCode();
        const avatar = prof?.avatarSvg || "";
        const points = parseInt(localStorage.getItem("points") || "0");
        const streak = parseInt(localStorage.getItem("streakRecord") || "0");
        const friends = loadFriends();

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
          overflow-y: auto; padding: 1.4rem;
          box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        }
        .header {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 1rem;
        }
        .header h2 { margin: 0; font-size: 1.2rem; }
        .close-btn {
          background: none; border: none; font-size: 1.4rem; cursor: pointer;
          color: #666; padding: 0.2rem 0.5rem; border-radius: 6px;
        }
        .close-btn:hover { background: #f0f0f0; }

        .tabs {
          display: flex; gap: 0.3rem; margin-bottom: 1rem;
        }
        .tab {
          flex: 1; padding: 0.5rem; border: none; border-radius: 8px;
          background: #f0f4f8; font-size: 0.85rem; cursor: pointer;
          font-weight: 600; color: #555; transition: all 0.2s;
        }
        .tab.active { background: #4299e1; color: white; }

        .tab-content { display: none; }
        .tab-content.active { display: block; }

        /* QR Card */
        .qr-card {
          background: linear-gradient(135deg, #667eea, #764ba2);
          border-radius: 18px; padding: 1.4rem; margin: 0.5rem 0;
          color: white; text-align: center; position: relative;
        }
        .qr-card .name { font-size: 1.15rem; font-weight: 700; margin-bottom: 0.2rem; }
        .qr-card .code { font-size: 0.8rem; opacity: 0.85; margin-bottom: 0.8rem; font-family: monospace; }
        .qr-card .stats { font-size: 0.78rem; opacity: 0.8; margin-top: 0.6rem; }
        .qr-wrap {
          background: white; border-radius: 14px; padding: 10px;
          display: inline-block; box-shadow: 0 2px 12px rgba(0,0,0,0.15);
        }
        .qr-wrap img {
          width: 180px; height: 180px; display: block; border-radius: 8px;
          image-rendering: pixelated;
          object-fit: contain;
        }
        .img-upload-btn {
          margin-top: 0.7rem; padding: 0.5rem 1rem; border: 2px dashed #cbd5e0;
          border-radius: 10px; background: #f7fafc; color: #555;
          font-size: 0.82rem; font-weight: 600; cursor: pointer;
          transition: all 0.2s; display: inline-block;
        }
        .img-upload-btn:hover { border-color: #4299e1; color: #4299e1; background: #ebf8ff; }
        .img-actions { display: flex; gap: 0.4rem; justify-content: center; margin-top: 0.5rem; }
        .img-reset-btn {
          padding: 0.3rem 0.8rem; border: none; border-radius: 8px;
          background: rgba(255,255,255,0.2); color: white; font-size: 0.75rem;
          cursor: pointer; font-weight: 600; transition: background 0.2s;
        }
        .img-reset-btn:hover { background: rgba(255,255,255,0.35); }
        .avatar-mini {
          position: absolute; top: 0.8rem; right: 0.8rem;
          width: 42px; height: 42px; border-radius: 50%;
          background: white; overflow: hidden; border: 2px solid rgba(255,255,255,0.5);
        }
        .avatar-mini svg { width: 100%; height: 100%; }

        .hint {
          text-align: center; font-size: 0.82rem; color: #666;
          margin: 0.8rem 0 0.4rem;
        }

        .color-row {
          display: flex; gap: 0.4rem; justify-content: center; margin: 0.7rem 0;
          flex-wrap: wrap;
        }
        .color-dot {
          width: 28px; height: 28px; border-radius: 50%; cursor: pointer;
          border: 3px solid transparent; transition: all 0.2s;
        }
        .color-dot:hover, .color-dot.active { border-color: #2d3748; transform: scale(1.15); }

        .share-row {
          display: flex; gap: 0.5rem; margin-top: 0.6rem; justify-content: center;
        }
        .share-btn {
          padding: 0.55rem 1.1rem; border: none; border-radius: 10px;
          font-size: 0.85rem; cursor: pointer; font-weight: 600;
          transition: all 0.2s;
        }
        .share-btn.primary { background: #4299e1; color: white; }
        .share-btn.primary:hover { background: #3182ce; }
        .share-btn.secondary { background: #edf2f7; color: #2d3748; }
        .share-btn.secondary:hover { background: #e2e8f0; }
        .copied { background: #48bb78 !important; color: white !important; }

        /* Add friend */
        .add-section { text-align: center; }
        .code-input {
          width: 100%; padding: 0.7rem; border: 2px solid #e2e8f0;
          border-radius: 10px; font-size: 1rem; text-align: center;
          letter-spacing: 2px; font-weight: 700; margin: 0.8rem 0;
        }
        .code-input:focus { outline: none; border-color: #4299e1; }
        .add-btn {
          width: 100%; padding: 0.7rem; border: none; border-radius: 10px;
          background: #48bb78; color: white; font-size: 1rem; font-weight: 700;
          cursor: pointer; transition: background 0.2s;
        }
        .add-btn:hover { background: #38a169; }
        .add-btn:disabled { background: #cbd5e0; cursor: default; }
        .add-msg { font-size: 0.85rem; margin-top: 0.5rem; min-height: 1.2em; }
        .add-msg.ok { color: #38a169; }
        .add-msg.err { color: #e53e3e; }

        /* Friends list */
        .no-friends { text-align: center; color: #888; font-size: 0.9rem; padding: 1.5rem 0; }
        .friend-card {
          display: flex; align-items: center; gap: 0.7rem;
          padding: 0.6rem; border-radius: 10px; background: #f7fafc;
          margin-bottom: 0.5rem; transition: background 0.2s;
        }
        .friend-card:hover { background: #edf2f7; }
        .friend-avatar {
          width: 38px; height: 38px; border-radius: 50%; overflow: hidden;
          background: #e2e8f0; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
        }
        .friend-avatar svg { width: 100%; height: 100%; }
        .friend-avatar .placeholder { font-size: 1.3rem; }
        .friend-info { flex: 1; min-width: 0; }
        .friend-name { font-weight: 700; font-size: 0.9rem; }
        .friend-stats { font-size: 0.75rem; color: #888; }
        .friend-code { font-size: 0.7rem; color: #aaa; font-family: monospace; }
        .remove-btn {
          background: none; border: none; font-size: 1rem; cursor: pointer;
          color: #ccc; padding: 0.3rem; border-radius: 6px;
        }
        .remove-btn:hover { color: #e53e3e; background: #fff5f5; }
      </style>

      <div class="panel">
        <div class="header">
          <h2>Freunde einladen</h2>
          <button class="close-btn" id="close-btn">\u2715</button>
        </div>

        <div class="tabs">
          <button class="tab active" data-tab="qr">Mein QR-Code</button>
          <button class="tab" data-tab="add">Code eingeben</button>
          <button class="tab" data-tab="list">Freunde (${friends.length})</button>
        </div>

        <!-- Tab: QR Code -->
        <div class="tab-content active" id="tab-qr">
          <div class="qr-card" id="qr-card">
            ${avatar ? `<div class="avatar-mini">${avatar}</div>` : ""}
            <div class="name">${myName}</div>
            <div class="code">${myCode}</div>
            <div class="qr-wrap">
              <img id="qr-img" src="${localStorage.getItem("inviteCardImage") || "assets/qr-invite.svg"}" alt="QR Code" />
            </div>
            <div class="img-actions">
              ${localStorage.getItem("inviteCardImage") ? '<button class="img-reset-btn" id="btn-reset-img">Zurücksetzen</button>' : ""}
            </div>
            <div class="stats">\u2B50 ${points} Punkte \u00b7 \uD83D\uDD25 ${streak} Streak</div>
          </div>

          <label class="img-upload-btn" id="upload-label">
            \uD83D\uDDBC\uFE0F Eigenes Bild einfügen
            <input type="file" accept="image/*" id="img-input" style="display:none" />
          </label>
          <p class="hint">Scanne diesen QR-Code, um zur App zu kommen!</p>

          <div class="color-row" id="color-row">
            <div class="color-dot active" style="background: linear-gradient(135deg, #667eea, #764ba2)" data-grad="667eea,764ba2"></div>
            <div class="color-dot" style="background: linear-gradient(135deg, #f97316, #ec4899)" data-grad="f97316,ec4899"></div>
            <div class="color-dot" style="background: linear-gradient(135deg, #06b6d4, #3b82f6)" data-grad="06b6d4,3b82f6"></div>
            <div class="color-dot" style="background: linear-gradient(135deg, #10b981, #059669)" data-grad="10b981,059669"></div>
            <div class="color-dot" style="background: linear-gradient(135deg, #f43f5e, #be123c)" data-grad="f43f5e,be123c"></div>
            <div class="color-dot" style="background: linear-gradient(135deg, #8b5cf6, #6d28d9)" data-grad="8b5cf6,6d28d9"></div>
            <div class="color-dot" style="background: linear-gradient(135deg, #111, #333)" data-grad="111111,333333"></div>
          </div>

          <div class="share-row">
            <button class="share-btn primary" id="btn-copy-link">Link kopieren</button>
            <button class="share-btn secondary" id="btn-share">Teilen</button>
          </div>
        </div>

        <!-- Tab: Add friend -->
        <div class="tab-content" id="tab-add">
          <div class="add-section">
            <p class="hint">Gib den Freundes-Code ein:</p>
            <input class="code-input" id="code-input" placeholder="VK-XXXXXX" maxlength="20" />
            <button class="add-btn" id="btn-add" disabled>Freund hinzuf\u00fcgen</button>
            <div class="add-msg" id="add-msg"></div>
          </div>
        </div>

        <!-- Tab: Friends list -->
        <div class="tab-content" id="tab-list">
          <div class="friends-section" id="friends-list"></div>
        </div>
      </div>`;

        // Events
        this.shadowRoot.getElementById("close-btn").onclick = () => this.close();

        // Tabs
        for (const tab of this.shadowRoot.querySelectorAll(".tab")) {
            tab.onclick = () => {
                this.shadowRoot.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
                this.shadowRoot.querySelectorAll(".tab-content").forEach(t => t.classList.remove("active"));
                tab.classList.add("active");
                this.shadowRoot.getElementById("tab-" + tab.dataset.tab).classList.add("active");
            };
        }

        // Image upload
        const imgInput = this.shadowRoot.getElementById("img-input");
        const qrImg = this.shadowRoot.getElementById("qr-img");
        imgInput.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                const dataURL = reader.result;
                localStorage.setItem("inviteCardImage", dataURL);
                qrImg.src = dataURL;
                this._render(); // re-render to show reset button
            };
            reader.readAsDataURL(file);
        };
        const resetBtn = this.shadowRoot.getElementById("btn-reset-img");
        if (resetBtn) {
            resetBtn.onclick = () => {
                localStorage.removeItem("inviteCardImage");
                this._render();
            };
        }

        // QR card color
        const qrCard = this.shadowRoot.getElementById("qr-card");
        for (const dot of this.shadowRoot.querySelectorAll(".color-dot")) {
            dot.onclick = () => {
                this.shadowRoot.querySelectorAll(".color-dot").forEach(d => d.classList.remove("active"));
                dot.classList.add("active");
                const [c1, c2] = dot.dataset.grad.split(",");
                qrCard.style.background = `linear-gradient(135deg, #${c1}, #${c2})`;
            };
        }

        // Copy link
        const copyBtn = this.shadowRoot.getElementById("btn-copy-link");
        copyBtn.onclick = async () => {
            try {
                await navigator.clipboard.writeText(APP_URL);
                copyBtn.textContent = "Kopiert!";
                copyBtn.classList.add("copied");
                setTimeout(() => { copyBtn.textContent = "Link kopieren"; copyBtn.classList.remove("copied"); }, 2000);
            } catch {
                const ta = document.createElement("textarea");
                ta.value = APP_URL; document.body.appendChild(ta);
                ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
                copyBtn.textContent = "Kopiert!";
                copyBtn.classList.add("copied");
                setTimeout(() => { copyBtn.textContent = "Link kopieren"; copyBtn.classList.remove("copied"); }, 2000);
            }
        };

        // Share API
        const shareBtn = this.shadowRoot.getElementById("btn-share");
        if (navigator.share) {
            shareBtn.onclick = () => {
                navigator.share({
                    title: "Lern-App",
                    text: `Lerne mit mir! Mein Code: ${myCode}`,
                    url: APP_URL,
                }).catch(() => {});
            };
        } else {
            shareBtn.style.display = "none";
        }

        // Add friend by code
        const codeInput = this.shadowRoot.getElementById("code-input");
        const addBtn = this.shadowRoot.getElementById("btn-add");
        const addMsg = this.shadowRoot.getElementById("add-msg");
        codeInput.oninput = () => {
            addBtn.disabled = codeInput.value.trim().length < 3;
        };
        addBtn.onclick = () => {
            const code = codeInput.value.trim().toUpperCase();
            if (code === myCode) {
                addMsg.textContent = "Das ist dein eigener Code!";
                addMsg.className = "add-msg err";
                return;
            }
            const existing = loadFriends();
            if (existing.find(f => f.code === code)) {
                addMsg.textContent = "Freund bereits hinzugef\u00fcgt!";
                addMsg.className = "add-msg err";
                return;
            }
            addFriend({ code, name: "Freund " + code, points: 0, streak: 0, avatar: "" });
            addMsg.textContent = "Freund hinzugef\u00fcgt!";
            addMsg.className = "add-msg ok";
            codeInput.value = "";
            addBtn.disabled = true;
            this.shadowRoot.querySelector('[data-tab="list"]').textContent = `Freunde (${loadFriends().length})`;
            this._renderFriendsList();
        };

        this._renderFriendsList();
    }

    _renderFriendsList() {
        const container = this.shadowRoot.getElementById("friends-list");
        const friends = loadFriends();
        if (friends.length === 0) {
            container.innerHTML = '<div class="no-friends">Noch keine Freunde hinzugef\u00fcgt.<br>Teile deinen QR-Code!</div>';
            return;
        }
        container.innerHTML = "";
        for (const f of friends) {
            const card = document.createElement("div");
            card.className = "friend-card";
            card.innerHTML = `
                <div class="friend-avatar">
                    ${f.avatar ? f.avatar : '<span class="placeholder">\uD83D\uDC64</span>'}
                </div>
                <div class="friend-info">
                    <div class="friend-name">${f.name}</div>
                    <div class="friend-stats">\u2B50 ${f.points} Punkte \u00b7 \uD83D\uDD25 ${f.streak} Streak</div>
                    <div class="friend-code">${f.code}</div>
                </div>
                <button class="remove-btn" title="Entfernen">\uD83D\uDDD1</button>`;
            card.querySelector(".remove-btn").onclick = () => {
                saveFriends(loadFriends().filter(x => x.code !== f.code));
                this.shadowRoot.querySelector('[data-tab="list"]').textContent = `Freunde (${loadFriends().length})`;
                this._renderFriendsList();
            };
            container.appendChild(card);
        }
    }
}

customElements.define("invite-qr", InviteQR);
