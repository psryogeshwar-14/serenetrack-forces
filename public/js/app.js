import {
  playChime,
  toggleBinauralBeats,
  setBinauralMode,
  toggleAmbientSoundscape,
  setAmbientMode,
  setMasterVolume,
  updateSanctuaryUI
} from './audio.js';

import {
  loadInitialData,
  saveDailyLog,
  postQuickLog,
  saveProfile,
  wipeAllData,
  checkServerHealth
} from './api.js';

import { setLanguage, applyTranslations, getLanguage } from './i18n.js';
import { updateWearableMetrics, updateWearableUI, toggleWearableConnection } from './wearable.js';
import { handleAnalyzeThought, handleLockWorry, renderVaultEntries } from './cbti.js';
import { updateCircadianDisplay, toggleSunlightTimer, resetSunlightTimer } from './circadian.js';
import { toggleCopilotDrawer, sendCopilotMessage } from './ai.js';
import { loadJudgeDemoPersona } from './demo.js';
import {
  loadForcesData,
  setForcesRole,
  setForcesBattalionFilter,
  submitJawanAssessment,
  sendJawanWelfareSOS,
  acknowledgeForcesAlert,
  dispatchForcesAction,
  quickDispatchIntervention,
  loadJudgeSimulationTheater,
  downloadAnonymizedDataset,
  switchJawanPersonnel
} from './forces.js';

/* -------------------------------------------------------------
   STATE & PERSISTENCE
------------------------------------------------------------- */
const MAX_RESTORATIVE_SLEEP = 8.0;

let appProfile = {
  username: "Alex Morgan",
  avatarUrl: "",
  age: 28,
  preferredWakeTime: "06:30",
  targetSleepGoal: 8.0,
  joinedDate: "2026-09-01"
};

let appNotifications = {
  breakReminders: true,
  breakIntervalMinutes: 90,
  bedtimeAlert: true,
  bedtimeAlertAdvanceMinutes: 45,
  soundEffects: true
};

let appLogs = [];
let activeMood = 'calm';
const todayStr = new Date().toISOString().split('T')[0];

/* -------------------------------------------------------------
   ALGORITHM: STRESS & SLEEP ENGINE (Max 8.0h Cap)
------------------------------------------------------------- */
export function calculateSleep(actualHours, quality, wakeTimeStr) {
  const actual = Math.max(0, parseFloat(actualHours) || 0);
  const target = MAX_RESTORATIVE_SLEEP;
  const deficit = Math.max(0, parseFloat((target - actual).toFixed(1)));

  const [wH, wM] = (wakeTimeStr || '06:30').split(':').map(Number);
  const wakeTotalMinutes = (isNaN(wH) ? 6 : wH) * 60 + (isNaN(wM) ? 30 : wM);
  let bedMinutes = wakeTotalMinutes - 495; // 8h + 15m wind-down
  if (bedMinutes < 0) bedMinutes += 24 * 60;
  const bH = Math.floor(bedMinutes / 60);
  const bM = bedMinutes % 60;
  const formattedBedtime = String(bH).padStart(2, '0') + ':' + String(bM).padStart(2, '0');

  return {
    actualHours: actual,
    target: target,
    deficit: deficit,
    suggestedBedtime: formattedBedtime,
    percent: Math.min(100, Math.round((actual / target) * 100))
  };
}

