/**
 * SereneTrack Procedural WebAudio Acoustic Sanctuary
 * - 432Hz / 528Hz Harmonic Chimes
 * - Stereo Binaural Beats (Delta 2.5Hz, Theta 6.0Hz, Alpha 10.0Hz)
 * - Procedural Synthesized Rain & Ocean Surf
 */

let audioCtx = null;
let masterGain = null;

// Binaural beats state
let isBinauralPlaying = false;
let oscLeft = null;
let oscRight = null;
let pannerLeft = null;
let pannerRight = null;
let binauralGain = null;
let currentBinauralMode = 'theta'; // 'delta', 'theta', 'alpha'

// Ambient soundscape state
let isAmbientPlaying = false;
let ambientSource = null;
let ambientGain = null;
let ambientModulator = null;
let currentAmbientMode = 'rain'; // 'rain', 'ocean'

const BINAURAL_MODES = {
  delta: {
    name: 'Delta Waves (2.5 Hz)',
    subtitle: 'Deep Restorative Sleep & Cellular Rejuvenation',
    carrier: 150,
    beat: 2.5,
    tag: 'Sleep Induction'
  },
  theta: {
    name: 'Theta Waves (6.0 Hz)',
    subtitle: 'Autonomic Calming, Vagal Reset & Meditation',
    carrier: 210,
    beat: 6.0,
    tag: 'Stress Release'
  },
  alpha: {
    name: 'Alpha Waves (10.0 Hz)',
    subtitle: 'Clear Mental Focus, Mindful Breaks & Pacing',
    carrier: 300,
    beat: 10.0,
    tag: 'Focus & Pacing'
  }
};

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContextClass();
    masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0.5, audioCtx.currentTime);
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Play a resonant pure sine harmonic chime (432Hz or 528Hz)
 */
export function playChime(freq = 432, duration = 1.4) {
  if (typeof window === 'undefined') return;
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start();
    osc.stop(ctx.currentTime + duration + 0.1);
  } catch (e) {
    console.warn('[Audio] Chime playback:', e);
  }
}

/**
 * Start or Stop Binaural Beats
 */
export function toggleBinauralBeats() {
  const ctx = getAudioContext();
  if (isBinauralPlaying) {
    stopBinauralBeats();
  } else {
    startBinauralBeats();
  }
  updateSanctuaryUI();
}

export function setBinauralMode(mode) {
  if (!BINAURAL_MODES[mode]) return;
  currentBinauralMode = mode;
  if (isBinauralPlaying) {
    stopBinauralBeats();
    startBinauralBeats();
  }
  updateSanctuaryUI();
}

function startBinauralBeats() {
  const ctx = getAudioContext();
  const config = BINAURAL_MODES[currentBinauralMode];

  const baseFreq = config.carrier;
  const leftFreq = baseFreq - (config.beat / 2);
  const rightFreq = baseFreq + (config.beat / 2);

  // Binaural gain node with gentle fade-in
  binauralGain = ctx.createGain();
  binauralGain.gain.setValueAtTime(0.0001, ctx.currentTime);
  binauralGain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 1.2);
  binauralGain.connect(masterGain);

  // Left Channel Oscillator & Panner
  oscLeft = ctx.createOscillator();
  oscLeft.type = 'sine';
  oscLeft.frequency.setValueAtTime(leftFreq, ctx.currentTime);

  pannerLeft = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  if (pannerLeft) pannerLeft.pan.setValueAtTime(-1, ctx.currentTime);

  // Right Channel Oscillator & Panner
  oscRight = ctx.createOscillator();
  oscRight.type = 'sine';
  oscRight.frequency.setValueAtTime(rightFreq, ctx.currentTime);

  pannerRight = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  if (pannerRight) pannerRight.pan.setValueAtTime(1, ctx.currentTime);

  if (pannerLeft && pannerRight) {
    oscLeft.connect(pannerLeft);
    pannerLeft.connect(binauralGain);

    oscRight.connect(pannerRight);
    pannerRight.connect(binauralGain);
  } else {
    oscLeft.connect(binauralGain);
    oscRight.connect(binauralGain);
  }

  oscLeft.start();
  oscRight.start();
  isBinauralPlaying = true;
}

function stopBinauralBeats() {
  if (!isBinauralPlaying) return;
  const ctx = getAudioContext();
  if (binauralGain) {
    binauralGain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    setTimeout(() => {
      try {
        if (oscLeft) { oscLeft.stop(); oscLeft.disconnect(); }
        if (oscRight) { oscRight.stop(); oscRight.disconnect(); }
      } catch (e) {}
      oscLeft = null;
      oscRight = null;
    }, 450);
  }
  isBinauralPlaying = false;
}

/**
 * Start or Stop Procedural Soundscape (Rain or Ocean)
 */
export function toggleAmbientSoundscape() {
  const ctx = getAudioContext();
  if (isAmbientPlaying) {
    stopAmbientSoundscape();
  } else {
    startAmbientSoundscape();
  }
  updateSanctuaryUI();
}

export function setAmbientMode(mode) {
  if (mode !== 'rain' && mode !== 'ocean') return;
  currentAmbientMode = mode;
  if (isAmbientPlaying) {
    stopAmbientSoundscape();
    startAmbientSoundscape();
  }
  updateSanctuaryUI();
}

