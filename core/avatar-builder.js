// core/avatar-builder.js
//
// Avatar builder as a native Web Component.
// All artwork is inline SVG — no external asset files required.
// Options with cost:1 are premium and must be unlocked with 1 Taler.
// Unlocked items are stored in localStorage["avatarUnlocked"].
// Exposes open() / close() methods and fires "avatar-saved" on save.
// Also exports getAvatarSVG() for use in other components.
// Set avatarBuilder.pointsManager = pointsManager to enable unlocking.

const LS_KEY   = "avatarSelection";
const LS_UNLOCK = "avatarUnlocked";

// ─── artwork ──────────────────────────────────────────────────────────────────
// Canvas: 200×200.  Face oval: cx=100 cy=120 rx=54 ry=60 (top≈60, bottom≈180).
// Layer order (bottom→top): background, face, hair, eyebrows, eyes, mouth, glasses, accessory.

const LAYERS = {
    background: [
        { label: "Blau",        svg: `<rect width="200" height="200" fill="#7EC8E3"/>` },
        { label: "Grün",        svg: `<rect width="200" height="200" fill="#98D982"/>` },
        { label: "Lila",        svg: `<rect width="200" height="200" fill="#C9A0DC"/>` },
        { label: "Rosa",        svg: `<rect width="200" height="200" fill="#FFB7C5"/>` },
        { label: "Gelb",        svg: `<rect width="200" height="200" fill="#FFD580"/>` },
        { label: "Orange",      svg: `<rect width="200" height="200" fill="#FFB347"/>` },
        { label: "Nacht",       svg: `<rect width="200" height="200" fill="#0D1B2A"/>
          <circle cx="20" cy="15" r="1.5" fill="white"/><circle cx="55" cy="30" r="1" fill="white"/>
          <circle cx="85" cy="10" r="2" fill="white"/><circle cx="125" cy="25" r="1.5" fill="white"/>
          <circle cx="165" cy="12" r="1" fill="white"/><circle cx="35" cy="55" r="1" fill="white"/>
          <circle cx="175" cy="45" r="1.5" fill="white"/><circle cx="105" cy="42" r="1" fill="white"/>
          <circle cx="148" cy="60" r="2" fill="white"/><circle cx="15" cy="80" r="1" fill="white"/>
          <path d="M155,22 C155,14 161,10 167,14 C163,10 163,20 159,24Z" fill="#FFFACD"/>` },
        { label: "Regenbogen",  svg: `<rect width="200" height="200" fill="white"/>
          <rect width="200" height="30" y="0"   fill="#FF6B6B" opacity="0.75"/>
          <rect width="200" height="28" y="30"  fill="#FF9F43" opacity="0.75"/>
          <rect width="200" height="28" y="58"  fill="#FFE66D" opacity="0.75"/>
          <rect width="200" height="28" y="86"  fill="#6BCB77" opacity="0.75"/>
          <rect width="200" height="28" y="114" fill="#74B9FF" opacity="0.75"/>
          <rect width="200" height="28" y="142" fill="#A29BFE" opacity="0.75"/>
          <rect width="200" height="30" y="170" fill="#FD79A8" opacity="0.75"/>` },
        { label: "Sonnenunt.",  svg: `<rect width="200" height="200" fill="#1A1A3E"/>
          <rect width="200" height="90" y="0"  fill="#FF6348" opacity="0.55"/>
          <rect width="200" height="60" y="60" fill="#FF4757" opacity="0.4"/>
          <rect width="200" height="70" y="120" fill="#2C3E6E" opacity="0.8"/>
          <circle cx="100" cy="130" r="38" fill="#FFD700" opacity="0.85"/>
          <rect width="200" height="30" y="130" fill="#2C3E6E"/>` },
        { label: "Ozean",       svg: `<rect width="200" height="200" fill="#B3E5FC"/>
          <rect width="200" height="80" y="120" fill="#0288D1"/>
          <path d="M0,120 Q25,112 50,120 Q75,128 100,120 Q125,112 150,120 Q175,128 200,120" fill="none" stroke="white" stroke-width="3" opacity="0.5"/>
          <path d="M0,135 Q30,127 60,135 Q90,143 120,135 Q150,127 180,135 Q190,139 200,135" fill="none" stroke="white" stroke-width="2" opacity="0.4"/>` },
        { label: "Konfetti",    svg: `<rect width="200" height="200" fill="#FAFAFA"/>
          <rect x="20" y="15" width="12" height="6" rx="2" fill="#FF6B6B" transform="rotate(30,26,18)"/>
          <rect x="80" y="25" width="10" height="5" rx="2" fill="#4ECDC4" transform="rotate(-20,85,27)"/>
          <rect x="145" y="10" width="12" height="6" rx="2" fill="#FFE66D" transform="rotate(45,151,13)"/>
          <rect x="50" y="60" width="8" height="5" rx="2" fill="#A29BFE" transform="rotate(15,54,62)"/>
          <rect x="125" y="55" width="12" height="6" rx="2" fill="#FF6B6B" transform="rotate(-35,131,58)"/>
          <rect x="170" y="70" width="10" height="5" rx="2" fill="#4ECDC4" transform="rotate(60,175,72)"/>
          <rect x="10" y="100" width="12" height="6" rx="2" fill="#FFE66D" transform="rotate(25,16,103)"/>
          <rect x="90" y="110" width="8" height="5" rx="2" fill="#A29BFE" transform="rotate(-45,94,112)"/>
          <circle cx="60" cy="145" r="5" fill="#FF6B6B"/><circle cx="150" cy="130" r="4" fill="#4ECDC4"/>
          <circle cx="25" cy="180" r="5" fill="#FFE66D"/><circle cx="185" cy="175" r="4" fill="#A29BFE"/>` },
        { label: "Kacheln",     svg: `<rect width="200" height="200" fill="#EDE7F6"/>
          <rect x="2"   y="2"   width="46" height="46" rx="6" fill="#D1C4E9"/>
          <rect x="54"  y="2"   width="46" height="46" rx="6" fill="#D1C4E9"/>
          <rect x="106" y="2"   width="46" height="46" rx="6" fill="#D1C4E9"/>
          <rect x="28"  y="54"  width="46" height="46" rx="6" fill="#B39DDB"/>
          <rect x="80"  y="54"  width="46" height="46" rx="6" fill="#B39DDB"/>
          <rect x="132" y="54"  width="46" height="46" rx="6" fill="#B39DDB"/>
          <rect x="2"   y="106" width="46" height="46" rx="6" fill="#D1C4E9"/>
          <rect x="54"  y="106" width="46" height="46" rx="6" fill="#D1C4E9"/>
          <rect x="106" y="106" width="46" height="46" rx="6" fill="#D1C4E9"/>
          <rect x="28"  y="158" width="46" height="40" rx="6" fill="#B39DDB"/>
          <rect x="80"  y="158" width="46" height="40" rx="6" fill="#B39DDB"/>
          <rect x="132" y="158" width="46" height="40" rx="6" fill="#B39DDB"/>` },
        { label: "Punkte",      svg: `<rect width="200" height="200" fill="#E8F4F8"/>
          <circle cx="20" cy="20" r="6" fill="#B0D4E8"/><circle cx="60" cy="20" r="6" fill="#B0D4E8"/>
          <circle cx="100" cy="20" r="6" fill="#B0D4E8"/><circle cx="140" cy="20" r="6" fill="#B0D4E8"/>
          <circle cx="180" cy="20" r="6" fill="#B0D4E8"/><circle cx="40" cy="55" r="6" fill="#B0D4E8"/>
          <circle cx="80" cy="55" r="6" fill="#B0D4E8"/><circle cx="120" cy="55" r="6" fill="#B0D4E8"/>
          <circle cx="160" cy="55" r="6" fill="#B0D4E8"/><circle cx="20" cy="90" r="6" fill="#B0D4E8"/>
          <circle cx="60" cy="90" r="6" fill="#B0D4E8"/><circle cx="100" cy="90" r="6" fill="#B0D4E8"/>
          <circle cx="140" cy="90" r="6" fill="#B0D4E8"/><circle cx="180" cy="90" r="6" fill="#B0D4E8"/>
          <circle cx="40" cy="125" r="6" fill="#B0D4E8"/><circle cx="80" cy="125" r="6" fill="#B0D4E8"/>
          <circle cx="120" cy="125" r="6" fill="#B0D4E8"/><circle cx="160" cy="125" r="6" fill="#B0D4E8"/>` },
        { label: "Streifen",    svg: `<rect width="200" height="200" fill="#FFF5E6"/>
          <rect x="0" y="0"   width="200" height="26" fill="#FFE4B5" opacity="0.7"/>
          <rect x="0" y="52"  width="200" height="26" fill="#FFE4B5" opacity="0.7"/>
          <rect x="0" y="104" width="200" height="26" fill="#FFE4B5" opacity="0.7"/>
          <rect x="0" y="156" width="200" height="26" fill="#FFE4B5" opacity="0.7"/>` },
        { label: "Wald",        svg: `<rect width="200" height="200" fill="#E8F5E9"/>
          <polygon points="10,160 40,90 70,160"   fill="#2E7D32"/>
          <polygon points="45,160 75,80 105,160"  fill="#388E3C"/>
          <polygon points="95,160 125,85 155,160" fill="#2E7D32"/>
          <polygon points="140,160 165,78 190,160" fill="#43A047"/>
          <rect x="27" y="155" width="14" height="30" fill="#5D4037"/>
          <rect x="62" y="155" width="14" height="30" fill="#795548"/>
          <rect x="112" y="155" width="14" height="30" fill="#5D4037"/>
          <rect x="155" y="155" width="14" height="30" fill="#795548"/>` },
        { label: "Galaxie",     svg: `<rect width="200" height="200" fill="#0A0015"/>
          <circle cx="100" cy="100" r="80" fill="#1A0030" opacity="0.8"/>
          <circle cx="100" cy="100" r="50" fill="#2D0050" opacity="0.6"/>
          <circle cx="20" cy="20" r="1" fill="white"/><circle cx="40" cy="10" r="1.5" fill="white"/>
          <circle cx="70" cy="5" r="1" fill="white"/><circle cx="110" cy="8" r="1" fill="white"/>
          <circle cx="155" cy="15" r="1.5" fill="white"/><circle cx="185" cy="5" r="1" fill="white"/>
          <circle cx="190" cy="40" r="1" fill="white"/><circle cx="8" cy="60" r="1.5" fill="white"/>
          <circle cx="100" cy="100" r="6" fill="#FF69B4" opacity="0.7"/>
          <circle cx="100" cy="100" r="3" fill="white" opacity="0.9"/>` },
        // ── PREMIUM ──
        { label: "⭐ Feuerwerk", cost: 1, svg: `<rect width="200" height="200" fill="#07001A"/>
          <line x1="60" y1="80" x2="60" y2="50" stroke="#FFD700" stroke-width="2"/>
          <line x1="60" y1="80" x2="42" y2="66" stroke="#FFD700" stroke-width="2"/>
          <line x1="60" y1="80" x2="78" y2="66" stroke="#FFD700" stroke-width="2"/>
          <line x1="60" y1="80" x2="46" y2="95" stroke="#FF6B6B" stroke-width="2"/>
          <line x1="60" y1="80" x2="74" y2="95" stroke="#FF6B6B" stroke-width="2"/>
          <circle cx="60" cy="80" r="5" fill="#FFD700"/>
          <line x1="140" y1="55" x2="140" y2="28" stroke="#4ECDC4" stroke-width="2"/>
          <line x1="140" y1="55" x2="118" y2="43" stroke="#4ECDC4" stroke-width="2"/>
          <line x1="140" y1="55" x2="162" y2="43" stroke="#4ECDC4" stroke-width="2"/>
          <line x1="140" y1="55" x2="125" y2="70" stroke="#A29BFE" stroke-width="2"/>
          <line x1="140" y1="55" x2="155" y2="70" stroke="#A29BFE" stroke-width="2"/>
          <circle cx="140" cy="55" r="5" fill="#4ECDC4"/>
          <line x1="100" y1="30" x2="100" y2="8" stroke="#FF8FA3" stroke-width="2"/>
          <line x1="100" y1="30" x2="83" y2="20" stroke="#FF8FA3" stroke-width="2"/>
          <line x1="100" y1="30" x2="117" y2="20" stroke="#FF8FA3" stroke-width="2"/>
          <circle cx="100" cy="30" r="4" fill="#FF8FA3"/>
          <circle cx="20" cy="15" r="1" fill="white"/><circle cx="180" cy="25" r="1.5" fill="white"/>
          <circle cx="30" cy="150" r="1" fill="white"/><circle cx="170" cy="140" r="1.5" fill="white"/>` },
        { label: "⭐ Aurora",    cost: 1, svg: `<rect width="200" height="200" fill="#061210"/>
          <path d="M0,80 Q50,60 100,80 Q150,100 200,70"  fill="none" stroke="#00FF88" stroke-width="22" opacity="0.25"/>
          <path d="M0,100 Q50,78 100,100 Q150,122 200,88" fill="none" stroke="#00FFCC" stroke-width="16" opacity="0.25"/>
          <path d="M0,68 Q60,48 120,68 Q160,83 200,58"   fill="none" stroke="#00CCFF" stroke-width="12" opacity="0.2"/>
          <path d="M0,90 Q40,68 100,90 Q160,112 200,78"  fill="none" stroke="#8800FF" stroke-width="10" opacity="0.18"/>
          <circle cx="15" cy="15" r="1" fill="white"/><circle cx="45" cy="25" r="1.5" fill="white"/>
          <circle cx="80" cy="10" r="1" fill="white"/><circle cx="120" cy="20" r="1.5" fill="white"/>
          <circle cx="160" cy="12" r="1" fill="white"/><circle cx="185" cy="30" r="1" fill="white"/>` },
        { label: "⭐ Pixel",     cost: 1, svg: `<rect width="200" height="200" fill="#000044"/>
          <rect x="20"  y="20"  width="20" height="20" fill="#FF6B6B"/>
          <rect x="60"  y="20"  width="20" height="20" fill="#FFD700"/>
          <rect x="100" y="20"  width="20" height="20" fill="#4ECDC4"/>
          <rect x="140" y="20"  width="20" height="20" fill="#A29BFE"/>
          <rect x="0"   y="60"  width="20" height="20" fill="#FF8FA3"/>
          <rect x="40"  y="60"  width="20" height="20" fill="#00FF88"/>
          <rect x="80"  y="60"  width="20" height="20" fill="#FF6B6B"/>
          <rect x="120" y="60"  width="20" height="20" fill="#FFD700"/>
          <rect x="160" y="60"  width="20" height="20" fill="#4ECDC4"/>
          <rect x="20"  y="100" width="20" height="20" fill="#A29BFE"/>
          <rect x="60"  y="100" width="20" height="20" fill="#FF8FA3"/>
          <rect x="100" y="100" width="20" height="20" fill="#00FF88"/>
          <rect x="140" y="100" width="20" height="20" fill="#FF6B6B"/>
          <rect x="0"   y="140" width="20" height="20" fill="#FFD700"/>
          <rect x="40"  y="140" width="20" height="20" fill="#4ECDC4"/>
          <rect x="80"  y="140" width="20" height="20" fill="#A29BFE"/>
          <rect x="120" y="140" width="20" height="20" fill="#FF8FA3"/>
          <rect x="160" y="140" width="20" height="20" fill="#00FF88"/>` },
    ],

    face: [
        { label: "Sehr hell",   svg: `<ellipse cx="100" cy="120" rx="54" ry="60" fill="#FFDBB4"/>` },
        { label: "Hell",        svg: `<ellipse cx="100" cy="120" rx="54" ry="60" fill="#F1C27D"/>` },
        { label: "Mittel",      svg: `<ellipse cx="100" cy="120" rx="54" ry="60" fill="#E0AC69"/>` },
        { label: "Olive",       svg: `<ellipse cx="100" cy="120" rx="54" ry="60" fill="#C68642"/>` },
        { label: "Dunkel",      svg: `<ellipse cx="100" cy="120" rx="54" ry="60" fill="#8D5524"/>` },
        { label: "Sehr dunkel", svg: `<ellipse cx="100" cy="120" rx="54" ry="60" fill="#4A2912"/>` },
    ],

    hair: [
        { label: "Kurz braun",    svg: `<ellipse cx="100" cy="66" rx="58" ry="36" fill="#4A3728"/>` },
        { label: "Lang braun",    svg: `<ellipse cx="100" cy="66" rx="58" ry="36" fill="#4A3728"/>
          <rect x="42" y="82" width="17" height="90" rx="8" fill="#4A3728"/>
          <rect x="141" y="82" width="17" height="90" rx="8" fill="#4A3728"/>` },
        { label: "Lockig",        svg: `<ellipse cx="100" cy="62" rx="60" ry="32" fill="#6B4226"/>
          <circle cx="46" cy="82" r="17" fill="#6B4226"/><circle cx="154" cy="82" r="17" fill="#6B4226"/>
          <circle cx="68" cy="56" r="20" fill="#6B4226"/><circle cx="132" cy="56" r="20" fill="#6B4226"/>
          <circle cx="100" cy="48" r="22" fill="#6B4226"/>` },
        { label: "Dutt",          svg: `<ellipse cx="100" cy="68" rx="58" ry="34" fill="#8B6914"/>
          <circle cx="100" cy="38" r="24" fill="#8B6914"/>` },
        { label: "Mohawk",        svg: `<ellipse cx="100" cy="72" rx="58" ry="30" fill="#222"/>
          <rect x="88" y="22" width="24" height="56" rx="12" fill="#222"/>` },
        { label: "Blond lang",    svg: `<ellipse cx="100" cy="66" rx="58" ry="36" fill="#E8C84A"/>
          <rect x="42" y="82" width="17" height="95" rx="8" fill="#E8C84A"/>
          <rect x="141" y="82" width="17" height="95" rx="8" fill="#E8C84A"/>` },
        { label: "Rot kurz",      svg: `<ellipse cx="100" cy="66" rx="58" ry="34" fill="#C0392B"/>` },
        { label: "Pferdeschwanz", svg: `<ellipse cx="100" cy="68" rx="58" ry="34" fill="#4A3728"/>
          <rect x="93" y="42" width="14" height="72" rx="7" fill="#4A3728"/>
          <ellipse cx="100" cy="114" rx="11" ry="7" fill="#4A3728"/>` },
        { label: "Afro",          svg: `<circle cx="100" cy="58" r="54" fill="#2C1B0E"/>
          <ellipse cx="52" cy="88" rx="26" ry="24" fill="#2C1B0E"/>
          <ellipse cx="148" cy="88" rx="26" ry="24" fill="#2C1B0E"/>` },
        { label: "Silber",        svg: `<ellipse cx="100" cy="66" rx="58" ry="36" fill="#90A4AE"/>
          <rect x="42" y="82" width="17" height="80" rx="8" fill="#90A4AE"/>
          <rect x="141" y="82" width="17" height="80" rx="8" fill="#90A4AE"/>` },
        { label: "Pony",          svg: `<ellipse cx="100" cy="66" rx="58" ry="36" fill="#5D3A1A"/>
          <rect x="50" y="70" width="100" height="26" rx="12" fill="#5D3A1A"/>` },
        { label: "Zöpfe",         svg: `<ellipse cx="100" cy="66" rx="58" ry="36" fill="#8B4513"/>
          <ellipse cx="48" cy="84" rx="10" ry="6" fill="#8B4513"/>
          <path d="M48,90 C36,102 32,122 40,142" stroke="#8B4513" stroke-width="14" fill="none" stroke-linecap="round"/>
          <ellipse cx="152" cy="84" rx="10" ry="6" fill="#8B4513"/>
          <path d="M152,90 C164,102 168,122 160,142" stroke="#8B4513" stroke-width="14" fill="none" stroke-linecap="round"/>` },
        { label: "Bunt",          svg: `<ellipse cx="100" cy="66" rx="58" ry="36" fill="#9C27B0"/>
          <ellipse cx="66" cy="74" rx="20" ry="18" fill="#2196F3"/>
          <ellipse cx="134" cy="74" rx="20" ry="18" fill="#F44336"/>
          <ellipse cx="100" cy="56" rx="22" ry="20" fill="#FF9800"/>` },
        { label: "Locken kurz",   svg: `<circle cx="58" cy="78" r="18" fill="#3E2723"/>
          <circle cx="100" cy="64" r="22" fill="#3E2723"/><circle cx="142" cy="78" r="18" fill="#3E2723"/>
          <circle cx="76" cy="68" r="16" fill="#3E2723"/><circle cx="124" cy="68" r="16" fill="#3E2723"/>
          <ellipse cx="100" cy="72" rx="52" ry="28" fill="#3E2723"/>` },
        { label: "Kahl",          svg: `` },
        // ── PREMIUM ──
        { label: "⭐ Gold",       cost: 1, svg: `<ellipse cx="100" cy="66" rx="58" ry="36" fill="#FFD700"/>
          <rect x="42" y="82" width="17" height="85" rx="8" fill="#FFD700"/>
          <rect x="141" y="82" width="17" height="85" rx="8" fill="#FFD700"/>
          <ellipse cx="80" cy="56" rx="10" ry="6" fill="#FFF176" opacity="0.6"/>` },
        { label: "⭐ Neon Blau",  cost: 1, svg: `<ellipse cx="100" cy="66" rx="58" ry="36" fill="#00BFFF"/>
          <rect x="42" y="82" width="17" height="80" rx="8" fill="#00BFFF"/>
          <rect x="141" y="82" width="17" height="80" rx="8" fill="#00BFFF"/>` },
        { label: "⭐ Lila lang",  cost: 1, svg: `<ellipse cx="100" cy="66" rx="58" ry="36" fill="#9B59B6"/>
          <rect x="42" y="82" width="17" height="95" rx="8" fill="#9B59B6"/>
          <rect x="141" y="82" width="17" height="95" rx="8" fill="#9B59B6"/>` },
        { label: "⭐ Regenbogen", cost: 1, svg: `<ellipse cx="100" cy="66" rx="58" ry="36" fill="#FF6B6B"/>
          <ellipse cx="72" cy="74" rx="18" ry="16" fill="#FFD700"/>
          <ellipse cx="128" cy="74" rx="18" ry="16" fill="#4ECDC4"/>
          <ellipse cx="100" cy="58" rx="20" ry="18" fill="#A29BFE"/>
          <rect x="42" y="84" width="14" height="80" rx="7" fill="#FF6B6B"/>
          <rect x="144" y="84" width="14" height="80" rx="7" fill="#4ECDC4"/>` },
    ],

    eyebrows: [
        { label: "Keine",     svg: `` },
        { label: "Normal",    svg: `
          <path d="M63,93 Q78,88 93,93" stroke="#4A3728" stroke-width="3.5" fill="none" stroke-linecap="round"/>
          <path d="M107,93 Q122,88 137,93" stroke="#4A3728" stroke-width="3.5" fill="none" stroke-linecap="round"/>` },
        { label: "Dick",      svg: `
          <path d="M62,94 Q78,87 94,94" stroke="#2C1B0E" stroke-width="6.5" fill="none" stroke-linecap="round"/>
          <path d="M106,94 Q122,87 138,94" stroke="#2C1B0E" stroke-width="6.5" fill="none" stroke-linecap="round"/>` },
        { label: "Wütend",    svg: `
          <path d="M63,88 L93,95" stroke="#4A3728" stroke-width="4.5" fill="none" stroke-linecap="round"/>
          <path d="M107,95 L137,88" stroke="#4A3728" stroke-width="4.5" fill="none" stroke-linecap="round"/>` },
        { label: "Hoch",      svg: `
          <path d="M63,85 Q78,79 93,85" stroke="#4A3728" stroke-width="3.5" fill="none" stroke-linecap="round"/>
          <path d="M107,85 Q122,79 137,85" stroke="#4A3728" stroke-width="3.5" fill="none" stroke-linecap="round"/>` },
        { label: "Buschig",   svg: `
          <path d="M60,94 Q78,86 96,94" stroke="#2C1B0E" stroke-width="9" fill="none" stroke-linecap="round"/>
          <path d="M104,94 Q122,86 140,94" stroke="#2C1B0E" stroke-width="9" fill="none" stroke-linecap="round"/>` },
        { label: "Blond",     svg: `
          <path d="M63,93 Q78,88 93,93" stroke="#E8C84A" stroke-width="4" fill="none" stroke-linecap="round"/>
          <path d="M107,93 Q122,88 137,93" stroke="#E8C84A" stroke-width="4" fill="none" stroke-linecap="round"/>` },
        { label: "Rot",       svg: `
          <path d="M63,93 Q78,88 93,93" stroke="#C0392B" stroke-width="4" fill="none" stroke-linecap="round"/>
          <path d="M107,93 Q122,88 137,93" stroke="#C0392B" stroke-width="4" fill="none" stroke-linecap="round"/>` },
        // ── PREMIUM ──
        { label: "⭐ Gold",   cost: 1, svg: `
          <path d="M63,93 Q78,88 93,93" stroke="#FFD700" stroke-width="5" fill="none" stroke-linecap="round"/>
          <path d="M107,93 Q122,88 137,93" stroke="#FFD700" stroke-width="5" fill="none" stroke-linecap="round"/>
          <circle cx="78" cy="89" r="2.5" fill="#FFF176"/>
          <circle cx="122" cy="89" r="2.5" fill="#FFF176"/>` },
        { label: "⭐ Neon",   cost: 1, svg: `
          <path d="M63,93 Q78,88 93,93" stroke="#00FF88" stroke-width="4" fill="none" stroke-linecap="round"/>
          <path d="M107,93 Q122,88 137,93" stroke="#00FF88" stroke-width="4" fill="none" stroke-linecap="round"/>` },
    ],

    eyes: [
        { label: "Normal",      svg: `
          <circle cx="78" cy="107" r="10" fill="white"/>
          <circle cx="78" cy="107" r="6" fill="#3D2B1F"/>
          <circle cx="81" cy="104" r="2" fill="white"/>
          <circle cx="122" cy="107" r="10" fill="white"/>
          <circle cx="122" cy="107" r="6" fill="#3D2B1F"/>
          <circle cx="125" cy="104" r="2" fill="white"/>` },
        { label: "Froh",        svg: `
          <path d="M68,107 Q78,99 88,107"   stroke="#3D2B1F" stroke-width="3" fill="none" stroke-linecap="round"/>
          <path d="M112,107 Q122,99 132,107" stroke="#3D2B1F" stroke-width="3" fill="none" stroke-linecap="round"/>` },
        { label: "Überrascht",  svg: `
          <circle cx="78" cy="107" r="12" fill="white"/><circle cx="78" cy="107" r="8" fill="#3D2B1F"/>
          <circle cx="82" cy="103" r="3" fill="white"/>
          <circle cx="122" cy="107" r="12" fill="white"/><circle cx="122" cy="107" r="8" fill="#3D2B1F"/>
          <circle cx="126" cy="103" r="3" fill="white"/>` },
        { label: "Zwinkern",    svg: `
          <circle cx="78" cy="107" r="10" fill="white"/><circle cx="78" cy="107" r="6" fill="#3D2B1F"/>
          <circle cx="81" cy="104" r="2" fill="white"/>
          <path d="M112,107 Q122,101 132,107" stroke="#3D2B1F" stroke-width="3.5" fill="none" stroke-linecap="round"/>` },
        { label: "Müde",        svg: `
          <circle cx="78" cy="109" r="9" fill="white"/><circle cx="78" cy="111" r="5" fill="#3D2B1F"/>
          <path d="M68,107 Q78,103 88,107" stroke="#4A3728" stroke-width="5" fill="none"/>
          <circle cx="122" cy="109" r="9" fill="white"/><circle cx="122" cy="111" r="5" fill="#3D2B1F"/>
          <path d="M112,107 Q122,103 132,107" stroke="#4A3728" stroke-width="5" fill="none"/>` },
        { label: "Sternaugen",  svg: `
          <circle cx="78" cy="107" r="11" fill="white"/>
          <text x="71" y="112" font-size="13" fill="#FFD700">★</text>
          <circle cx="122" cy="107" r="11" fill="white"/>
          <text x="115" y="112" font-size="13" fill="#FFD700">★</text>` },
        { label: "Herzaugen",   svg: `
          <path d="M67,108 C67,103 71,99 78,103 C85,99 89,103 89,108 C89,113 78,120 78,120Z" fill="#FF6B9D"/>
          <path d="M111,108 C111,103 115,99 122,103 C129,99 133,103 133,108 C133,113 122,120 122,120Z" fill="#FF6B9D"/>` },
        { label: "Wütend",      svg: `
          <circle cx="78" cy="110" r="9" fill="white"/><circle cx="78" cy="110" r="5" fill="#3D2B1F"/>
          <path d="M64,102 L92,108" stroke="#3D2B1F" stroke-width="4" stroke-linecap="round"/>
          <circle cx="122" cy="110" r="9" fill="white"/><circle cx="122" cy="110" r="5" fill="#3D2B1F"/>
          <path d="M108,108 L136,102" stroke="#3D2B1F" stroke-width="4" stroke-linecap="round"/>` },
        { label: "Anime",       svg: `
          <ellipse cx="78" cy="108" rx="13" ry="14" fill="white"/>
          <ellipse cx="78" cy="110" rx="10" ry="11" fill="#3D7A8A"/>
          <ellipse cx="78" cy="112" rx="7" ry="8" fill="#1A3A4A"/>
          <circle cx="83" cy="104" r="3.5" fill="white"/><circle cx="75" cy="108" r="1.5" fill="white"/>
          <ellipse cx="122" cy="108" rx="13" ry="14" fill="white"/>
          <ellipse cx="122" cy="110" rx="10" ry="11" fill="#3D7A8A"/>
          <ellipse cx="122" cy="112" rx="7" ry="8" fill="#1A3A4A"/>
          <circle cx="127" cy="104" r="3.5" fill="white"/><circle cx="119" cy="108" r="1.5" fill="white"/>` },
        { label: "Geschlossen", svg: `
          <path d="M64,107 Q78,115 92,107" stroke="#3D2B1F" stroke-width="3.5" fill="none" stroke-linecap="round"/>
          <path d="M108,107 Q122,115 136,107" stroke="#3D2B1F" stroke-width="3.5" fill="none" stroke-linecap="round"/>` },
        // ── PREMIUM ──
        { label: "⭐ Regenbogen", cost: 1, svg: `
          <circle cx="78" cy="107" r="11" fill="white"/>
          <circle cx="78" cy="107" r="8" fill="#FF6B6B"/>
          <circle cx="78" cy="107" r="5" fill="#FFD700"/>
          <circle cx="78" cy="107" r="2.5" fill="#4ECDC4"/>
          <circle cx="80" cy="104" r="1.5" fill="white"/>
          <circle cx="122" cy="107" r="11" fill="white"/>
          <circle cx="122" cy="107" r="8" fill="#FF6B6B"/>
          <circle cx="122" cy="107" r="5" fill="#FFD700"/>
          <circle cx="122" cy="107" r="2.5" fill="#4ECDC4"/>
          <circle cx="124" cy="104" r="1.5" fill="white"/>` },
        { label: "⭐ Diamant",    cost: 1, svg: `
          <path d="M78,97 L88,107 L78,117 L68,107Z" fill="white"/>
          <path d="M78,100 L85,107 L78,114 L71,107Z" fill="#B9F2FF"/>
          <circle cx="78" cy="107" r="3" fill="#1A3A4A"/>
          <path d="M122,97 L132,107 L122,117 L112,107Z" fill="white"/>
          <path d="M122,100 L129,107 L122,114 L115,107Z" fill="#B9F2FF"/>
          <circle cx="122" cy="107" r="3" fill="#1A3A4A"/>` },
        { label: "⭐ Neon",       cost: 1, svg: `
          <circle cx="78" cy="107" r="10" fill="#001100"/>
          <circle cx="78" cy="107" r="7" fill="#00FF88"/>
          <circle cx="78" cy="107" r="4" fill="#AAFFCC"/>
          <circle cx="80" cy="105" r="1.5" fill="white"/>
          <circle cx="122" cy="107" r="10" fill="#001100"/>
          <circle cx="122" cy="107" r="7" fill="#00FF88"/>
          <circle cx="122" cy="107" r="4" fill="#AAFFCC"/>
          <circle cx="124" cy="105" r="1.5" fill="white"/>` },
    ],

    mouth: [
        { label: "Lächeln",     svg: `<path d="M82,136 Q100,150 118,136" stroke="#C0836A" stroke-width="3" fill="none" stroke-linecap="round"/>` },
        { label: "Lachen",      svg: `<path d="M78,133 Q100,156 122,133" stroke="#333" stroke-width="2" fill="#FF6B6B" stroke-linecap="round"/>` },
        { label: "Neutral",     svg: `<line x1="85" y1="138" x2="115" y2="138" stroke="#C0836A" stroke-width="3" stroke-linecap="round"/>` },
        { label: "Traurig",     svg: `<path d="M82,146 Q100,133 118,146" stroke="#C0836A" stroke-width="3" fill="none" stroke-linecap="round"/>` },
        { label: "Staunen",     svg: `<ellipse cx="100" cy="140" rx="10" ry="12" fill="#CC7B5C"/>` },
        { label: "Grinsen",     svg: `<path d="M85,138 Q100,148 115,134" stroke="#C0836A" stroke-width="3" fill="none" stroke-linecap="round"/>` },
        { label: "Zunge",       svg: `<path d="M82,133 Q100,148 118,133" stroke="#333" stroke-width="2" fill="#FF6B6B"/>
          <ellipse cx="100" cy="148" rx="10" ry="8" fill="#FF8FA3"/>` },
        { label: "Zähne",       svg: `<path d="M78,133 Q100,154 122,133" stroke="#333" stroke-width="2" fill="#FF6B6B"/>
          <rect x="84" y="133" width="32" height="10" rx="2" fill="white"/>
          <line x1="94" y1="133" x2="94" y2="143" stroke="#ddd" stroke-width="1"/>
          <line x1="100" y1="133" x2="100" y2="143" stroke="#ddd" stroke-width="1"/>
          <line x1="106" y1="133" x2="106" y2="143" stroke="#ddd" stroke-width="1"/>
          <line x1="112" y1="133" x2="112" y2="143" stroke="#ddd" stroke-width="1"/>` },
        { label: "Schief",      svg: `<path d="M84,140 Q96,148 112,135" stroke="#C0836A" stroke-width="3" fill="none" stroke-linecap="round"/>` },
        { label: "Schnute",     svg: `<ellipse cx="100" cy="140" rx="15" ry="7" fill="#D4857A"/>
          <ellipse cx="100" cy="136" rx="15" ry="5" fill="#E09090"/>` },
        // ── PREMIUM ──
        { label: "⭐ Gold",     cost: 1, svg: `
          <path d="M80,134 Q100,150 120,134" stroke="#FFD700" stroke-width="4.5" fill="none" stroke-linecap="round"/>
          <circle cx="82" cy="136" r="3" fill="#FFD700"/>
          <circle cx="118" cy="136" r="3" fill="#FFD700"/>` },
        { label: "⭐ Bunt",     cost: 1, svg: `
          <path d="M80,134 Q88,145 96,141"  stroke="#FF6B6B" stroke-width="4" fill="none" stroke-linecap="round"/>
          <path d="M90,140 Q100,149 110,140" stroke="#FFD700" stroke-width="4" fill="none" stroke-linecap="round"/>
          <path d="M104,141 Q112,145 120,134" stroke="#4ECDC4" stroke-width="4" fill="none" stroke-linecap="round"/>` },
    ],

    glasses: [
        { label: "Keine",        svg: `` },
        { label: "Rund",         svg: `
          <circle cx="78" cy="107" r="15" fill="none" stroke="#333" stroke-width="3"/>
          <circle cx="122" cy="107" r="15" fill="none" stroke="#333" stroke-width="3"/>
          <line x1="93" y1="107" x2="107" y2="107" stroke="#333" stroke-width="3"/>
          <line x1="63" y1="107" x2="54" y2="103" stroke="#333" stroke-width="3"/>
          <line x1="137" y1="107" x2="146" y2="103" stroke="#333" stroke-width="3"/>` },
        { label: "Eckig",        svg: `
          <rect x="63" y="97" width="30" height="20" rx="4" fill="none" stroke="#333" stroke-width="3"/>
          <rect x="107" y="97" width="30" height="20" rx="4" fill="none" stroke="#333" stroke-width="3"/>
          <line x1="93" y1="107" x2="107" y2="107" stroke="#333" stroke-width="3"/>
          <line x1="63" y1="107" x2="54" y2="103" stroke="#333" stroke-width="3"/>
          <line x1="137" y1="107" x2="146" y2="103" stroke="#333" stroke-width="3"/>` },
        { label: "Sonnenbrille", svg: `
          <rect x="60" y="98" width="36" height="18" rx="9" fill="#222" opacity="0.9"/>
          <rect x="104" y="98" width="36" height="18" rx="9" fill="#222" opacity="0.9"/>
          <line x1="96" y1="107" x2="104" y2="107" stroke="#555" stroke-width="3"/>
          <line x1="60" y1="107" x2="52" y2="103" stroke="#555" stroke-width="3"/>
          <line x1="140" y1="107" x2="148" y2="103" stroke="#555" stroke-width="3"/>` },
        { label: "Herz",         svg: `
          <path d="M64,108 C64,102 71,97 78,102 C85,97 92,102 92,108 C92,114 78,121 78,121Z" fill="#FF6B9D"/>
          <path d="M108,108 C108,102 115,97 122,102 C129,97 136,102 136,108 C136,114 122,121 122,121Z" fill="#FF6B9D"/>
          <line x1="92" y1="108" x2="108" y2="108" stroke="#FF6B9D" stroke-width="3"/>
          <line x1="64" y1="108" x2="55" y2="104" stroke="#FF6B9D" stroke-width="3"/>
          <line x1="136" y1="108" x2="145" y2="104" stroke="#FF6B9D" stroke-width="3"/>` },
        { label: "Cat-Eye",      svg: `
          <path d="M63,112 L80,100 L95,107 L80,114Z" fill="none" stroke="#333" stroke-width="3" stroke-linejoin="round"/>
          <path d="M105,107 L120,100 L137,112 L122,114Z" fill="none" stroke="#333" stroke-width="3" stroke-linejoin="round"/>
          <line x1="95" y1="107" x2="105" y2="107" stroke="#333" stroke-width="3"/>
          <line x1="63" y1="112" x2="54" y2="108" stroke="#333" stroke-width="3"/>
          <line x1="137" y1="112" x2="146" y2="108" stroke="#333" stroke-width="3"/>` },
        { label: "Monokle",      svg: `
          <circle cx="122" cy="107" r="16" fill="rgba(200,230,255,0.2)" stroke="#B8860B" stroke-width="3"/>
          <line x1="122" y1="91" x2="130" y2="80" stroke="#B8860B" stroke-width="2.5"/>
          <circle cx="131" cy="78" r="3" fill="#B8860B"/>` },
        { label: "Flieger",      svg: `
          <ellipse cx="78" cy="107" rx="17" ry="12" fill="rgba(180,210,255,0.4)" stroke="#8B7355" stroke-width="2.5"/>
          <ellipse cx="122" cy="107" rx="17" ry="12" fill="rgba(180,210,255,0.4)" stroke="#8B7355" stroke-width="2.5"/>
          <line x1="95" y1="107" x2="105" y2="107" stroke="#8B7355" stroke-width="2.5"/>
          <line x1="61" y1="107" x2="52" y2="103" stroke="#8B7355" stroke-width="2.5"/>
          <line x1="139" y1="107" x2="148" y2="103" stroke="#8B7355" stroke-width="2.5"/>` },
        // ── PREMIUM ──
        { label: "⭐ Gold",      cost: 1, svg: `
          <circle cx="78" cy="107" r="15" fill="none" stroke="#FFD700" stroke-width="3.5"/>
          <circle cx="122" cy="107" r="15" fill="none" stroke="#FFD700" stroke-width="3.5"/>
          <line x1="93" y1="107" x2="107" y2="107" stroke="#FFD700" stroke-width="3.5"/>
          <line x1="63" y1="107" x2="54" y2="103" stroke="#FFD700" stroke-width="3.5"/>
          <line x1="137" y1="107" x2="146" y2="103" stroke="#FFD700" stroke-width="3.5"/>` },
        { label: "⭐ Neon",      cost: 1, svg: `
          <circle cx="78" cy="107" r="15" fill="rgba(0,255,136,0.12)" stroke="#00FF88" stroke-width="3"/>
          <circle cx="122" cy="107" r="15" fill="rgba(0,255,136,0.12)" stroke="#00FF88" stroke-width="3"/>
          <line x1="93" y1="107" x2="107" y2="107" stroke="#00FF88" stroke-width="3"/>
          <line x1="63" y1="107" x2="54" y2="103" stroke="#00FF88" stroke-width="3"/>
          <line x1="137" y1="107" x2="146" y2="103" stroke="#00FF88" stroke-width="3"/>` },
    ],

    accessory: [
        { label: "Keines",         svg: `` },
        { label: "Cap",            svg: `
          <path d="M38,80 Q38,52 100,52 Q162,52 162,80" fill="#2980B9"/>
          <ellipse cx="100" cy="80" rx="62" ry="16" fill="#2471A3"/>
          <rect x="140" y="74" width="32" height="10" rx="5" fill="#1A5276"/>` },
        { label: "Krone",          svg: `
          <polygon points="54,82 54,48 70,64 100,42 130,64 146,48 146,82" fill="#FFD700" stroke="#E6AC00" stroke-width="2"/>
          <circle cx="100" cy="52" r="7" fill="#E74C3C"/>
          <circle cx="72" cy="66" r="5" fill="#27AE60"/>
          <circle cx="128" cy="66" r="5" fill="#3498DB"/>` },
        { label: "Kopfhörer",      svg: `
          <path d="M42,108 C42,68 66,44 100,44 C134,44 158,68 158,108" fill="none" stroke="#555" stroke-width="9" stroke-linecap="round"/>
          <rect x="35" y="100" width="18" height="26" rx="9" fill="#444"/>
          <rect x="147" y="100" width="18" height="26" rx="9" fill="#444"/>` },
        { label: "Hexenhut",       svg: `
          <polygon points="100,16 58,82 142,82" fill="#2C3E50"/>
          <ellipse cx="100" cy="82" rx="52" ry="12" fill="#2C3E50"/>
          <ellipse cx="100" cy="82" rx="52" ry="12" fill="none" stroke="#8E44AD" stroke-width="5"/>` },
        { label: "Doktorhut",      svg: `
          <rect x="64" y="68" width="72" height="16" rx="2" fill="#222"/>
          <polygon points="100,40 52,66 148,66" fill="#222"/>
          <line x1="140" y1="66" x2="148" y2="88" stroke="#FFD700" stroke-width="3"/>
          <circle cx="148" cy="92" r="6" fill="#FFD700"/>` },
        { label: "Hasenohren",     svg: `
          <ellipse cx="74" cy="52" rx="13" ry="32" fill="#F0C0D0"/>
          <ellipse cx="74" cy="52" rx="8" ry="22" fill="#FFB6C1"/>
          <ellipse cx="126" cy="52" rx="13" ry="32" fill="#F0C0D0"/>
          <ellipse cx="126" cy="52" rx="8" ry="22" fill="#FFB6C1"/>` },
        { label: "Blumenkranz",    svg: `
          <path d="M42,74 Q100,60 158,74" fill="none" stroke="#4CAF50" stroke-width="4" stroke-linecap="round"/>
          <circle cx="58" cy="70" r="10" fill="#FF8FA3"/><circle cx="58" cy="70" r="5" fill="#FFD700"/>
          <circle cx="78" cy="63" r="10" fill="#AED581"/><circle cx="78" cy="63" r="5" fill="#FFD700"/>
          <circle cx="100" cy="59" r="11" fill="#FF8FA3"/><circle cx="100" cy="59" r="5" fill="#FFD700"/>
          <circle cx="122" cy="63" r="10" fill="#AED581"/><circle cx="122" cy="63" r="5" fill="#FFD700"/>
          <circle cx="142" cy="70" r="10" fill="#FF8FA3"/><circle cx="142" cy="70" r="5" fill="#FFD700"/>` },
        { label: "Schleife",       svg: `
          <path d="M126,60 C120,50 136,44 142,56 C148,44 164,50 158,60 C152,66 142,62 142,62 C142,62 132,66 126,60Z" fill="#FF6B9D"/>
          <circle cx="142" cy="58" r="6" fill="#FF4785"/>` },
        { label: "Heiligenschein", svg: `
          <ellipse cx="100" cy="44" rx="42" ry="10" fill="none" stroke="#FFD700" stroke-width="6" opacity="0.95"/>
          <ellipse cx="100" cy="44" rx="42" ry="10" fill="none" stroke="#FFF9C4" stroke-width="2" opacity="0.7"/>` },
        { label: "Katzenohren",    svg: `
          <polygon points="62,78 52,40 88,68" fill="#FF8FA3"/>
          <polygon points="65,75 58,48 84,68" fill="#FFB6C1"/>
          <polygon points="138,78 148,40 112,68" fill="#FF8FA3"/>
          <polygon points="135,75 142,48 116,68" fill="#FFB6C1"/>` },
        { label: "Wikinger",       svg: `
          <ellipse cx="100" cy="74" rx="58" ry="24" fill="#8B6914"/>
          <rect x="42" y="66" width="116" height="16" rx="4" fill="#A0790E"/>
          <path d="M42,68 C28,56 24,36 38,30 C42,40 42,60 44,70Z" fill="#ECEFF1"/>
          <path d="M158,68 C172,56 176,36 162,30 C158,40 158,60 156,70Z" fill="#ECEFF1"/>` },
        { label: "Piratenhut",     svg: `
          <ellipse cx="100" cy="82" rx="62" ry="14" fill="#1A1A1A"/>
          <path d="M46,82 Q46,44 100,40 Q154,44 154,82Z" fill="#222"/>
          <rect x="76" y="50" width="48" height="30" rx="3" fill="white" opacity="0.9"/>
          <circle cx="100" cy="60" r="9" fill="#1A1A1A"/>
          <ellipse cx="100" cy="70" rx="7" ry="5" fill="#1A1A1A"/>
          <circle cx="95" cy="59" r="2.5" fill="white"/><circle cx="105" cy="59" r="2.5" fill="white"/>` },
        { label: "Stirnband",      svg: `
          <path d="M42,88 Q100,78 158,88" fill="none" stroke="#E53935" stroke-width="10" stroke-linecap="round"/>
          <circle cx="100" cy="82" r="7" fill="#FFD700"/>` },
        // ── PREMIUM ──
        { label: "⭐ Diamant Krone", cost: 1, svg: `
          <polygon points="54,82 54,48 70,64 100,42 130,64 146,48 146,82" fill="#B9F2FF" stroke="#74D7FF" stroke-width="2"/>
          <polygon points="60,82 60,54 72,66 100,48 128,66 140,54 140,82" fill="#E8FBFF" opacity="0.5"/>
          <circle cx="100" cy="50" r="8" fill="#FF9EFF"/>
          <circle cx="72" cy="66" r="5" fill="#FFD700"/>
          <circle cx="128" cy="66" r="5" fill="#74D7FF"/>` },
        { label: "⭐ Feenflügel",   cost: 1, svg: `
          <path d="M46,80 C20,60 10,90 20,110 C30,130 50,120 54,100 C58,80 50,70 46,80Z" fill="rgba(255,200,255,0.5)" stroke="#FF8FA3" stroke-width="1.5"/>
          <path d="M46,80 C22,68 18,100 30,115 C38,122 48,110 46,95Z" fill="rgba(200,220,255,0.4)" stroke="#A29BFE" stroke-width="1"/>
          <path d="M154,80 C180,60 190,90 180,110 C170,130 150,120 146,100 C142,80 150,70 154,80Z" fill="rgba(255,200,255,0.5)" stroke="#FF8FA3" stroke-width="1.5"/>
          <path d="M154,80 C178,68 182,100 170,115 C162,122 152,110 154,95Z" fill="rgba(200,220,255,0.4)" stroke="#A29BFE" stroke-width="1"/>` },
        { label: "⭐ Zauberstab",   cost: 1, svg: `
          <line x1="145" y1="180" x2="80" y2="58" stroke="#8B6914" stroke-width="5" stroke-linecap="round"/>
          <polygon points="80,50 83,59 92,59 85,65 88,74 80,68 72,74 75,65 68,59 77,59" fill="#FFD700"/>
          <circle cx="80" cy="60" r="13" fill="rgba(255,215,0,0.25)"/>
          <circle cx="66" cy="49" r="2" fill="#FFD700" opacity="0.8"/>
          <circle cx="94" cy="47" r="2" fill="#FF8FA3" opacity="0.8"/>
          <circle cx="70" cy="72" r="1.5" fill="#4ECDC4" opacity="0.8"/>` },
        { label: "⭐ Regenbogen Hut", cost: 1, svg: `
          <ellipse cx="100" cy="82" rx="62" ry="14" fill="#FF6B6B"/>
          <path d="M46,82 Q46,44 100,40 Q154,44 154,82Z" fill="#FF6B6B"/>
          <path d="M52,72 Q76,52 124,52 Q148,60 148,72Z" fill="#FFD700"/>
          <path d="M55,64 Q78,48 122,48 Q145,55 145,64Z" fill="#4ECDC4"/>
          <path d="M60,57 Q80,44 120,44 Q140,50 140,57Z" fill="#A29BFE"/>` },
    ],
};