export function calculateStress(workH, sleepH, quality, fatigue, mood, screenH, breaks, water, caffeine, movement) {
  let score = 25;
  const drivers = [];

  if (workH > 10) { score += 26; drivers.push('Extended working schedule (' + workH + 'h)'); }
  else if (workH > 8) { score += 14; drivers.push('Overtime work duration (' + workH + 'h)'); }
  else if (workH < 5) { score -= 6; }

  const sleepData = calculateSleep(sleepH, quality, appProfile.preferredWakeTime);
  if (sleepH < 5) { score += 28; drivers.push('Severe sleep deficit (' + sleepH + 'h vs 8.0h limit)'); }
  else if (sleepH < 6.5) { score += 16; drivers.push('Sleep deficit (' + sleepData.deficit + 'h below 8.0h ceiling)'); }
  else if (sleepH >= 7.5) { score -= 12; }

  if (quality <= 2) { score += 12; drivers.push('Fragmented sleep quality rating (' + quality + '/5)'); }
  else if (quality >= 4) { score -= 8; }

  if (fatigue >= 8) { score += 22; drivers.push('Severe physical fatigue (' + fatigue + '/10)'); }
  else if (fatigue >= 5) { score += 10; drivers.push('Elevated fatigue index (' + fatigue + '/10)'); }
  else if (fatigue <= 3) { score -= 6; }

  const moodOffsets = { calm: -14, energetic: -8, content: -10, neutral: 0, anxious: 18, exhausted: 24 };
  if (moodOffsets[mood] !== undefined) score += moodOffsets[mood];
  if (['anxious', 'exhausted'].includes(mood)) drivers.push('Heightened nervous system arousal (' + mood + ')');

  if (screenH > 9) { score += 12; drivers.push('Prolonged screen exposure (' + screenH + 'h)'); }
  if (breaks < 2) { score += 10; drivers.push('Lack of mindful breaks (&lt;2 taken)'); }
  else if (breaks >= 4) { score -= 8; }

  if (caffeine >= 4) { score += 12; drivers.push('Elevated caffeine consumption (' + caffeine + ' cups)'); }
  if (water < 4) { score += 8; drivers.push('Suboptimal hydration (&lt;4 glasses)'); }
  else if (water >= 8) { score -= 6; }

  if (movement >= 30) score -= 10;
  else if (movement < 10) { score += 8; drivers.push('Sedentary musculoskeletal stagnation'); }

  score = Math.max(5, Math.min(98, Math.round(score)));

  let tier = 'Moderate';
  if (score <= 35) tier = 'Low';
  else if (score <= 60) tier = 'Moderate';
  else if (score <= 79) tier = 'Elevated';
  else tier = 'High';

  if (drivers.length === 0) drivers.push('Autonomic nervous system in stable equilibrium');

  return { score, tier, drivers, sleepData };
}

/* -------------------------------------------------------------
   NAVIGATION & UI
------------------------------------------------------------- */
export function setTab(tab) {
  ['dashboard', 'trends', 'vault', 'settings', 'forces'].forEach(t => {
    const view = document.getElementById('view-' + t);
    const btn = document.getElementById('tab-btn-' + t);
    if (view) view.classList.add('hidden');
    if (btn) btn.className = 'px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5';
  });

  const activeView = document.getElementById('view-' + tab);
  const activeBtn = document.getElementById('tab-btn-' + tab);
  if (activeView) activeView.classList.remove('hidden');
  if (activeBtn) activeBtn.className = 'px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white text-teal-800 shadow-xs flex items-center gap-1.5';

  if (tab === 'trends') renderTrendGraph();
  if (tab === 'vault') renderVaultEntries();
  if (tab === 'forces') loadForcesData();
}

export function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.innerText = msg;
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 3200);
}

export function selectMood(m) {
  activeMood = m;
  document.querySelectorAll('.mood-pill').forEach(btn => {
    if (btn.getAttribute('data-mood') === m) {
      btn.className = 'mood-pill px-3.5 py-1.5 rounded-lg border text-xs font-semibold bg-teal-600 text-white border-teal-600 shadow-xs';
    } else {
      btn.className = 'mood-pill px-3.5 py-1.5 rounded-lg border text-xs font-semibold bg-slate-50 text-slate-700 border-slate-200';
    }
  });
  updateLiveCalculation();
}

export async function quickLog(type) {
  if (type === 'water') {
    const inp = document.getElementById('input-water');
    inp.value = parseInt(inp.value) + 1;
    showToast('Logged +1 glass of water (8oz)');
  } else if (type === 'break') {
    const inp = document.getElementById('input-breaks');
    inp.value = parseInt(inp.value) + 1;
    showToast('Logged +1 mindful break (5m)');
  } else if (type === 'stretch') {
    const inp = document.getElementById('input-movement');
    inp.value = parseInt(inp.value) + 5;
    showToast('Logged +5 mins mobility stretch');
  } else if (type === 'walk') {
    const inp = document.getElementById('input-movement');
    inp.value = parseInt(inp.value) + 10;
    showToast('Logged +10 mins cadence walk');
  }

  playChime(528);
  updateLiveCalculation();

  // Background server sync
  await postQuickLog(type);
}

