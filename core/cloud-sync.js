// core/cloud-sync.js
// Synchronises local profiles with Supabase and manages group membership.

import { supabaseGet, supabaseUpsert, supabaseInsert, supabaseDelete, supabaseUpdate } from "./supabase.js";
import { getActiveProfile, getActiveId, getProfiles, saveSnapshot } from "./profiles.js";
import { getAvatarSVG } from "./avatar-builder.js";

// ─── helpers ────────────────────────────────────────────────────────────────

function generateCode(len) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < len; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
}

/** Push ALL local profile data to cloud — reads fresh from localStorage */
function toCloudRow(p) {
    // Read latest values directly from localStorage (most up-to-date)
    const points = parseInt(localStorage.getItem("points") || "0");
    const streak = parseInt(localStorage.getItem("streakRecord") || "0");
    const bg = localStorage.getItem("appBg") || "light";
    let avatarSel = p.avatarSelection;
    try { avatarSel = JSON.parse(localStorage.getItem("avatarSelection")) || avatarSel; } catch {}
    let avatarUnl = p.avatarUnlocked || [];
    try { avatarUnl = JSON.parse(localStorage.getItem("avatarUnlocked") || "[]"); } catch {}
    // Get fresh avatar SVG
    let svg = "";
    try { svg = getAvatarSVG(); } catch { svg = p.avatarSvg || ""; }

    // Collect all background-related settings
    const bgExtra = {};
    try { bgExtra.gradColors = JSON.parse(localStorage.getItem("gradColors") || "null"); } catch {}
    bgExtra.gradDir = localStorage.getItem("gradDir") || null;
    bgExtra.gradAnimated = localStorage.getItem("gradAnimated") || null;
    bgExtra.liveBgKey = localStorage.getItem("liveBgKey") || null;
    bgExtra.appBgCustom = localStorage.getItem("appBgCustom") || null;

    const row = {
        id:               p.id,
        name:             p.name || "Unnamed",
        role:             p.role || localStorage.getItem("userRole") || "schueler",
        points:           points,
        streak_record:    streak,
        avatar_svg:       svg,
        avatar_selection: avatarSel,
        avatar_unlocked:  avatarUnl,
        app_bg:           bg,
        bg_extra:         bgExtra,
    };
    console.log("[cloud-sync] pushing:", p.name, "pts:", points, "streak:", streak, "id:", p.id);
    return row;
}

/** Map cloud row back to local profile + apply to localStorage */
function fromCloudRow(row) {
    return {
        id:              row.id,
        name:            row.name,
        role:            row.role,
        points:          row.points ?? 0,
        streakRecord:    row.streak_record ?? 0,
        avatarSvg:       row.avatar_svg ?? "",
        avatarSelection: row.avatar_selection ?? null,
        avatarUnlocked:  row.avatar_unlocked ?? [],
        appBg:           row.app_bg ?? "light",
        bgExtra:         row.bg_extra ?? {},
        loginCode:       row.login_code ?? null,
    };
}

// ─── profile sync ───────────────────────────────────────────────────────────

export async function syncProfileToCloud() {
    try {
        saveSnapshot();
        const profile = getActiveProfile();
        if (!profile) return null;
        const local = toCloudRow(profile);

        // Read current server state FIRST
        const serverRows = await supabaseGet("profiles", `id=eq.${encodeURIComponent(local.id)}`);
        const server = serverRows?.[0] || null;

        if (server) {
            // MERGE: take the MAX of points/streak (never lose progress from either device)
            local.points = Math.max(local.points || 0, server.points || 0);
            local.streak_record = Math.max(local.streak_record || 0, server.streak_record || 0);

            // If server has more points, update local too
            const localPts = parseInt(localStorage.getItem("points") || "0");
            if (server.points > localPts) {
                localStorage.setItem("points", String(server.points));
            }
            const localStreak = parseInt(localStorage.getItem("streakRecord") || "0");
            if (server.streak_record > localStreak) {
                localStorage.setItem("streakRecord", String(server.streak_record));
            }

            // For background/avatar: use the most recently changed one
            // We detect "recently changed" by comparing with what we last pulled
            const lastPulledBg = localStorage.getItem("_lastServerBg");
            if (lastPulledBg && local.app_bg === lastPulledBg && server.app_bg !== lastPulledBg) {
                // Server changed but local didn't → keep server version
                local.app_bg = server.app_bg;
                local.bg_extra = server.bg_extra;
            }
            // Save what the server has so we can detect changes next time
            localStorage.setItem("_lastServerBg", local.app_bg);
        }

        const rows = await supabaseUpsert("profiles", [local]);
        console.log("[cloud-sync] pushed:", local.name, "pts:", local.points, "streak:", local.streak_record);
        return rows ? rows[0] : null;
    } catch (e) {
        console.warn("[cloud-sync] sync failed:", e);
        return null;
    }
}

