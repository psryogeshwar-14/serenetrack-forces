/**
 * SereneTrack Hybrid Client API & Sync Manager
 * - Synchronizes with Node.js Express REST API when online
 * - Transparently falls back to localStorage when offline
 * - Displays active server connection status badge
 */

const STORAGE_KEY_LOGS = 'serenetrack_logs';
const STORAGE_KEY_PROFILE = 'serenetrack_profile';
const STORAGE_KEY_NOTIFS = 'serenetrack_notifications';

let isServerOnline = false;

export async function checkServerHealth() {
  try {
    const res = await fetch('/api/health', { method: 'GET', cache: 'no-cache' });
    if (res.ok) {
      isServerOnline = true;
    } else {
      isServerOnline = false;
    }
  } catch (e) {
    isServerOnline = false;
  }
  updateSyncBadge();
  return isServerOnline;
}

export function updateSyncBadge() {
  const badge = document.getElementById('sync-status-badge');
  if (!badge) return;

  if (isServerOnline) {
    badge.className = 'sync-badge online';
    badge.innerHTML = `<span class="sync-dot"></span><span>Server Synced</span>`;
    badge.title = 'Connected to Node.js backend & persistent SQLite database';
  } else {
    badge.className = 'sync-badge offline';
    badge.innerHTML = `<span class="sync-dot"></span><span>Offline Storage</span>`;
    badge.title = 'Running locally in browser sandbox (LocalStorage)';
  }
}

/**
 * Initial load: load from server if available, otherwise local storage
 */
export async function loadInitialData() {
  const online = await checkServerHealth();
  let profile = null;
  let logs = [];

  if (online) {
    try {
      const [profRes, logsRes] = await Promise.all([
        fetch('/api/profile'),
        fetch('/api/logs')
      ]);

      if (profRes.ok && logsRes.ok) {
        const profData = await profRes.json();
        const logsData = await logsRes.json();
        profile = profData.profile;
        logs = logsData.logs;

        // Cache locally for offline resilience
        try {
          localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile));
          localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(logs));
        } catch(e) {}

        return { profile, logs, isOnline: true };
      }
    } catch (err) {
      console.warn('[Sync] Server read failed, using localStorage:', err);
    }
  }

  // Fallback to localStorage
  try {
    const storedProf = localStorage.getItem(STORAGE_KEY_PROFILE);
    if (storedProf) profile = JSON.parse(storedProf);
    const storedLogs = localStorage.getItem(STORAGE_KEY_LOGS);
    if (storedLogs) logs = JSON.parse(storedLogs);
  } catch (err) {
    console.warn('[Sync] Local storage read error:', err);
  }

  return { profile, logs, isOnline: false };
}

/**
 * Save daily log
 */
export async function saveDailyLog(log) {
  // Always update local cache immediately
  try {
    const stored = localStorage.getItem(STORAGE_KEY_LOGS);
    let list = stored ? JSON.parse(stored) : [];
    const idx = list.findIndex(l => l.date === log.date);
    if (idx >= 0) list[idx] = log;
    else list.push(log);
    localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(list));
  } catch(e) {}

  if (isServerOnline) {
    try {
      const res = await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(log)
      });
      if (res.ok) {
        const data = await res.json();
        return data.log;
      }
    } catch (err) {
      console.warn('[Sync] Save log to server failed:', err);
    }
  }

  return log;
}

/**
 * Save quick log (+water, +break, +stretch, +walk)
 */
export async function postQuickLog(action) {
  if (isServerOnline) {
    try {
      const res = await fetch('/api/logs/quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        const data = await res.json();
        return data;
      }
    } catch (e) {
      console.warn('[Sync] Quick log server error:', e);
    }
  }
  return null;
}

/**
 * Save Profile
 */
export async function saveProfile(profile) {
  try {
    localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile));
  } catch(e) {}

  if (isServerOnline) {
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });
      if (res.ok) {
        const data = await res.json();
        return data.profile;
      }
    } catch (err) {
      console.warn('[Sync] Save profile to server failed:', err);
    }
  }

  return profile;
}

/**
 * Wipe all data
 */
export async function wipeAllData() {
  try {
    localStorage.clear();
  } catch(e) {}

  if (isServerOnline) {
    try {
      await fetch('/api/backup/wipe', { method: 'POST' });
    } catch(e) {}
  }
}

// Periodically check server connectivity every 30 seconds
setInterval(checkServerHealth, 30000);
