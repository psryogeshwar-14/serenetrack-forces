/**
 * Uniformed Forces Personnel Stress & Welfare Monitoring System
 * Ministry of Home Affairs (MHA) - CRPF, Police II Division
 * Problem Statement ID: 26186
 * 
 * Frontend Controller for:
 * 1. Role-Based Portals: Commander Dashboard, Welfare Officer Portal, Field Personnel Mobile App.
 * 2. Predictive Analytics & Heatmap Visualizations.
 * 3. Automated Welfare Alerts & Triage Dispatch.
 * 4. PSS-10 Standardized Self-Assessments & Tactical Recovery.
 * 5. SIH 1-Click Judge Simulation Theaters.
 */

let activeRole = 'commander'; // 'commander' | 'welfare_officer' | 'personnel'
let activeBattalionFilter = '';
let forcesDashboardData = null;
let personnelRoster = [];
let cachedPersonnelList = [];
let activeAlerts = [];
let activeInterventions = [];
let currentPersonnelId = 'CRPF-204-001'; // Default jawan for personnel view

/**
 * Switch Role (RBAC)
 */
export function setForcesRole(role) {
  activeRole = role;
  
  // Update role buttons
  ['commander', 'welfare_officer', 'personnel'].forEach(r => {
    const btn = document.getElementById(`role-btn-${r}`);
    if (btn) {
      if (r === role) {
        btn.className = 'px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 text-white shadow-xs flex items-center gap-1.5';
      } else {
        btn.className = 'px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1.5';
      }
    }
  });

  // Toggle role sub-views
  const cmdView = document.getElementById('forces-view-commander');
  const woView = document.getElementById('forces-view-welfare');
  const jawanView = document.getElementById('forces-view-jawan');

  if (cmdView) cmdView.classList.toggle('hidden', role !== 'commander');
  if (woView) woView.classList.toggle('hidden', role !== 'welfare_officer');
  if (jawanView) jawanView.classList.toggle('hidden', role !== 'personnel');

  // Update privacy badge label
  const privacyBadge = document.getElementById('forces-privacy-status');
  if (privacyBadge) {
    if (role === 'commander') {
      privacyBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span class="font-bold">Commander Privacy Shield:</span> De-identified Tokens Active (Zero Stigmatization Guarantee)`;
      privacyBadge.className = 'text-[11px] px-3 py-1 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-300 flex items-center gap-1.5';
    } else if (role === 'welfare_officer') {
      privacyBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-sky-500"></span>
        <span class="font-bold">Medical & Welfare Officer Portal:</span> Clinical Triage & Counseling Matrix Active`;
      privacyBadge.className = 'text-[11px] px-3 py-1 rounded-full bg-sky-50 text-sky-900 border border-sky-300 flex items-center gap-1.5';
    } else {
      privacyBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-indigo-500"></span>
        <span class="font-bold">Confidential Field Jawan Portal:</span> Strict Non-Punitive Medical Isolation (Zero Command Snooping)`;
      privacyBadge.className = 'text-[11px] px-3 py-1 rounded-full bg-indigo-50 text-indigo-900 border border-indigo-300 flex items-center gap-1.5';
    }
  }

  loadForcesData();
}

/**
 * Filter by Battalion
 */
export function setForcesBattalionFilter(battalion) {
  activeBattalionFilter = battalion;
  loadForcesData();
}

/**
 * Fetch All Forces Data from Backend
 */
export async function loadForcesData() {
  try {
    const batParam = activeBattalionFilter ? `&battalion=${encodeURIComponent(activeBattalionFilter)}` : '';
    
    // 1. Fetch Dashboard Metrics
    const dashRes = await fetch(`/api/forces/dashboard?role=${activeRole}${batParam}`);
    const dashJson = await dashRes.json();
    if (dashJson.success) {
      forcesDashboardData = dashJson.metrics;
      renderCommanderDashboard();
    }

    // 2. Fetch Personnel Roster
    const idParam = (activeRole === 'personnel' && currentPersonnelId) ? `&personnelId=${encodeURIComponent(currentPersonnelId)}` : '';
    const rosterRes = await fetch(`/api/forces/personnel?role=${activeRole}${batParam}${idParam}`);
    const rosterJson = await rosterRes.json();
    if (rosterJson.success) {
      personnelRoster = rosterJson.personnel;
      if (activeRole !== 'personnel' && personnelRoster.length > 0) {
        cachedPersonnelList = personnelRoster;
      }
      renderPersonnelTable();
      if (activeRole === 'welfare_officer') renderWelfareTriage();
      if (activeRole === 'personnel') renderJawanPortal();
    }

    // 3. Fetch Alerts
    const alertsRes = await fetch(`/api/forces/alerts?role=${activeRole}`);
    const alertsJson = await alertsRes.json();
    if (alertsJson.success) {
      activeAlerts = alertsJson.alerts;
      renderAlertsFeed();
    }

    // 4. Fetch Interventions
    const intvRes = await fetch(`/api/forces/interventions?role=${activeRole}`);
    const intvJson = await intvRes.json();
    if (intvJson.success) {
      activeInterventions = intvJson.interventions;
      renderInterventionsList();
    }
  } catch (err) {
    console.error('[Forces UI Error]:', err);
  }
}

/**
 * Render Commander Dashboard: Heatmaps, Gauge, Duty Overtime, Leave Backlog
 */
function renderCommanderDashboard() {
  if (!forcesDashboardData) return;
  const m = forcesDashboardData;

  // 1. Force Readiness Index & Strain
  const readinessEl = document.getElementById('forces-readiness-val');
  if (readinessEl) readinessEl.innerText = `${m.operationalReadiness}%`;

  const avgStrainEl = document.getElementById('forces-avg-strain');
  if (avgStrainEl) avgStrainEl.innerText = `${m.averageStrain}/100`;

  const totalJawansEl = document.getElementById('forces-total-jawans');
  if (totalJawansEl) totalJawansEl.innerText = m.totalPersonnel;

  const atRiskEl = document.getElementById('forces-at-risk-count');
  if (atRiskEl) atRiskEl.innerText = `${m.atRiskCount} (${m.atRiskPercentage}%)`;

  const leaveBacklogEl = document.getElementById('forces-leave-backlog');
  if (leaveBacklogEl) leaveBacklogEl.innerText = `${m.leaveBacklogOverdue} (${m.leaveBacklogPercent}%)`;

  const shiftOvertimeEl = document.getElementById('forces-shift-overtime');
  if (shiftOvertimeEl) shiftOvertimeEl.innerText = `${m.shiftOvertimeCount} (${m.shiftOvertimePercent}%)`;

  // 2. Company Stress Heatmap
  const heatmapContainer = document.getElementById('forces-company-heatmap');
  if (heatmapContainer && m.companyBreakdown) {
    heatmapContainer.innerHTML = m.companyBreakdown.map(c => {
      let bgClass = 'bg-emerald-50 border-emerald-200 text-emerald-950';
      let tagClass = 'bg-emerald-600 text-white';
      let strainColor = 'text-emerald-700';

      if (c.averageStrain >= 75) {
        bgClass = 'bg-rose-50 border-rose-300 text-rose-950';
        tagClass = 'bg-rose-600 text-white';
        strainColor = 'text-rose-700';
      } else if (c.averageStrain >= 55) {
        bgClass = 'bg-amber-50 border-amber-300 text-amber-950';
        tagClass = 'bg-amber-600 text-white';
        strainColor = 'text-amber-700';
      }

      return `
        <div class="p-3.5 rounded-xl border ${bgClass} transition-all hover:shadow-xs">
          <div class="flex items-center justify-between mb-2">
            <div>
              <span class="text-xs font-black uppercase tracking-wider block">${c.name}</span>
              <span class="text-[10px] text-slate-500">${c.battalion}</span>
            </div>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${tagClass}">${c.stressLevel} Risk</span>
          </div>
          <div class="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-200/60 text-center">
            <div>
              <span class="text-[10px] text-slate-500 block">Avg Strain</span>
              <span class="text-sm font-extrabold ${strainColor}">${c.averageStrain}/100</span>
            </div>
            <div>
              <span class="text-[10px] text-slate-500 block">Readiness</span>
              <span class="text-sm font-extrabold text-slate-900">${c.averageReadiness}%</span>
            </div>
            <div>
              <span class="text-[10px] text-slate-500 block">At-Risk</span>
              <span class="text-sm font-extrabold text-rose-700">${c.atRiskCount} Jawans</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }
}

/**
 * Render Personnel Table (Masked for Commander, Clinical for Welfare Officer)
 */
function renderPersonnelTable() {
  const tbody = document.getElementById('forces-personnel-table-body');
  if (!tbody) return;

  if (personnelRoster.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-xs text-slate-400">No personnel records found for selected filter.</td></tr>`;
    return;
  }

  tbody.innerHTML = personnelRoster.map(p => {
    const risk = p.calculatedRisk || {};
    const score = risk.compositeStrainScore || 20;
    const tier = risk.riskTier || 'Moderate';
    
    let tierBadge = 'bg-emerald-100 text-emerald-800';
    if (tier === 'Critical') tierBadge = 'bg-rose-100 text-rose-900 font-bold';
    else if (tier === 'Elevated') tierBadge = 'bg-amber-100 text-amber-900 font-bold';

    const displayName = activeRole === 'commander' 
      ? `<span class="font-mono text-teal-800 font-bold">${p.anonymizedToken}</span> <span class="text-[10px] text-slate-400 block">${p.rank}</span>`
      : `<span class="font-bold text-slate-900">${p.name}</span> <span class="text-[10px] font-mono text-slate-500 block">${p.serviceNumber} • ${p.rank}</span>`;

    const driversSummary = (risk.riskDrivers || []).slice(0, 2).map(d => `• ${d}`).join('<br>');

    return `
      <tr class="hover:bg-slate-50/80 transition-colors border-b border-slate-100 text-xs">
        <td class="py-3 px-3">${displayName}</td>
        <td class="py-3 px-3">
          <span class="font-semibold text-slate-800 block">${p.battalion}</span>
          <span class="text-[10px] text-slate-500">${p.company}</span>
        </td>
        <td class="py-3 px-3">
          <span class="text-[11px] text-slate-700 font-medium block">${p.deploymentLocation}</span>
          <span class="text-[10px] text-slate-400">${p.deploymentDurationMonths} mos tenure</span>
        </td>
        <td class="py-3 px-3 text-center">
          <span class="font-bold ${p.daysSinceLastLeave > 180 ? 'text-rose-700' : 'text-slate-800'}">${p.daysSinceLastLeave}d</span>
          <span class="text-[10px] text-slate-400 block">${p.leaveRejectionCount} rejections</span>
        </td>
        <td class="py-3 px-3 text-center">
          <span class="font-bold ${p.dutyShiftHours > 11 ? 'text-amber-700' : 'text-slate-800'}">${p.dutyShiftHours}h/d</span>
          <span class="text-[10px] text-slate-400 block">${p.consecutiveNightDuties} night sentries</span>
        </td>
        <td class="py-3 px-3 text-center">
          <span class="inline-block px-2.5 py-1 rounded-full text-[11px] ${tierBadge}">
            ${score}/100 (${tier})
          </span>
        </td>
        <td class="py-3 px-3">
          <div class="text-[11px] text-slate-600 leading-relaxed">${driversSummary || 'Baseline stable'}</div>
          ${activeRole === 'welfare_officer' ? `
            <button onclick="window.quickDispatchIntervention('${p.id}')" class="mt-1.5 px-2 py-0.5 rounded bg-teal-600 hover:bg-teal-700 text-white text-[10px] font-bold">
              Dispatch Action
            </button>
          ` : ''}
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Render Welfare Officer Triage List
 */
function renderWelfareTriage() {
  const container = document.getElementById('welfare-triage-container');
  if (!container) return;

  const highRisk = personnelRoster.filter(p => (p.calculatedRisk && (p.calculatedRisk.riskTier === 'Critical' || p.calculatedRisk.riskTier === 'Elevated')));

  if (highRisk.length === 0) {
    container.innerHTML = `<div class="p-6 text-center text-xs text-slate-400">No personnel currently in Critical or Elevated stress tier. Force well-being optimal.</div>`;
    return;
  }

  container.innerHTML = highRisk.map(p => {
    const risk = p.calculatedRisk || {};
    return `
      <div class="p-4 rounded-xl border border-rose-200 bg-white shadow-xs space-y-3">
        <div class="flex items-start justify-between gap-2">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-sm font-extrabold text-slate-900">${p.name}</span>
              <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700">${p.serviceNumber}</span>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">${risk.riskTier} Risk (${risk.compositeStrainScore}/100)</span>
            </div>
            <p class="text-xs text-slate-500 mt-0.5">${p.rank} • ${p.battalion} (${p.company}) • ${p.deploymentLocation}</p>
          </div>
          <div class="text-right">
            <span class="text-[10px] text-slate-400 block">Burnout Probability</span>
            <span class="text-sm font-extrabold text-rose-700">${risk.burnoutProbability}%</span>
          </div>
        </div>

        <!-- Risk Factors Breakdown -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 text-xs">
          <div>
            <span class="text-[10px] text-slate-400 block">Days Away</span>
            <span class="font-extrabold ${p.daysSinceLastLeave > 180 ? 'text-rose-700' : 'text-slate-800'}">${p.daysSinceLastLeave} Days</span>
          </div>
          <div>
            <span class="text-[10px] text-slate-400 block">Leave Rejections</span>
            <span class="font-extrabold ${p.leaveRejectionCount > 0 ? 'text-amber-700' : 'text-slate-800'}">${p.leaveRejectionCount} Denied</span>
          </div>
          <div>
            <span class="text-[10px] text-slate-400 block">Shift Duration</span>
            <span class="font-extrabold text-slate-800">${p.dutyShiftHours}h/day</span>
          </div>
          <div>
            <span class="text-[10px] text-slate-400 block">HRV Telemetry</span>
            <span class="font-extrabold ${(p.voluntaryBiometrics && p.voluntaryBiometrics.hrvRmssd < 25) ? 'text-rose-700' : 'text-slate-800'}">
              ${(p.voluntaryBiometrics && p.voluntaryBiometrics.hrvRmssd) ? p.voluntaryBiometrics.hrvRmssd + ' ms' : 'N/A'}
            </span>
          </div>
        </div>

        <!-- Transparent Drivers -->
        <div class="text-[11px] text-slate-600 bg-rose-50/50 p-2.5 rounded-lg border border-rose-100">
          <span class="font-bold text-rose-900 block mb-1">Explainable AI (XAI) Stress Drivers:</span>
          <ul class="list-disc list-inside space-y-0.5">
            ${(risk.riskDrivers || []).map(d => `<li>${d}</li>`).join('')}
          </ul>
        </div>

        <!-- 1-Click Proactive Actions -->
        <div class="flex flex-wrap items-center gap-2 pt-1">
          <button onclick="window.dispatchForcesAction('${p.id}', 'COMPASSIONATE_LEAVE', 'Fast-Track 15-Day Compassionate Leave')" class="btn-xs px-2.5 py-1 rounded bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-xs">
            ✈️ Fast-Track Leave
          </button>
          <button onclick="window.dispatchForcesAction('${p.id}', 'MANDATORY_RR_CYCLE', 'Order 48-Hour R&R Rest Cycle')" class="btn-xs px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs">
            🛌 Order 48h R&R
          </button>
          <button onclick="window.dispatchForcesAction('${p.id}', 'DUTY_ROSTER_REBALANCE', 'Rotate to Soft/Day Shift')" class="btn-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-900 text-white font-bold shadow-xs">
            🔄 Rotate Shift
          </button>
          <a href="tel:14416" class="btn-xs px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-xs">
            📞 Tele-MANAS (14416)
          </a>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Render Alerts Feed
 */
function renderAlertsFeed() {
  const container = document.getElementById('forces-alerts-container');
  if (!container) return;

  if (activeAlerts.length === 0) {
    container.innerHTML = `<div class="p-3 text-xs text-slate-400">No active early-warning alerts.</div>`;
    return;
  }

  container.innerHTML = activeAlerts.map(a => {
    let sevBadge = 'bg-rose-600 text-white';
    if (a.severity === 'High') sevBadge = 'bg-amber-600 text-white';
    else if (a.severity === 'Moderate') sevBadge = 'bg-sky-600 text-white';

    return `
      <div class="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-3 text-xs shadow-xs">
        <div class="flex items-center gap-2.5">
          <span class="px-2 py-0.5 rounded text-[10px] font-black uppercase ${sevBadge}">${a.severity}</span>
          <div>
            <span class="font-extrabold text-slate-900 block">${a.message}</span>
            <span class="text-[10px] text-slate-500">Personnel: ${a.personnelName} (${a.rank || ''}) • ${a.battalion || ''}</span>
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          ${!a.acknowledged ? `
            <button onclick="window.acknowledgeForcesAlert('${a.id}')" class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] border border-slate-300">
              Acknowledge
            </button>
          ` : `
            <span class="text-[10px] text-emerald-600 font-bold">✓ Acknowledged</span>
          `}
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Render Active Interventions
 */
function renderInterventionsList() {
  const container = document.getElementById('forces-interventions-container');
  if (!container) return;

  if (activeInterventions.length === 0) {
    container.innerHTML = `<div class="p-3 text-xs text-slate-400">No welfare interventions logged.</div>`;
    return;
  }

  container.innerHTML = activeInterventions.slice(0, 6).map(i => `
    <div class="p-3 rounded-xl border border-slate-200 bg-white text-xs shadow-xs space-y-1">
      <div class="flex items-center justify-between">
        <span class="font-bold text-slate-900">${i.title}</span>
        <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${i.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
          ${i.status}
        </span>
      </div>
      <p class="text-[11px] text-slate-600">${i.description}</p>
      <div class="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
        <span>Target: ${i.personnelName}</span>
        <span>Assigned: ${i.assignedTo}</span>
      </div>
    </div>
  `).join('');
}

/**
 * Switch Active Personnel in Jawan View
 */
export async function switchJawanPersonnel(personnelId) {
  currentPersonnelId = personnelId;
  await loadForcesData();
}

/**
 * Render Jawan Mobile Portal (Confidential Self-Assessment & Tactical Recovery)
 */
function renderJawanPortal() {
  if (!personnelRoster || personnelRoster.length === 0) return;

  // Populate personnel selector dropdown using cached master roster or current roster
  const displayList = cachedPersonnelList.length > 0 ? cachedPersonnelList : personnelRoster;
  const selector = document.getElementById('jawan-personnel-selector');
  if (selector && displayList.length > 0) {
    selector.innerHTML = displayList.map(x => 
      `<option value="${x.id}" ${x.id === currentPersonnelId ? 'selected' : ''}>${x.name} (${x.rank}) - ${x.battalion}</option>`
    ).join('');
    selector.value = currentPersonnelId;
  }

  const p = personnelRoster.find(x => x.id === currentPersonnelId) || personnelRoster[0];
  if (!p) return;
  currentPersonnelId = p.id;

  const nameEl = document.getElementById('jawan-profile-name');
  if (nameEl) nameEl.innerText = p.name;

  const infoEl = document.getElementById('jawan-profile-info');
  if (infoEl) infoEl.innerText = `${p.rank} • ${p.force} • ${p.deploymentLocation}`;

  const strainScoreEl = document.getElementById('jawan-current-strain');
  const score = (p.calculatedRisk && p.calculatedRisk.compositeStrainScore !== undefined) ? p.calculatedRisk.compositeStrainScore : 25;
  if (strainScoreEl) {
    strainScoreEl.innerText = `${score}/100`;
  }

  const tierBadge = document.getElementById('jawan-strain-tier');
  if (tierBadge) {
    const tier = (p.calculatedRisk && p.calculatedRisk.riskTier) ? p.calculatedRisk.riskTier : (score >= 80 ? 'Critical' : score >= 60 ? 'Elevated' : score >= 35 ? 'Moderate' : 'Low');
    tierBadge.innerText = `${tier} Strain`;
    if (tier === 'Critical') {
      tierBadge.className = 'px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30';
    } else if (tier === 'Elevated') {
      tierBadge.className = 'px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30';
    } else if (tier === 'Moderate') {
      tierBadge.className = 'px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30';
    } else {
      tierBadge.className = 'px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
    }
  }

  // Sync form inputs with current jawan's existing assessment/biometrics
  const latestAssess = p.latestAssessment || {};
  const biometrics = p.voluntaryBiometrics || {};

  const pssInput = document.getElementById('jawan-input-pss');
  const pssVal = document.getElementById('jawan-pss-val');
  if (pssInput) {
    const pss = latestAssess.pss10Score !== undefined ? latestAssess.pss10Score : 20;
    pssInput.value = pss;
    if (pssVal) pssVal.innerText = pss;
  }

  const fatigueInput = document.getElementById('jawan-input-fatigue');
  const fatigueVal = document.getElementById('jawan-fatigue-val');
  if (fatigueInput) {
    const fatigue = latestAssess.operationalFatigue !== undefined ? latestAssess.operationalFatigue : 5;
    fatigueInput.value = fatigue;
    if (fatigueVal) fatigueVal.innerText = fatigue;
  }

  const sleepInput = document.getElementById('jawan-input-sleep');
  const sleepVal = document.getElementById('jawan-sleep-val');
  if (sleepInput) {
    const sleep = biometrics.sleepHours !== undefined ? biometrics.sleepHours : 6.5;
    sleepInput.value = sleep;
    if (sleepVal) sleepVal.innerText = `${sleep}h`;
  }

  const moodInput = document.getElementById('jawan-input-mood');
  if (moodInput && latestAssess.mood) {
    moodInput.value = latestAssess.mood;
  }

  const familyInput = document.getElementById('jawan-input-family');
  if (familyInput && latestAssess.familyContact) {
    familyInput.value = latestAssess.familyContact;
  }

  const notesInput = document.getElementById('jawan-input-notes');
  if (notesInput) {
    notesInput.value = p.dutyStrainNotes || '';
  }
}

/**
 * Submit Field Self-Assessment (PSS-10 & Fatigue)
 */
export async function submitJawanAssessment(event) {
  if (event) event.preventDefault();

  const pss = document.getElementById('jawan-input-pss').value;
  const fatigue = document.getElementById('jawan-input-fatigue').value;
  const sleep = document.getElementById('jawan-input-sleep').value;
  const mood = document.getElementById('jawan-input-mood').value;
  const family = document.getElementById('jawan-input-family').value;
  const notes = document.getElementById('jawan-input-notes').value;

  try {
    const res = await fetch('/api/forces/assessments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personnelId: currentPersonnelId,
        pss10Score: pss,
        operationalFatigue: fatigue,
        sleepHours: sleep,
        mood,
        familyContact: family,
        dutyStrainNotes: notes,
        role: 'personnel'
      })
    });

    const data = await res.json();
    if (data.success) {
      alert(`✓ Confidential Assessment Submitted!\nUpdated Autonomic Strain Score: ${data.calculatedRisk.compositeStrainScore}/100 (${data.calculatedRisk.riskTier})`);
      loadForcesData();
    } else {
      alert(`Error: ${data.error}`);
    }
  } catch (e) {
    alert(`Failed submitting assessment: ${e.message}`);
  }
}

/**
 * 1-Click SOS Welfare Assistance (Direct to Welfare Officer)
 */
export async function sendJawanWelfareSOS() {
  const confirmed = confirm('Confirm Confidential Welfare Request?\n\nThis will privately alert the Unit Medical Officer / Welfare Subedar to schedule a supportive check-in. It is strictly non-punitive and protected under MHA Welfare Guidelines.');
  if (!confirmed) return;

  try {
    const res = await fetch('/api/forces/interventions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personnelId: currentPersonnelId,
        type: 'CONFIDENTIAL_JAWAN_SOS',
        title: 'Confidential Welfare & Counseling Request (Jawan Initiated)',
        description: 'Personnel requested confidential welfare conversation regarding family/operational stress.',
        urgency: 'Critical',
        assignedTo: 'Unit Medical Officer / Welfare Subedar',
        role: 'personnel'
      })
    });
    const data = await res.json();
    if (data.success) {
      alert('✓ Confidential Welfare Request Dispatched!\n\nYour Unit Medical Officer has been notified. You can also connect 24x7 immediately with Tele-MANAS toll-free at 14416.');
      loadForcesData();
    }
  } catch (e) {
    alert(`Failed sending request: ${e.message}`);
  }
}

/**
 * Acknowledge Alert (Welfare Officer)
 */
export async function acknowledgeForcesAlert(alertId) {
  try {
    const res = await fetch(`/api/forces/alerts/${alertId}/ack`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: activeRole })
    });
    const data = await res.json();
    if (data.success) {
      loadForcesData();
    }
  } catch (e) {
    console.error('Failed acknowledging alert:', e);
  }
}

/**
 * Dispatch Action / Intervention (Welfare Officer)
 */
export async function dispatchForcesAction(personnelId, type, title) {
  try {
    const res = await fetch('/api/forces/interventions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personnelId,
        type,
        title,
        description: `Proactively actioned by Welfare Officer under CAPF standard welfare protocol.`,
        urgency: 'High',
        assignedTo: 'Company Commander / Unit 2IC',
        role: 'welfare_officer'
      })
    });
    const data = await res.json();
    if (data.success) {
      alert(`✓ Welfare Intervention Actioned: "${title}"\nStatus: Approved & Assigned to Unit Commander.`);
      loadForcesData();
    }
  } catch (e) {
    alert(`Failed dispatching action: ${e.message}`);
  }
}

/**
 * Quick Dispatch Intervention helper
 */
export function quickDispatchIntervention(personnelId) {
  dispatchForcesAction(personnelId, 'DUTY_ROSTER_REBALANCE', 'Duty Roster Rest & Shift Rebalance');
}

const SCENARIO_REPRESENTATIVE_MAP = {
  sukma_cobra_crisis: { battalion: '204 CoBRA Battalion', jawanId: 'CRPF-204-001' },
  srinagar_ci_ops: { battalion: '110 Bn CRPF', jawanId: 'CRPF-110-001' },
  raf_riot_order: { battalion: '103 RAF Battalion', jawanId: 'CRPF-103-001' },
  peace_station_delhi: { battalion: '50 Bn CRPF', jawanId: 'CRPF-050-001' }
};

/**
 * 1-Click SIH Judge Theater Switcher
 */
export async function loadJudgeSimulationTheater(scenarioKey) {
  try {
    const res = await fetch('/api/forces/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario: scenarioKey })
    });
    const data = await res.json();
    if (data.success) {
      const risk = data.computedRisk;
      const mapping = SCENARIO_REPRESENTATIVE_MAP[scenarioKey];
      if (mapping) {
        activeBattalionFilter = mapping.battalion;
        currentPersonnelId = mapping.jawanId;
        const filterDropdown = document.getElementById('forces-battalion-filter');
        if (filterDropdown) filterDropdown.value = mapping.battalion;
      }
      await loadForcesData();

      // Non-blocking toast notification
      const toastEl = document.getElementById('toast');
      if (toastEl) {
        toastEl.innerText = `🎖️ SIH Judge Theater: ${data.name} | Strain: ${risk.compositeStrainScore}/100 (${risk.riskTier}) | ${data.battalion}`;
        toastEl.classList.remove('hidden');
        setTimeout(() => toastEl.classList.add('hidden'), 5000);
      }
    }
  } catch (e) {
    console.error('Failed loading simulation theater:', e);
  }
}

/**
 * Download Anonymized Dataset for Problem Statement 26186
 */
export function downloadAnonymizedDataset() {
  window.open('/api/forces/dataset', '_blank');
}

// Attach globally for inline event handlers
if (typeof window !== 'undefined') {
  window.setForcesRole = setForcesRole;
  window.setForcesBattalionFilter = setForcesBattalionFilter;
  window.switchJawanPersonnel = switchJawanPersonnel;
  window.acknowledgeForcesAlert = acknowledgeForcesAlert;
  window.dispatchForcesAction = dispatchForcesAction;
  window.quickDispatchIntervention = quickDispatchIntervention;
  window.submitJawanAssessment = submitJawanAssessment;
  window.sendJawanWelfareSOS = sendJawanWelfareSOS;
  window.loadJudgeSimulationTheater = loadJudgeSimulationTheater;
  window.downloadAnonymizedDataset = downloadAnonymizedDataset;
}
