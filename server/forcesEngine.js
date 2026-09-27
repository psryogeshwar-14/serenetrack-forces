/**
 * AI Predictive Personnel Stress and Welfare Monitoring Engine
 * Built for Ministry of Home Affairs (MHA) - CRPF, Police II Division
 * Problem Statement ID: 26186
 * 
 * Multi-Factor Predictive Modeling:
 * 1. Organizational & HRMS Signals: Deployment Hardship Zone, Days Since Leave,
 *    Leave Rejection/Deferral, Duty Shift Hours, Consecutive Night Duties, Outpost Isolation.
 * 2. Voluntary Biometric Telemetry: HRV (rMSSD ms), Resting Heart Rate (bpm), Sleep Deficit.
 * 3. Voluntary Behavioral & Psychological Self-Assessments: PSS-10 score, Operational Fatigue, Family Contact.
 * 
 * Philosophy: Proactive, non-punitive, explainable AI (XAI) focused strictly on welfare support.
 */

export const HARDSHIP_ZONES = {
  ZONE_LWE: {
    code: 'ZONE_LWE',
    name: 'Left-Wing Extremism (LWE / CoBRA - Sukma/Bastar)',
    hardshipWeight: 28,
    threatLevel: 'Extreme',
    climateStress: 'High Humidity & Jungle Terrain'
  },
  ZONE_HIGH_ALTITUDE: {
    code: 'ZONE_HIGH_ALTITUDE',
    name: 'High Altitude & Cold Weather (J&K / Ladakh / ITBP)',
    hardshipWeight: 24,
    threatLevel: 'High',
    climateStress: 'Hypoxia & Sub-Zero Temperatures'
  },
  ZONE_CI_OPS: {
    code: 'ZONE_CI_OPS',
    name: 'Counter-Insurgency Operations (CI / Valley Sector)',
    hardshipWeight: 22,
    threatLevel: 'High',
    climateStress: 'Continuous Cordon & Search Readiness'
  },
  ZONE_PUBLIC_ORDER: {
    code: 'ZONE_PUBLIC_ORDER',
    name: 'Rapid Action Force (RAF / Public Order & Riot Control)',
    hardshipWeight: 16,
    threatLevel: 'Moderate-High',
    climateStress: 'Rapid Short-Notice Mobilization'
  },
  ZONE_PEACE_STATIC: {
    code: 'ZONE_PEACE_STATIC',
    name: 'Peace Posting / Static Guard / Training Garrison',
    hardshipWeight: 4,
    threatLevel: 'Low',
    climateStress: 'Standard Garrison Conditions'
  }
};

export const CLINICAL_SLEEP_CEILING = 8.0;

/**
 * Multi-Factor AI Risk Calculation for Uniformed Forces Personnel
 */
