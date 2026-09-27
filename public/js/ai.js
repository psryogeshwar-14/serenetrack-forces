/**
 * SereneAI Neuro-Restorative Copilot Client Module
 * Manages the slide-out conversational drawer, prompt chips, and connects to /api/ai/copilot.
 */

let isDrawerOpen = false;

export function toggleCopilotDrawer() {
  isDrawerOpen = !isDrawerOpen;
  const drawer = document.getElementById('copilot-drawer');
  const backdrop = document.getElementById('copilot-backdrop');
  if (!drawer || !backdrop) return;

  if (isDrawerOpen) {
    drawer.classList.remove('translate-x-full');
    backdrop.classList.remove('hidden');
    document.getElementById('copilot-input')?.focus();
  } else {
    drawer.classList.add('translate-x-full');
    backdrop.classList.add('hidden');
  }
}

export async function sendCopilotMessage(customText = null) {
  const input = document.getElementById('copilot-input');
  const text = customText || (input ? input.value.trim() : '');
  if (!text) return;

  if (input) input.value = '';

  // Append user message to chat stream
  appendChatMessage('user', text);

  // Show typing indicator
  const typingId = showTypingIndicator();

  // Gather current biometric and ergonomic context from DOM
  const score = parseInt(document.getElementById('gauge-score')?.innerText, 10) || 42;
  const workH = parseFloat(document.getElementById('input-work')?.value) || 8.0;
  const sleepH = parseFloat(document.getElementById('input-sleep')?.value) || 7.2;
  const fatigue = parseInt(document.getElementById('input-fatigue')?.value, 10) || 4;
  const caffeine = parseInt(document.getElementById('input-caffeine')?.value, 10) || 2;
  const screenH = parseFloat(document.getElementById('input-screen')?.value) || 7.0;
  const breaks = parseInt(document.getElementById('input-breaks')?.value, 10) || 3;
  const wakeTime = document.getElementById('prof-waketime')?.value || '06:30';

  const context = {
    currentLog: {
      predictedStressScore: score,
      stressTier: score <= 35 ? 'Low' : score <= 60 ? 'Moderate' : score <= 79 ? 'Elevated' : 'High',
      workingHours: workH,
      sleepHours: sleepH,
      fatigueLevel: fatigue,
      sleepAnalysis: {
        deficit: Math.max(0, parseFloat((8.0 - sleepH).toFixed(1))),
        suggestedBedtime: document.getElementById('sleep-bedtime-display')?.innerText || '22:15'
      },
      activities: {
        caffeineCups: caffeine,
        screenTimeHours: screenH,
        breaksTaken: breaks
      }
    },
    wakeTime
  };

  try {
    const res = await fetch('/api/ai/copilot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: text, context })
    });

    removeTypingIndicator(typingId);

    if (res.ok) {
      const data = await res.json();
      appendChatMessage('bot', data.reply, data.source);
    } else {
      appendChatMessage('bot', 'Apologies, unable to reach the diagnostic engine right now. Please practice 3 minutes of Box Breathing in the studio.');
    }
  } catch (err) {
    removeTypingIndicator(typingId);
    appendChatMessage('bot', 'Offline mode active: To stabilize autonomic tone, reduce screen blue light and prioritize wind-down tonight.');
  }
}

function appendChatMessage(sender, text, source = null) {
  const container = document.getElementById('copilot-messages');
  if (!container) return;

  const msgDiv = document.createElement('div');
  msgDiv.className = sender === 'user'
    ? 'flex justify-end my-2'
    : 'flex justify-start my-2';

  const bubble = document.createElement('div');
  bubble.className = sender === 'user'
    ? 'bg-teal-600 text-white rounded-2xl rounded-tr-xs p-3 text-xs max-w-[85%] shadow-xs leading-relaxed'
    : 'bg-white text-slate-800 border border-slate-200 rounded-2xl rounded-tl-xs p-3.5 text-xs max-w-[90%] shadow-xs space-y-1.5 leading-relaxed';

  if (sender === 'user') {
    bubble.innerText = text;
  } else {
    // Format simple markdown lines
    const formatted = text
      .replace(/^### (.*$)/gim, '<strong class="text-sm text-slate-900 block border-b pb-1 mb-1">$1</strong>')
      .replace(/^\*Source: (.*)\*$/gim, '<span class="text-[10px] text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded font-bold block mb-1">$1</span>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>')
      .replace(/• (.*)/g, '<div class="flex items-start gap-1.5 text-slate-700 my-0.5"><span class="text-teal-600 font-bold">•</span><span>$1</span></div>')
      .replace(/\n\n/g, '<div class="h-1.5"></div>');

    bubble.innerHTML = formatted;
  }

  msgDiv.appendChild(bubble);
  container.appendChild(msgDiv);
  container.scrollTop = container.scrollHeight;
}

function showTypingIndicator() {
  const container = document.getElementById('copilot-messages');
  if (!container) return null;

  const id = `typing-${Date.now()}`;
  const div = document.createElement('div');
  div.id = id;
  div.className = 'flex justify-start my-2';
  div.innerHTML = `
    <div class="bg-slate-100 text-slate-500 rounded-2xl rounded-tl-xs px-3 py-2 text-xs flex items-center gap-1.5">
      <span class="w-1.5 h-1.5 bg-teal-600 rounded-full animate-bounce"></span>
      <span class="w-1.5 h-1.5 bg-teal-600 rounded-full animate-bounce [animation-delay:0.2s]"></span>
      <span class="w-1.5 h-1.5 bg-teal-600 rounded-full animate-bounce [animation-delay:0.4s]"></span>
      <span class="text-[11px] font-semibold text-slate-600 ml-1">SereneAI analyzing neuro-metrics...</span>
    </div>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return id;
}

function removeTypingIndicator(id) {
  if (!id) return;
  const el = document.getElementById(id);
  if (el) el.remove();
}

// Global window bindings
if (typeof window !== 'undefined') {
  window.toggleCopilotDrawer = toggleCopilotDrawer;
  window.sendCopilotMessage = sendCopilotMessage;
}