export function updateLiveCalculation() {
  const workH = parseFloat(document.getElementById('input-work').value);
  const sleepH = parseFloat(document.getElementById('input-sleep').value);
  const quality = parseInt(document.getElementById('input-quality').value);
  const fatigue = parseInt(document.getElementById('input-fatigue').value);
  const screenH = parseFloat(document.getElementById('input-screen').value) || 0;
  const breaks = parseInt(document.getElementById('input-breaks').value) || 0;
  const water = parseInt(document.getElementById('input-water').value) || 0;
  const caffeine = parseInt(document.getElementById('input-caffeine').value) || 0;
  const movement = parseInt(document.getElementById('input-movement').value) || 0;

  // Update slider readout labels
  document.getElementById('val-work').innerText = workH.toFixed(1) + ' hrs';
  document.getElementById('val-sleep').innerText = sleepH.toFixed(1) + ' hrs';
  document.getElementById('val-quality').innerText = quality + ' / 5';
  document.getElementById('val-fatigue').innerText = fatigue + ' / 10';

  const res = calculateStress(workH, sleepH, quality, fatigue, activeMood, screenH, breaks, water, caffeine, movement);

  // Update Gauge
  document.getElementById('gauge-score').innerText = res.score;
  document.getElementById('gauge-badge').innerText = res.tier + ' Strain';

  const circumference = 314.15;
  const offset = circumference - (res.score / 100) * circumference;
  const gaugeCircle = document.getElementById('gauge-circle');
  gaugeCircle.style.strokeDashoffset = offset;

  let color = '#0d9488'; // Low
  if (res.tier === 'Moderate') color = '#d97706';
  else if (res.tier === 'Elevated' || res.tier === 'High') color = '#e11d48';
  gaugeCircle.style.stroke = color;

  // Summary & Catalysts
  document.getElementById('gauge-summary').innerText = res.score <= 35
    ? 'Autonomic balance is favorable. Parasympathetic tone is dominant.'
    : res.score <= 60
    ? 'Moderate strain detected. Ergonomic micro-breaks and timely wind-down advised.'
    : 'Elevated sympathetic tone. Immediate restorative protocols indicated.';

  const driversEl = document.getElementById('drivers-list');
  driversEl.innerHTML = '';
  res.drivers.forEach(d => {
    const li = document.createElement('li');
    li.innerText = '• ' + d;
    driversEl.appendChild(li);
  });

  // Update Sleep Card
  document.getElementById('sleep-actual-display').innerText = res.sleepData.actualHours + ' hrs';
  document.getElementById('sleep-deficit-display').innerText = res.sleepData.deficit + ' hrs';
  document.getElementById('sleep-bedtime-display').innerText = res.sleepData.suggestedBedtime;
  document.getElementById('sleep-percent-text').innerText = res.sleepData.percent + '% of 8.0h';
  document.getElementById('sleep-progress-bar').style.width = res.sleepData.percent + '%';

  let recText = '';
  if (res.sleepData.deficit === 0) {
    recText = 'Optimal restorative window achieved. You attained the clinical 8.0h ceiling for cognitive and cellular renewal.';
  } else {
    recText = 'You are ' + res.sleepData.deficit + 'h short of the optimal 8.0h restorative ceiling. Prioritize wind-down tonight at ' + res.sleepData.suggestedBedtime + ' to restore full neuro-cellular equilibrium.';
  }
  document.getElementById('sleep-recommendation-text').innerText = recText;

  // 1. Update IoT Wearable Telemetry
  updateWearableMetrics(res.score);

  // 2. Update Circadian Caffeine Decay
  updateCircadianDisplay(caffeine);

  // 3. Tele-MANAS Crisis Safety Net Evaluation
  const crisisBanner = document.getElementById('telemanas-crisis-banner');
  if (crisisBanner) {
    if (res.score >= 80 || activeMood === 'anxious' || activeMood === 'exhausted') {
      crisisBanner.classList.remove('hidden');
    } else {
      crisisBanner.classList.add('hidden');
    }
  }
}

