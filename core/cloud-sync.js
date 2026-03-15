// core/cloud-sync.js
// Synchronises local profiles with Supabase and manages group membership.

import { supabaseGet, supabaseUpsert, supabaseInsert, supabaseDelete, supabaseUpdate } from "./supabase.js";
import { getActiveProfile, getActiveId, getProfiles } from "./profiles.js";

// ─── helpers ────────────────────────────────────────────────────────────────

/** Generate a random 6-character uppercase alphanumeric join code. */
function generateJoinCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no O/0/1/I to avoid confusion
    let code = "";
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
}

/** Map a local profile object to the Supabase `profiles` row shape. */
function toCloudRow(p) {
    return {
        id:            p.id,
        name:          p.name || "Unnamed",
        role:          p.role || "schueler",
        points:        p.points || 0,
        streak_record: p.streakRecord || 0,
        avatar_svg:    p.avatarSvg || "",
        group_code:    null,            // managed separately via join/create
    };
}

/** Map a Supabase `profiles` row back to local-profile-compatible fields. */
function fromCloudRow(row) {
    return {
        id:           row.id,
        name:         row.name,
        role:         row.role,
        points:       row.points ?? 0,
        streakRecord: row.streak_record ?? 0,
        avatarSvg:    row.avatar_svg ?? "",
    };
}

// ─── profile sync ───────────────────────────────────────────────────────────

/**
 * Push the current active local profile to the cloud (upsert by id).
 * Returns the upserted row, or null on failure.
 */
export async function syncProfileToCloud() {
    try {
        const profile = getActiveProfile();
        if (!profile) return null;
        const rows = await supabaseUpsert("profiles", [toCloudRow(profile)]);
        return rows ? rows[0] : null;
    } catch (e) {
        console.warn("[cloud-sync] syncProfileToCloud failed:", e);
        return null;
    }
}

/**
 * Pull a profile from the cloud by its id.
 * Returns a local-profile-shaped object, or null on failure / not found.
 */
export async function loadProfileFromCloud(id) {
    try {
        const rows = await supabaseGet("profiles", `id=eq.${encodeURIComponent(id)}`);
        if (!rows || rows.length === 0) return null;
        return fromCloudRow(rows[0]);
    } catch (e) {
        console.warn("[cloud-sync] loadProfileFromCloud failed:", e);
        return null;
    }
}

// ─── groups ─────────────────────────────────────────────────────────────────

/**
 * Create a new group (teacher action).
 * Generates a unique 6-char join code and inserts the group row.
 * Also adds the teacher as a group member.
 * Returns the created group row, or null on failure.
 */
export async function createGroup(name) {
    try {
        const profileId = getActiveId();
        if (!profileId) return null;

        const group = {
            id:         "g" + Date.now(),
            name:       name,
            teacher_id: profileId,
            join_code:  generateJoinCode(),
            settings:   {},
        };

        const rows = await supabaseInsert("groups", [group]);
        if (!rows || rows.length === 0) return null;

        // add the teacher as a member of the group
        await supabaseInsert("group_members", [{
            group_id:   group.id,
            profile_id: profileId,
        }]);

        return rows[0];
    } catch (e) {
        console.warn("[cloud-sync] createGroup failed:", e);
        return null;
    }
}

/**
 * Join a group by its 6-char join code.
 * Looks up the group, then inserts a group_members row for the active profile.
 * Returns the group row on success, or null on failure / invalid code.
 */
export async function joinGroup(joinCode) {
    try {
        const profileId = getActiveId();
        if (!profileId) return null;

        const group = await getGroupByCode(joinCode);
        if (!group) return null;

        const memberRow = await supabaseInsert("group_members", [{
            group_id:   group.id,
            profile_id: profileId,
        }]);
        if (!memberRow) return null;

        return group;
    } catch (e) {
        console.warn("[cloud-sync] joinGroup failed:", e);
        return null;
    }
}

/**
 * Fetch all members of a group (profiles joined to group_members).
 * Returns an array of profile objects, or null on failure.
 */
export async function getGroupMembers(groupId) {
    try {
        // First get member ids
        const members = await supabaseGet(
            "group_members",
            `group_id=eq.${encodeURIComponent(groupId)}&select=profile_id`
        );
        if (!members || members.length === 0) return [];

        // Fetch full profiles for those ids
        const ids = members.map(m => m.profile_id);
        const filter = `id=in.(${ids.map(encodeURIComponent).join(",")})`;
        const profiles = await supabaseGet("profiles", filter);
        if (!profiles) return null;

        return profiles.map(fromCloudRow);
    } catch (e) {
        console.warn("[cloud-sync] getGroupMembers failed:", e);
        return null;
    }
}

/**
 * Look up a group by its join code.
 * Returns the group row, or null if not found / on failure.
 */
export async function getGroupByCode(code) {
    try {
        const rows = await supabaseGet(
            "groups",
            `join_code=eq.${encodeURIComponent(code)}`
        );
        if (!rows || rows.length === 0) return null;
        return rows[0];
    } catch (e) {
        console.warn("[cloud-sync] getGroupByCode failed:", e);
        return null;
    }
}

// ─── login system ──────────────────────────────────────────────────────────

/** Simple hash for PIN (not crypto-grade, but prevents casual snooping) */
async function hashPin(pin) {
    const data = new TextEncoder().encode(pin + "vokabel-salt-2026");
    const buf = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

/** Generate a unique 8-char login code for a profile */
function generateLoginCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
}

/**
 * Register a profile in the cloud with a login code and PIN.
 * Returns { loginCode } on success, null on failure.
 */
export async function registerCloudAccount(profileId, pin) {
    try {
        const code = generateLoginCode();
        const pinH = await hashPin(pin);
        await supabaseUpdate("profiles", { id: profileId }, { login_code: code, pin_hash: pinH });
        localStorage.setItem("myLoginCode", code);
        return { loginCode: code };
    } catch (e) {
        console.warn("[cloud-sync] registerCloudAccount failed:", e);
        return null;
    }
}

/**
 * Login with a login code + PIN from another device.
 * Returns the cloud profile data on success, null on failure.
 */
export async function loginWithCode(loginCode, pin) {
    try {
        const rows = await supabaseGet("profiles", `login_code=eq.${encodeURIComponent(loginCode.toUpperCase())}`);
        if (!rows || rows.length === 0) return null;
        const row = rows[0];
        const pinH = await hashPin(pin);
        if (row.pin_hash !== pinH) return null; // wrong PIN
        return fromCloudRow(row);
    } catch (e) {
        console.warn("[cloud-sync] loginWithCode failed:", e);
        return null;
    }
}

/**
 * Get the login code for the current profile (if registered).
 */
export async function getMyLoginCode() {
    const cached = localStorage.getItem("myLoginCode");
    if (cached) return cached;
    try {
        const id = getActiveId();
        if (!id) return null;
        const rows = await supabaseGet("profiles", `id=eq.${encodeURIComponent(id)}&select=login_code`);
        if (rows?.[0]?.login_code) {
            localStorage.setItem("myLoginCode", rows[0].login_code);
            return rows[0].login_code;
        }
        return null;
    } catch { return null; }
}

// ─── auto-sync on import ────────────────────────────────────────────────────

// Fire-and-forget: push the active profile to the cloud when this module loads.
syncProfileToCloud();