function startAmbientSoundscape() {
  const ctx = getAudioContext();
  const bufferSize = ctx.sampleRate * 2; // 2 seconds looping buffer
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  // Generate procedural pink/brown noise
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    if (currentAmbientMode === 'rain') {
      // Gentle rain texture: filtered pink noise
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.08;
      b6 = white * 0.115926;
    } else {
      // Ocean surf texture: warm brownian noise
      b0 = (b0 + (0.02 * white)) / 1.02;
      data[i] = b0 * 0.6;
    }
  }

  ambientSource = ctx.createBufferSource();
  ambientSource.buffer = buffer;
  ambientSource.loop = true;

  // Filter shaping
  const filter = ctx.createBiquadFilter();
  if (currentAmbientMode === 'rain') {
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, ctx.currentTime);
  } else {
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(650, ctx.currentTime);
  }

  ambientGain = ctx.createGain();
  ambientGain.gain.setValueAtTime(0.0001, ctx.currentTime);
  ambientGain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 1.0);

  // For ocean surf, add a gentle low-frequency swell modulator
  if (currentAmbientMode === 'ocean') {
    ambientModulator = ctx.createOscillator();
    const modGain = ctx.createGain();
    ambientModulator.type = 'sine';
    ambientModulator.frequency.setValueAtTime(0.12, ctx.currentTime); // 8-second swell cycle
    modGain.gain.setValueAtTime(0.12, ctx.currentTime);

    ambientModulator.connect(modGain);
    modGain.connect(ambientGain.gain);
    ambientModulator.start();
  }

  ambientSource.connect(filter);
  filter.connect(ambientGain);
  ambientGain.connect(masterGain);

  ambientSource.start();
  isAmbientPlaying = true;
}

function stopAmbientSoundscape() {
  if (!isAmbientPlaying) return;
  const ctx = getAudioContext();
  if (ambientGain) {
    ambientGain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    setTimeout(() => {
      try {
        if (ambientSource) { ambientSource.stop(); ambientSource.disconnect(); }
        if (ambientModulator) { ambientModulator.stop(); ambientModulator.disconnect(); }
      } catch (e) {}
      ambientSource = null;
      ambientModulator = null;
    }, 450);
  }
  isAmbientPlaying = false;
}

export function setMasterVolume(val) {
  const v = Math.max(0, Math.min(1, parseFloat(val) || 0));
  if (masterGain) {
    masterGain.gain.linearRampToValueAtTime(v, getAudioContext().currentTime + 0.05);
  }
}

/**
 * Synchronize UI state on the Sanctuary Card
 */
export function updateSanctuaryUI() {
  const btnBinaural = document.getElementById('btn-toggle-binaural');
  const btnAmbient = document.getElementById('btn-toggle-ambient');
  const waveVisualizer = document.getElementById('sanctuary-visualizer');
  const badgeInfo = document.getElementById('binaural-active-badge');
  const subtitleInfo = document.getElementById('binaural-active-subtitle');

  if (badgeInfo && subtitleInfo) {
    const cfg = BINAURAL_MODES[currentBinauralMode];
    badgeInfo.innerText = cfg.name;
    subtitleInfo.innerText = cfg.subtitle;
  }

  // Update Binaural buttons
  ['delta', 'theta', 'alpha'].forEach(m => {
    const el = document.getElementById(`binaural-btn-${m}`);
    if (el) {
      if (m === currentBinauralMode) {
        el.className = 'px-2.5 py-1 text-xs font-semibold rounded-lg bg-teal-600 text-white shadow-xs';
      } else {
        el.className = 'px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200';
      }
    }
  });

  // Update Ambient buttons
  ['rain', 'ocean'].forEach(m => {
    const el = document.getElementById(`ambient-btn-${m}`);
    if (el) {
      if (m === currentAmbientMode) {
        el.className = 'px-2.5 py-1 text-xs font-semibold rounded-lg bg-cyan-600 text-white shadow-xs';
      } else {
        el.className = 'px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200';
      }
    }
  });

  if (btnBinaural) {
    btnBinaural.innerHTML = isBinauralPlaying
      ? `<svg class="icon w-3.5 h-3.5" viewBox="0 0 24 24"><rect width="4" height="16" x="6" y="4"/><rect width="4" height="16" x="14" y="4"/></svg><span>Pause Beats</span>`
      : `<svg class="icon w-3.5 h-3.5" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg><span>Play Binaural Beats</span>`;
    btnBinaural.className = isBinauralPlaying ? 'btn-primary btn-sm bg-rose-600 hover:bg-rose-700' : 'btn-primary btn-sm';
  }

  if (btnAmbient) {
    btnAmbient.innerHTML = isAmbientPlaying
      ? `<svg class="icon w-3.5 h-3.5" viewBox="0 0 24 24"><rect width="4" height="16" x="6" y="4"/><rect width="4" height="16" x="14" y="4"/></svg><span>Pause Ambient</span>`
      : `<svg class="icon w-3.5 h-3.5" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg><span>Play Ambient Sound</span>`;
    btnAmbient.className = isAmbientPlaying ? 'btn-secondary btn-sm border-cyan-300 text-cyan-800' : 'btn-secondary btn-sm';
  }

  if (waveVisualizer) {
    if (isBinauralPlaying || isAmbientPlaying) {
      waveVisualizer.classList.add('audio-playing');
    } else {
      waveVisualizer.classList.remove('audio-playing');
    }
  }
}