export async function handleFormSubmit(e) {
  e.preventDefault();
  const workH = parseFloat(document.getElementById('input-work').value);
  const sleepH = parseFloat(document.getElementById('input-sleep').value);
  const quality = parseInt(document.getElementById('input-quality').value);
  const fatigue = parseInt(document.getElementById('input-fatigue').value);
  const screenH = parseFloat(document.getElementById('input-screen').value) || 0;
  const breaks = parseInt(document.getElementById('input-breaks').value) || 0;
  const water = parseInt(document.getElementById('input-water').value) || 0;
  const caffeine = parseInt(document.getElementById('input-caffeine').value) || 0;
  const movement = parseInt(document.getElementById('input-movement').value) || 0;
  const notes = document.getElementById('input-notes').value || '';

  const res = calculateStress(workH, sleepH, quality, fatigue, activeMood, screenH, breaks, water, caffeine, movement);

  const log = {
    id: 'log-' + todayStr,
    date: todayStr,
    workingHours: workH,
    sleepHours: sleepH,
    sleepQuality: quality,
    fatigueLevel: fatigue,
    mood: activeMood,
    predictedStressScore: res.score,
    stressTier: res.tier,
    stressDrivers: res.drivers,
    sleepAnalysis: res.sleepData,
    activities: { screenTimeHours: screenH, breaksTaken: breaks, waterGlasses: water, caffeineCups: caffeine, physicalActivityMinutes: movement },
    notes
  };

  const existingIndex = appLogs.findIndex(l => l.date === todayStr);
  if (existingIndex >= 0) appLogs[existingIndex] = log;
  else appLogs.push(log);

  await saveDailyLog(log);
  showToast('Daily log saved securely to persistent database!');
  playChime(528);
}

/* -------------------------------------------------------------
   TREND GRAPH RENDERER (Cubic Bezier Spline)
------------------------------------------------------------- */
export function renderTrendGraph() {
  const svg = document.getElementById('trend-svg');
  if (!svg) return;
  svg.innerHTML = '';

  const logs = [...appLogs].sort((a,b) => a.date.localeCompare(b.date)).slice(-7);
  if (logs.length === 0) return;

  const width = 700;
  const height = 220;
  const padLeft = 45;
  const padRight = 35;
  const padTop = 25;
  const padBottom = 35;

  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;

  // Threshold lines: 0, 35, 60, 80, 100
  [0, 35, 60, 80, 100].forEach(val => {
    const y = padTop + plotHeight - (val / 100) * plotHeight;
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', padLeft);
    line.setAttribute('y1', y);
    line.setAttribute('x2', width - padRight);
    line.setAttribute('y2', y);
    line.setAttribute('stroke', val === 35 || val === 60 ? '#cbd5e1' : '#f1f5f9');
    line.setAttribute('stroke-dasharray', val === 35 || val === 60 ? '4 4' : 'none');
    svg.appendChild(line);

    const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    txt.setAttribute('x', padLeft - 8);
    txt.setAttribute('y', y + 3);
    txt.setAttribute('fill', '#94a3b8');
    txt.setAttribute('font-size', '10');
    txt.setAttribute('text-anchor', 'end');
    txt.textContent = val;
    svg.appendChild(txt);
  });

  const points = logs.map((log, idx) => {
    const x = padLeft + (idx / Math.max(1, logs.length - 1)) * plotWidth;
    const y = padTop + plotHeight - (log.predictedStressScore / 100) * plotHeight;
    return { x, y, log, idx };
  });

  // Construct Cubic Bezier Spline Path
  let pathD = '';
  points.forEach((pt, i) => {
    if (i === 0) {
      pathD += 'M ' + pt.x + ' ' + pt.y;
    } else {
      const prev = points[i - 1];
      const cp1x = prev.x + (pt.x - prev.x) / 2;
      const cp1y = prev.y;
      const cp2x = prev.x + (pt.x - prev.x) / 2;
      const cp2y = pt.y;
      pathD += ' C ' + cp1x + ' ' + cp1y + ', ' + cp2x + ' ' + cp2y + ', ' + pt.x + ' ' + pt.y;
    }
  });

  // Area under curve
  const areaD = pathD + ' L ' + points[points.length - 1].x + ' ' + (padTop + plotHeight) + ' L ' + points[0].x + ' ' + (padTop + plotHeight) + ' Z';
  const areaPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  areaPath.setAttribute('d', areaD);
  areaPath.setAttribute('fill', 'rgba(13, 148, 136, 0.12)');
  svg.appendChild(areaPath);

  // Line
  const linePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  linePath.setAttribute('d', pathD);
  linePath.setAttribute('fill', 'none');
  linePath.setAttribute('stroke', '#0d9488');
  linePath.setAttribute('stroke-width', '3.5');
  linePath.setAttribute('stroke-linecap', 'round');
  linePath.setAttribute('stroke-linejoin', 'round');
  svg.appendChild(linePath);

  // Dots
  points.forEach(pt => {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', pt.x);
    circle.setAttribute('cy', pt.y);
    circle.setAttribute('r', '6');
    circle.setAttribute('fill', pt.log.predictedStressScore <= 35 ? '#0d9488' : pt.log.predictedStressScore <= 60 ? '#d97706' : '#e11d48');
    circle.setAttribute('stroke', '#ffffff');
    circle.setAttribute('stroke-width', '2.5');
    circle.style.cursor = 'pointer';

    const inspectThisDay = () => {
      document.getElementById('insp-score').innerText = pt.log.predictedStressScore;
      document.getElementById('insp-score').style.backgroundColor = pt.log.predictedStressScore <= 35 ? '#ccfbf1' : pt.log.predictedStressScore <= 60 ? '#fef3c7' : '#ffe4e6';
      document.getElementById('insp-score').style.color = pt.log.predictedStressScore <= 35 ? '#115e59' : pt.log.predictedStressScore <= 60 ? '#92400e' : '#be123c';
      document.getElementById('insp-date').innerText = 'Date: ' + pt.log.date;
      document.getElementById('insp-details').innerText = 'Sleep: ' + pt.log.sleepHours + 'h (' + (pt.log.sleepAnalysis ? pt.log.sleepAnalysis.deficit : '0') + 'h deficit) • Fatigue: ' + pt.log.fatigueLevel + '/10 • Work: ' + pt.log.workingHours + 'h';
      document.getElementById('insp-badge').innerText = pt.log.stressTier + ' Strain';
      playChime(432);
    };

    circle.onmouseenter = inspectThisDay;
    circle.onclick = inspectThisDay;
    svg.appendChild(circle);

    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', pt.x);
    label.setAttribute('y', height - 12);
    label.setAttribute('fill', '#64748b');
    label.setAttribute('font-size', '10');
    label.setAttribute('text-anchor', 'middle');
    label.textContent = pt.log.date.slice(5);
    svg.appendChild(label);
  });

  // Calculate 7-Day Stats
  const scores = logs.map(l => l.predictedStressScore);
  const avg = Math.round(scores.reduce((a,b)=>a+b, 0) / scores.length);
  const peak = Math.max(...scores);
  const low = Math.min(...scores);
  const avgSleep = (logs.reduce((a,b)=>a+b.sleepHours, 0) / logs.length).toFixed(1);

  document.getElementById('trend-avg').innerText = avg;
  document.getElementById('trend-peak').innerText = peak;
  document.getElementById('trend-low').innerText = low;
  document.getElementById('trend-avg-sleep').innerText = avgSleep + 'h';
}

