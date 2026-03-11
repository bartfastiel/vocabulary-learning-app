// core/app-shell.js
// Clean ANTON-style dashboard with subject cards and trainer views.

import "./help-overlay.js";
import "./group-board.js";
import "../vocab/vocab.js";
import "../vocab/vocab-editor.js";
import "../game/game-lobby.js";
import "../math/math-trainer.js";
import "../deutsch/deutsch-trainer.js";
import { PointsManager } from "../vocab/points.js";
import { getAvatarSVG } from "./avatar-builder.js";
import { getProfiles, getActiveId, getActiveProfile, createProfile, deleteProfile,
         activateProfile, saveSnapshot, setAvatarSvg } from "./profiles.js";

class AppShell extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    connectedCallback() {
        this.shadowRoot.innerHTML = `
      <style>
        *, *::before, *::after { box-sizing: border-box; }
        :host {
          display: block; margin: 0; padding: 0;
          min-height: 100vh;
          font-family: "Segoe UI", system-ui, sans-serif;
          background: #f0f4f8;
          color: #2d3748;
        }

        /* ── Top bar ── */
        .topbar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0.7rem 1.2rem;
          background: white;
          border-bottom: 1px solid #e2e8f0;
          position: sticky; top: 0; z-index: 100;
          box-shadow: 0 1px 4px rgba(0,0,0,0.06);
        }
        .topbar-left { display: flex; align-items: center; gap: 0.7rem; }
        .topbar-avatar {
          width: 40px; height: 40px; border-radius: 50%;
          overflow: hidden; cursor: pointer;
          border: 2px solid #e2e8f0;
          background: #edf2f7;
          display: flex; align-items: center; justify-content: center;
          transition: border-color 0.2s, transform 0.15s;
        }
        .topbar-avatar:hover { border-color: #4299e1; transform: scale(1.08); }
        .topbar-avatar svg { width: 100%; height: 100%; display: block; }
        .topbar-name {
          font-weight: 700; font-size: 1rem; color: #2d3748;
          cursor: pointer;
        }
        .topbar-name:hover { color: #4299e1; }
        .topbar-right { display: flex; align-items: center; gap: 0.5rem; }
        .topbar-stats {
          display: flex; align-items: center; gap: 0.3rem;
          background: #edf2f7; border-radius: 20px;
          padding: 0.3rem 0.8rem; font-size: 0.85rem; font-weight: 600;
          color: #4a5568;
        }
        .topbar-btn {
          background: none; border: none; cursor: pointer;
          font-size: 1.3rem; padding: 0.3rem;
          border-radius: 8px; transition: background 0.15s;
          color: #4a5568;
        }
        .topbar-btn:hover { background: #edf2f7; }

        /* ── Dashboard / Home ── */
        #home-screen {
          max-width: 600px; margin: 0 auto;
          padding: 1.5rem 1rem 2rem;
        }
        #trainer-screen {
          display: none;
          max-width: 600px; margin: 0 auto;
          padding: 0 1rem 2rem;
        }

        .welcome {
          font-size: 1.5rem; font-weight: 800;
          margin: 0 0 0.3rem; color: #1a202c;
        }
        .welcome-sub {
          font-size: 0.95rem; color: #718096;
          margin: 0 0 1.5rem;
        }

        /* ── Subject cards ── */
        .subject-cards {
          display: flex; flex-direction: column; gap: 0.9rem;
          margin-bottom: 1.5rem;
        }
        .subject-card {
          display: flex; align-items: center; gap: 1rem;
          padding: 1.1rem 1.2rem;
          background: white;
          border-radius: 16px;
          border: none;
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.15s;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          text-align: left; width: 100%;
          font-family: inherit;
        }
        .subject-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0,0,0,0.1);
        }
        .subject-card:active { transform: scale(0.98); }
        .card-icon {
          width: 56px; height: 56px; border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.8rem; flex-shrink: 0;
        }
        .card-icon.englisch { background: #ebf8ff; }
        .card-icon.mathe    { background: #fefcbf; }
        .card-icon.deutsch  { background: #fed7e2; }
        .card-info { flex: 1; }
        .card-title { font-size: 1.1rem; font-weight: 700; color: #1a202c; margin: 0; }
        .card-desc { font-size: 0.82rem; color: #a0aec0; margin: 0.15rem 0 0; }
        .card-arrow { font-size: 1.3rem; color: #cbd5e0; }

        /* ── Action buttons on home ── */
        .home-actions {
          display: grid; grid-template-columns: 1fr 1fr; gap: 0.7rem;
          margin-bottom: 1.2rem;
        }
        .action-card {
          display: flex; align-items: center; gap: 0.7rem;
          padding: 0.9rem 1rem;
          background: white; border-radius: 14px;
          border: none; cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          transition: transform 0.15s, box-shadow 0.15s;
          font-family: inherit; text-align: left; width: 100%;
        }
        .action-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 14px rgba(0,0,0,0.1);
        }
        .action-icon { font-size: 1.5rem; }
        .action-label { font-size: 0.9rem; font-weight: 600; color: #2d3748; }

        /* ── Trainer view ── */
        .back-btn {
          display: inline-flex; align-items: center; gap: 0.4rem;
          background: white; border: 1px solid #e2e8f0;
          border-radius: 10px; padding: 0.5rem 1rem;
          font-size: 0.9rem; font-weight: 600; color: #4a5568;
          cursor: pointer; margin: 1rem 0 0.5rem;
          transition: all 0.15s;
          font-family: inherit;
        }
        .back-btn:hover { background: #edf2f7; color: #2d3748; }
        .trainer-title {
          font-size: 1.3rem; font-weight: 800; margin: 0.5rem 0 0.8rem;
          color: #1a202c;
        }

        /* ── Stats banner on home ── */
        .stats-banner {
          display: flex; gap: 0.7rem; margin-bottom: 1.5rem;
        }
        .stat-box {
          flex: 1; background: white; border-radius: 14px;
          padding: 0.8rem; text-align: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        .stat-value { font-size: 1.4rem; font-weight: 800; color: #2d3748; }
        .stat-label { font-size: 0.75rem; color: #a0aec0; margin-top: 0.1rem; }

        /* Streak badge */
        #ship { font-size: 1rem; margin-left: 0.2rem; }

        /* ── Profile overlay ── */
        #profile-overlay {
          position: fixed; inset: 0; z-index: 9998;
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(8px);
          display: flex; align-items: center; justify-content: center;
        }
        #profile-overlay.hidden { display: none; }
        #profile-box {
          background: white; border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.2);
          padding: 2rem 1.5rem;
          width: min(440px, 92vw); max-height: 90vh;
          overflow-y: auto;
          display: flex; flex-direction: column; gap: 1.2rem; align-items: center;
        }
        #profile-box h2 { margin: 0; font-size: 1.3rem; color: #1a202c; }
        #profile-grid {
          display: flex; flex-wrap: wrap; gap: 0.8rem;
          justify-content: center; width: 100%;
        }
        .profile-card {
          display: flex; flex-direction: column; align-items: center; gap: 0.4rem;
          padding: 0.8rem; border-radius: 14px; cursor: pointer;
          border: 2px solid #e2e8f0; background: #f7fafc;
          transition: all 0.2s; position: relative; width: 90px;
        }
        .profile-card:hover { border-color: #4299e1; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(66,153,225,0.15); }
        .profile-avatar-wrap {
          width: 52px; height: 52px; border-radius: 50%;
          overflow: hidden; border: 2px solid #e2e8f0;
          background: #edf2f7;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.4rem; color: #a0aec0;
        }
        .profile-avatar-wrap svg { width: 100%; height: 100%; display: block; }
        .profile-card-name {
          font-size: 0.78rem; color: #4a5568; text-align: center; font-weight: 600;
          max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .profile-del-btn {
          position: absolute; top: 2px; right: 2px;
          width: 20px; height: 20px; border-radius: 50%;
          background: #fc8181; color: white;
          border: none; cursor: pointer; font-size: 0.65rem;
          opacity: 0; transition: opacity 0.2s;
          display: flex; align-items: center; justify-content: center;
        }
        .profile-card:hover .profile-del-btn { opacity: 1; }
        #btn-new-profile {
          width: 100%; padding: 0.7rem;
          border: 2px dashed #cbd5e0; border-radius: 12px;
          background: transparent; color: #718096;
          font-size: 0.95rem; cursor: pointer; transition: all 0.2s;
        }
        #btn-new-profile:hover { background: #f7fafc; border-color: #4299e1; color: #4299e1; }
        #profile-new-view { display: flex; flex-direction: column; gap: 1rem; align-items: center; width: 100%; }
        #input-profile-name {
          width: 100%; padding: 0.7rem 1rem;
          background: #f7fafc; border: 2px solid #e2e8f0;
          border-radius: 10px; color: #2d3748; font-size: 1.1rem;
          outline: none; text-align: center;
        }
        #input-profile-name:focus { border-color: #4299e1; }
        #input-profile-name::placeholder { color: #a0aec0; }
        .profile-form-btns { display: flex; gap: 0.7rem; width: 100%; }
        #btn-profile-cancel {
          flex: 1; padding: 0.65rem; background: #f7fafc;
          border: 1px solid #e2e8f0; border-radius: 10px;
          color: #718096; cursor: pointer; font-size: 0.9rem;
        }
        #btn-profile-create {
          flex: 2; padding: 0.65rem;
          background: #4299e1; border: none; border-radius: 10px;
          color: white; font-size: 1rem; font-weight: bold; cursor: pointer;
        }
        #btn-profile-create:hover { background: #3182ce; }

        /* ── Role overlay ── */
        #role-overlay {
          position: fixed; inset: 0; z-index: 9999;
          background: rgba(0,0,0,0.5); backdrop-filter: blur(8px);
          display: flex; align-items: center; justify-content: center;
        }
        #role-overlay.hidden { display: none; }
        #role-box {
          display: flex; flex-direction: column; align-items: center; gap: 1.4rem;
          padding: 2rem 1.5rem;
          background: white; border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.2);
          max-width: 380px; width: 92vw;
        }
        #role-box h2 { margin: 0; font-size: 1.4rem; color: #1a202c; }
        #role-box p { margin: 0; font-size: 0.9rem; color: #718096; text-align: center; }
        .role-btns { display: flex; gap: 0.8rem; width: 100%; }
        .role-btn {
          flex: 1; padding: 1rem 0.5rem;
          border: 2px solid #e2e8f0; border-radius: 14px;
          cursor: pointer; background: #f7fafc;
          color: #4a5568; font-size: 0.95rem; font-weight: bold;
          display: flex; flex-direction: column; align-items: center; gap: 0.4rem;
          transition: all 0.2s; font-family: inherit;
        }
        .role-btn:hover { border-color: #4299e1; background: #ebf8ff; transform: translateY(-2px); }
        .role-btn .role-icon { font-size: 2.2rem; }

        /* ── Hidden helpers ── */
        [hidden] { display: none !important; }

        /* ── Streak animations (kept for PointsManager) ── */
        .streak-10 #ship { transform: scale(1.3); }
        .streak-15 #ship { transform: scale(1.5) rotate(15deg); }
        .streak-20 #ship { transform: scale(1.8) rotate(360deg); }
        .streak-broken #ship { animation: shake 0.5s; }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }

        #treasure { cursor: pointer; transition: transform 0.2s; }
        #treasure.disabled { opacity: 0.3; cursor: default; }
        #treasure:not(.disabled):hover { transform: scale(1.2); }

        /* Hide points/streak spans the PointsManager targets */
        #points, #streak, #streak-record { /* visible in topbar stats */ }

        /* ── Theme picker ── */
        .theme-section {
          margin-top: 0.5rem;
        }
        .theme-section-title {
          font-size: 0.85rem; font-weight: 700; color: #718096;
          margin: 0 0 0.6rem; text-transform: uppercase; letter-spacing: 0.5px;
        }
        .theme-grid {
          display: flex; flex-wrap: wrap; gap: 0.5rem;
        }
        .theme-dot {
          width: 40px; height: 40px; border-radius: 12px;
          border: 3px solid transparent;
          cursor: pointer;
          transition: transform 0.15s, border-color 0.15s, box-shadow 0.15s;
          position: relative;
        }
        .theme-dot:hover { transform: scale(1.12); }
        .theme-dot.active {
          border-color: #2d3748;
          box-shadow: 0 0 0 2px white, 0 0 0 4px #4299e1;
        }
        .theme-dot::after {
          content: ""; position: absolute; inset: 0;
          border-radius: 9px;
        }

        /* ── Background themes ── */
        :host([data-bg="light"])   { background: #f0f4f8; }
        :host([data-bg="blue"])    { background: #dbeafe; }
        :host([data-bg="green"])   { background: #d1fae5; }
        :host([data-bg="purple"])  { background: #ede9fe; }
        :host([data-bg="pink"])    { background: #fce7f3; }
        :host([data-bg="yellow"])  { background: #fef9c3; }
        :host([data-bg="orange"])  { background: #ffedd5; }
        :host([data-bg="dark"])    { background: #1a202c; color: #e2e8f0; }

        :host([data-bg="dark"]) .topbar { background: #2d3748; border-bottom-color: #4a5568; }
        :host([data-bg="dark"]) .topbar-name { color: #e2e8f0; }
        :host([data-bg="dark"]) .topbar-stats { background: #4a5568; color: #e2e8f0; }
        :host([data-bg="dark"]) .topbar-btn { color: #e2e8f0; }
        :host([data-bg="dark"]) .topbar-btn:hover { background: #4a5568; }
        :host([data-bg="dark"]) .subject-card { background: #2d3748; }
        :host([data-bg="dark"]) .card-title { color: #e2e8f0; }
        :host([data-bg="dark"]) .card-desc { color: #a0aec0; }
        :host([data-bg="dark"]) .card-arrow { color: #4a5568; }
        :host([data-bg="dark"]) .action-card { background: #2d3748; }
        :host([data-bg="dark"]) .action-label { color: #e2e8f0; }
        :host([data-bg="dark"]) .stat-box { background: #2d3748; }
        :host([data-bg="dark"]) .stat-value { color: #e2e8f0; }
        :host([data-bg="dark"]) .welcome { color: #e2e8f0; }
        :host([data-bg="dark"]) .back-btn { background: #2d3748; border-color: #4a5568; color: #e2e8f0; }
        :host([data-bg="dark"]) .back-btn:hover { background: #4a5568; }
        :host([data-bg="dark"]) .trainer-title { color: #e2e8f0; }
        :host([data-bg="dark"]) .theme-section-title { color: #a0aec0; }
      </style>

      <!-- Profile overlay -->
      <div id="profile-overlay" class="hidden">
        <div id="profile-box">
          <div id="profile-pick-view">
            <h2>Wer bist du?</h2>
            <div id="profile-grid"></div>
            <button id="btn-new-profile">+ Neues Profil</button>
          </div>
          <div id="profile-new-view" hidden>
            <h2>Neues Profil</h2>
            <input id="input-profile-name" type="text" placeholder="Dein Name..."
                   autocomplete="off" autocorrect="off" spellcheck="false"/>
            <div class="profile-form-btns">
              <button id="btn-profile-cancel">Zurück</button>
              <button id="btn-profile-create">Erstellen</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Role overlay -->
      <div id="role-overlay" class="hidden">
        <div id="role-box">
          <h2>Wer bist du?</h2>
          <p>Wähle deine Rolle.</p>
          <div class="role-btns">
            <button class="role-btn" data-role="student">
              <span class="role-icon">🎒</span><span>Schüler</span>
            </button>
            <button class="role-btn" data-role="teacher">
              <span class="role-icon">👩‍🏫</span><span>Lehrer</span>
            </button>
            <button class="role-btn" data-role="developer">
              <span class="role-icon">💻</span><span>Entwickler</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Top bar -->
      <div class="topbar">
        <div class="topbar-left">
          <span class="topbar-name" id="profile-switcher" title="Profil wechseln">
            <span id="profile-switcher-name">–</span> ▾
          </span>
          <div class="topbar-stats">
            ⭐ <span id="points">0</span>
            &nbsp;🔥 <span id="streak">0</span>
            <span id="ship">🚀</span>
          </div>
          <span id="streak-record" style="display:none">0</span>
        </div>
        <div class="topbar-right">
          <span id="treasure" title="Spiele">🎮</span>
          <button class="topbar-btn" id="group-btn" title="Gruppen">👥</button>
          <button class="topbar-btn" id="info-btn" title="Hilfe">?</button>
          <div class="topbar-avatar" id="avatar-btn" title="Avatar bearbeiten">
            <div id="avatar-mini"></div>
          </div>
        </div>
      </div>

      <vocab-help></vocab-help>
      <avatar-builder></avatar-builder>
      <vocab-editor></vocab-editor>
      <group-board></group-board>
      <game-lobby></game-lobby>

      <!-- Home / Dashboard -->
      <div id="home-screen">
        <div class="stats-banner">
          <div class="stat-box">
            <div class="stat-value" id="home-points">0</div>
            <div class="stat-label">Punkte</div>
          </div>
          <div class="stat-box">
            <div class="stat-value" id="home-streak">0</div>
            <div class="stat-label">Streak-Rekord</div>
          </div>
        </div>

        <p class="welcome" id="welcome-text">Hallo!</p>
        <p class="welcome-sub">Was möchtest du heute lernen?</p>

        <div class="subject-cards">
          <button class="subject-card" data-subject="englisch">
            <div class="card-icon englisch">🇬🇧</div>
            <div class="card-info">
              <p class="card-title">Englisch</p>
              <p class="card-desc">Vokabeln lernen, hören & schreiben</p>
            </div>
            <span class="card-arrow">›</span>
          </button>
          <button class="subject-card" data-subject="mathe">
            <div class="card-icon mathe">🔢</div>
            <div class="card-info">
              <p class="card-title">Mathe</p>
              <p class="card-desc">Rechnen, Geometrie, Brüche & mehr</p>
            </div>
            <span class="card-arrow">›</span>
          </button>
          <button class="subject-card" data-subject="deutsch">
            <div class="card-icon deutsch">📖</div>
            <div class="card-info">
              <p class="card-title">Deutsch</p>
              <p class="card-desc">Grammatik, Rechtschreibung & Wortarten</p>
            </div>
            <span class="card-arrow">›</span>
          </button>
        </div>

        <div class="home-actions">
          <button class="action-card" id="home-games">
            <span class="action-icon">🎮</span>
            <span class="action-label">Spiele</span>
          </button>
          <button class="action-card" id="home-groups">
            <span class="action-icon">👥</span>
            <span class="action-label">Gruppen</span>
          </button>
          <button class="action-card" id="home-vocab-edit">
            <span class="action-icon">✏️</span>
            <span class="action-label">Vokabeln</span>
          </button>
          <button class="action-card" id="home-avatar">
            <span class="action-icon">😊</span>
            <span class="action-label">Avatar</span>
          </button>
        </div>

        <div class="theme-section">
          <p class="theme-section-title">Hintergrund</p>
          <div class="theme-grid">
            <div class="theme-dot" data-theme="light" style="background:#f0f4f8" title="Hell"></div>
            <div class="theme-dot" data-theme="blue" style="background:#dbeafe" title="Blau"></div>
            <div class="theme-dot" data-theme="green" style="background:#d1fae5" title="Grün"></div>
            <div class="theme-dot" data-theme="purple" style="background:#ede9fe" title="Lila"></div>
            <div class="theme-dot" data-theme="pink" style="background:#fce7f3" title="Rosa"></div>
            <div class="theme-dot" data-theme="yellow" style="background:#fef9c3" title="Gelb"></div>
            <div class="theme-dot" data-theme="orange" style="background:#ffedd5" title="Orange"></div>
            <div class="theme-dot" data-theme="dark" style="background:#1a202c" title="Dunkel"></div>
          </div>
        </div>
      </div>

      <!-- Trainer view (shown when subject is selected) -->
      <div id="trainer-screen">
        <button class="back-btn" id="back-btn">← Zurück</button>
        <h2 class="trainer-title" id="trainer-title"></h2>
        <div id="trainer-slot"></div>
      </div>
    `;

