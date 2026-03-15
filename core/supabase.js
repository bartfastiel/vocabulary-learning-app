// core/supabase.js
// Supabase client singleton for online features.

const SUPABASE_URL = "https://anrwjfidqqjivatjarrg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFucndqZmlkcXFqaXZhdGphcnJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NjQyNjYsImV4cCI6MjA4OTE0MDI2Nn0.Pxq5uXvFqk5UF8hrnT94A8WT1ZUEVeiWfu2_OZZA8us";

const HEADERS = {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": "Bearer " + SUPABASE_ANON_KEY,
    "Content-Type": "application/json",
    "Prefer": "return=representation",
};

/** Simple REST wrapper — no external SDK needed. */
export async function supabaseGet(table, query = "") {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, { headers: HEADERS });
    if (!res.ok) return null;
    return res.json();
}

export async function supabaseInsert(table, rows) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: "POST", headers: HEADERS, body: JSON.stringify(rows),
    });
    if (!res.ok) return null;
    return res.json();
}

export async function supabaseUpsert(table, rows) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: "POST",
        headers: { ...HEADERS, "Prefer": "return=representation,resolution=merge-duplicates" },
        body: JSON.stringify(rows),
    });
    if (!res.ok) return null;
    return res.json();
}

export async function supabaseUpdate(table, match, data) {
    const query = Object.entries(match).map(([k, v]) => `${k}=eq.${v}`).join("&");
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
        method: "PATCH", headers: HEADERS, body: JSON.stringify(data),
    });
    if (!res.ok) return null;
    return res.json();
}

export async function supabaseDelete(table, match) {
    const query = Object.entries(match).map(([k, v]) => `${k}=eq.${v}`).join("&");
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
        method: "DELETE", headers: HEADERS,
    });
    return res.ok;
}

/** Check if Supabase is reachable */
export async function supabasePing() {
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/`, { headers: HEADERS, signal: AbortSignal.timeout(3000) });
        return res.ok;
    } catch { return false; }
}

export { SUPABASE_URL, SUPABASE_ANON_KEY };