/* -------------------------------------------------------------
   EXERCISE TIMER
------------------------------------------------------------- */
let exTimerInterval = null;
let exTimerSeconds = 0;
let exTimerRunning = false;

export function startRoutineTimer(name, mins) {
  document.getElementById('exercise-timer-card').classList.remove('hidden');
  document.getElementById('active-routine-name').innerText = name + ' (' + mins + 'm)';
  exTimerSeconds = mins * 60;
  exTimerRunning = true;
  document.getElementById('btn-toggle-ex-timer').innerText = 'Pause';
  updateTimerDisplay();

  clearInterval(exTimerInterval);
  exTimerInterval = setInterval(() => {
    if (exTimerSeconds > 0) {
      exTimerSeconds--;
      updateTimerDisplay();
    } else {
      clearInterval(exTimerInterval);
      exTimerRunning = false;
      playChime(528);
      showToast('Routine completed! Neuro-muscular tension discharged.');
    }
  }, 1000);
}

function updateTimerDisplay() {
  const m = Math.floor(exTimerSeconds / 60);
  const s = exTimerSeconds % 60;
  document.getElementById('active-timer-display').innerText = String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
}

export function toggleExerciseTimer() {
  exTimerRunning = !exTimerRunning;
  document.getElementById('btn-toggle-ex-timer').innerText = exTimerRunning ? 'Pause' : 'Resume';
  if (!exTimerRunning) clearInterval(exTimerInterval);
  else {
    exTimerInterval = setInterval(() => {
      if (exTimerSeconds > 0) { exTimerSeconds--; updateTimerDisplay(); }
    }, 1000);
  }
}

