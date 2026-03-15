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
        loginCode:       row.login_code ?? null,
    };
}

// ─── profile sync ───────────────────────────────────────────────────────────

export async function syncProfileToCloud() {
    try {
        saveSnapshot(); // make sure profile object has latest localStorage values
        const profile = getActiveProfile();
        if (!profile) return null;
        const rows = await supabaseUpsert("profiles", [toCloudRow(profile)]);
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
 * Pull the latest profile data from the cloud and update localStorage.
 * This keeps a second device in sync when the first device earns points.
 */
export async function pullFromCloud() {
    try {
        const id = getActiveId();
        if (!id) return;
        const rows = await supabaseGet("profiles", `id=eq.${encodeURIComponent(id)}`);
        if (!rows || rows.length === 0) return;
        const cloud = fromCloudRow(rows[0]);

        // Only update if cloud has higher values (don't overwrite local progress)
        const localPoints = parseInt(localStorage.getItem("points") || "0");
        const localStreak = parseInt(localStorage.getItem("streakRecord") || "0");

        if (cloud.points > localPoints) {
            localStorage.setItem("points", String(cloud.points));
            // Update the displayed points if the element exists
            const el = document.querySelector("app-shell")?.shadowRoot?.getElementById("home-points");
            if (el) el.textContent = cloud.points;
        }
        if (cloud.streakRecord > localStreak) {
            localStorage.setItem("streakRecord", String(cloud.streakRecord));
            const el = document.querySelector("app-shell")?.shadowRoot?.getElementById("home-streak");
            if (el) el.textContent = cloud.streakRecord;
        }

        // Sync avatar and background if changed on other device
        if (cloud.avatarSvg && cloud.avatarSvg !== localStorage.getItem("lastCloudAvatar")) {
            localStorage.setItem("lastCloudAvatar", cloud.avatarSvg);
            const list = JSON.parse(localStorage.getItem("allProfiles") || "[]");
            const p = list.find(p => p.id === id);
            if (p) {
                p.avatarSvg = cloud.avatarSvg;
                p.points = Math.max(p.points || 0, cloud.points);
                p.streakRecord = Math.max(p.streakRecord || 0, cloud.streakRecord);
                if (cloud.avatarSelection) p.avatarSelection = cloud.avatarSelection;
                if (cloud.appBg) p.appBg = cloud.appBg;
                localStorage.setItem("allProfiles", JSON.stringify(list));
            }
        }
    } catch (e) {
        console.warn("[cloud-sync] pullFromCloud failed:", e);
    }
}

// ─── auto-sync on import ────────────────────────────────────────────────────
// Wait for the app to be fully loaded before first sync
setTimeout(() => {
    syncProfileToCloud();
    // Pull + push loop: push every 45s, pull every 30s
    setInterval(() => syncProfileToCloud(), 45000);
    setInterval(() => pullFromCloud(), 30000);
}, 3000);