export async function loadProfileFromCloud(id) {
    try {
        const rows = await supabaseGet("profiles", `id=eq.${encodeURIComponent(id)}`);
        if (!rows || rows.length === 0) return null;
        return fromCloudRow(rows[0]);
    } catch (e) {
        console.warn("[cloud-sync] load failed:", e);
        return null;
    }
}

// ─── simple login system (just a code, no PIN) ─────────────────────────────

/** Create a login code for the current profile */
export async function createLoginCode() {
    try {
        const id = getActiveId();
        if (!id) return null;
        await syncProfileToCloud(); // make sure profile exists
        const code = generateCode(6);
        await supabaseUpdate("profiles", { id }, { login_code: code });
        localStorage.setItem("myLoginCode", code);
        return code;
    } catch (e) {
        console.warn("[cloud-sync] createLoginCode failed:", e);
        return null;
    }
}

/** Login with a code — returns full profile data or null */
export async function loginWithCode(code) {
    try {
        const rows = await supabaseGet("profiles", `login_code=eq.${encodeURIComponent(code.toUpperCase())}`);
        if (!rows || rows.length === 0) return null;
        return fromCloudRow(rows[0]);
    } catch (e) {
        console.warn("[cloud-sync] loginWithCode failed:", e);
        return null;
    }
}

/** Get login code for current active profile (always checks server) */
export async function getMyLoginCode() {
    try {
        const id = getActiveId();
        if (!id) return null;
        const rows = await supabaseGet("profiles", `id=eq.${encodeURIComponent(id)}&select=login_code`);
        if (rows?.[0]?.login_code) {
            localStorage.setItem("myLoginCode", rows[0].login_code);
            return rows[0].login_code;
        }
        // No code for this profile — clear any stale cached code
        localStorage.removeItem("myLoginCode");
        return null;
    } catch {
        // Offline fallback: only return cached if we can't reach server
        return localStorage.getItem("myLoginCode") || null;
    }
}

// ─── groups ─────────────────────────────────────────────────────────────────

export async function createGroup(name) {
    try {
        const profileId = getActiveId();
        if (!profileId) return null;
        const group = {
            id: "g" + Date.now(),
            name,
            teacher_id: profileId,
            join_code: generateCode(6),
            settings: {},
        };
        const rows = await supabaseInsert("groups", [group]);
        if (!rows || rows.length === 0) return null;
        await supabaseInsert("group_members", [{ group_id: group.id, profile_id: profileId }]);
        return rows[0];
    } catch (e) {
        console.warn("[cloud-sync] createGroup failed:", e);
        return null;
    }
}

export async function joinGroup(joinCode) {
    try {
        const profileId = getActiveId();
        if (!profileId) return null;
        const group = await getGroupByCode(joinCode);
        if (!group) return null;
        await supabaseInsert("group_members", [{ group_id: group.id, profile_id: profileId }]);
        // Mark this profile as being in this class
        await supabaseUpdate("profiles", { id: profileId }, { class_id: group.id });
        return group;
    } catch (e) {
        console.warn("[cloud-sync] joinGroup failed:", e);
        return null;
    }
}

export async function getGroupMembers(groupId) {
    try {
        const members = await supabaseGet("group_members", `group_id=eq.${encodeURIComponent(groupId)}&select=profile_id`);
        if (!members || members.length === 0) return [];
        const ids = members.map(m => m.profile_id);
        const profiles = await supabaseGet("profiles", `id=in.(${ids.map(encodeURIComponent).join(",")})`);
        return (profiles || []).map(fromCloudRow);
    } catch (e) {
        console.warn("[cloud-sync] getGroupMembers failed:", e);
        return null;
    }
}

export async function getGroupByCode(code) {
    try {
        const rows = await supabaseGet("groups", `join_code=eq.${encodeURIComponent(code)}`);
        return rows?.[0] ?? null;
    } catch { return null; }
}

