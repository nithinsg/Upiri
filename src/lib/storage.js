/* ================= STORAGE HELPERS =================
   All ŪPIRI data lives in localStorage under the `upiri:` key convention. */
const PREFIX = "upiri:";

export async function loadKey(key, fallback) {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export async function saveKey(key, obj) {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(obj));
    return true;
  } catch (e) {
    console.error("storage save failed", e);
    return false;
  }
}

export function loadKeySync(key, fallback) {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function saveKeySync(key, obj) {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(obj));
    return true;
  } catch {
    return false;
  }
}
