/**
 * SereneTrack Simulated IoT Smart Wearable & Biometrics Telemetry Engine
 * Simulates real-time PPG sensor feed: Heart Rate Variability (HRV ms), Resting HR (BPM),
 * and Sleep Architecture stages with realistic physiological variance.
 */

let isWearableConnected = true;
let telemetryInterval = null;
let currentBpm = 68;
let currentHrv = 58; // ms
let currentDeepSleep = 22; // %
let currentRemSleep = 24; // %
let currentLightSleep = 54; // %

export function toggleWearableConnection() {
  isWearableConnected = !isWearableConnected;
  updateWearableUI();
  if (isWearableConnected) {
    startTelemetryLoop();
  } else {
    clearInterval(telemetryInterval);
  }
}

export function updateWearableMetrics(stressScore = 42) {
  // Physiology: Higher stress score leads to lower HRV (rMSSD) and higher Resting Heart Rate
  const normalizedStrain = Math.max(5, Math.min(98, stressScore));
  
  // Baseline calculations
  const targetHrv = Math.round(85 - (normalizedStrain * 0.65)); // 85ms down to 21ms
  const targetBpm = Math.round(58 + (normalizedStrain * 0.35)); // 58bpm up to 92bpm
  
  // Sleep architecture shifts with strain
  if (normalizedStrain > 75) {
    currentDeepSleep = 12; // Suppressed restorative slow-wave N3
    currentRemSleep = 18;  // Restless fragmented REM
    currentLightSleep = 70;
  } else if (normalizedStrain > 45) {
    currentDeepSleep = 18;
    currentRemSleep = 22;
    currentLightSleep = 60;
  } else {
    currentDeepSleep = 24;
    currentRemSleep = 25;
    currentLightSleep = 51;
  }

  // Add subtle sinusoidal physiological micro-variation
  const jitterHrv = (Math.random() * 4 - 2);
  const jitterBpm = (Math.random() * 2 - 1);

  currentHrv = Math.max(15, Math.round(targetHrv + jitterHrv));
  currentBpm = Math.max(50, Math.round(targetBpm + jitterBpm));

  renderWearableValues();
}

function renderWearableValues() {
  const bpmEl = document.getElementById('wearable-bpm');
  const hrvEl = document.getElementById('wearable-hrv');
  const hrvStatusEl = document.getElementById('wearable-hrv-status');
  const deepBar = document.getElementById('wearable-deep-bar');
  const remBar = document.getElementById('wearable-rem-bar');
  const lightBar = document.getElementById('wearable-light-bar');

  if (bpmEl) bpmEl.innerText = `${currentBpm} bpm`;
  if (hrvEl) hrvEl.innerText = `${currentHrv} ms`;

  if (hrvStatusEl) {
    if (currentHrv >= 55) {
      hrvStatusEl.innerText = 'High Parasympathetic Reserve (Favorable)';
      hrvStatusEl.className = 'text-[11px] font-bold text-emerald-700';
    } else if (currentHrv >= 38) {
      hrvStatusEl.innerText = 'Moderate Vagal Tone';
      hrvStatusEl.className = 'text-[11px] font-bold text-amber-700';
    } else {
      hrvStatusEl.innerText = 'Low HRV (Sympathetic Overdrive / Strain)';
      hrvStatusEl.className = 'text-[11px] font-bold text-rose-600';
    }
  }

  if (deepBar) deepBar.style.width = `${currentDeepSleep}%`;
  if (remBar) remBar.style.width = `${currentRemSleep}%`;
  if (lightBar) lightBar.style.width = `${currentLightSleep}%`;

  const deepTxt = document.getElementById('wearable-deep-text');
  const remTxt = document.getElementById('wearable-rem-text');
  const lightTxt = document.getElementById('wearable-light-text');
  if (deepTxt) deepTxt.innerText = `Deep N3: ${currentDeepSleep}%`;
  if (remTxt) remTxt.innerText = `REM: ${currentRemSleep}%`;
  if (lightTxt) lightTxt.innerText = `Light: ${currentLightSleep}%`;
}

export function updateWearableUI() {
  const btn = document.getElementById('btn-toggle-wearable');
  const badge = document.getElementById('wearable-conn-badge');
  const pulseIcon = document.getElementById('wearable-pulse-icon');

  if (btn) {
    btn.innerHTML = isWearableConnected
      ? `<svg class="icon w-3.5 h-3.5 text-teal-600" viewBox="0 0 24 24"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg><span>Disconnect Wearable</span>`
      : `<svg class="icon w-3.5 h-3.5 text-slate-500" viewBox="0 0 24 24"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><line x1="1" y1="1" x2="23" y2="23"/></svg><span>Connect Smart Wearable</span>`;
  }

  if (badge) {
    if (isWearableConnected) {
      badge.className = 'sync-badge online';
      badge.innerHTML = `<span class="sync-dot"></span><span>BLE Paired • Live PPG Telemetry</span>`;
    } else {
      badge.className = 'sync-badge offline';
      badge.innerHTML = `<span class="sync-dot"></span><span>Wearable Disconnected</span>`;
    }
  }

  if (pulseIcon) {
    pulseIcon.style.animation = isWearableConnected ? 'pulse 1s infinite' : 'none';
  }
}

function startTelemetryLoop() {
  clearInterval(telemetryInterval);
  telemetryInterval = setInterval(() => {
    if (!isWearableConnected) return;
    const scoreEl = document.getElementById('gauge-score');
    const score = scoreEl ? parseInt(scoreEl.innerText, 10) : 42;
    updateWearableMetrics(score);
  }, 3500);
}

// Global window binding
if (typeof window !== 'undefined') {
  window.toggleWearableConnection = toggleWearableConnection;

  // Auto-start on load in browser
  setTimeout(() => {
    updateWearableUI();
    startTelemetryLoop();
  }, 600);
}
