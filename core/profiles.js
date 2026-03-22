// core/profiles.js
// Multi-profile support for a single device.

const LS_ALL    = "allProfiles";
const LS_ACTIVE = "activeProfileId";

export function getProfiles() {
    try { return JSON.parse(localStorage.getItem(LS_ALL) || "[]"); } catch { return []; }
}

function _save(list) {
    localStorage.setItem(LS_ALL, JSON.stringify(list));
}

export function getActiveId() {
    return localStorage.getItem(LS_ACTIVE) || null;
}

export function getActiveProfile() {
    const id = getActiveId();
    return id ? (getProfiles().find(p => p.id === id) || null) : null;
}

const RANDOM_BGS = [
    "light", "blue", "green", "purple", "pink", "yellow",
    "grad-sunset", "grad-ocean", "grad-aurora", "grad-candy",
    "grad-sky", "grad-mint", "grad-peach",
];

export function createProfile(name) {
    const list = getProfiles();
    const id = "p" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
    const bg = RANDOM_BGS[Math.floor(Math.random() * RANDOM_BGS.length)];
    list.push({ id, name, role: null, points: 0, streakRecord: 0,
                avatarSelection: null, avatarUnlocked: [], avatarSvg: "", appBg: bg,
                _needsRandomAvatar: true });
    _save(list);
    return id;
}

/** Called after avatar-builder is loaded to assign a random avatar */
export function assignRandomAvatarIfNeeded(generateFn) {
    const list = getProfiles();
    let changed = false;
    for (const p of list) {
        if (p._needsRandomAvatar) {
            const { selection, svg } = generateFn();
            p.avatarSelection = selection;
            p.avatarSvg = svg;
            delete p._needsRandomAvatar;
            changed = true;
            // Set in localStorage if this is the active profile
            if (p.id === getActiveId()) {
                localStorage.setItem("avatarSelection", JSON.stringify(selection));
            }
        }
    }
    if (changed) _save(list);
}

export function deleteProfile(id) {
    _save(getProfiles().filter(p => p.id !== id));
    if (getActiveId() === id) localStorage.removeItem(LS_ACTIVE);
}

// Snapshot current localStorage state into the active profile object
export function saveSnapshot() {
    const id = getActiveId();
    if (!id) return;
    const list = getProfiles();
    const p = list.find(p => p.id === id);
    if (!p) return;
    p.points       = parseInt(localStorage.getItem("points") || "0");
    p.streakRecord = parseInt(localStorage.getItem("streakRecord") || "0");
    p.role         = localStorage.getItem("userRole") || null;
    p.appBg        = localStorage.getItem("appBg") || "dark";
    p.age          = localStorage.getItem("userAge") || null;
    try { p.avatarSelection = JSON.parse(localStorage.getItem("avatarSelection")); } catch {}
    try { p.avatarUnlocked  = JSON.parse(localStorage.getItem("avatarUnlocked") || "[]"); } catch {}
    _save(list);
}

// Load a profile into localStorage and mark it active
export function activateProfile(id) {
    saveSnapshot();
    localStorage.setItem(LS_ACTIVE, id);
    const p = getProfiles().find(p => p.id === id);
    if (!p) return;
    localStorage.setItem("points",       String(p.points || 0));
    localStorage.setItem("streakRecord", String(p.streakRecord || 0));
    p.role            ? localStorage.setItem("userRole",        p.role)
                      : localStorage.removeItem("userRole");
    p.avatarSelection ? localStorage.setItem("avatarSelection", JSON.stringify(p.avatarSelection))
                      : localStorage.removeItem("avatarSelection");
    localStorage.setItem("avatarUnlocked", JSON.stringify(p.avatarUnlocked || []));
    localStorage.setItem("appBg", p.appBg || "dark");
    p.age ? localStorage.setItem("userAge", p.age)
          : localStorage.removeItem("userAge");
}

export function setAvatarSvg(svgStr) {
    const id = getActiveId();
    if (!id) return;
    const list = getProfiles();
    const p = list.find(p => p.id === id);
    if (p) { p.avatarSvg = svgStr; _save(list); }
}