export function calculateForcesRisk({
  deploymentZone = 'ZONE_PEACE_STATIC',
  deploymentDurationMonths = 6,
  daysSinceLastLeave = 45,
  leaveRejectionCount = 0,
  dutyShiftHours = 8.0,
  consecutiveNightDuties = 1,
  outpostIsolationScore = 2, // 1 (city) to 5 (cut-off border post)
  transferCount = 1, // unit/station transfers in last 3 years
  trainingCommitment = 'Standard Garrison Drill', // training commitment course
  workloadTrend = 'stable', // 'increasing' | 'stable' | 'decreasing'
  voluntaryBiometrics = {},
  latestAssessment = {}
} = {}) {
  let score = 20; // baseline military stress calibration
  const drivers = [];
  const interventions = [];

  // Parse & normalize all HRMS indicators upfront (eliminating TDZ errors and NaN hazards)
  const zoneInfo = HARDSHIP_ZONES[deploymentZone] || HARDSHIP_ZONES.ZONE_PEACE_STATIC;
  const depMonths = parseFloat(deploymentDurationMonths) || 0;
  const daysNoLeave = parseInt(daysSinceLastLeave, 10) || 0;
  const rejections = parseInt(leaveRejectionCount, 10) || 0;
  const shiftH = dutyShiftHours !== undefined && !isNaN(parseFloat(dutyShiftHours)) ? parseFloat(dutyShiftHours) : 8.0;
  const nightDuties = parseInt(consecutiveNightDuties, 10) || 0;
  const isolation = parseInt(outpostIsolationScore, 10) || 2;
  const transfers = parseInt(transferCount, 10) || 0;
  const training = String(trainingCommitment || 'Standard Garrison Drill');
  const trend = String(workloadTrend || 'stable');

  // 1. Organizational & HRMS Indicators
  score += zoneInfo.hardshipWeight;
  if (zoneInfo.hardshipWeight >= 20) {
    drivers.push(`High operational hardship theater: ${zoneInfo.name}`);
  }

  // Deployment Duration in Hardship Zone
  if (depMonths > 24) {
    score += 18;
    drivers.push(`Extended hardship posting: ${depMonths} consecutive months without peace rotation`);
    interventions.push({
      type: 'ROTATION_PEACE_POSTING',
      title: 'Recommend Rotation to Peace Garrison',
      urgency: 'High',
      description: `Personnel has served ${depMonths} months in ${zoneInfo.name}. Standard CAPF tenure recommends rotation to static/peace station.`
    });
  } else if (depMonths > 18) {
    score += 10;
    drivers.push(`Prolonged hardship tenure (${depMonths} months)`);
  }

  // Days Since Last Leave (Acute separation from family is leading cause of distress in CAPF)
  if (daysNoLeave > 200 || (daysNoLeave > 180 && rejections >= 1)) {
    score += 26;
    drivers.push(`Severe family separation: ${daysNoLeave} days since last home leave`);
    interventions.push({
      type: 'COMPASSIONATE_LEAVE',
      title: 'Fast-Track 15-Day Compassionate Home Leave',
      urgency: 'Critical',
      description: `Exceeded ${daysNoLeave} days away from home with deferred leave. Proactive compassionate leave sanction strongly advised to prevent acute burnout.`
    });
  } else if (daysNoLeave > 150) {
    score += 18;
    drivers.push(`Elevated leave backlog (${daysNoLeave} days without home visit)`);
    interventions.push({
      type: 'LEAVE_SANCTION_RECOMMENDED',
      title: 'Schedule Annual / Casual Leave Window',
      urgency: 'High',
      description: `Personnel has completed ${daysNoLeave} days continuous duty. Plan 10-15 day rest cycle.`
    });
  } else if (daysNoLeave > 100) {
    score += 8;
  } else if (daysNoLeave < 45) {
    score -= 6; // recent restorative leave
  }

  // Leave Rejection History (Frustration & alienation trigger)
  if (rejections >= 3) {
    score += 18;
    drivers.push(`Multiple deferred/rejected leave requests (${rejections} rejections)`);
  } else if (rejections >= 1) {
    score += 9;
    drivers.push(`Recent leave application deferred (${rejections} rejection)`);
  }

  // Duty Shifts & Night Sentry Burden
  if (shiftH > 13) {
    score += 18;
    drivers.push(`Excessive shift duty hours (${shiftH}h/day)`);
    interventions.push({
      type: 'DUTY_ROSTER_REBALANCE',
      title: 'Rebalance Duty Roster & Cap Shifts',
      urgency: 'High',
      description: `Shift duration (${shiftH}h) exceeds safe cognitive capacity. Recommend 8h shift cap with relief sentry.`
    });
  } else if (shiftH > 10) {
    score += 10;
    drivers.push(`Overtime shift duration (${shiftH}h/day)`);
  }

  if (nightDuties >= 5) {
    score += 16;
    drivers.push(`Circadian disruption: ${nightDuties} consecutive night sentry shifts`);
    interventions.push({
      type: 'CIRCADIAN_SHIFT_SWAP',
      title: 'Swap to Day Static / Administrative Duties',
      urgency: 'High',
      description: `Rotate off night sentry to allow circadian melatonin reset and restore REM sleep.`
    });
  } else if (nightDuties >= 3) {
    score += 8;
    drivers.push(`Consecutive night duties (${nightDuties} nights)`);
  }

  // Forward Outpost Isolation
  if (isolation >= 5) {
    score += 12;
    drivers.push('Severe remote outpost isolation (minimal cellular connectivity / family reach)');
    interventions.push({
      type: 'FAMILY_COMM_BOOTH',
      title: 'Facilitate Welfare Satellite / High-Speed Video Call',
      urgency: 'Moderate',
      description: 'Arrange dedicated time at Company HQ satellite communication booth to connect with family.'
    });
  } else if (isolation >= 4) {
    score += 6;
  }

  // Transfer Frequency (Turbulence & Family Dislocation)
  if (transfers >= 3) {
    score += 12;
    drivers.push(`High transfer turbulence: ${transfers} unit transfers in past 3 years (family dislocation strain)`);
    interventions.push({
      type: 'STABILIZE_POSTING',
      title: 'Recommend Posting Tenure Freeze (Welfare Lock)',
      urgency: 'Moderate',
      description: `Personnel has experienced ${transfers} postings in 3 years. Recommend minimum 24-month stability lock to ensure family well-being.`
    });
  } else if (transfers === 2) {
    score += 5;
    drivers.push(`Recent transfer readjustment (${transfers} transfers in 3 years)`);
  }

  // Training Commitments (Physical Exertion Overlay)
  const isHighIntensityTraining = /commando|battle|induction|special ops|counter-insurgency|ci ops/i.test(training);
  if (isHighIntensityTraining) {
    score += 10;
    drivers.push(`Intense training commitment: ${training} on top of operational duties`);
    if (score >= 65) {
      interventions.push({
        type: 'DEFER_INTENSIVE_TRAINING',
        title: 'Temporary Training Deferral / Rest Window',
        urgency: 'High',
        description: `Strenuous course (${training}) exacerbating cumulative strain. Recommend temporary deferral until physical recovery.`
      });
    }
  }

  // Workload Trends (Leading Burnout Predictor)
  if (trend === 'increasing') {
    score += 8;
    drivers.push('Accelerating workload trajectory (+25% duty hours over prior month)');
    if (shiftH > 10) {
      interventions.push({
        type: 'WORKLOAD_BALANCING',
        title: 'Platoon Workload & Guard Rebalancing',
        urgency: 'High',
        description: 'Rebalance platoons to relieve continuous surge taskings and cap overtime shifts.'
      });
    }
  } else if (trend === 'decreasing') {
    score -= 4; // restorative taper
  }

  // 2. Voluntary Biometric Telemetry (if available)
  const biometrics = voluntaryBiometrics || {};
  let hrv = biometrics.hrvRmssd !== undefined && biometrics.hrvRmssd !== null ? parseFloat(biometrics.hrvRmssd) : null;
  let rhr = biometrics.restingHeartRate !== undefined && biometrics.restingHeartRate !== null ? parseInt(biometrics.restingHeartRate, 10) : null;
  let sleepH = biometrics.sleepHours !== undefined && biometrics.sleepHours !== null ? parseFloat(biometrics.sleepHours) : null;

  if (hrv !== null && !isNaN(hrv)) {
    if (hrv < 18) {
      score += 22;
      drivers.push(`Critical Autonomic Exhaustion: HRV rMSSD dropped to ${hrv} ms (sympathetic overdrive)`);
      interventions.push({
        type: 'MANDATORY_RR_CYCLE',
        title: 'Mandatory 48-Hour Rest & Recuperation (R&R) in Camp',
        urgency: 'Critical',
        description: `Autonomic biomarkers indicate extreme sympathetic strain (HRV ${hrv}ms). Stand down from field ops.`
      });
    } else if (hrv < 26) {
      score += 14;
      drivers.push(`Depressed HRV rMSSD (${hrv} ms indicates chronic stress)`);
    } else if (hrv > 45) {
      score -= 10; // high resilience / parasympathetic equilibrium
    }
  }

  if (rhr !== null && !isNaN(rhr)) {
    if (rhr > 86) {
      score += 12;
      drivers.push(`Elevated resting heart rate (${rhr} bpm)`);
    } else if (rhr <= 68) {
      score -= 5;
    }
  }

  if (sleepH !== null && !isNaN(sleepH)) {
    const sleepDebt = Math.max(0, parseFloat((CLINICAL_SLEEP_CEILING - sleepH).toFixed(1)));
    if (sleepH < 4.5) {
      score += 24;
      drivers.push(`Acute sleep deprivation: ${sleepH}h recorded (${sleepDebt}h below 8.0h recovery ceiling)`);
      interventions.push({
        type: 'SLEEP_HYGIENE_RESET',
        title: 'Guaranteed 8.0h Undisturbed Bunk Rest Period',
        urgency: 'High',
        description: `Cumulative sleep deficit has reached dangerous levels. Order relief jawan for next watch.`
      });
    } else if (sleepH < 6.0) {
      score += 12;
      drivers.push(`Restorative sleep deficit (${sleepDebt}h under 8.0h ceiling)`);
    } else if (sleepH >= 7.5) {
      score -= 8;
    }
  }

  // 3. Voluntary Self-Assessment Scores (PSS-10 & Operational Fatigue)
  const assessment = latestAssessment || {};
  const pss = assessment.pss10Score !== undefined && assessment.pss10Score !== null ? parseInt(assessment.pss10Score, 10) : null;
  const fatigue = assessment.operationalFatigue !== undefined && assessment.operationalFatigue !== null ? parseInt(assessment.operationalFatigue, 10) : null;
  const mood = assessment.mood || 'neutral';
  const familyContact = assessment.familyContact || 'regular';

  if (pss !== null && !isNaN(pss)) {
    if (pss >= 28) {
      score += 20;
      drivers.push(`High Perceived Stress Scale (PSS-10: ${pss}/40)`);
      interventions.push({
        type: 'TELE_MANAS_COUNSELING',
        title: 'Proactive Tele-MANAS (14416) / Unit Doctor Session',
        urgency: 'High',
        description: 'Offer confidential, voluntary counseling session with Unit Medical Officer or Tele-MANAS specialist.'
      });
    } else if (pss >= 18) {
      score += 10;
      drivers.push(`Moderate Perceived Stress (PSS-10: ${pss}/40)`);
    } else if (pss < 13) {
      score -= 8;
    }
  }

  if (fatigue !== null && !isNaN(fatigue)) {
    if (fatigue >= 8) {
      score += 16;
      drivers.push(`Severe operational fatigue index (${fatigue}/10)`);
    } else if (fatigue >= 5) {
      score += 8;
    }
  }

  const moodOffsets = { calm: -10, confident: -8, alert: -4, neutral: 0, anxious: 14, exhausted: 20, distressed: 26 };
  if (moodOffsets[mood] !== undefined) {
    score += moodOffsets[mood];
    if (['anxious', 'exhausted', 'distressed'].includes(mood)) {
      drivers.push(`Personnel self-reported affective state: ${mood.toUpperCase()}`);
    }
  }

  if (familyContact === 'isolated' || familyContact === 'rarely') {
    score += 10;
    drivers.push('Infrequent or strained communication with family');
  } else if (familyContact === 'daily') {
    score -= 6;
  }

  // Always append peer-buddy support if elevated or critical
  if (score >= 60) {
    interventions.push({
      type: 'BUDDY_PAIR_ASSIGNMENT',
      title: 'Activate Unit Peer-Buddy Mutual Check-in',
      urgency: 'Moderate',
      description: 'Assign trusted buddy jawan for daily shared mess meals and informal peer observation.'
    });
  }

  // Normalize final score (5 - 99)
  const compositeStrainScore = Math.max(5, Math.min(99, Math.round(score)));

  // Risk Tiering
  let riskTier = 'Moderate';
  if (compositeStrainScore <= 35) riskTier = 'Low';
  else if (compositeStrainScore <= 60) riskTier = 'Moderate';
  else if (compositeStrainScore <= 79) riskTier = 'Elevated';
  else riskTier = 'Critical';

  // Burnout probability model
  const burnoutProbability = Math.min(99, Math.max(2, Math.round(
    compositeStrainScore * 0.85 + (rejections * 4) + (daysNoLeave > 180 ? 12 : 0) + (transfers >= 3 ? 5 : 0)
  )));

  // Operational Readiness Index (Inverse of acute fatigue with safety factor)
  const operationalReadinessIndex = Math.max(10, Math.min(99, Math.round(100 - (compositeStrainScore * 0.75))));

  // Alert Trigger Logic for Authorized Welfare Personnel
  const alertTrigger = compositeStrainScore >= 75 || (daysNoLeave > 200 && rejections >= 2) || (hrv !== null && hrv < 20);

  let alertPayload = null;
  if (alertTrigger) {
    let alertSeverity = 'High';
    let alertCategory = 'ELEVATED_STRESS';

    if (compositeStrainScore >= 80 || (hrv !== null && hrv < 18)) {
      alertSeverity = 'Critical';
      alertCategory = 'ACUTE_BURNOUT_RISK';
    } else if (daysNoLeave > 200) {
      alertCategory = 'LEAVE_DEPRIVATION_ALERT';
    }

    alertPayload = {
      severity: alertSeverity,
      category: alertCategory,
      message: `${alertSeverity.toUpperCase()} Welfare Alert: Strain Score ${compositeStrainScore}/100 in ${zoneInfo.name}`,
      recommendedAction: interventions[0] ? interventions[0].title : 'Immediate Welfare Officer Check-in',
      triggeredAt: new Date().toISOString()
    };
  }

  if (drivers.length === 0) {
    drivers.push('Operational stress indicators within sustainable baseline limits.');
  }

  return {
    compositeStrainScore,
    burnoutProbability,
    riskTier,
    operationalReadinessIndex,
    riskDrivers: drivers,
    recommendedInterventions: interventions,
    alertTrigger,
    alertPayload,
    breakdown: {
      hardshipFactor: zoneInfo.hardshipWeight,
      leaveFactor: daysNoLeave > 180 ? 18 : (daysNoLeave > 120 ? 8 : 0),
      shiftFactor: shiftH > 10 ? 10 : 0,
      transferFactor: transfers >= 3 ? 12 : (transfers === 2 ? 5 : 0),
      trainingFactor: isHighIntensityTraining ? 10 : 0,
      workloadTrendFactor: trend === 'increasing' ? 8 : (trend === 'decreasing' ? -4 : 0),
      biometricFactor: hrv !== null ? (hrv < 26 ? 14 : 0) : null,
      assessmentFactor: pss !== null ? (pss >= 25 ? 18 : 0) : null
    }
  };
}
