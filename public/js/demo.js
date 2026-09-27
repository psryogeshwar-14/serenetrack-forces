/**
 * SereneTrack 1-Click SIH Judge Demo Mode
 * Instantly shifts entire application state between realistic personas for the 3-minute hackathon pitch.
 */

import { selectMood, updateLiveCalculation } from './app.js';
import { updateWearableMetrics } from './wearable.js';
import { updateCircadianDisplay } from './circadian.js';
import { playChime } from './audio.js';

export const DEMO_PERSONAS = {
  student: {
    name: 'Aarav Sharma',
    role: 'NEET / JEE Aspirant (Academic Stress & Acute Sleep Debt)',
    work: 11.5,
    sleep: 4.5,
    quality: 1,
    fatigue: 9,
    mood: 'anxious',
    screen: 10.0,
    breaks: 0,
    water: 3,
    caffeine: 4,
    movement: 5,
    notes: 'Exam mock test pressure, severe insomnia, tight temples, palpitations.',
    triggerCrisis: true
  },
  tech: {
    name: 'Pooja Iyer',
    role: 'Senior Software Engineer (Sprint Crunch & Digital Ocular Load)',
    work: 9.5,
    sleep: 6.0,
    quality: 3,
    fatigue: 6,
    mood: 'exhausted',
    screen: 9.5,
    breaks: 1,
    water: 4,
    caffeine: 5,
    movement: 15,
    notes: 'Late production deployment, excessive blue light exposure, skipped lunch.',
    triggerCrisis: false
  },
  restored: {
    name: 'Karan Verma',
    role: 'Holistic Student (Clinical 8.0h Ceiling & Vagal Tone Restored)',
    work: 7.5,
    sleep: 8.0,
    quality: 5,
    fatigue: 2,
    mood: 'calm',
    screen: 5.5,
    breaks: 4,
    water: 8,
    caffeine: 1,
    movement: 45,
    notes: 'Attained full 8.0h restorative ceiling. Morning sunlight and cadenced breaks maintained.',
    triggerCrisis: false
  },
  forces_cobra: {
    name: 'Ct. Rajesh Kumar Singh (204 CoBRA Sukma)',
    role: 'LWE Hardship, 215 days no leave, 14h shift, Critical Burnout',
    forcesScenario: 'sukma_cobra_crisis'
  },
  forces_kashmir: {
    name: 'Ct. Mohammad Farooq (110 Bn Srinagar)',
    role: 'High Altitude CI Ops, Cold Stress, Sub-Zero Night Sentry',
    forcesScenario: 'srinagar_ci_ops'
  },
  forces_raf: {
    name: 'Ct. Sandeep Yadav (103 RAF)',
    role: 'Rapid Action Force, Sudden Riot Mobilization, 14h Shift',
    forcesScenario: 'raf_riot_order'
  },
  forces_peace: {
    name: 'HC Dinesh Murmu (50 Bn CRPF)',
    role: 'Static Peace Garrison, Restored Autonomic Tone',
    forcesScenario: 'peace_station_delhi'
  }
};

export function loadJudgeDemoPersona(personaKey) {
  const p = DEMO_PERSONAS[personaKey];
  if (!p) return;

  if (p.forcesScenario) {
    if (window.setTab) window.setTab('forces');
    if (window.loadJudgeSimulationTheater) window.loadJudgeSimulationTheater(p.forcesScenario);
    return;
  }

  // Update form inputs
  document.getElementById('input-work').value = p.work;
  document.getElementById('input-sleep').value = p.sleep;
  document.getElementById('input-quality').value = p.quality;
  document.getElementById('input-fatigue').value = p.fatigue;
  document.getElementById('input-screen').value = p.screen;
  document.getElementById('input-breaks').value = p.breaks;
  document.getElementById('input-water').value = p.water;
  document.getElementById('input-caffeine').value = p.caffeine;
  document.getElementById('input-movement').value = p.movement;
  document.getElementById('input-notes').value = p.notes;

  // Set mood
  selectMood(p.mood);

  // Recalculate live engine
  updateLiveCalculation();

  // Recalculate circadian caffeine decay
  updateCircadianDisplay(p.caffeine);

  // Read resulting score
  const score = parseInt(document.getElementById('gauge-score').innerText, 10);
  updateWearableMetrics(score);

  // Handle Tele-MANAS Crisis banner visibility
  const crisisBanner = document.getElementById('telemanas-crisis-banner');
  if (crisisBanner) {
    if (p.triggerCrisis || score >= 80) {
      crisisBanner.classList.remove('hidden');
    } else {
      crisisBanner.classList.add('hidden');
    }
  }

  // Toast feedback
  const toast = document.getElementById('toast');
  if (toast) {
    toast.innerText = `🎤 SIH Demo: Loaded ${p.name} (${p.role})`;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3500);
  }

  playChime(score > 60 ? 396 : 528);
}

// Global window mapping
if (typeof window !== 'undefined') {
  window.loadJudgeDemoPersona = loadJudgeDemoPersona;
}
