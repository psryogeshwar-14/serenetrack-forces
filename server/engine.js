/**
 * SereneTrack Clinical Algorithm Engine
 * - Restorative Sleep with strict 8.0h clinical ceiling
 * - Predictive Autonomic Strain (0-100) with biometric & ergonomic catalysts
 */

export const MAX_RESTORATIVE_SLEEP = 8.0;

export function calculateSleep(actualHours, quality, wakeTimeStr = '06:30') {
  const actual = Math.max(0, parseFloat(actualHours) || 0);
  const target = MAX_RESTORATIVE_SLEEP;
  const deficit = Math.max(0, parseFloat((target - actual).toFixed(1)));

  const [wH, wM] = (wakeTimeStr || '06:30').split(':').map(Number);
  const wakeTotalMinutes = (isNaN(wH) ? 6 : wH) * 60 + (isNaN(wM) ? 30 : wM);
  let bedMinutes = wakeTotalMinutes - 495; // 8h sleep + 15m wind-down
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

export function calculateStress({
  workingHours = 8,
  sleepHours = 7,
  sleepQuality = 4,
  fatigueLevel = 4,
  mood = 'calm',
  screenTimeHours = 7,
  breaksTaken = 3,
  waterGlasses = 6,
  caffeineCups = 2,
  physicalActivityMinutes = 30,
  preferredWakeTime = '06:30'
}) {
  const workH = parseFloat(workingHours) || 0;
  const sleepH = parseFloat(sleepHours) || 0;
  const quality = parseInt(sleepQuality, 10) || 3;
  const fatigue = parseInt(fatigueLevel, 10) || 4;
  const screenH = parseFloat(screenTimeHours) || 0;
  const breaks = parseInt(breaksTaken, 10) || 0;
  const water = parseInt(waterGlasses, 10) || 0;
  const caffeine = parseInt(caffeineCups, 10) || 0;
  const movement = parseInt(physicalActivityMinutes, 10) || 0;

  let score = 25;
  const drivers = [];

  if (workH > 10) { score += 26; drivers.push(`Extended working schedule (${workH}h)`); }
  else if (workH > 8) { score += 14; drivers.push(`Overtime work duration (${workH}h)`); }
  else if (workH < 5) { score -= 6; }

  const sleepData = calculateSleep(sleepH, quality, preferredWakeTime);
  if (sleepH < 5) { score += 28; drivers.push(`Severe sleep deficit (${sleepH}h vs 8.0h limit)`); }
  else if (sleepH < 6.5) { score += 16; drivers.push(`Sleep deficit (${sleepData.deficit}h below 8.0h ceiling)`); }
  else if (sleepH >= 7.5) { score -= 12; }

  if (quality <= 2) { score += 12; drivers.push(`Fragmented sleep quality rating (${quality}/5)`); }
  else if (quality >= 4) { score -= 8; }

  if (fatigue >= 8) { score += 22; drivers.push(`Severe physical fatigue (${fatigue}/10)`); }
  else if (fatigue >= 5) { score += 10; drivers.push(`Elevated fatigue index (${fatigue}/10)`); }
  else if (fatigue <= 3) { score -= 6; }

  const moodOffsets = { calm: -14, energetic: -8, content: -10, neutral: 0, anxious: 18, exhausted: 24 };
  if (moodOffsets[mood] !== undefined) score += moodOffsets[mood];
  if (['anxious', 'exhausted'].includes(mood)) drivers.push(`Heightened nervous system arousal (${mood})`);

  if (screenH > 9) { score += 12; drivers.push(`Prolonged screen exposure (${screenH}h)`); }
  if (breaks < 2) { score += 10; drivers.push('Lack of mindful breaks (<2 taken)'); }
  else if (breaks >= 4) { score -= 8; }

  if (caffeine >= 4) { score += 12; drivers.push(`Elevated caffeine consumption (${caffeine} cups)`); }
  if (water < 4) { score += 8; drivers.push('Suboptimal hydration (<4 glasses)'); }
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
