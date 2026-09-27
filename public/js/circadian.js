/**
 * SereneTrack Circadian Biology & Caffeine Metabolic Engine
 * - Calculates caffeine half-life decay (t1/2 = 5.5 hours)
 * - Identifies adenosine receptor clearance horizon for slow-wave sleep
 * - Morning lux/sunlight exposure stopwatch
 */

import { playChime } from './audio.js';

const CAFFEINE_HALF_LIFE_HOURS = 5.5;
const MG_PER_CUP = 95; // Standard coffee serving (tea ~45mg)
const SLEEP_PERMISSIBLE_MG = 25; // mg threshold below which adenosine binding is unblocked

export function calculateCaffeineDecay(cups = 2, lastIntakeHour = 14) {
  const totalCaffeineMg = cups * MG_PER_CUP;
  if (totalCaffeineMg === 0) {
    return {
      totalMg: 0,
      clearanceHour: 'Cleared',
      hoursToClear: 0,
      percentBlocked: 0
    };
  }

  // Hours required to decay from totalMg to SLEEP_PERMISSIBLE_MG
  // SLEEP_PERMISSIBLE_MG = totalMg * (0.5)^(t / 5.5)
  // log(25 / totalMg) = (t / 5.5) * log(0.5)
  const hoursToClear = Math.max(0, CAFFEINE_HALF_LIFE_HOURS * (Math.log(totalCaffeineMg / SLEEP_PERMISSIBLE_MG) / Math.log(2)));
  const clearanceTotalHours = lastIntakeHour + hoursToClear;

  const cH = Math.floor(clearanceTotalHours) % 24;
  const cM = Math.round((clearanceTotalHours % 1) * 60);
  const formattedClearance = `${String(cH).padStart(2, '0')}:${String(cM).padStart(2, '0')}`;

  return {
    totalMg: totalCaffeineMg,
    clearanceHour: formattedClearance,
    hoursToClear: parseFloat(hoursToClear.toFixed(1)),
    percentBlocked: Math.min(100, Math.round((totalCaffeineMg / 250) * 100))
  };
}

export function updateCircadianDisplay(cups = 2) {
  const decay = calculateCaffeineDecay(cups);

  const totalMgEl = document.getElementById('caffeine-total-mg');
  const horizonEl = document.getElementById('caffeine-clearance-horizon');
  const hoursEl = document.getElementById('caffeine-hours-remaining');
  const barEl = document.getElementById('caffeine-decay-bar');

  if (totalMgEl) totalMgEl.innerText = `${decay.totalMg} mg`;
  if (horizonEl) horizonEl.innerText = decay.clearanceHour;
  if (hoursEl) hoursEl.innerText = `~${decay.hoursToClear} hrs post-intake`;
  if (barEl) barEl.style.width = `${decay.percentBlocked}%`;

  const noteEl = document.getElementById('caffeine-advice-note');
  if (noteEl) {
    if (decay.totalMg === 0) {
      noteEl.innerText = 'Zero stimulant burden. Adenosine receptors are unobstructed for restorative slow-wave sleep.';
    } else if (decay.totalMg >= 250) {
      noteEl.innerText = `High caffeine load (${decay.totalMg}mg) will delay deep N3 sleep onset until approximately ${decay.clearanceHour}. Avoid late evening screens.`;
    } else {
      noteEl.innerText = `Caffeine will clear your system by ${decay.clearanceHour}. Safe sleep window aligns with your target bedtime.`;
    }
  }
}

/* -------------------------------------------------------------
   MORNING SUNLIGHT (LUX) TIMER
------------------------------------------------------------- */
let sunTimerInterval = null;
let sunTimerSeconds = 600; // 10 minutes
let sunTimerRunning = false;

export function toggleSunlightTimer() {
  sunTimerRunning = !sunTimerRunning;
  const btn = document.getElementById('btn-toggle-sun-timer');
  if (btn) btn.innerText = sunTimerRunning ? 'Pause' : 'Resume';

  if (sunTimerRunning) {
    sunTimerInterval = setInterval(() => {
      if (sunTimerSeconds > 0) {
        sunTimerSeconds--;
        renderSunTimer();
      } else {
        clearInterval(sunTimerInterval);
        sunTimerRunning = false;
        playChime(528);
        alert('☀️ Morning sunlight protocol complete! Suprachiasmatic nucleus anchored for optimal evening melatonin onset.');
      }
    }, 1000);
  } else {
    clearInterval(sunTimerInterval);
  }
}

export function resetSunlightTimer() {
  clearInterval(sunTimerInterval);
  sunTimerRunning = false;
  sunTimerSeconds = 600;
  const btn = document.getElementById('btn-toggle-sun-timer');
  if (btn) btn.innerText = 'Start (10m)';
  renderSunTimer();
}

function renderSunTimer() {
  const el = document.getElementById('sun-timer-display');
  if (!el) return;
  const m = Math.floor(sunTimerSeconds / 60);
  const s = sunTimerSeconds % 60;
  el.innerText = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// Global window bindings
if (typeof window !== 'undefined') {
  window.toggleSunlightTimer = toggleSunlightTimer;
  window.resetSunlightTimer = resetSunlightTimer;
  window.updateCircadianDisplay = updateCircadianDisplay;
}