export function resetExerciseTimer() {
  clearInterval(exTimerInterval);
  exTimerRunning = false;
  document.getElementById('exercise-timer-card').classList.add('hidden');
}

/* -------------------------------------------------------------
   BREATHING PACER
------------------------------------------------------------- */
let pacerInterval = null;
let pacerMode = 'box';
let pacerRunning = false;
let pacerCycleCount = 0;

const PACER_PATTERNS = {
  box: [
    { name: 'Inhale', duration: 4, cls: 'breath-inhale', freq: 432 },
    { name: 'Hold', duration: 4, cls: 'breath-hold', freq: 528 },
    { name: 'Exhale', duration: 4, cls: 'breath-exhale', freq: 396 },
    { name: 'Rest', duration: 4, cls: 'breath-rest', freq: 432 }
  ],
  sleep: [
    { name: 'Inhale', duration: 4, cls: 'breath-inhale', freq: 432 },
    { name: 'Hold', duration: 7, cls: 'breath-hold', freq: 528 },
    { name: 'Exhale', duration: 8, cls: 'breath-exhale', freq: 396 }
  ],
  coherent: [
    { name: 'Inhale', duration: 5, cls: 'breath-inhale', freq: 432 },
    { name: 'Exhale', duration: 5, cls: 'breath-exhale', freq: 396 }
  ],
  sigh: [
    { name: 'Deep Inhale', duration: 3, cls: 'breath-inhale', freq: 432 },
    { name: 'Top-Off Inhale', duration: 1, cls: 'breath-hold', freq: 528 },
    { name: 'Long Exhale', duration: 6, cls: 'breath-exhale', freq: 396 }
  ]
};

export function setPacerMode(m) {
  if (pacerRunning) togglePacer();
  pacerMode = m;
  document.getElementById('pacer-btn-box').className = 'px-2.5 py-1 text-xs font-semibold rounded-lg text-slate-600';
  document.getElementById('pacer-btn-sleep').className = 'px-2.5 py-1 text-xs font-semibold rounded-lg text-slate-600';
  document.getElementById('pacer-btn-coherent').className = 'px-2.5 py-1 text-xs font-semibold rounded-lg text-slate-600';
  document.getElementById('pacer-btn-sigh').className = 'px-2.5 py-1 text-xs font-semibold rounded-lg text-slate-600';
  document.getElementById('pacer-btn-' + m).className = 'px-2.5 py-1 text-xs font-semibold rounded-lg bg-white text-teal-800 shadow-xs';
}

export function togglePacer() {
  pacerRunning = !pacerRunning;
  const btnText = document.getElementById('pacer-toggle-text');
  if (pacerRunning) {
    btnText.innerText = 'Pause Breathing Session';
    startPacerLoop();
  } else {
    btnText.innerText = 'Resume Breathing Session';
    clearInterval(pacerInterval);
  }
}

function startPacerLoop() {
  const pattern = PACER_PATTERNS[pacerMode];
  let stepIndex = 0;
  let secondsLeft = pattern[0].duration;

  function updateUI() {
    const curStep = pattern[stepIndex];
    const circle = document.getElementById('pacer-circle');
    circle.className = 'breath-circle ' + curStep.cls;
    document.getElementById('pacer-phase').innerText = curStep.name;
    document.getElementById('pacer-seconds').innerText = secondsLeft + 's';
    document.getElementById('pacer-cycles').innerText = 'Cycle ' + pacerCycleCount;
  }

  updateUI();
  playChime(pattern[0].freq);

  pacerInterval = setInterval(() => {
    secondsLeft--;
    if (secondsLeft <= 0) {
      stepIndex++;
      if (stepIndex >= pattern.length) {
        stepIndex = 0;
        pacerCycleCount++;
      }
      secondsLeft = pattern[stepIndex].duration;
      playChime(pattern[stepIndex].freq);
    }
    updateUI();
  }, 1000);
}