const CATEGORIES = [
    { id: "background", label: "Hintergrund" },
    { id: "face",       label: "Gesicht" },
    { id: "hair",       label: "Haare" },
    { id: "eyebrows",   label: "Augenbrauen" },
    { id: "eyes",       label: "Augen" },
    { id: "mouth",      label: "Mund" },
    { id: "glasses",    label: "Brille" },
    { id: "accessory",  label: "Accessoire" },
];

const DEFAULT_SEL = { background: 0, face: 0, hair: 0, eyebrows: 0, eyes: 0, mouth: 0, glasses: 0, accessory: 0 };

// ─── helpers ──────────────────────────────────────────────────────────────────

function composeSVG(sel) {
    const parts = CATEGORIES.map(cat => LAYERS[cat.id][sel[cat.id] ?? 0]?.svg ?? "");
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">${parts.join("")}</svg>`;
}

export function getAvatarSVG() {
    try {
        const sel = { ...DEFAULT_SEL, ...JSON.parse(localStorage.getItem(LS_KEY) || "{}") };
        return composeSVG(sel);
    } catch {
        return composeSVG(DEFAULT_SEL);
    }
}

// ─── component ────────────────────────────────────────────────────────────────

class AvatarBuilder extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._sel = this._load();
        this._activeCategory = "background";
        this._unlocked = this._loadUnlocked();
        this.pointsManager = null;
    }

    _load() {
        try { return { ...DEFAULT_SEL, ...JSON.parse(localStorage.getItem(LS_KEY) || "{}") }; }
        catch { return { ...DEFAULT_SEL }; }
    }

    _loadUnlocked() {
        try { return new Set(JSON.parse(localStorage.getItem(LS_UNLOCK) || "[]")); }
        catch { return new Set(); }
    }

    _saveUnlocked() {
        localStorage.setItem(LS_UNLOCK, JSON.stringify([...this._unlocked]));
    }

    connectedCallback() {
        this._renderShell();
        this._updatePreview();
        this._renderTabs();
        this._renderOptions();
    }

    open() {
        this._sel = this._load();
        this._unlocked = this._loadUnlocked();
        this._updatePreview();
        this._renderOptions();
        this.shadowRoot.querySelector(".overlay").classList.add("active");
    }

    close() {
        this.shadowRoot.querySelector(".overlay").classList.remove("active");
    }

    _save() {
        localStorage.setItem(LS_KEY, JSON.stringify(this._sel));
        this.dispatchEvent(new CustomEvent("avatar-saved", { bubbles: true, detail: { ...this._sel } }));
    }

    _renderShell() {
        this.shadowRoot.innerHTML = `
      <style>
        .overlay {
          display: none; position: fixed; inset: 0;
          background: rgba(0,0,0,0.65); backdrop-filter: blur(6px);
          z-index: 1000; align-items: center; justify-content: center;
        }
        .overlay.active { display: flex; }

        .panel {
          background: rgba(224,242,254,0.97);
          border: 1px solid rgba(56,189,248,0.4);
          border-radius: 20px; padding: 1.2rem;
          width: min(440px, 95vw); max-height: 92vh;
          display: flex; flex-direction: column; gap: 0.8rem;
          box-shadow: 0 0 40px rgba(56,189,248,0.3), 0 20px 60px rgba(0,0,0,0.3);
          overflow: hidden;
        }

        .panel-header {
          display: flex; justify-content: space-between; align-items: center;
          font-size: 1.15rem; font-weight: bold; color: #0369a1;
        }

        .close-btn {
          background: rgba(0,0,0,0.08); border: 1px solid rgba(0,0,0,0.1);
          font-size: 1.2rem; cursor: pointer; color: #555;
          padding: 0.2rem 0.6rem; border-radius: 8px; line-height: 1;
          transition: background 0.2s;
        }
        .close-btn:hover { background: rgba(255,80,80,0.2); color: #c00; }

        .preview-area { display: flex; justify-content: center; padding: 0.4rem 0; }

        .avatar-preview {
          width: 150px; height: 150px; border-radius: 50%;
          overflow: hidden;
          border: 3px solid rgba(14,165,233,0.5);
          box-shadow: 0 0 24px rgba(56,189,248,0.4);
          flex-shrink: 0;
        }
        .avatar-preview svg { width: 100%; height: 100%; display: block; }

        .category-tabs {
          display: flex; gap: 0.4rem; overflow-x: auto;
          padding-bottom: 0.25rem; scrollbar-width: thin;
        }

        .tab-btn {
          white-space: nowrap; padding: 0.35rem 0.75rem;
          border: 1px solid rgba(14,165,233,0.3);
          border-radius: 20px; background: rgba(14,165,233,0.1);
          cursor: pointer; font-size: 0.82rem; color: #0369a1;
          transition: all 0.15s; flex-shrink: 0;
        }
        .tab-btn:hover { border-color: #0ea5e9; background: rgba(14,165,233,0.2); }
        .tab-btn.active {
          background: rgba(14,165,233,0.8); border-color: #0ea5e9;
          color: white; font-weight: bold;
          box-shadow: 0 0 10px rgba(14,165,233,0.4);
        }

        .options-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
          gap: 0.5rem; overflow-y: auto; max-height: 240px;
          padding: 0.2rem 0.1rem;
        }

        .option-btn {
          position: relative; display: flex; flex-direction: column;
          align-items: center; gap: 0.25rem; padding: 0.35rem 0.25rem;
          border: 1px solid rgba(14,165,233,0.25);
          border-radius: 12px; background: rgba(255,255,255,0.6);
          cursor: pointer; transition: all 0.15s; color: #0c4a6e;
        }
        .option-btn:hover { border-color: #0ea5e9; transform: scale(1.05); background: rgba(255,255,255,0.9); }
        .option-btn.selected {
          border-color: #0284c7; background: rgba(14,165,233,0.15);
          box-shadow: 0 0 10px rgba(14,165,233,0.3);
        }
        .option-btn.locked { cursor: default; }
        .option-btn.locked:hover { transform: none; }
        .lock-badge {
          position: absolute; top: 3px; right: 5px;
          font-size: 0.7rem; background: rgba(0,0,0,0.55);
          color: #FFD700; border-radius: 8px; padding: 1px 4px;
          line-height: 1.4; pointer-events: none;
        }

        .opt-thumb {
          width: 60px; height: 60px; display: block;
          border-radius: 50%; overflow: hidden; flex-shrink: 0;
          border: 1px solid rgba(0,0,0,0.08);
        }
        .opt-thumb svg { width: 100%; height: 100%; display: block; }
        .option-btn.locked .opt-thumb { filter: brightness(0.55) saturate(0.4); }

        .opt-label {
          font-size: 0.66rem; text-align: center;
          line-height: 1.2; word-break: break-word;
        }

        .points-info {
          text-align: center; font-size: 0.78rem; color: #0369a1;
          background: rgba(14,165,233,0.1); border-radius: 8px; padding: 0.3rem 0.5rem;
        }

        .save-btn {
          background: linear-gradient(135deg, rgba(14,165,233,0.9), rgba(56,189,248,0.9));
          color: white; border: none; border-radius: 12px;
          padding: 0.75rem; font-size: 1rem; font-weight: bold;
          cursor: pointer; width: 100%;
          box-shadow: 0 0 16px rgba(14,165,233,0.4);
          transition: filter 0.2s; flex-shrink: 0;
        }
        .save-btn:hover  { filter: brightness(1.1); }
        .save-btn:active { filter: brightness(0.9); }
      </style>

      <div class="overlay">
        <div class="panel">
          <div class="panel-header">
            <span>✨ Avatar erstellen</span>
            <button class="close-btn" aria-label="Schließen">✕</button>
          </div>
          <div class="preview-area">
            <div class="avatar-preview"></div>
          </div>
          <div class="category-tabs"></div>
          <div class="points-info" id="pts-info"></div>
          <div class="options-grid"></div>
          <button class="save-btn">💾 Avatar speichern</button>
        </div>
      </div>
    `;

        this.shadowRoot.querySelector(".close-btn").onclick = () => this.close();
        this.shadowRoot.querySelector(".save-btn").onclick = () => { this._save(); this.close(); };
        this.shadowRoot.querySelector(".overlay").addEventListener("click", e => {
            if (e.target === e.currentTarget) this.close();
        });
    }

    _updatePreview() {
        const el = this.shadowRoot.querySelector(".avatar-preview");
        if (el) el.innerHTML = composeSVG(this._sel);
        const pts = this.pointsManager?.points ?? 0;
        const info = this.shadowRoot.getElementById("pts-info");
        if (info) info.textContent = `⭐-Optionen kosten 1 Taler zum Freischalten — du hast ${pts} Taler`;
    }

    _renderTabs() {
        const container = this.shadowRoot.querySelector(".category-tabs");
        if (!container) return;
        container.innerHTML = CATEGORIES.map(cat =>
            `<button class="tab-btn${cat.id === this._activeCategory ? " active" : ""}" data-cat="${cat.id}">${cat.label}</button>`
        ).join("");
        container.querySelectorAll(".tab-btn").forEach(btn => {
            btn.onclick = () => {
                this._activeCategory = btn.dataset.cat;
                container.querySelectorAll(".tab-btn").forEach(b => b.classList.toggle("active", b === btn));
                this._renderOptions();
            };
        });
    }

    _renderOptions() {
        const container = this.shadowRoot.querySelector(".options-grid");
        if (!container) return;
        const catId = this._activeCategory;
        container.innerHTML = LAYERS[catId].map((opt, i) => {
            const key      = `${catId}:${i}`;
            const isLocked = opt.cost && !this._unlocked.has(key);
            const thumb    = composeSVG({ ...this._sel, [catId]: i });
            return `<button class="option-btn${this._sel[catId] === i ? " selected" : ""}${isLocked ? " locked" : ""}"
                data-idx="${i}" data-cat="${catId}" data-locked="${isLocked ? "1" : "0"}">
              <span class="opt-thumb">${thumb}</span>
              <span class="opt-label">${opt.label}</span>
              ${isLocked ? `<span class="lock-badge">🔒 1🪙</span>` : ""}
            </button>`;
        }).join("");

        container.querySelectorAll(".option-btn").forEach(btn => {
            btn.onclick = () => {
                if (btn.dataset.locked === "1") {
                    const pts = this.pointsManager?.points ?? 0;
                    if (pts < 1) {
                        alert("Du brauchst 1 Taler um diese Option freizuschalten!\nLerne mehr Vokabeln um Taler zu verdienen.");
                        return;
                    }
                    this.pointsManager.updatePoints(-1);
                    const key = `${btn.dataset.cat}:${btn.dataset.idx}`;
                    this._unlocked.add(key);
                    this._saveUnlocked();
                    btn.dataset.locked = "0";
                    btn.classList.remove("locked");
                    btn.querySelector(".lock-badge")?.remove();
                    btn.querySelector(".opt-thumb").style.filter = "";
                    this._updatePreview();
                }
                this._sel[btn.dataset.cat] = parseInt(btn.dataset.idx);
                this._updatePreview();
                container.querySelectorAll(".option-btn").forEach(b =>
                    b.classList.toggle("selected", b === btn)
                );
            };
        });
    }
}

customElements.define("avatar-builder", AvatarBuilder);