// ─── pull latest data from cloud into local ─────────────────────────────────

/**
 * Pull the latest profile data from the cloud and update EVERYTHING locally.
 * Keeps two devices in perfect sync — points, background, avatar, all of it.
 */
export async function pullFromCloud() {
    try {
        const id = getActiveId();
        if (!id) return;
        const rows = await supabaseGet("profiles", `id=eq.${encodeURIComponent(id)}`);
        if (!rows || rows.length === 0) return;
        const cloud = fromCloudRow(rows[0]);
        const shell = document.querySelector("app-shell");
        const sr = shell?.shadowRoot;
        let needsReload = false;

        // ── Points & Streak (take the higher value) ──
        const localPoints = parseInt(localStorage.getItem("points") || "0");
        const localStreak = parseInt(localStorage.getItem("streakRecord") || "0");

        if (cloud.points > localPoints) {
            localStorage.setItem("points", String(cloud.points));
            const el = sr?.getElementById("home-points");
            if (el) el.textContent = cloud.points;
        }
        if (cloud.streakRecord > localStreak) {
            localStorage.setItem("streakRecord", String(cloud.streakRecord));
            const el = sr?.getElementById("home-streak");
            if (el) el.textContent = cloud.streakRecord;
        }

        // ── Background (detect if OTHER device changed it) ──
        const localBg = localStorage.getItem("appBg") || "light";
        const lastServerBg = localStorage.getItem("_lastServerBg") || localBg;
        // If server bg changed AND it wasn't us who changed it
        if (cloud.appBg && cloud.appBg !== localBg && cloud.appBg !== lastServerBg) {
            localStorage.setItem("appBg", cloud.appBg);
            localStorage.setItem("_lastServerBg", cloud.appBg);
            const bgEx = cloud.bgExtra || {};
            if (bgEx.gradColors) localStorage.setItem("gradColors", JSON.stringify(bgEx.gradColors));
            if (bgEx.gradDir) localStorage.setItem("gradDir", bgEx.gradDir);
            if (bgEx.gradAnimated) localStorage.setItem("gradAnimated", bgEx.gradAnimated);
            if (bgEx.liveBgKey) localStorage.setItem("liveBgKey", bgEx.liveBgKey);
            if (bgEx.appBgCustom) localStorage.setItem("appBgCustom", bgEx.appBgCustom);
            needsReload = true;
        }

        // ── Avatar (detect if other device changed it) ──
        const lastAvatar = localStorage.getItem("_lastServerAvatar") || "";
        if (cloud.avatarSvg && cloud.avatarSvg !== lastAvatar) {
            localStorage.setItem("_lastServerAvatar", cloud.avatarSvg);
            if (cloud.avatarSelection) localStorage.setItem("avatarSelection", JSON.stringify(cloud.avatarSelection));
            // Update avatar display without full reload
            const avatarEl = sr?.getElementById("avatar-mini");
            if (avatarEl && cloud.avatarSvg) avatarEl.innerHTML = cloud.avatarSvg;
        }

        // ── Update profile object ──
        const list = JSON.parse(localStorage.getItem("allProfiles") || "[]");
        const p = list.find(p => p.id === id);
        if (p) {
            p.points = Math.max(p.points || 0, cloud.points);
            p.streakRecord = Math.max(p.streakRecord || 0, cloud.streakRecord);
            if (cloud.avatarSvg) p.avatarSvg = cloud.avatarSvg;
            if (cloud.avatarSelection) p.avatarSelection = cloud.avatarSelection;
            if (cloud.appBg) p.appBg = cloud.appBg;
            localStorage.setItem("allProfiles", JSON.stringify(list));
        }

        // Only reload for background changes (points/avatar update live)
        if (needsReload) {
            console.log("[cloud-sync] background changed on other device, reloading...");
            location.reload();
        }
    } catch (e) {
        console.warn("[cloud-sync] pullFromCloud failed:", e);
    }
}

// ─── auto-sync on import ────────────────────────────────────────────────────
// Wait for the app to be fully loaded before first sync
setTimeout(() => {
    syncProfileToCloud();
    // Push every 20s, pull every 15s for near-realtime sync
    setInterval(() => syncProfileToCloud(), 20000);
    setInterval(() => pullFromCloud(), 15000);
}, 3000);