/* -------------------------------------------------------------
   PROFILE & NOTIFICATIONS
------------------------------------------------------------- */
export async function handleSaveProfile(e) {
  e.preventDefault();
  const uName = (document.getElementById('prof-username').value || '').trim();
  if (!uName) return;

  const ageEl = document.getElementById('prof-age');
  const errEl = document.getElementById('prof-age-err');
  const ageVal = parseInt(ageEl ? ageEl.value : '', 10);
  if (isNaN(ageVal) || ageVal < 18 || ageVal > 62) {
    if (errEl) errEl.classList.remove('hidden');
    alert('Please enter a valid age between 18 and 62 years.');
    if (ageEl) ageEl.focus();
    return;
  }
  if (errEl) errEl.classList.add('hidden');

  appProfile.username = uName;
  appProfile.age = ageVal;
  appProfile.preferredWakeTime = document.getElementById('prof-waketime').value;

  await saveProfile(appProfile);

  updateHeaderAvatar();
  updateLiveCalculation();
  showToast('Profile preferences updated in database.');
  playChime(528);
}

export function handleAvatarUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (evt) => {
    appProfile.avatarUrl = evt.target.result;
    await saveProfile(appProfile);
    updateHeaderAvatar();
    showToast('Profile avatar photo updated.');
    playChime(528);
  };
  reader.readAsDataURL(file);
}

export async function removeAvatar() {
  appProfile.avatarUrl = '';
  await saveProfile(appProfile);
  updateHeaderAvatar();
  showToast('Profile photo removed.');
}

function updateHeaderAvatar() {
  const el = document.getElementById('header-avatar');
  const prev = document.getElementById('profile-photo-preview');
  const nameEl = document.getElementById('header-name');
  if (nameEl) nameEl.innerText = appProfile.username || 'Alex Morgan';

  if (appProfile.avatarUrl) {
    el.innerHTML = '<img src="' + appProfile.avatarUrl + '" style="width:100%;height:100%;object-fit:cover;">';
    prev.innerHTML = '<img src="' + appProfile.avatarUrl + '" style="width:100%;height:100%;object-fit:cover;">';
  } else {
    const initials = (appProfile.username || 'AM').slice(0, 2).toUpperCase();
    el.innerText = initials;
    prev.innerText = initials;
  }

  const wakeSub = document.getElementById('sleep-wake-target-sub');
  if (wakeSub) wakeSub.innerText = 'For ' + (appProfile.preferredWakeTime || '06:30') + ' wake-up';

  if (document.getElementById('prof-username')) document.getElementById('prof-username').value = appProfile.username || 'Alex Morgan';
  if (document.getElementById('prof-age')) document.getElementById('prof-age').value = appProfile.age || 28;
  if (document.getElementById('prof-waketime')) document.getElementById('prof-waketime').value = appProfile.preferredWakeTime || '06:30';
}

export async function toggleNotification(key) {
  appNotifications[key] = !appNotifications[key];
  appProfile.notifications = appNotifications;
  await saveProfile(appProfile);

  const toggleEl = document.getElementById('toggle-' + (key === 'breakReminders' ? 'break-reminders' : key === 'bedtimeAlert' ? 'bedtime-alert' : 'sound'));
  if (appNotifications[key]) toggleEl.classList.add('active');
  else toggleEl.classList.remove('active');

  showToast('Reminder preference updated.');
  playChime(432);
}

/* -------------------------------------------------------------
   DATA BACKUP & RESTORE
------------------------------------------------------------- */
export function exportJSON() {
  window.location.href = '/api/backup/export';
  showToast('Backup JSON downloading from server...');
  playChime(528);
}

export function restoreJSON(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (evt) => {
    try {
      const parsed = JSON.parse(evt.target.result);
      const res = await fetch('/api/backup/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed)
      });
      if (res.ok) {
        showToast('Backup successfully restored to server!');
        setTimeout(() => location.reload(), 600);
      } else {
        alert('Server rejected backup format.');
      }
    } catch(err) {
      alert('Invalid backup JSON format.');
    }
  };
  reader.readAsText(file);
}

export async function wipeData() {
  if (confirm('Are you sure you want to clear all local logs and profile preferences?')) {
    await wipeAllData();
    location.reload();
  }
}

