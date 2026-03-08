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

export function createProfile(name) {
    const list = getProfiles();
    const id = "p" + Date.now();
    list.push({ id, name, role: null, points: 0, streakRecord: 0,
                avatarSelection: null, avatarUnlocked: [], avatarSvg: "", appBg: "dark" });
    _save(list);
    return id;
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
}

export function setAvatarSvg(svgStr) {
    const id = getActiveId();
    if (!id) return;
    const list = getProfiles();
    const p = list.find(p => p.id === id);
    if (p) { p.avatarSvg = svgStr; _save(list); }
}