        // Trainers are created lazily when needed
        this._trainers = {};
        this._startup();
    }

    // ── Startup ──────────────────────────────────────────────────────────────

    _startup() {
        const profiles = getProfiles();
        const activeId = getActiveId();
        const active = profiles.find(p => p.id === activeId);

        if (profiles.length === 0) {
            this._showProfileOverlay(true);
        } else if (!active) {
            this._showProfileOverlay(false);
        } else {
            activateProfile(activeId);
            this.init();
        }
    }

    _showProfileOverlay(forceNew = false) {
        const overlay = this.shadowRoot.getElementById("profile-overlay");
        const pickView = this.shadowRoot.getElementById("profile-pick-view");
        const newView = this.shadowRoot.getElementById("profile-new-view");
        const grid = this.shadowRoot.getElementById("profile-grid");
        const nameInput = this.shadowRoot.getElementById("input-profile-name");

        const showPick = () => {
            pickView.hidden = false;
            newView.hidden = true;
            this._renderProfileGrid(grid, (id) => {
                activateProfile(id);
                overlay.classList.add("hidden");
                this.init();
            });
        };
        const showNew = () => {
            pickView.hidden = true;
            newView.hidden = false;
            nameInput.value = "";
            setTimeout(() => nameInput.focus(), 50);
        };

        overlay.classList.remove("hidden");
        if (forceNew) showNew(); else showPick();

        this.shadowRoot.getElementById("btn-new-profile").onclick = () => showNew();
        this.shadowRoot.getElementById("btn-profile-cancel").onclick = () => showPick();

        const doCreate = () => {
            const name = nameInput.value.trim();
            if (!name) { nameInput.focus(); return; }
            const id = createProfile(name);
            activateProfile(id);
            overlay.classList.add("hidden");
            this.init();
        };
        this.shadowRoot.getElementById("btn-profile-create").onclick = doCreate;
        nameInput.onkeydown = e => { if (e.key === "Enter") doCreate(); };
    }

    _renderProfileGrid(grid, onPick) {
        grid.innerHTML = "";
        const profiles = getProfiles();
        const canDelete = profiles.length > 1;
        profiles.forEach(p => {
            const card = document.createElement("div");
            card.className = "profile-card";
            const avatarHtml = p.avatarSvg
                ? `<div class="profile-avatar-wrap">${p.avatarSvg}</div>`
                : `<div class="profile-avatar-wrap">${p.name[0].toUpperCase()}</div>`;
            card.innerHTML = `
              ${avatarHtml}
              <span class="profile-card-name">${p.name}</span>
              ${canDelete ? `<button class="profile-del-btn" title="Löschen">✕</button>` : ""}
            `;
            card.onclick = () => onPick(p.id);
            if (canDelete) {
                card.querySelector(".profile-del-btn").onclick = (e) => {
                    e.stopPropagation();
                    if (confirm(`Profil „${p.name}" löschen?`)) {
                        deleteProfile(p.id);
                        this._renderProfileGrid(grid, onPick);
                    }
                };
            }
            grid.appendChild(card);
        });
    }

    // ── Init ─────────────────────────────────────────────────────────────────

    init() {
        const treasureEl = this.shadowRoot.getElementById("treasure");
        const pointsManager = new PointsManager(this.shadowRoot);
        this._pointsManager = pointsManager;

        const help = this.shadowRoot.querySelector("vocab-help");

        // Role
        const roleOverlay = this.shadowRoot.getElementById("role-overlay");
        const savedRole = localStorage.getItem("userRole");
        const applyRole = (role) => {
            const isFirst = !localStorage.getItem("userRole");
            localStorage.setItem("userRole", role);
            roleOverlay.classList.add("hidden");
            treasureEl.style.display = role === "teacher" ? "none" : "";
            if (isFirst && !localStorage.getItem("vocabHelpSeen")) {
                setTimeout(() => this.startHelp(help), 500);
            }
        };
        if (savedRole) applyRole(savedRole);
        else roleOverlay.classList.remove("hidden");
        roleOverlay.querySelectorAll(".role-btn").forEach(btn => {
            btn.onclick = () => applyRole(btn.dataset.role);
        });

        // Game lobby
        const gameLobby = this.shadowRoot.querySelector("game-lobby");
        gameLobby.pointsManager = pointsManager;
        treasureEl.addEventListener("click", () => {
            if (!treasureEl.classList.contains("disabled")) gameLobby.open();
        });

        // Avatar
        const avatarMini = this.shadowRoot.getElementById("avatar-mini");
        const avatarBuilder = this.shadowRoot.querySelector("avatar-builder");
        const refreshAvatar = () => {
            const svg = getAvatarSVG();
            avatarMini.innerHTML = svg;
            setAvatarSvg(svg);
        };
        refreshAvatar();
        avatarBuilder.pointsManager = pointsManager;
        this.shadowRoot.getElementById("avatar-btn").onclick = () => avatarBuilder.open();
        this.shadowRoot.addEventListener("avatar-saved", refreshAvatar);
        this.shadowRoot.addEventListener("show-role-select", () => roleOverlay.classList.remove("hidden"));

        // Profile switcher
        const profile = getActiveProfile();
        const switcherName = this.shadowRoot.getElementById("profile-switcher-name");
        if (switcherName && profile) switcherName.textContent = profile.name;
        this.shadowRoot.getElementById("profile-switcher").onclick = () => {
            saveSnapshot();
            const overlay = this.shadowRoot.getElementById("profile-overlay");
            const grid = this.shadowRoot.getElementById("profile-grid");
            this.shadowRoot.getElementById("profile-pick-view").hidden = false;
            this.shadowRoot.getElementById("profile-new-view").hidden = true;
            this._renderProfileGrid(grid, (id) => { activateProfile(id); location.reload(); });
            overlay.classList.remove("hidden");
        };
        window.addEventListener("beforeunload", () => saveSnapshot());

        // Welcome text
        if (profile) {
            this.shadowRoot.getElementById("welcome-text").textContent = `Hallo, ${profile.name}!`;
        }

        // Update home stats
        this._updateHomeStats();

        // Subject cards → open trainer
        this.shadowRoot.querySelectorAll(".subject-card").forEach(card => {
            card.onclick = () => this._openSubject(card.dataset.subject);
        });

        // Back button
        this.shadowRoot.getElementById("back-btn").onclick = () => this._showHome();

        // Home action buttons
        this.shadowRoot.getElementById("home-games").onclick = () => gameLobby.open();
        const groupBoard = this.shadowRoot.querySelector("group-board");
        this.shadowRoot.getElementById("home-groups").onclick = () => groupBoard.open();
        this.shadowRoot.getElementById("group-btn").onclick = () => groupBoard.open();

        const vocabEditor = this.shadowRoot.querySelector("vocab-editor");
        this.shadowRoot.getElementById("home-vocab-edit").onclick = () => vocabEditor.open();
        vocabEditor.onSaved = () => {
            if (this._trainers.englisch) {
                this._trainers.englisch.reload();
                this._trainers.englisch.togglePopup?.(true);
            }
        };
        vocabEditor.addEventListener("vocab-updated", () => {
            if (this._trainers.englisch) this._trainers.englisch.reload();
        });

        this.shadowRoot.getElementById("home-avatar").onclick = () => avatarBuilder.open();
        this.shadowRoot.getElementById("info-btn").onclick = () => this.startHelp(help);

        if (savedRole && !localStorage.getItem("vocabHelpSeen")) {
            setTimeout(() => this.startHelp(help), 500);
        }

        // Theme picker
        const savedTheme = localStorage.getItem("appBg") || "light";
        this.setAttribute("data-bg", savedTheme);
        document.body.style.background = getComputedStyle(this).background;
        this.shadowRoot.querySelectorAll(".theme-dot").forEach(dot => {
            if (dot.dataset.theme === savedTheme) dot.classList.add("active");
            dot.onclick = () => {
                this.shadowRoot.querySelectorAll(".theme-dot").forEach(d => d.classList.remove("active"));
                dot.classList.add("active");
                const theme = dot.dataset.theme;
                this.setAttribute("data-bg", theme);
                localStorage.setItem("appBg", theme);
                // Sync body background
                requestAnimationFrame(() => {
                    document.body.style.background = getComputedStyle(this).background;
                });
            };
        });

        // Observe points changes to update home stats
        const observer = new MutationObserver(() => this._updateHomeStats());
        const pointsEl = this.shadowRoot.getElementById("points");
        if (pointsEl) observer.observe(pointsEl, { childList: true, characterData: true, subtree: true });
    }

    _updateHomeStats() {
        const pts = localStorage.getItem("points") || "0";
        const sr = localStorage.getItem("streakRecord") || "0";
        const hp = this.shadowRoot.getElementById("home-points");
        const hs = this.shadowRoot.getElementById("home-streak");
        if (hp) hp.textContent = pts;
        if (hs) hs.textContent = sr;
    }

    // ── Navigation ───────────────────────────────────────────────────────────

    _openSubject(subject) {
        const home = this.shadowRoot.getElementById("home-screen");
        const trainer = this.shadowRoot.getElementById("trainer-screen");
        const slot = this.shadowRoot.getElementById("trainer-slot");
        const title = this.shadowRoot.getElementById("trainer-title");

        home.style.display = "none";
        trainer.style.display = "block";

        const subjects = {
            englisch: { title: "🇬🇧 Englisch", tag: "vocab-trainer" },
            mathe:    { title: "🔢 Mathe", tag: "math-trainer" },
            deutsch:  { title: "📖 Deutsch", tag: "deutsch-trainer" },
        };
        const s = subjects[subject];
        title.textContent = s.title;

        // Lazy create trainer or reuse
        if (!this._trainers[subject]) {
            const el = document.createElement(s.tag);
            if (el.points !== undefined || subject !== "englisch") {
                el.points = this._pointsManager;
            } else {
                // vocab-trainer uses .points setter
                el.points = this._pointsManager;
            }
            this._trainers[subject] = el;
        }

        slot.innerHTML = "";
        slot.appendChild(this._trainers[subject]);
    }

    _showHome() {
        this.shadowRoot.getElementById("home-screen").style.display = "";
        this.shadowRoot.getElementById("trainer-screen").style.display = "none";
        this._updateHomeStats();
    }

    // ── Help ─────────────────────────────────────────────────────────────────

    async startHelp(help) {
        // Open English trainer first so elements exist
        this._openSubject("englisch");

        const trainer = await this.waitFor(() => this._trainers.englisch);
        if (!trainer) return;
        await this.waitFor(() => trainer.shadowRoot);
        await this.waitFor(() => trainer.shadowRoot.querySelector(".lesson-header"));
        await this.waitFor(() => trainer.shadowRoot.querySelector("#question"));
        await this.waitFor(() => trainer.shadowRoot.querySelector("#answer"));

        help.start([
            { selector: () => trainer.shadowRoot.querySelector(".lesson-header"), text: "Hier wählst du die Lektion aus." },
            { selector: () => trainer.shadowRoot.querySelector("#question"), text: "Hier steht die Aufgabe." },
            { selector: () => trainer.shadowRoot.querySelector("#answer"), text: "Hier gibst du deine Antwort ein." },
            { selector: () => this.shadowRoot.querySelector("#treasure"), text: "Hier öffnest du die Spiele!" },
        ]);
    }

    waitFor(fn, interval = 50, timeout = 2000) {
        return new Promise(resolve => {
            const start = performance.now();
            const tick = () => {
                const result = fn();
                if (result) return resolve(result);
                if (performance.now() - start > timeout) return resolve(null);
                setTimeout(tick, interval);
            };
            tick();
        });
    }
}

customElements.define("app-shell", AppShell);