// Global window mappings for HTML onclick handlers
if (typeof window !== 'undefined') {
  window.setTab = setTab;
  window.quickLog = quickLog;
  window.selectMood = selectMood;
  window.updateLiveCalculation = updateLiveCalculation;
  window.handleFormSubmit = handleFormSubmit;
  window.startRoutineTimer = startRoutineTimer;
  window.toggleExerciseTimer = toggleExerciseTimer;
  window.resetExerciseTimer = resetExerciseTimer;
  window.setPacerMode = setPacerMode;
  window.togglePacer = togglePacer;
  window.handleSaveProfile = handleSaveProfile;
  window.handleAvatarUpload = handleAvatarUpload;
  window.removeAvatar = removeAvatar;
  window.toggleNotification = toggleNotification;
  window.exportJSON = exportJSON;
  window.restoreJSON = restoreJSON;
  window.wipeData = wipeData;
  window.playChime = playChime;

  // Audio Sanctuary window bindings
  window.toggleBinauralBeats = toggleBinauralBeats;
  window.setBinauralMode = setBinauralMode;
  window.toggleAmbientSoundscape = toggleAmbientSoundscape;
  window.setAmbientMode = setAmbientMode;
  window.setMasterVolume = setMasterVolume;

  // SIH Hackathon Pillars window bindings
  window.setLanguage = setLanguage;
  window.toggleWearableConnection = toggleWearableConnection;
  window.handleAnalyzeThought = handleAnalyzeThought;
  window.handleLockWorry = handleLockWorry;
  window.toggleSunlightTimer = toggleSunlightTimer;
  window.resetSunlightTimer = resetSunlightTimer;
  window.toggleCopilotDrawer = toggleCopilotDrawer;
  window.sendCopilotMessage = sendCopilotMessage;
  window.loadJudgeDemoPersona = loadJudgeDemoPersona;
  window.loadForcesData = loadForcesData;
  window.setForcesRole = setForcesRole;
  window.setForcesBattalionFilter = setForcesBattalionFilter;
  window.submitJawanAssessment = submitJawanAssessment;
  window.sendJawanWelfareSOS = sendJawanWelfareSOS;
  window.acknowledgeForcesAlert = acknowledgeForcesAlert;
  window.dispatchForcesAction = dispatchForcesAction;
  window.quickDispatchIntervention = quickDispatchIntervention;
  window.loadJudgeSimulationTheater = loadJudgeSimulationTheater;
  window.downloadAnonymizedDataset = downloadAnonymizedDataset;
}

/* -------------------------------------------------------------
   BOOTSTRAP APPLICATION
------------------------------------------------------------- */
async function bootstrap() {
  // Initialize language from local storage
  try {
    const savedLang = localStorage.getItem('serenetrack_lang');
    if (savedLang) setLanguage(savedLang);
  } catch(e) {}

  const initial = await loadInitialData();
  if (initial.profile) {
    appProfile = { ...appProfile, ...initial.profile };
    if (initial.profile.notifications) {
      appNotifications = { ...appNotifications, ...initial.profile.notifications };
    }
  }

  if (initial.logs && initial.logs.length > 0) {
    appLogs = initial.logs;
  }

  // Populate Today's inputs if existing log for today exists
  const todayLog = appLogs.find(l => l.date === todayStr);
  if (todayLog) {
    document.getElementById('input-work').value = todayLog.workingHours;
    document.getElementById('input-sleep').value = todayLog.sleepHours;
    document.getElementById('input-quality').value = todayLog.sleepQuality;
    document.getElementById('input-fatigue').value = todayLog.fatigueLevel;
    if (todayLog.activities) {
      if (todayLog.activities.screenTimeHours !== undefined) document.getElementById('input-screen').value = todayLog.activities.screenTimeHours;
      if (todayLog.activities.breaksTaken !== undefined) document.getElementById('input-breaks').value = todayLog.activities.breaksTaken;
      if (todayLog.activities.waterGlasses !== undefined) document.getElementById('input-water').value = todayLog.activities.waterGlasses;
      if (todayLog.activities.caffeineCups !== undefined) document.getElementById('input-caffeine').value = todayLog.activities.caffeineCups;
      if (todayLog.activities.physicalActivityMinutes !== undefined) document.getElementById('input-movement').value = todayLog.activities.physicalActivityMinutes;
    }
    if (todayLog.notes) document.getElementById('input-notes').value = todayLog.notes;
    if (todayLog.mood) selectMood(todayLog.mood);
  }

  updateHeaderAvatar();
  updateLiveCalculation();
  updateSanctuaryUI();
  updateWearableUI();
  renderVaultEntries();
  loadForcesData();
  applyTranslations();
}

// Initialize on DOM load
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', bootstrap);
}

