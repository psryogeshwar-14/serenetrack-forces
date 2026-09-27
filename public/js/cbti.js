/**
 * SereneTrack CBT-I (Cognitive Behavioral Therapy for Insomnia) Bedtime Worry Vault
 * Detects pre-sleep cognitive distortions and generates reframed cognitive restructuring
 * before locking thoughts away until morning to silence rumination.
 */

import { playChime } from './audio.js';

const STORAGE_KEY_VAULT = 'serenetrack_worry_vault';

let lockedWorries = [];

// Initialize stored entries if in browser
if (typeof localStorage !== 'undefined') {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_VAULT);
    if (stored) lockedWorries = JSON.parse(stored);
  } catch(e) {}
}

/**
 * Classify Cognitive Distortion
 */
export function analyzeThoughtDistortion(thought) {
  const text = (thought || '').toLowerCase();
  
  if (/fail|ruin|catastrophe|disaster|end of the world|destroy|worst/i.test(text)) {
    return {
      type: 'Catastrophizing',
      badgeCls: 'bg-rose-100 text-rose-800',
      description: 'Magnifying a difficult situation into an irreversible catastrophe.',
      reframe: 'Even if challenges arise tomorrow, I have the capability and resilience to navigate them step-by-step. Catastrophic predictions are thoughts, not future facts.'
    };
  }
  
  if (/always|never|completely|totally|everything|nothing|perfect/i.test(text)) {
    return {
      type: 'All-or-Nothing Thinking',
      badgeCls: 'bg-amber-100 text-amber-800',
      description: 'Viewing reality in binary black-or-white absolutes.',
      reframe: 'Progress is built through imperfect consistency, not absolute perfection. A single day or outcome does not define my worth or trajectory.'
    };
  }

  if (/everyone|they think|they judge|people hate|everyone will laugh/i.test(text)) {
    return {
      type: 'Mind Reading / Social Projection',
      badgeCls: 'bg-purple-100 text-purple-800',
      description: 'Assuming you know negative judgments of others without objective evidence.',
      reframe: 'People are primarily focused on their own challenges. I release the need to predict other people\'s private perceptions.'
    };
  }

  if (/should have|must have|ought to/i.test(text)) {
    return {
      type: 'Should Statements (Tyranny of the Shoulds)',
      badgeCls: 'bg-cyan-100 text-cyan-800',
      description: 'Holding rigid expectations about past events that cannot be changed right now.',
      reframe: 'I did the best I could with the awareness and energy I had. Right now, my sole responsibility is restorative physical rest.'
    };
  }

  // Default General Anxious Rumination
  return {
    type: 'Anticipatory Cognitive Rumination',
    badgeCls: 'bg-teal-100 text-teal-800',
    description: 'Active problem-solving firing when the brain needs parasympathetic wind-down.',
    reframe: 'My nervous system is trying to protect me, but right now is for resting. Problem-solving is 10x more effective after 8 hours of restorative sleep.'
  };
}

export function handleAnalyzeThought() {
  const input = document.getElementById('worry-input');
  if (!input) return;
  const thought = input.value.trim();
  if (!thought) {
    alert('Please write down what thought is currently looping in your mind.');
    return;
  }

  const analysis = analyzeThoughtDistortion(thought);

  const resultCard = document.getElementById('worry-analysis-result');
  const typeBadge = document.getElementById('worry-distortion-badge');
  const descEl = document.getElementById('worry-distortion-desc');
  const reframeEl = document.getElementById('worry-reframe-text');

  if (resultCard && typeBadge && descEl && reframeEl) {
    typeBadge.innerText = analysis.type;
    typeBadge.className = `px-2.5 py-1 rounded-full text-xs font-bold ${analysis.badgeCls}`;
    descEl.innerText = analysis.description;
    reframeEl.innerText = `"${analysis.reframe}"`;
    resultCard.classList.remove('hidden');
  }

  playChime(432);
}

export function handleLockWorry() {
  const input = document.getElementById('worry-input');
  const thought = input.value.trim();
  if (!thought) return;

  const analysis = analyzeThoughtDistortion(thought);

  const entry = {
    id: `worry-${Date.now()}`,
    timestamp: Date.now(),
    dateStr: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    originalThought: thought,
    distortion: analysis.type,
    reframe: analysis.reframe,
    unlockTime: '08:00 AM'
  };

  lockedWorries.unshift(entry);
  if (lockedWorries.length > 8) lockedWorries.pop();

  try {
    localStorage.setItem(STORAGE_KEY_VAULT, JSON.stringify(lockedWorries));
  } catch(e) {}

  input.value = '';
  document.getElementById('worry-analysis-result').classList.add('hidden');

  // Trigger Lock Visual Effect & Audio
  playChime(396, 1.8);
  const toast = document.getElementById('toast');
  if (toast) {
    toast.innerText = '🔒 Thought locked in vault until 08:00 AM. Sleep peacefully.';
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3500);
  }

  renderVaultEntries();
}

export function renderVaultEntries() {
  const listEl = document.getElementById('worry-locked-list');
  if (!listEl) return;

  if (lockedWorries.length === 0) {
    listEl.innerHTML = `<p class="text-xs text-slate-400 italic">No worries locked in the vault tonight. Your mental slate is clear.</p>`;
    return;
  }

  listEl.innerHTML = '';
  lockedWorries.forEach(w => {
    const card = document.createElement('div');
    card.className = 'p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5';
    card.innerHTML = `
      <div class="flex items-center justify-between text-[11px] text-slate-500">
        <span class="font-semibold flex items-center gap-1">🔒 Locked • ${w.dateStr}</span>
        <span class="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold">${w.distortion}</span>
      </div>
      <p class="text-slate-800 font-medium">"${w.originalThought}"</p>
      <div class="p-2 rounded-lg bg-teal-50 border border-teal-100 text-teal-900 text-[11px]">
        <strong>Cognitive Reframe:</strong> ${w.reframe}
      </div>
    `;
    listEl.appendChild(card);
  });
}

// Global window bindings
if (typeof window !== 'undefined') {
  window.handleAnalyzeThought = handleAnalyzeThought;
  window.handleLockWorry = handleLockWorry;
  window.renderVaultEntries = renderVaultEntries;
  setTimeout(renderVaultEntries, 500);
}
