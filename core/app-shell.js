// core/app-shell.js
// Clean ANTON-style dashboard with subject cards and trainer views.

import "./help-overlay.js";
import "./group-board.js";
import "./invite-qr.js";
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

        /* ── Background overlay ── */
        .bg-overlay {
          display: none; position: fixed; inset: 0; z-index: 1200;
          background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
          align-items: center; justify-content: center;
        }
        .bg-overlay.active { display: flex; }
        .bg-panel {
          background: white; border-radius: 18px;
          width: min(480px, 96vw); max-height: 92vh;
          display: flex; flex-direction: column;
          box-shadow: 0 20px 60px rgba(0,0,0,0.35);
          overflow: hidden;
        }
        :host([data-bg="dark"]) .bg-panel { background: #1a202c; }
        .bg-header {
          display: flex; align-items: center; gap: 0.5rem;
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white; padding: 0.9rem 1rem; flex-shrink: 0;
        }
        .bg-header-title { font-size: 1.1rem; font-weight: bold; flex: 1; }
        .bg-close {
          background: rgba(255,255,255,0.2); border: none; color: white;
          font-size: 1.2rem; border-radius: 8px; padding: 0.3rem 0.6rem;
          cursor: pointer; transition: background 0.2s;
        }
        .bg-close:hover { background: rgba(255,255,255,0.35); }
        .bg-body {
          flex: 1; overflow-y: auto; padding: 1rem;
          display: flex; flex-direction: column; gap: 0.3rem;
        }

        /* ── Theme picker ── */
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
        .gradient-dot {
          background-size: 100% 100% !important;
        }

        /* Custom color picker */
        .theme-custom {
          width: 40px; height: 40px; border-radius: 12px;
          border: 3px dashed #cbd5e0;
          cursor: pointer; position: relative;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.1rem; color: #718096;
          transition: transform 0.15s, border-color 0.15s;
          overflow: hidden;
        }
        .theme-custom:hover { transform: scale(1.12); border-color: #4299e1; }
        .theme-custom.active {
          border-style: solid; border-color: #2d3748;
          box-shadow: 0 0 0 2px white, 0 0 0 4px #4299e1;
        }
        .theme-custom input[type="color"] {
          position: absolute; inset: -10px;
          width: 60px; height: 60px;
          opacity: 0; cursor: pointer;
        }

        /* ── Animated backgrounds ── */
        .anim-section-title {
          font-size: 0.85rem; font-weight: 700; color: #718096;
          margin: 0.8rem 0 0.6rem; text-transform: uppercase; letter-spacing: 0.5px;
        }
        .anim-grid {
          display: flex; flex-wrap: wrap; gap: 0.5rem;
        }
        .anim-chip {
          padding: 0.4rem 0.9rem; border-radius: 20px;
          border: 2px solid #e2e8f0; background: white;
          cursor: pointer; font-size: 0.82rem; font-weight: 600;
          color: #4a5568; transition: all 0.15s;
        }
        .anim-chip:hover { border-color: #4299e1; color: #4299e1; }
        .anim-chip.active { border-color: #4299e1; background: #ebf8ff; color: #2b6cb0; }

        :host([data-bg="dark"]) .anim-chip { background: #2d3748; color: #e2e8f0; border-color: #4a5568; }
        :host([data-bg="dark"]) .anim-chip.active { background: #2c5282; border-color: #63b3ed; color: #bee3f8; }
        :host([data-bg="dark"]) .anim-section-title { color: #a0aec0; }

        /* ── Custom gradient builder ── */
        .grad-builder {
          margin-top: 0.5rem; padding: 0.7rem;
          border: 2px solid #e2e8f0; border-radius: 12px;
          background: #f7fafc;
        }
        :host([data-bg="dark"]) .grad-builder { background: #2d3748; border-color: #4a5568; }
        .grad-builder-row {
          display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;
        }
        .grad-builder-row label {
          font-size: 0.78rem; font-weight: 600; color: #718096; min-width: 55px;
        }
        :host([data-bg="dark"]) .grad-builder-row label { color: #a0aec0; }
        .grad-color-inputs { display: flex; gap: 0.4rem; flex: 1; flex-wrap: wrap; }
        .grad-color-input {
          width: 36px; height: 36px; border: 2px solid #e2e8f0; border-radius: 8px;
          cursor: pointer; padding: 0; overflow: hidden;
        }
        .grad-color-input::-webkit-color-swatch-wrapper { padding: 0; }
        .grad-color-input::-webkit-color-swatch { border: none; border-radius: 6px; }
        .grad-add-color {
          width: 36px; height: 36px; border: 2px dashed #cbd5e0; border-radius: 8px;
          background: transparent; color: #718096; font-size: 1.2rem; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.15s;
        }
        .grad-add-color:hover { border-color: #4299e1; color: #4299e1; }
        .grad-remove-color {
          width: 20px; height: 20px; border: none; border-radius: 50%;
          background: #fc8181; color: white; font-size: 0.7rem; cursor: pointer;
          position: absolute; top: -6px; right: -6px; display: none;
          align-items: center; justify-content: center; line-height: 1;
        }
        .grad-color-wrap { position: relative; }
        .grad-color-wrap:hover .grad-remove-color { display: flex; }
        .grad-direction {
          padding: 0.3rem 0.6rem; border: 2px solid #e2e8f0; border-radius: 8px;
          background: white; font-size: 0.82rem; cursor: pointer; color: #4a5568;
        }
        :host([data-bg="dark"]) .grad-direction { background: #1a202c; color: #e2e8f0; border-color: #4a5568; }
        .grad-preview {
          height: 40px; border-radius: 8px; margin-top: 0.4rem;
          border: 2px solid #e2e8f0;
        }
        .grad-btn-row { display: flex; gap: 0.5rem; margin-top: 0.5rem; }
        .grad-apply {
          flex: 1; padding: 0.45rem; border: none; border-radius: 8px;
          background: #4299e1; color: white; font-size: 0.82rem; font-weight: 600;
          cursor: pointer; transition: filter 0.15s;
        }
        .grad-apply:hover { filter: brightness(1.1); }
        .grad-anim-toggle {
          padding: 0.45rem 0.8rem; border: 2px solid #e2e8f0; border-radius: 8px;
          background: white; font-size: 0.82rem; font-weight: 600;
          cursor: pointer; color: #4a5568; transition: all 0.15s;
        }
        .grad-anim-toggle.active { border-color: #4299e1; background: #ebf8ff; color: #2b6cb0; }
        :host([data-bg="dark"]) .grad-anim-toggle { background: #1a202c; color: #e2e8f0; border-color: #4a5568; }
        :host([data-bg="dark"]) .grad-anim-toggle.active { background: #2c5282; border-color: #63b3ed; color: #bee3f8; }

        /* Animated gradient layer */
        #grad-anim-layer {
          position: fixed; inset: 0; z-index: -1; pointer-events: none;
          background-size: 300% 300%;
          animation: gradientFlow 8s ease infinite;
          opacity: 0; transition: opacity 0.5s;
        }
        #grad-anim-layer.active { opacity: 1; }
        @keyframes gradientFlow {
          0%   { background-position: 0% 50%; }
          25%  { background-position: 100% 0%; }
          50%  { background-position: 100% 100%; }
          75%  { background-position: 0% 100%; }
          100% { background-position: 0% 50%; }
        }

        /* Animation canvas */
        #anim-canvas {
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
        }
        .topbar { position: relative; z-index: 100; }
        #home-screen, #trainer-screen { position: relative; z-index: 1; }

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
      <invite-qr></invite-qr>

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
          <button class="action-card" id="home-bg">
            <span class="action-icon">🎨</span>
            <span class="action-label">Hintergrund</span>
          </button>
          <button class="action-card" id="home-friends">
            <span class="action-icon">📲</span>
            <span class="action-label">Freunde</span>
          </button>
          <button class="action-card" id="home-profile">
            <span class="action-icon">🔄</span>
            <span class="action-label">Profil</span>
          </button>
        </div>

      </div>

      <!-- Background settings overlay -->
      <div class="bg-overlay" id="bg-overlay">
        <div class="bg-panel">
          <div class="bg-header">
            <span class="bg-header-title">🎨 Hintergrund</span>
            <button class="bg-close" id="bg-close">✕</button>
          </div>
          <div class="bg-body">

            <p class="theme-section-title">Farben</p>
            <div class="theme-grid">
              <div class="theme-dot" data-theme="light" style="background:#f0f4f8" title="Hell"></div>
              <div class="theme-dot" data-theme="blue" style="background:#dbeafe" title="Blau"></div>
              <div class="theme-dot" data-theme="green" style="background:#d1fae5" title="Grün"></div>
              <div class="theme-dot" data-theme="purple" style="background:#ede9fe" title="Lila"></div>
              <div class="theme-dot" data-theme="pink" style="background:#fce7f3" title="Rosa"></div>
              <div class="theme-dot" data-theme="yellow" style="background:#fef9c3" title="Gelb"></div>
              <div class="theme-dot" data-theme="orange" style="background:#ffedd5" title="Orange"></div>
              <div class="theme-dot" data-theme="dark" style="background:#1a202c" title="Dunkel"></div>
              <div class="theme-custom" id="theme-custom-wrap" title="Eigene Farbe">
                🎨
                <input type="color" id="custom-color-input" value="#f0f4f8" />
              </div>
            </div>

            <p class="anim-section-title">Farbverläufe</p>
            <div class="theme-grid">
              <div class="theme-dot gradient-dot" data-theme="grad-sunset" style="background:linear-gradient(135deg,#f97316,#ec4899,#8b5cf6)" title="Sonnenuntergang"></div>
              <div class="theme-dot gradient-dot" data-theme="grad-ocean" style="background:linear-gradient(135deg,#06b6d4,#3b82f6,#6366f1)" title="Ozean"></div>
              <div class="theme-dot gradient-dot" data-theme="grad-aurora" style="background:linear-gradient(135deg,#10b981,#06b6d4,#8b5cf6)" title="Aurora"></div>
              <div class="theme-dot gradient-dot" data-theme="grad-candy" style="background:linear-gradient(135deg,#f472b6,#c084fc,#60a5fa)" title="Candy"></div>
              <div class="theme-dot gradient-dot" data-theme="grad-forest" style="background:linear-gradient(135deg,#065f46,#059669,#34d399)" title="Wald"></div>
              <div class="theme-dot gradient-dot" data-theme="grad-fire" style="background:linear-gradient(135deg,#dc2626,#f97316,#fbbf24)" title="Feuer"></div>
              <div class="theme-dot gradient-dot" data-theme="grad-sky" style="background:linear-gradient(180deg,#bfdbfe,#60a5fa,#2563eb)" title="Himmel"></div>
              <div class="theme-dot gradient-dot" data-theme="grad-galaxy" style="background:linear-gradient(135deg,#0f172a,#581c87,#7c3aed,#0ea5e9)" title="Galaxie"></div>
              <div class="theme-dot gradient-dot" data-theme="grad-rainbow" style="background:linear-gradient(135deg,#ef4444,#f97316,#eab308,#22c55e,#3b82f6,#8b5cf6)" title="Regenbogen"></div>
              <div class="theme-dot gradient-dot" data-theme="grad-mint" style="background:linear-gradient(135deg,#d1fae5,#a7f3d0,#6ee7b7,#34d399)" title="Minze"></div>
              <div class="theme-dot gradient-dot" data-theme="grad-peach" style="background:linear-gradient(135deg,#fed7aa,#fdba74,#fb923c,#f97316)" title="Pfirsich"></div>
              <div class="theme-dot gradient-dot" data-theme="grad-night" style="background:linear-gradient(180deg,#0f172a,#1e293b,#334155)" title="Nacht"></div>
            </div>

            <p class="anim-section-title">Eigener Farbverlauf</p>
            <div class="grad-builder" id="grad-builder">
              <div class="grad-builder-row">
                <label>Farben</label>
                <div class="grad-color-inputs" id="grad-colors"></div>
                <button class="grad-add-color" id="grad-add-color" title="Farbe hinzufügen">+</button>
              </div>
              <div class="grad-builder-row">
                <label>Richtung</label>
                <select class="grad-direction" id="grad-direction">
                  <option value="135deg">Diagonal ↘</option>
                  <option value="180deg">Oben → Unten ↓</option>
                  <option value="90deg">Links → Rechts →</option>
                  <option value="45deg">Diagonal ↗</option>
                  <option value="225deg">Diagonal ↙</option>
                  <option value="270deg">Rechts → Links ←</option>
                  <option value="0deg">Unten → Oben ↑</option>
                  <option value="circle">Kreisförmig ⊙</option>
                </select>
              </div>
              <div class="grad-preview" id="grad-preview"></div>
              <div class="grad-btn-row">
                <button class="grad-apply" id="grad-apply">Anwenden</button>
                <button class="grad-anim-toggle" id="grad-anim-toggle">Bewegt</button>
              </div>
            </div>

            <p class="anim-section-title">Partikel-Animation</p>
            <div class="anim-grid">
              <div class="anim-chip" data-anim="none">Keine</div>
              <div class="anim-chip" data-anim="bubbles">Blasen</div>
              <div class="anim-chip" data-anim="stars">Sterne</div>
              <div class="anim-chip" data-anim="confetti">Konfetti</div>
              <div class="anim-chip" data-anim="snow">Schnee</div>
              <div class="anim-chip" data-anim="hearts">Herzen</div>
              <div class="anim-chip" data-anim="leaves">Blätter</div>
              <div class="anim-chip" data-anim="fireflies">Glühwürmchen</div>
              <div class="anim-chip" data-anim="diamonds">Diamanten</div>
              <div class="anim-chip" data-anim="music">Noten</div>
              <div class="anim-chip" data-anim="rain">Regen</div>
              <div class="anim-chip" data-anim="matrix">Matrix</div>
              <div class="anim-chip" data-anim="sakura">Kirschblüten</div>
              <div class="anim-chip" data-anim="lightning">Blitze</div>
              <div class="anim-chip" data-anim="coins">Münzen</div>
              <div class="anim-chip" data-anim="emojis">Emojis</div>
            </div>

          </div>
        </div>
      </div>

      <div id="grad-anim-layer"></div>
      <canvas id="anim-canvas"></canvas>

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

    _showProfileOverlay(forceNew = false, onDone = null) {
        const overlay = this.shadowRoot.getElementById("profile-overlay");
        const pickView = this.shadowRoot.getElementById("profile-pick-view");
        const newView = this.shadowRoot.getElementById("profile-new-view");
        const grid = this.shadowRoot.getElementById("profile-grid");
        const nameInput = this.shadowRoot.getElementById("input-profile-name");

        const finish = (id) => {
            activateProfile(id);
            overlay.classList.add("hidden");
            if (onDone) onDone(); else this.init();
        };

        const showPick = () => {
            pickView.hidden = false;
            newView.hidden = true;
            this._renderProfileGrid(grid, finish);
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
            finish(id);
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
            this._showProfileOverlay(false, () => location.reload());
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
            // Reload all vocab trainers so custom lists appear under the right subject
            for (const key of Object.keys(this._trainers)) {
                const t = this._trainers[key];
                if (t?.tagName === "VOCAB-TRAINER" && typeof t.reload === "function") {
                    t.reload();
                    t.togglePopup?.(true);
                }
            }
        };
        vocabEditor.addEventListener("vocab-updated", () => {
            for (const key of Object.keys(this._trainers)) {
                const t = this._trainers[key];
                if (t?.tagName === "VOCAB-TRAINER" && typeof t.reload === "function") {
                    t.reload();
                }
            }
        });

        const inviteQR = this.shadowRoot.querySelector("invite-qr");
        this.shadowRoot.getElementById("home-friends").onclick = () => inviteQR.open();

        this.shadowRoot.getElementById("home-avatar").onclick = () => avatarBuilder.open();
        // Background settings overlay
        const bgOverlay = this.shadowRoot.getElementById("bg-overlay");
        this.shadowRoot.getElementById("home-bg").onclick = () => bgOverlay.classList.add("active");
        this.shadowRoot.getElementById("bg-close").onclick = () => bgOverlay.classList.remove("active");
        this.shadowRoot.getElementById("home-profile").onclick = () => {
            saveSnapshot();
            this._showProfileOverlay(false, () => location.reload());
        };
        this.shadowRoot.getElementById("info-btn").onclick = () => this.startHelp(help);

        if (savedRole && !localStorage.getItem("vocabHelpSeen")) {
            setTimeout(() => this.startHelp(help), 500);
        }

        // Theme picker
        const savedTheme = localStorage.getItem("appBg") || "light";
        const savedCustomColor = localStorage.getItem("appBgCustom") || "#f0f4f8";
        const customWrap = this.shadowRoot.getElementById("theme-custom-wrap");
        const customInput = this.shadowRoot.getElementById("custom-color-input");

        const clearActive = () => {
            this.shadowRoot.querySelectorAll(".theme-dot").forEach(d => d.classList.remove("active"));
            customWrap.classList.remove("active");
            const gal = this.shadowRoot.getElementById("grad-anim-layer");
            if (gal) gal.classList.remove("active");
        };
        const applyBg = (color) => {
            this.style.background = color;
            document.body.style.background = color;
        };

        // Gradient map for gradient themes
        const GRADIENTS = {
            "grad-sunset":  "linear-gradient(135deg,#f97316,#ec4899,#8b5cf6)",
            "grad-ocean":   "linear-gradient(135deg,#06b6d4,#3b82f6,#6366f1)",
            "grad-aurora":  "linear-gradient(135deg,#10b981,#06b6d4,#8b5cf6)",
            "grad-candy":   "linear-gradient(135deg,#f472b6,#c084fc,#60a5fa)",
            "grad-forest":  "linear-gradient(135deg,#065f46,#059669,#34d399)",
            "grad-fire":    "linear-gradient(135deg,#dc2626,#f97316,#fbbf24)",
            "grad-sky":     "linear-gradient(180deg,#bfdbfe,#60a5fa,#2563eb)",
            "grad-galaxy":  "linear-gradient(135deg,#0f172a,#581c87,#7c3aed,#0ea5e9)",
            "grad-rainbow": "linear-gradient(135deg,#ef4444,#f97316,#eab308,#22c55e,#3b82f6,#8b5cf6)",
            "grad-mint":    "linear-gradient(135deg,#d1fae5,#a7f3d0,#6ee7b7,#34d399)",
            "grad-peach":   "linear-gradient(135deg,#fed7aa,#fdba74,#fb923c,#f97316)",
            "grad-night":   "linear-gradient(180deg,#0f172a,#1e293b,#334155)",
        };
        const DARK_THEMES = ["dark", "grad-galaxy", "grad-night", "grad-forest"];

        const applyTheme = (theme) => {
            if (GRADIENTS[theme]) {
                this.removeAttribute("data-bg");
                if (DARK_THEMES.includes(theme)) this.setAttribute("data-bg", "dark");
                applyBg(GRADIENTS[theme]);
                document.body.style.background = GRADIENTS[theme];
                document.body.style.minHeight = "100vh";
            } else {
                this.setAttribute("data-bg", theme);
                this.style.background = "";
                requestAnimationFrame(() => {
                    document.body.style.background = getComputedStyle(this).background;
                });
            }
        };

        if (savedTheme === "custom") {
            customWrap.classList.add("active");
            customWrap.style.background = savedCustomColor;
            customInput.value = savedCustomColor;
            this.removeAttribute("data-bg");
            applyBg(savedCustomColor);
        } else {
            applyTheme(savedTheme);
            this.shadowRoot.querySelectorAll(".theme-dot").forEach(dot => {
                if (dot.dataset.theme === savedTheme) dot.classList.add("active");
            });
        }

        this.shadowRoot.querySelectorAll(".theme-dot").forEach(dot => {
            dot.onclick = () => {
                clearActive();
                dot.classList.add("active");
                const theme = dot.dataset.theme;
                localStorage.setItem("appBg", theme);
                applyTheme(theme);
            };
        });

        customInput.oninput = () => {
            const color = customInput.value;
            clearActive();
            customWrap.classList.add("active");
            customWrap.style.background = color;
            this.removeAttribute("data-bg");
            applyBg(color);
            localStorage.setItem("appBg", "custom");
            localStorage.setItem("appBgCustom", color);
            gradAnimLayer.classList.remove("active");
        };

        // ── Custom gradient builder ──
        const gradAnimLayer = this.shadowRoot.getElementById("grad-anim-layer");
        const gradColorsWrap = this.shadowRoot.getElementById("grad-colors");
        const gradDirection = this.shadowRoot.getElementById("grad-direction");
        const gradPreview = this.shadowRoot.getElementById("grad-preview");
        const gradApply = this.shadowRoot.getElementById("grad-apply");
        const gradAnimToggle = this.shadowRoot.getElementById("grad-anim-toggle");

        // Load saved custom gradient
        let gradColors = JSON.parse(localStorage.getItem("gradColors") || '["#4299e1","#9f7aea","#ed64a6"]');
        let gradDir = localStorage.getItem("gradDir") || "135deg";
        let gradAnimated = localStorage.getItem("gradAnimated") === "true";

        gradDirection.value = gradDir;
        if (gradAnimated) gradAnimToggle.classList.add("active");

        const buildGradientCSS = () => {
            if (gradColors.length < 2) return gradColors[0] || "#4299e1";
            if (gradDir === "circle") return `radial-gradient(circle, ${gradColors.join(",")})`;
            return `linear-gradient(${gradDir}, ${gradColors.join(",")})`;
        };

        const renderGradColors = () => {
            gradColorsWrap.innerHTML = "";
            gradColors.forEach((c, i) => {
                const wrap = document.createElement("div");
                wrap.className = "grad-color-wrap";
                const inp = document.createElement("input");
                inp.type = "color"; inp.value = c;
                inp.className = "grad-color-input";
                inp.oninput = () => { gradColors[i] = inp.value; updateGradPreview(); };
                wrap.appendChild(inp);
                if (gradColors.length > 2) {
                    const rm = document.createElement("button");
                    rm.className = "grad-remove-color"; rm.textContent = "x";
                    rm.onclick = () => { gradColors.splice(i, 1); renderGradColors(); updateGradPreview(); };
                    wrap.appendChild(rm);
                }
                gradColorsWrap.appendChild(wrap);
            });
        };

        const updateGradPreview = () => {
            gradPreview.style.background = buildGradientCSS();
        };

        renderGradColors();
        updateGradPreview();

        this.shadowRoot.getElementById("grad-add-color").onclick = () => {
            if (gradColors.length < 6) {
                const hue = Math.floor(Math.random() * 360);
                gradColors.push(`hsl(${hue}, 70%, 60%)`);
                renderGradColors();
                updateGradPreview();
            }
        };

        gradDirection.onchange = () => {
            gradDir = gradDirection.value;
            updateGradPreview();
        };

        gradAnimToggle.onclick = () => {
            gradAnimated = !gradAnimated;
            gradAnimToggle.classList.toggle("active", gradAnimated);
        };

        const applyCustomGrad = () => {
            const css = buildGradientCSS();
            clearActive();
            this.removeAttribute("data-bg");
            localStorage.setItem("appBg", "customGrad");
            localStorage.setItem("gradColors", JSON.stringify(gradColors));
            localStorage.setItem("gradDir", gradDir);
            localStorage.setItem("gradAnimated", String(gradAnimated));

            if (gradAnimated) {
                // Apply to animated layer with flowing effect
                gradAnimLayer.style.background = css;
                gradAnimLayer.style.backgroundSize = "300% 300%";
                gradAnimLayer.classList.add("active");
                this.style.background = "transparent";
                document.body.style.background = gradColors[0];
            } else {
                gradAnimLayer.classList.remove("active");
                applyBg(css);
            }

            // Detect dark gradients
            const darkColors = gradColors.every(c => {
                const d = document.createElement("div");
                d.style.color = c; document.body.appendChild(d);
                const rgb = getComputedStyle(d).color.match(/\d+/g).map(Number);
                d.remove();
                return (rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114) < 100;
            });
            if (darkColors) this.setAttribute("data-bg", "dark");
        };

        gradApply.onclick = applyCustomGrad;

        // Restore custom gradient on load
        if (savedTheme === "customGrad") {
            applyCustomGrad();
        }

        // Animation picker
        const canvas = this.shadowRoot.getElementById("anim-canvas");
        const ctx = canvas.getContext("2d");
        let animId = null;
        let particles = [];

        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resizeCanvas();
        window.addEventListener("resize", resizeCanvas);

        const ANIMS = {
            none: null,
            bubbles: {
                spawn: () => ({
                    x: Math.random() * canvas.width,
                    y: canvas.height + 20,
                    r: 4 + Math.random() * 12,
                    speed: 0.3 + Math.random() * 0.7,
                    wobble: Math.random() * Math.PI * 2,
                    opacity: 0.15 + Math.random() * 0.25,
                    color: `hsla(${200 + Math.random() * 40}, 70%, 70%, `,
                }),
                update: (p) => { p.y -= p.speed; p.x += Math.sin(p.wobble += 0.01) * 0.3; return p.y + p.r > -20; },
                draw: (p) => { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fillStyle = p.color + p.opacity + ")"; ctx.fill(); },
                rate: 3,
            },
            stars: {
                spawn: () => ({
                    x: Math.random() * canvas.width,
                    y: -10,
                    size: 3 + Math.random() * 6,
                    speed: 0.2 + Math.random() * 0.5,
                    opacity: 0.2 + Math.random() * 0.3,
                    rot: Math.random() * Math.PI * 2,
                    rotSpeed: (Math.random() - 0.5) * 0.02,
                }),
                update: (p) => { p.y += p.speed; p.rot += p.rotSpeed; return p.y < canvas.height + 20; },
                draw: (p) => {
                    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
                    ctx.globalAlpha = p.opacity; ctx.fillStyle = "#fbbf24";
                    ctx.beginPath();
                    for (let i = 0; i < 5; i++) { ctx.lineTo(Math.cos((i * 4 * Math.PI) / 5) * p.size, Math.sin((i * 4 * Math.PI) / 5) * p.size); }
                    ctx.closePath(); ctx.fill(); ctx.restore(); ctx.globalAlpha = 1;
                },
                rate: 2,
            },
            confetti: {
                spawn: () => ({
                    x: Math.random() * canvas.width,
                    y: -10,
                    w: 4 + Math.random() * 4, h: 6 + Math.random() * 6,
                    speed: 0.5 + Math.random() * 1.5,
                    drift: (Math.random() - 0.5) * 0.5,
                    rot: Math.random() * Math.PI * 2,
                    rotSpeed: (Math.random() - 0.5) * 0.06,
                    color: `hsl(${Math.random() * 360}, 80%, 60%)`,
                    opacity: 0.5 + Math.random() * 0.4,
                }),
                update: (p) => { p.y += p.speed; p.x += p.drift; p.rot += p.rotSpeed; return p.y < canvas.height + 20; },
                draw: (p) => {
                    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
                    ctx.globalAlpha = p.opacity; ctx.fillStyle = p.color;
                    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
                    ctx.restore(); ctx.globalAlpha = 1;
                },
                rate: 4,
            },
            snow: {
                spawn: () => ({
                    x: Math.random() * canvas.width,
                    y: -10,
                    r: 2 + Math.random() * 4,
                    speed: 0.3 + Math.random() * 0.6,
                    wobble: Math.random() * Math.PI * 2,
                    opacity: 0.3 + Math.random() * 0.4,
                }),
                update: (p) => { p.y += p.speed; p.x += Math.sin(p.wobble += 0.008) * 0.4; return p.y < canvas.height + 20; },
                draw: (p) => { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fillStyle = `rgba(255,255,255,${p.opacity})`; ctx.fill(); },
                rate: 3,
            },
            hearts: {
                spawn: () => ({
                    x: Math.random() * canvas.width,
                    y: canvas.height + 20,
                    size: 6 + Math.random() * 10,
                    speed: 0.3 + Math.random() * 0.6,
                    wobble: Math.random() * Math.PI * 2,
                    opacity: 0.15 + Math.random() * 0.25,
                    color: `hsl(${340 + Math.random() * 30}, 80%, 65%)`,
                }),
                update: (p) => { p.y -= p.speed; p.x += Math.sin(p.wobble += 0.01) * 0.3; return p.y + p.size > -20; },
                draw: (p) => {
                    ctx.save(); ctx.translate(p.x, p.y); ctx.globalAlpha = p.opacity;
                    ctx.fillStyle = p.color; ctx.font = `${p.size * 2}px serif`;
                    ctx.fillText("\u2764", -p.size, p.size);
                    ctx.restore(); ctx.globalAlpha = 1;
                },
                rate: 2,
            },
            leaves: {
                spawn: () => ({
                    x: Math.random() * canvas.width, y: -15,
                    size: 8 + Math.random() * 12, speed: 0.4 + Math.random() * 0.8,
                    drift: (Math.random() - 0.3) * 0.8, rot: Math.random() * Math.PI * 2,
                    rotSpeed: (Math.random() - 0.5) * 0.03,
                    wobble: Math.random() * Math.PI * 2,
                    color: [`#22c55e`,`#16a34a`,`#f97316`,`#dc2626`,`#eab308`][Math.floor(Math.random()*5)],
                    opacity: 0.4 + Math.random() * 0.3,
                }),
                update: (p) => { p.y += p.speed; p.x += p.drift + Math.sin(p.wobble += 0.015) * 0.5; p.rot += p.rotSpeed; return p.y < canvas.height + 20; },
                draw: (p) => {
                    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
                    ctx.globalAlpha = p.opacity; ctx.fillStyle = p.color;
                    ctx.beginPath(); ctx.ellipse(0, 0, p.size / 2, p.size / 4, 0, 0, Math.PI * 2); ctx.fill();
                    ctx.strokeStyle = p.color; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(-p.size/2, 0); ctx.lineTo(p.size/2, 0); ctx.stroke();
                    ctx.restore(); ctx.globalAlpha = 1;
                },
                rate: 2,
            },
            fireflies: {
                spawn: () => ({
                    x: Math.random() * canvas.width, y: Math.random() * canvas.height,
                    r: 2 + Math.random() * 3, phase: Math.random() * Math.PI * 2,
                    dx: (Math.random() - 0.5) * 0.5, dy: (Math.random() - 0.5) * 0.5,
                    life: 200 + Math.random() * 300, age: 0,
                }),
                update: (p) => { p.x += p.dx + Math.sin(p.phase += 0.02) * 0.3; p.y += p.dy + Math.cos(p.phase * 0.7) * 0.3; p.age++; return p.age < p.life; },
                draw: (p) => {
                    const glow = Math.sin(p.age * 0.05) * 0.3 + 0.4;
                    ctx.save(); ctx.globalAlpha = glow;
                    ctx.shadowColor = "#fbbf24"; ctx.shadowBlur = 15;
                    ctx.fillStyle = "#fde68a"; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
                    ctx.restore(); ctx.globalAlpha = 1;
                },
                rate: 1,
            },
            diamonds: {
                spawn: () => ({
                    x: Math.random() * canvas.width, y: -15,
                    size: 5 + Math.random() * 8, speed: 0.3 + Math.random() * 0.5,
                    rot: Math.random() * Math.PI * 2, rotSpeed: (Math.random() - 0.5) * 0.04,
                    color: [`#60a5fa`,`#a78bfa`,`#f472b6`,`#34d399`,`#fbbf24`][Math.floor(Math.random()*5)],
                    opacity: 0.3 + Math.random() * 0.3, sparkle: Math.random() * Math.PI * 2,
                }),
                update: (p) => { p.y += p.speed; p.rot += p.rotSpeed; p.sparkle += 0.08; return p.y < canvas.height + 20; },
                draw: (p) => {
                    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
                    ctx.globalAlpha = p.opacity + Math.sin(p.sparkle) * 0.15;
                    ctx.fillStyle = p.color; ctx.beginPath();
                    ctx.moveTo(0, -p.size); ctx.lineTo(p.size * 0.6, 0); ctx.lineTo(0, p.size); ctx.lineTo(-p.size * 0.6, 0);
                    ctx.closePath(); ctx.fill();
                    ctx.restore(); ctx.globalAlpha = 1;
                },
                rate: 2,
            },
            music: {
                spawn: () => ({
                    x: Math.random() * canvas.width, y: canvas.height + 20,
                    size: 14 + Math.random() * 10, speed: 0.4 + Math.random() * 0.6,
                    wobble: Math.random() * Math.PI * 2,
                    opacity: 0.2 + Math.random() * 0.3,
                    note: ["\u266A","\u266B","\u266C","\u2669"][Math.floor(Math.random()*4)],
                    color: `hsl(${Math.random()*360}, 70%, 60%)`,
                }),
                update: (p) => { p.y -= p.speed; p.x += Math.sin(p.wobble += 0.012) * 0.5; return p.y > -30; },
                draw: (p) => {
                    ctx.save(); ctx.globalAlpha = p.opacity; ctx.fillStyle = p.color;
                    ctx.font = `${p.size}px serif`; ctx.fillText(p.note, p.x, p.y);
                    ctx.restore(); ctx.globalAlpha = 1;
                },
                rate: 2,
            },
            rain: {
                spawn: () => ({
                    x: Math.random() * canvas.width, y: -5,
                    len: 10 + Math.random() * 15, speed: 4 + Math.random() * 6,
                    opacity: 0.15 + Math.random() * 0.2,
                }),
                update: (p) => { p.y += p.speed; p.x -= p.speed * 0.1; return p.y < canvas.height + 20; },
                draw: (p) => {
                    ctx.strokeStyle = `rgba(147,197,253,${p.opacity})`; ctx.lineWidth = 1;
                    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + p.len * 0.1, p.y + p.len); ctx.stroke();
                },
                rate: 15,
            },
            matrix: {
                spawn: () => ({
                    x: Math.floor(Math.random() * (canvas.width / 14)) * 14, y: -14,
                    speed: 2 + Math.random() * 4,
                    char: String.fromCharCode(0x30A0 + Math.random() * 96),
                    opacity: 0.3 + Math.random() * 0.5, changeRate: Math.random(),
                }),
                update: (p) => { p.y += p.speed; if (Math.random() < 0.05) p.char = String.fromCharCode(0x30A0 + Math.random() * 96); return p.y < canvas.height + 20; },
                draw: (p) => {
                    ctx.save(); ctx.globalAlpha = p.opacity; ctx.fillStyle = "#22c55e";
                    ctx.font = "14px monospace"; ctx.fillText(p.char, p.x, p.y);
                    ctx.restore(); ctx.globalAlpha = 1;
                },
                rate: 8,
            },
            sakura: {
                spawn: () => ({
                    x: Math.random() * canvas.width, y: -10,
                    size: 6 + Math.random() * 8, speed: 0.3 + Math.random() * 0.5,
                    drift: 0.2 + Math.random() * 0.4, wobble: Math.random() * Math.PI * 2,
                    rot: Math.random() * Math.PI * 2, rotSpeed: (Math.random() - 0.5) * 0.02,
                    opacity: 0.3 + Math.random() * 0.35,
                    color: [`#fbcfe8`,`#f9a8d4`,`#f472b6`,`#fda4af`][Math.floor(Math.random()*4)],
                }),
                update: (p) => { p.y += p.speed; p.x += p.drift + Math.sin(p.wobble += 0.01) * 0.3; p.rot += p.rotSpeed; return p.y < canvas.height + 20; },
                draw: (p) => {
                    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.globalAlpha = p.opacity;
                    ctx.fillStyle = p.color;
                    for (let i = 0; i < 5; i++) {
                        ctx.beginPath(); ctx.ellipse(0, -p.size/2, p.size/4, p.size/2, 0, 0, Math.PI*2); ctx.fill();
                        ctx.rotate(Math.PI*2/5);
                    }
                    ctx.restore(); ctx.globalAlpha = 1;
                },
                rate: 3,
            },
            lightning: {
                spawn: () => ({
                    x: Math.random() * canvas.width, y: 0,
                    segments: [], opacity: 0.7 + Math.random() * 0.3,
                    life: 8 + Math.floor(Math.random() * 6), age: 0,
                    built: false,
                }),
                update: (p) => {
                    if (!p.built) {
                        let cx = p.x, cy = 0;
                        for (let i = 0; i < 6 + Math.floor(Math.random()*4); i++) {
                            const nx = cx + (Math.random()-0.5) * 60;
                            const ny = cy + 30 + Math.random() * 50;
                            p.segments.push({x1:cx,y1:cy,x2:nx,y2:ny});
                            cx = nx; cy = ny;
                        }
                        p.built = true;
                    }
                    p.age++; return p.age < p.life;
                },
                draw: (p) => {
                    ctx.save(); ctx.globalAlpha = p.opacity * (1 - p.age / p.life);
                    ctx.strokeStyle = "#fef08a"; ctx.lineWidth = 2; ctx.shadowColor = "#fef08a"; ctx.shadowBlur = 10;
                    ctx.beginPath();
                    p.segments.forEach(s => { ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); });
                    ctx.stroke(); ctx.restore(); ctx.globalAlpha = 1;
                },
                rate: 0.3,
            },
            coins: {
                spawn: () => ({
                    x: Math.random() * canvas.width, y: -15,
                    size: 8 + Math.random() * 6, speed: 0.5 + Math.random() * 0.8,
                    wobble: Math.random() * Math.PI * 2, opacity: 0.4 + Math.random() * 0.3,
                    phase: Math.random() * Math.PI * 2,
                }),
                update: (p) => { p.y += p.speed; p.x += Math.sin(p.wobble += 0.01) * 0.3; p.phase += 0.06; return p.y < canvas.height + 20; },
                draw: (p) => {
                    const squeeze = Math.abs(Math.cos(p.phase));
                    ctx.save(); ctx.translate(p.x, p.y); ctx.globalAlpha = p.opacity;
                    ctx.fillStyle = "#fbbf24"; ctx.beginPath(); ctx.ellipse(0, 0, p.size * squeeze, p.size, 0, 0, Math.PI*2); ctx.fill();
                    ctx.fillStyle = "#f59e0b"; ctx.font = `bold ${p.size}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
                    if (squeeze > 0.3) ctx.fillText("$", 0, 1);
                    ctx.restore(); ctx.globalAlpha = 1;
                },
                rate: 2,
            },
            emojis: {
                spawn: () => ({
                    x: Math.random() * canvas.width, y: -20,
                    size: 16 + Math.random() * 14, speed: 0.3 + Math.random() * 0.6,
                    wobble: Math.random() * Math.PI * 2, opacity: 0.3 + Math.random() * 0.3,
                    rot: (Math.random() - 0.5) * 0.5, rotSpeed: (Math.random() - 0.5) * 0.01,
                    emoji: ["\u{1F60A}","\u{1F389}","\u{2B50}","\u{1F525}","\u{1F308}","\u{1F680}","\u{1F381}","\u{1F4A1}","\u{1F3B5}","\u{1F338}","\u{1F98B}","\u{1F30D}"][Math.floor(Math.random()*12)],
                }),
                update: (p) => { p.y += p.speed; p.x += Math.sin(p.wobble += 0.008) * 0.4; p.rot += p.rotSpeed; return p.y < canvas.height + 30; },
                draw: (p) => {
                    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.globalAlpha = p.opacity;
                    ctx.font = `${p.size}px serif`; ctx.fillText(p.emoji, 0, 0);
                    ctx.restore(); ctx.globalAlpha = 1;
                },
                rate: 2,
            },
        };

        let currentAnim = null;
        const startAnim = (name) => {
            if (animId) cancelAnimationFrame(animId);
            animId = null;
            particles = [];
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            currentAnim = ANIMS[name];
            if (!currentAnim) return;
            let frame = 0;
            const loop = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                if (frame++ % Math.max(1, Math.round(60 / currentAnim.rate)) === 0) {
                    particles.push(currentAnim.spawn());
                }
                particles = particles.filter(p => currentAnim.update(p));
                particles.forEach(p => currentAnim.draw(p));
                if (particles.length > 300) particles.splice(0, particles.length - 300);
                animId = requestAnimationFrame(loop);
            };
            loop();
        };

        const savedAnim = localStorage.getItem("appAnim") || "none";
        this.shadowRoot.querySelectorAll(".anim-chip").forEach(chip => {
            if (chip.dataset.anim === savedAnim) chip.classList.add("active");
            chip.onclick = () => {
                this.shadowRoot.querySelectorAll(".anim-chip").forEach(c => c.classList.remove("active"));
                chip.classList.add("active");
                localStorage.setItem("appAnim", chip.dataset.anim);
                startAnim(chip.dataset.anim);
            };
        });
        startAnim(savedAnim);

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
            el.points = this._pointsManager;
            if (s.tag === "vocab-trainer") {
                el._subject = subject;
            }
            this._trainers[subject] = el;
        }

        // For mathe/deutsch, also create a vocab-trainer for custom vocab lists
        if (subject !== "englisch" && !this._trainers[subject + "_vocab"]) {
            const vt = document.createElement("vocab-trainer");
            vt.points = this._pointsManager;
            vt._subject = subject;
            this._trainers[subject + "_vocab"] = vt;
        }

        slot.innerHTML = "";
        slot.appendChild(this._trainers[subject]);
        if (subject !== "englisch") {
            slot.appendChild(this._trainers[subject + "_vocab"]);
        }
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
