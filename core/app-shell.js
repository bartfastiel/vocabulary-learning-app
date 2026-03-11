// core/app-shell.js
//
// Layout: headline on top, below a two-column grid with equal-height
// score and streak boxes.
//

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
        html, :host, body {
          margin: 0; padding: 0; height: 100%; overflow: hidden;
          font-family: "Segoe UI", sans-serif;
          background: #050d1a;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
        }

        /* ── Animated background ── */
        #bg {
          position: fixed; inset: 0; z-index: 0;
          animation: bgShift 14s ease-in-out infinite alternate;
        }
        @keyframes bgShift {
          0%   { background: radial-gradient(ellipse at 20% 30%, #0a1f3a 0%, #050d1a 60%, #020810 100%); }
          50%  { background: radial-gradient(ellipse at 70% 60%, #0d2240 0%, #060f1e 60%, #020810 100%); }
          100% { background: radial-gradient(ellipse at 40% 80%, #091830 0%, #050d1a 60%, #010608 100%); }
        }

        /* Sterne-Partikel */
        #bg::before {
          content: "";
          position: absolute; inset: 0;
          background-image:
            radial-gradient(1px 1px at 10% 15%, rgba(147,210,255,0.7) 0%, transparent 100%),
            radial-gradient(1px 1px at 25% 40%, rgba(100,180,255,0.5) 0%, transparent 100%),
            radial-gradient(1.5px 1.5px at 50% 10%, rgba(180,230,255,0.8) 0%, transparent 100%),
            radial-gradient(1px 1px at 70% 25%, rgba(120,200,255,0.6) 0%, transparent 100%),
            radial-gradient(1px 1px at 85% 55%, rgba(150,220,255,0.5) 0%, transparent 100%),
            radial-gradient(1.5px 1.5px at 35% 70%, rgba(100,180,255,0.7) 0%, transparent 100%),
            radial-gradient(1px 1px at 90% 80%, rgba(170,225,255,0.6) 0%, transparent 100%),
            radial-gradient(1px 1px at 15% 85%, rgba(130,210,255,0.5) 0%, transparent 100%),
            radial-gradient(2px 2px at 60% 50%, rgba(56,189,248,0.4) 0%, transparent 100%),
            radial-gradient(1px 1px at 45% 90%, rgba(100,180,255,0.6) 0%, transparent 100%);
        }

        .orb {
          position: absolute; border-radius: 50%;
          filter: blur(90px); opacity: 0.35;
          animation: float 14s ease-in-out infinite;
        }
        .orb1 { width: 500px; height: 500px; background: #0369a1; top: -180px; left: -150px; animation-duration: 18s; }
        .orb2 { width: 420px; height: 420px; background: #0ea5e9; bottom: -120px; right: -100px; animation-duration: 14s; animation-delay: -5s; }
        .orb3 { width: 320px; height: 320px; background: #1d4ed8; top: 35%; left: 55%; animation-duration: 20s; animation-delay: -9s; }
        .orb4 { width: 250px; height: 250px; background: #38bdf8; top: 15%; right: 15%; animation-duration: 11s; animation-delay: -3s; }
        .orb5 { width: 180px; height: 180px; background: #7dd3fc; bottom: 20%; left: 10%; animation-duration: 16s; animation-delay: -7s; opacity: 0.25; }

        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33%       { transform: translate(35px, -50px) scale(1.1); }
          66%       { transform: translate(-25px, 25px) scale(0.93); }
        }

        /* ── Subject tabs ── */
        .subject-tabs {
          display: flex; gap: 0.5rem; margin-bottom: 0.6rem;
          z-index: 1; position: relative;
        }
        .subject-tab {
          padding: 0.5rem 1.1rem;
          border: 2px solid rgba(56,189,248,0.3);
          border-radius: 12px;
          background: rgba(3,30,60,0.5);
          color: #7dd3fc;
          font-size: 0.95rem; font-weight: bold;
          cursor: pointer;
          transition: all 0.2s;
          backdrop-filter: blur(10px);
        }
        .subject-tab:hover {
          background: rgba(3,60,110,0.7);
          border-color: rgba(56,189,248,0.6);
          transform: translateY(-2px);
        }
        .subject-tab.active {
          background: linear-gradient(135deg, rgba(14,165,233,0.8), rgba(56,189,248,0.8));
          border-color: rgba(56,189,248,0.9);
          color: white;
          box-shadow: 0 0 20px rgba(14,165,233,0.5);
        }
        .trainer-container { display: none; width: 100%; }
        .trainer-container.active { display: block; }

        /* ── Layout ── */
        #quiz-container {
          position: relative; z-index: 1;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
        }

        h1 {
          font-size: 2rem; margin: 0 0 0.6rem 0;
          color: #e0f2fe;
          text-shadow: 0 0 20px rgba(56,189,248,0.9), 0 0 40px rgba(14,165,233,0.7), 0 0 70px rgba(56,189,248,0.4);
          animation: titleGlow 3s ease-in-out infinite alternate;
        }
        @keyframes titleGlow {
          from { text-shadow: 0 0 18px rgba(56,189,248,0.8), 0 0 36px rgba(14,165,233,0.5); }
          to   { text-shadow: 0 0 30px rgba(56,189,248,1), 0 0 60px rgba(14,165,233,0.8), 0 0 100px rgba(125,211,252,0.5); }
        }

        .info-grid {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 0.8rem; width: 100%; max-width: 420px;
        }

        #score, #streak-box {
          display: flex; align-items: center; justify-content: center;
          background: rgba(3,30,60,0.65);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          border: 1px solid rgba(56,189,248,0.35);
          border-radius: 14px;
          padding: 0.6rem 1rem; font-size: 1rem;
          min-height: 2.5rem; box-sizing: border-box;
          white-space: nowrap; color: #bae6fd;
          box-shadow: 0 0 18px rgba(14,165,233,0.25), inset 0 1px 0 rgba(56,189,248,0.2);
        }

        #treasure {
          margin-left: 10px; cursor: pointer;
          transition: transform 0.2s, filter 0.2s, opacity 0.2s;
          animation: treasurePulse 2s ease-in-out infinite;
        }
        @keyframes treasurePulse {
          0%, 100% { filter: drop-shadow(0 0 4px #f59e0b); }
          50%       { filter: drop-shadow(0 0 12px #f59e0b) drop-shadow(0 0 24px #fbbf24); }
        }
        #treasure.disabled {
          cursor: default; opacity: 0.25;
          filter: grayscale(100%); animation: none;
        }
        #treasure:not(.disabled):hover { transform: scale(1.3); }

        #ship { font-size: 1.3rem; margin-left: 0.5rem; }
        .streak-10 #ship { transform: scale(1.3); }
        .streak-15 #ship { transform: scale(1.6) rotate(15deg); }
        .streak-20 #ship { transform: scale(2) rotate(360deg); }
        .streak-broken #ship { animation: shake 0.5s; color: #e53935; }

        @keyframes shake {
          0%   { transform: translateX(0); }
          25%  { transform: translateX(-5px); }
          50%  { transform: translateX(5px); }
          75%  { transform: translateX(-5px); }
          100% { transform: translateX(0); }
        }

        /* ── Buttons ── */
        .top-right-btns {
          position: absolute; top: 10px; right: 12px; z-index: 2;
          display: flex; flex-direction: column; gap: 6px;
        }
        #info-btn, #edit-vocab-btn, #group-btn {
          font-size: 0.95rem;
          background: rgba(3,105,161,0.7);
          backdrop-filter: blur(10px);
          color: #e0f2fe; border: 1px solid rgba(56,189,248,0.45);
          padding: 0.4rem 0.7rem; border-radius: 10px;
          cursor: pointer; white-space: nowrap;
          box-shadow: 0 0 14px rgba(14,165,233,0.4);
          transition: background 0.2s, box-shadow 0.2s, transform 0.15s;
        }
        #info-btn:hover, #edit-vocab-btn:hover, #group-btn:hover {
          background: rgba(2,132,199,0.9);
          box-shadow: 0 0 24px rgba(56,189,248,0.8);
          transform: translateY(-2px);
        }

        /* ── Avatar ── */
        #avatar-btn {
          position: absolute; top: 10px; left: 12px; z-index: 2;
          width: 200px; height: 200px; border-radius: 50%;
          overflow: hidden; cursor: pointer;
          border: 2px solid rgba(56,189,248,0.6);
          box-shadow: 0 0 18px rgba(14,165,233,0.7), 0 0 36px rgba(56,189,248,0.4);
          transition: transform 0.2s, box-shadow 0.2s;
          background: #071a2e;
        }
        #avatar-btn:hover {
          transform: scale(1.1);
          box-shadow: 0 0 28px rgba(56,189,248,1), 0 0 56px rgba(14,165,233,0.7);
        }
        #avatar-mini { width: 100%; height: 100%; }
        #avatar-mini svg { width: 100%; height: 100%; display: block; }

        /* ── Profilwechsler unter Avatar ── */
        #profile-switcher {
          position: absolute; top: 214px; left: 12px; z-index: 2;
          width: 200px; text-align: center; cursor: pointer;
          color: #7dd3fc; font-size: 0.75rem;
          background: rgba(3,20,45,0.7);
          border: 1px solid rgba(56,189,248,0.3);
          border-radius: 0 0 12px 12px;
          padding: 0.22rem 0.5rem;
          transition: background 0.2s, color 0.2s;
        }
        #profile-switcher:hover { background: rgba(3,60,110,0.85); color: #e0f2fe; }

        /* ── Profilauswahl Overlay ── */
        #profile-overlay {
          position: fixed; inset: 0; z-index: 9998;
          background: rgba(0,5,15,0.96);
          backdrop-filter: blur(18px);
          display: flex; align-items: center; justify-content: center;
        }
        #profile-overlay.hidden { display: none; }
        #profile-box {
          background: rgba(4,20,45,0.92);
          border: 1px solid rgba(56,189,248,0.35);
          border-radius: 22px;
          box-shadow: 0 0 60px rgba(14,165,233,0.3);
          padding: 1.8rem 1.5rem;
          width: min(480px, 94vw); max-height: 90vh;
          overflow-y: auto;
          display: flex; flex-direction: column; gap: 1.2rem; align-items: center;
        }
        #profile-box h2 {
          margin: 0; font-size: 1.4rem; color: #e0f2fe;
          text-shadow: 0 0 20px rgba(56,189,248,0.8);
        }
        #profile-grid {
          display: flex; flex-wrap: wrap; gap: 0.8rem;
          justify-content: center; width: 100%;
        }
        .profile-card {
          display: flex; flex-direction: column; align-items: center; gap: 0.45rem;
          padding: 0.75rem 0.6rem; border-radius: 14px; cursor: pointer;
          border: 2px solid rgba(56,189,248,0.25);
          background: rgba(3,30,60,0.55);
          transition: all 0.2s; position: relative; width: 90px;
        }
        .profile-card:hover {
          border-color: rgba(56,189,248,0.75);
          transform: translateY(-3px);
          box-shadow: 0 0 20px rgba(56,189,248,0.35);
        }
        .profile-avatar-wrap {
          width: 60px; height: 60px; border-radius: 50%;
          overflow: hidden; border: 2px solid rgba(56,189,248,0.4);
          background: #071a2e;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.6rem;
        }
        .profile-avatar-wrap svg { width: 100%; height: 100%; display: block; }
        .profile-card-name {
          font-size: 0.8rem; color: #bae6fd; text-align: center;
          max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .profile-del-btn {
          position: absolute; top: 3px; right: 3px;
          width: 18px; height: 18px; border-radius: 50%;
          background: rgba(200,40,40,0.8); color: white;
          border: none; cursor: pointer; font-size: 0.6rem;
          opacity: 0; transition: opacity 0.2s;
          display: flex; align-items: center; justify-content: center;
        }
        .profile-card:hover .profile-del-btn { opacity: 1; }
        #btn-new-profile {
          width: 100%; padding: 0.7rem; border: 2px dashed rgba(56,189,248,0.4);
          border-radius: 12px; background: transparent; color: #7dd3fc;
          font-size: 1rem; cursor: pointer; transition: all 0.2s;
        }
        #btn-new-profile:hover {
          background: rgba(14,165,233,0.15); border-color: rgba(56,189,248,0.8);
          color: #e0f2fe;
        }
        /* New profile form */
        #profile-new-view { display: flex; flex-direction: column; gap: 1rem; align-items: center; width: 100%; }
        #input-profile-name {
          width: 100%; padding: 0.7rem 1rem;
          background: rgba(3,30,60,0.8); border: 2px solid rgba(56,189,248,0.4);
          border-radius: 10px; color: #e0f2fe; font-size: 1.1rem; outline: none;
          text-align: center;
        }
        #input-profile-name:focus { border-color: rgba(56,189,248,0.9); }
        #input-profile-name::placeholder { color: rgba(186,230,253,0.4); }
        .profile-form-btns { display: flex; gap: 0.7rem; width: 100%; }
        #btn-profile-cancel {
          flex: 1; padding: 0.65rem; background: transparent;
          border: 1px solid rgba(56,189,248,0.3); border-radius: 10px;
          color: #7dd3fc; cursor: pointer; font-size: 0.9rem; transition: all 0.2s;
        }
        #btn-profile-cancel:hover { background: rgba(56,189,248,0.1); }
        #btn-profile-create {
          flex: 2; padding: 0.65rem;
          background: linear-gradient(135deg, rgba(14,165,233,0.9), rgba(56,189,248,0.9));
          border: none; border-radius: 10px; color: white;
          font-size: 1rem; font-weight: bold; cursor: pointer; transition: filter 0.2s;
        }
        #btn-profile-create:hover { filter: brightness(1.1); }

        /* ── Rollenauswahl ── */
        #role-overlay {
          position: fixed; inset: 0; z-index: 9999;
          background: rgba(0,5,15,0.95);
          backdrop-filter: blur(16px);
          display: flex; align-items: center; justify-content: center;
        }
        #role-overlay.hidden { display: none; }
        #role-box {
          display: flex; flex-direction: column; align-items: center; gap: 1.6rem;
          padding: 2.5rem 2rem;
          background: rgba(4,20,45,0.9);
          border: 1px solid rgba(56,189,248,0.35);
          border-radius: 22px;
          box-shadow: 0 0 50px rgba(14,165,233,0.3);
          max-width: 360px; width: 90vw;
        }
        #role-box h2 {
          margin: 0; font-size: 1.5rem; color: #e0f2fe;
          text-align: center;
          text-shadow: 0 0 20px rgba(56,189,248,0.8);
        }
        #role-box p {
          margin: 0; font-size: 0.95rem; color: #7dd3fc;
          text-align: center; line-height: 1.5;
        }
        .role-btns { display: flex; gap: 1rem; width: 100%; }
        .role-btn {
          flex: 1; padding: 1rem 0.5rem;
          border: 2px solid rgba(56,189,248,0.4);
          border-radius: 14px; cursor: pointer;
          background: rgba(3,60,110,0.6);
          color: #bae6fd; font-size: 1rem; font-weight: bold;
          display: flex; flex-direction: column; align-items: center; gap: 0.5rem;
          transition: background 0.2s, border-color 0.2s, transform 0.15s, box-shadow 0.2s;
        }
        .role-btn:hover {
          background: rgba(3,105,161,0.8);
          border-color: rgba(56,189,248,0.8);
          transform: translateY(-3px);
          box-shadow: 0 0 24px rgba(56,189,248,0.5);
        }
        .role-btn .role-icon { font-size: 2.5rem; }
        .role-btn .role-sub { font-size: 0.75rem; color: #7dd3fc; font-weight: normal; }

        /* ── Background theme overrides ── */
        /* ocean */
        #bg[data-theme="ocean"] { animation-name: bgShift-ocean; }
        #bg[data-theme="ocean"] .orb1 { background: #0e7490; }
        #bg[data-theme="ocean"] .orb2 { background: #06b6d4; }
        #bg[data-theme="ocean"] .orb3 { background: #0891b2; }
        #bg[data-theme="ocean"] .orb4 { background: #67e8f9; }
        #bg[data-theme="ocean"] .orb5 { background: #a5f3fc; }
        @keyframes bgShift-ocean {
          0%   { background: radial-gradient(ellipse at 20% 30%, #083344 0%, #021a22 60%, #01080f 100%); }
          50%  { background: radial-gradient(ellipse at 70% 60%, #0d3a4a 0%, #031f2a 60%, #01080f 100%); }
          100% { background: radial-gradient(ellipse at 40% 80%, #052535 0%, #021a22 60%, #010810 100%); }
        }

        /* purple */
        #bg[data-theme="purple"] { animation-name: bgShift-purple; }
        #bg[data-theme="purple"] .orb1 { background: #7c3aed; }
        #bg[data-theme="purple"] .orb2 { background: #a855f7; }
        #bg[data-theme="purple"] .orb3 { background: #6d28d9; }
        #bg[data-theme="purple"] .orb4 { background: #c084fc; }
        #bg[data-theme="purple"] .orb5 { background: #e879f9; }
        @keyframes bgShift-purple {
          0%   { background: radial-gradient(ellipse at 20% 30%, #1e0838 0%, #0f0520 60%, #060210 100%); }
          50%  { background: radial-gradient(ellipse at 70% 60%, #250a45 0%, #130628 60%, #060210 100%); }
          100% { background: radial-gradient(ellipse at 40% 80%, #180630 0%, #0f0520 60%, #040108 100%); }
        }

        /* forest */
        #bg[data-theme="forest"] { animation-name: bgShift-forest; }
        #bg[data-theme="forest"] .orb1 { background: #166534; }
        #bg[data-theme="forest"] .orb2 { background: #22c55e; }
        #bg[data-theme="forest"] .orb3 { background: #15803d; }
        #bg[data-theme="forest"] .orb4 { background: #4ade80; }
        #bg[data-theme="forest"] .orb5 { background: #86efac; }
        @keyframes bgShift-forest {
          0%   { background: radial-gradient(ellipse at 20% 30%, #0a2e10 0%, #041505 60%, #010c02 100%); }
          50%  { background: radial-gradient(ellipse at 70% 60%, #0d3512 0%, #051a06 60%, #010c02 100%); }
          100% { background: radial-gradient(ellipse at 40% 80%, #08220c 0%, #041505 60%, #010802 100%); }
        }

        /* sunset */
        #bg[data-theme="sunset"] { animation-name: bgShift-sunset; }
        #bg[data-theme="sunset"] .orb1 { background: #c2410c; }
        #bg[data-theme="sunset"] .orb2 { background: #f97316; }
        #bg[data-theme="sunset"] .orb3 { background: #b91c1c; }
        #bg[data-theme="sunset"] .orb4 { background: #fb923c; }
        #bg[data-theme="sunset"] .orb5 { background: #fcd34d; }
        @keyframes bgShift-sunset {
          0%   { background: radial-gradient(ellipse at 20% 30%, #2e1008 0%, #1a0805 60%, #0c0302 100%); }
          50%  { background: radial-gradient(ellipse at 70% 60%, #381208 0%, #200a04 60%, #0c0302 100%); }
          100% { background: radial-gradient(ellipse at 40% 80%, #250e06 0%, #1a0805 60%, #080201 100%); }
        }

        /* rose */
        #bg[data-theme="rose"] { animation-name: bgShift-rose; }
        #bg[data-theme="rose"] .orb1 { background: #be185d; }
        #bg[data-theme="rose"] .orb2 { background: #ec4899; }
        #bg[data-theme="rose"] .orb3 { background: #9d174d; }
        #bg[data-theme="rose"] .orb4 { background: #f472b6; }
        #bg[data-theme="rose"] .orb5 { background: #f9a8d4; }
        @keyframes bgShift-rose {
          0%   { background: radial-gradient(ellipse at 20% 30%, #2e0818 0%, #1a0510 60%, #0c0208 100%); }
          50%  { background: radial-gradient(ellipse at 70% 60%, #38091e 0%, #200610 60%, #0c0208 100%); }
          100% { background: radial-gradient(ellipse at 40% 80%, #250614 0%, #1a0510 60%, #080206 100%); }
        }

        /* gold */
        #bg[data-theme="gold"] { animation-name: bgShift-gold; }
        #bg[data-theme="gold"] .orb1 { background: #b45309; }
        #bg[data-theme="gold"] .orb2 { background: #eab308; }
        #bg[data-theme="gold"] .orb3 { background: #92400e; }
        #bg[data-theme="gold"] .orb4 { background: #fbbf24; }
        #bg[data-theme="gold"] .orb5 { background: #fde68a; }
        @keyframes bgShift-gold {
          0%   { background: radial-gradient(ellipse at 20% 30%, #2a1a00 0%, #1a1000 60%, #0c0800 100%); }
          50%  { background: radial-gradient(ellipse at 70% 60%, #331f00 0%, #201400 60%, #0c0800 100%); }
          100% { background: radial-gradient(ellipse at 40% 80%, #221500 0%, #1a1000 60%, #080600 100%); }
        }

        /* ice */
        #bg[data-theme="ice"] { animation-name: bgShift-ice; }
        #bg[data-theme="ice"] .orb1 { background: #60a5fa; }
        #bg[data-theme="ice"] .orb2 { background: #93c5fd; }
        #bg[data-theme="ice"] .orb3 { background: #3b82f6; }
        #bg[data-theme="ice"] .orb4 { background: #bfdbfe; }
        #bg[data-theme="ice"] .orb5 { background: #dbeafe; }
        @keyframes bgShift-ice {
          0%   { background: radial-gradient(ellipse at 20% 30%, #c8dff8 0%, #dbeafe 60%, #eff6ff 100%); }
          50%  { background: radial-gradient(ellipse at 70% 60%, #bdd7f7 0%, #dbeafe 60%, #eff6ff 100%); }
          100% { background: radial-gradient(ellipse at 40% 80%, #cae3fc 0%, #dbeafe 60%, #f0f8ff 100%); }
        }

      </style>

      <!-- Profilauswahl -->
      <div id="profile-overlay" class="hidden">
        <div id="profile-box">
          <div id="profile-pick-view">
            <h2>👤 Wer spielt?</h2>
            <div id="profile-grid"></div>
            <button id="btn-new-profile">+ Neues Profil erstellen</button>
          </div>
          <div id="profile-new-view" hidden>
            <h2>✨ Neues Profil</h2>
            <input id="input-profile-name" type="text" placeholder="Dein Name..."
                   autocomplete="off" autocorrect="off" spellcheck="false"/>
            <div class="profile-form-btns">
              <button id="btn-profile-cancel">← Zurück</button>
              <button id="btn-profile-create">Erstellen ✓</button>
            </div>
          </div>
        </div>
      </div>

      <div id="role-overlay" class="hidden">
        <div id="role-box">
          <h2>🎓 Wer bist du?</h2>
          <p>Wähle deine Rolle – sie bestimmt was du siehst.</p>
          <div class="role-btns">
            <button class="role-btn" data-role="student">
              <span class="role-icon">🎒</span>
              <span>Schüler</span>
            </button>
            <button class="role-btn" data-role="teacher">
              <span class="role-icon">👩‍🏫</span>
              <span>Lehrer</span>
            </button>
            <button class="role-btn" data-role="developer">
              <span class="role-icon">💻</span>
              <span>Entwickler</span>
            </button>
          </div>
        </div>
      </div>

      <div id="bg">
        <div class="orb orb1"></div>
        <div class="orb orb2"></div>
        <div class="orb orb3"></div>
        <div class="orb orb4"></div>
        <div class="orb orb5"></div>
      </div>

      <div class="top-right-btns">
        <button id="info-btn">ⓘ Hilfe</button>
        <button id="edit-vocab-btn">✏️ Vokabeln</button>
        <button id="group-btn">👥 Gruppen</button>
      </div>
      <div id="avatar-btn" title="Avatar bearbeiten">
        <div id="avatar-mini"></div>
      </div>
      <div id="profile-switcher" title="Profil wechseln">
        <span id="profile-switcher-name">–</span> ▾
      </div>
      <vocab-help></vocab-help>
      <avatar-builder></avatar-builder>
      <vocab-editor></vocab-editor>
      <group-board></group-board>

      <div id="quiz-container">
        <h1>🎓 Lerntrainer</h1>

        <div class="info-grid">
          <div id="score">
            Punkte: <span id="points">0</span>
            <span id="treasure" title="Fun-Spiele">🎮</span>
          </div>

          <div id="streak-box">
            Streak: <span id="streak">0</span>&nbsp;
            Rekord: <span id="streak-record">0</span>
            <span id="ship">🚀</span>
          </div>
        </div>

        <div class="subject-tabs">
          <button class="subject-tab active" data-subject="englisch">🇬🇧 Englisch</button>
          <button class="subject-tab" data-subject="mathe">🔢 Mathe</button>
          <button class="subject-tab" data-subject="deutsch">📖 Deutsch</button>
        </div>

        <div class="trainer-container active" data-subject="englisch">
          <vocab-trainer></vocab-trainer>
        </div>
        <div class="trainer-container" data-subject="mathe">
          <math-trainer></math-trainer>
        </div>
        <div class="trainer-container" data-subject="deutsch">
          <deutsch-trainer></deutsch-trainer>
        </div>
      </div>

      <game-lobby></game-lobby>
    `;

        this._startup();
    }

    // ── Startup: profile selection → role selection → app ─────────────────────

    _startup() {
        const profiles = getProfiles();
        const activeId = getActiveId();
        const active   = profiles.find(p => p.id === activeId);

        if (profiles.length === 0) {
            // First launch — show new-profile form directly
            this._showProfileOverlay(true);
        } else if (!active) {
            // Profiles exist but none selected — show picker
            this._showProfileOverlay(false);
        } else {
            // Already have an active profile — load it and start
            activateProfile(activeId);
            this.init();
        }
    }

    _showProfileOverlay(forceNew = false) {
        const overlay   = this.shadowRoot.getElementById("profile-overlay");
        const pickView  = this.shadowRoot.getElementById("profile-pick-view");
        const newView   = this.shadowRoot.getElementById("profile-new-view");
        const grid      = this.shadowRoot.getElementById("profile-grid");
        const nameInput = this.shadowRoot.getElementById("input-profile-name");

        const showPick = () => {
            pickView.hidden = false;
            newView.hidden  = true;
            this._renderProfileGrid(grid, (id) => {
                activateProfile(id);
                overlay.classList.add("hidden");
                this.init();
            });
        };

        const showNew = () => {
            pickView.hidden = true;
            newView.hidden  = false;
            nameInput.value = "";
            setTimeout(() => nameInput.focus(), 50);
        };

        overlay.classList.remove("hidden");
        if (forceNew) showNew(); else showPick();

        this.shadowRoot.getElementById("btn-new-profile").onclick  = () => showNew();
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
                    if (confirm(`Profil „${p.name}" wirklich löschen?`)) {
                        deleteProfile(p.id);
                        this._renderProfileGrid(grid, onPick);
                    }
                };
            }
            grid.appendChild(card);
        });
    }

    // ── Background theme ──────────────────────────────────────────────────────

    _applyBgTheme(key) {
        const bg = this.shadowRoot.getElementById("bg");
        if (!bg) return;
        if (!key || key === "dark") {
            bg.removeAttribute("data-theme");
        } else {
            bg.setAttribute("data-theme", key);
        }
    }

    // ── App init (called only after a profile is active) ──────────────────────

    init() {
        const treasureEl = this.shadowRoot.getElementById("treasure");
        const pointsManager = new PointsManager(this.shadowRoot);

        const help = this.shadowRoot.querySelector("vocab-help");

        // ── Rollenauswahl ──
        const roleOverlay = this.shadowRoot.getElementById("role-overlay");
        const savedRole   = localStorage.getItem("userRole");
        const applyRole = (role) => {
            const isFirst = !localStorage.getItem("userRole");
            localStorage.setItem("userRole", role);
            roleOverlay.classList.add("hidden");
            treasureEl.style.display = role === "teacher" ? "none" : "";
            // Hilfe starten wenn Rolle zum ersten Mal gewählt wird
            if (isFirst && !localStorage.getItem("vocabHelpSeen")) {
                setTimeout(() => this.startHelp(help), 500);
            }
        };
        if (savedRole) {
            applyRole(savedRole);
        } else {
            roleOverlay.classList.remove("hidden");
        }
        roleOverlay.querySelectorAll(".role-btn").forEach(btn => {
            btn.onclick = () => applyRole(btn.dataset.role);
        });

        // Connect trainers with points manager
        const trainer = this.shadowRoot.querySelector("vocab-trainer");
        trainer.points = pointsManager;

        const mathTrainer = this.shadowRoot.querySelector("math-trainer");
        mathTrainer.points = pointsManager;

        const deutschTrainer = this.shadowRoot.querySelector("deutsch-trainer");
        deutschTrainer.points = pointsManager;

        // Subject tabs
        const tabs = this.shadowRoot.querySelectorAll(".subject-tab");
        const containers = this.shadowRoot.querySelectorAll(".trainer-container");
        tabs.forEach(tab => {
            tab.onclick = () => {
                const subj = tab.dataset.subject;
                tabs.forEach(t => t.classList.toggle("active", t === tab));
                containers.forEach(c => c.classList.toggle("active", c.dataset.subject === subj));
            };
        });

        // Connect game lobby with points manager
        const gameLobby = this.shadowRoot.querySelector("game-lobby");
        gameLobby.pointsManager = pointsManager;

        treasureEl.addEventListener("click", () => {
            if (treasureEl.classList.contains("disabled")) return;
            gameLobby.open();
        });

        // App background theme
        this._applyBgTheme(localStorage.getItem("appBg") || "dark");
        this.shadowRoot.addEventListener("bg-changed", e => {
            this._applyBgTheme(e.detail.theme);
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
        this.shadowRoot.addEventListener("show-role-select", () => {
            roleOverlay.classList.remove("hidden");
        });

        // Profile switcher under avatar
        const profile = getActiveProfile();
        const switcherName = this.shadowRoot.getElementById("profile-switcher-name");
        if (switcherName && profile) switcherName.textContent = profile.name;
        this.shadowRoot.getElementById("profile-switcher").onclick = () => {
            saveSnapshot();
            // Reshow profile picker (wired to reload when new profile picked)
            const overlay = this.shadowRoot.getElementById("profile-overlay");
            const grid    = this.shadowRoot.getElementById("profile-grid");
            this.shadowRoot.getElementById("profile-pick-view").hidden = false;
            this.shadowRoot.getElementById("profile-new-view").hidden  = true;
            this._renderProfileGrid(grid, (id) => {
                activateProfile(id);
                location.reload();
            });
            overlay.classList.remove("hidden");
        };

        // Save snapshot on page unload
        window.addEventListener("beforeunload", () => saveSnapshot());

        // Group board
        const groupBoard = this.shadowRoot.querySelector("group-board");
        this.shadowRoot.getElementById("group-btn").onclick = () => groupBoard.open();

        // Vocab editor
        const vocabEditor = this.shadowRoot.querySelector("vocab-editor");
        this.shadowRoot.getElementById("edit-vocab-btn").onclick = () => vocabEditor.open();
        vocabEditor.onSaved = () => {
            trainer.reload();
            trainer.togglePopup(true);
        };
        vocabEditor.addEventListener("vocab-updated", () => trainer.reload());

        const infoBtn = this.shadowRoot.getElementById("info-btn");
        infoBtn.onclick = () => this.startHelp(help);

        // Hilfe beim ersten Start (wenn Rolle schon gesetzt war, z.B. nach Reload)
        if (savedRole && !localStorage.getItem("vocabHelpSeen")) {
            setTimeout(() => this.startHelp(help), 500);
        }
    }

    async startHelp(help) {

        // Warten bis vocab-trainer im Shadow DOM sichtbar ist
        const trainer = await this.waitFor(() =>
            this.shadowRoot.querySelector("vocab-trainer")
        );
        if (!trainer) return console.warn("Tutorial: Kein vocab-trainer gefunden");

        // Warten bis ShadowRoot existiert
        await this.waitFor(() => trainer.shadowRoot);

        // jetzt im inneren Shadow warten:
        await this.waitFor(() => trainer.shadowRoot.querySelector(".lesson-header"));
        await this.waitFor(() => trainer.shadowRoot.querySelector("#question"));
        await this.waitFor(() => trainer.shadowRoot.querySelector("#answer"));

        help.start([
            {
                selector: () =>
                    trainer.shadowRoot.querySelector(".lesson-header"),
                text: "Hier kannst du die Lesson auswählen."
            },
            {
                selector: () =>
                    trainer.shadowRoot.querySelector("#question"),
                text: "Hier steht die Aufgabe."
            },
            {
                selector: () =>
                    trainer.shadowRoot.querySelector("#answer"),
                text: "Hier gibst du deine Antwort ein."
            },
            {
                selector: () => this.shadowRoot.querySelector("#treasure"),
                text: "Hier findest du den Taler. Sobald du 5 Punkte hast, kannst du damit das Spiel starten!"
            },
        ]);
    }

    waitFor(fn, interval = 50, timeout = 2000) {
        return new Promise(resolve => {
            const start = performance.now();
            const tick = () => {
                const result = fn();
                console.log("waitFor tick:", result);
                if (result) return resolve(result);
                if (performance.now() - start > timeout) return resolve(null);
                setTimeout(tick, interval);
            };
            tick();
        });
    }
}

customElements.define("app-shell", AppShell);
