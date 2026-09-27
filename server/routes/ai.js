import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const router = express.Router();

/**
 * Deterministic Clinical Heuristic Fallback Engine
 * Provides instant, zero-downtime clinical diagnostics when offline or when no API key is set.
 */
function generateHeuristicResponse(query, context = {}) {
  const current = context.currentLog || {};
  const work = current.workingHours || 8;
  const sleep = current.sleepHours || 7;
  const fatigue = current.fatigueLevel || 4;
  const caffeine = (current.activities && current.activities.caffeineCups) || 2;
  const screen = (current.activities && current.activities.screenTimeHours) || 7;
  const mood = current.mood || 'calm';
  const score = current.predictedStressScore || 35;
  const deficit = Math.max(0, parseFloat((8.0 - sleep).toFixed(1)));

  const lowerQ = (query || '').toLowerCase();

  // Pattern 1: Why is my stress score or fatigue high?
  if (lowerQ.includes('stress') || lowerQ.includes('score') || lowerQ.includes('fatigue') || lowerQ.includes('tired') || lowerQ.includes('why')) {
    return {
      source: 'Clinical Heuristic Engine',
      title: 'Neuro-Autonomic Load Diagnostic',
      summary: `Your calculated Autonomic Strain Score is ${score}/100 with a Fatigue Index of ${fatigue}/10. Several physiological catalysts are driving elevated sympathetic arousal:`,
      catalysts: [
        deficit > 0 ? `Sleep Debt: You accumulated ${deficit}h of restorative sleep debt under the clinical 8.0h ceiling.` : `Sleep Duration: On target at ${sleep}h.`,
        work > 8 ? `Work Schedule: ${work} hours exceeds optimal sustained cognitive capacity, elevating cortisol.` : `Work Schedule: Balanced at ${work}h.`,
        caffeine >= 3 ? `Stimulant Load: ${caffeine} cups of caffeine delays adenosine clearance by ~${(caffeine * 2.5).toFixed(1)} hours.` : `Caffeine: Moderate at ${caffeine} cups.`,
        screen >= 8 ? `Digital Ocular Strain: ${screen}h of high-energy blue light suppresses natural melatonin onset.` : `Screen Time: Manageable at ${screen}h.`
      ],
      recommendations: [
        'Engage in 3 minutes of Cyclic Physiological Sighing (two quick nasal sniffs followed by an extended audible mouth exhale) to immediately vent accumulated CO2 and reduce heart rate.',
        'Implement an immediate blue-light cutoff 60 minutes before your target bedtime.',
        'Take a 5-minute optic flow cadence walk to attenuate amygdala hyperactivity.'
      ],
      circadianNote: `To achieve full cellular and neurological recovery, aim for bedtime at ${current.sleepAnalysis ? current.sleepAnalysis.suggestedBedtime : '22:30'} tonight.`
    };
  }

  // Pattern 2: Bedtime wind-down routine
  if (lowerQ.includes('sleep') || lowerQ.includes('bedtime') || lowerQ.includes('wind-down') || lowerQ.includes('insomnia') || lowerQ.includes('night')) {
    return {
      source: 'Clinical Heuristic Engine',
      title: 'Prescribed CBT-I Wind-Down Protocol',
      summary: `To eliminate sleep debt of ${deficit}h and optimize restorative slow-wave N3 sleep:`,
      catalysts: [
        'Caffeine half-life is ~5.5 hours; ensure no stimulants are consumed past 02:00 PM.',
        'Hot shower or warm foot soak 45 minutes before sleep triggers distal vasodilation and lowers core body temperature.'
      ],
      recommendations: [
        'T-45 mins: Dim ambient lights below 50 lux and cease active work problem-solving.',
        'T-30 mins: Practice 4-7-8 Respiratory Pacing (Inhale 4s, Hold 7s, Exhale 8s) in the Mindful Studio.',
        'T-15 mins: Complete a 3-minute Bedtime Worry Vault entry to offload cognitive rumination before lying down.',
        'In Bed: Listen to Delta Binaural Beats (2.5 Hz) from the Acoustic Sanctuary at low volume.'
      ],
      circadianNote: `Your target sleep ceiling is 8.0 hours. Set your alarm for consistent wake-up at ${context.wakeTime || '06:30'} AM to anchor your circadian rhythm.`
    };
  }

  // Pattern 3: General wellness or caffeine question
  return {
    source: 'Clinical Heuristic Engine',
    title: 'Autonomic Recovery & Ergonomic Guidance',
    summary: `Based on your recent 7-day biorhythms (Strain: ${score}/100, Mood: ${mood}):`,
    catalysts: [
      `Autonomic Tone: ${score > 60 ? 'Sympathetic Dominance (Fight/Flight)' : 'Parasympathetic Dominance (Rest & Digest)'}`,
      `Hydration & Movement: Maintain 6-8 glasses of water to prevent hypovolemic fatigue.`
    ],
    recommendations: [
      'Take 90-minute ultradian micro-breaks: reset focal distance using the 20-20-20 rule.',
      'Use the Acoustic Sanctuary Theta (6.0 Hz) audio stream during afternoon tasks to reduce cortisol spikes.',
      'Engage in 10 minutes of gentle spinal unfurling and thoracic release stretches.'
    ],
    circadianNote: 'Consistent sleep timing anchors your neuro-endocrine clock more effectively than variable catch-up sleep.'
  };
}

// POST /api/ai/copilot
router.post('/copilot', async (req, res) => {
  const { query, context } = req.body;

  if (!query) {
    return res.status(400).json({ success: false, error: 'Query is required.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `
You are SereneAI, a clinical-grade neuro-restorative sleep and autonomic strain specialist built for the Smart India Hackathon (SIH).
You synthesize evidence-based medicine (ICMR sleep guidelines, Stanford neurobiology, CBT-I protocols, and autonomic heart rate variability metrics).

USER CONTEXT:
- Current Autonomic Strain Score: ${context?.currentLog?.predictedStressScore || 42}/100 (${context?.currentLog?.stressTier || 'Moderate'} strain)
- Working Hours: ${context?.currentLog?.workingHours || 8} hrs
- Sleep Duration: ${context?.currentLog?.sleepHours || 7.2} hrs (Target Clinical Restorative Ceiling: 8.0 hrs)
- Sleep Deficit: ${context?.currentLog?.sleepAnalysis?.deficit || 0.8} hrs
- Fatigue Index: ${context?.currentLog?.fatigueLevel || 4}/10
- Subjective Mood: ${context?.currentLog?.mood || 'calm'}
- Screen Time: ${context?.currentLog?.activities?.screenTimeHours || 7} hrs
- Caffeine Cups: ${context?.currentLog?.activities?.caffeineCups || 2} cups
- Mindful Breaks Taken: ${context?.currentLog?.activities?.breaksTaken || 3}
- Preferred Wake Time: ${context?.wakeTime || '06:30'}

USER QUESTION: "${query}"

Provide a concise, compassionate, clinical, and actionable response structured with:
1. Executive Clinical Assessment
2. Primary Physiological Catalysts identified
3. Step-by-step non-pharmacological somatic or sleep interventions
4. Bedtime/Circadian recommendation.
Format your answer cleanly with bullet points and bold highlights. Keep it professional, empathetic, and under 250 words.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });

      return res.json({
        success: true,
        source: 'Gemini 2.5 Flash',
        reply: response.text
      });
    } catch (err) {
      console.warn('[AI Route] Gemini API call failed, falling back to heuristic engine:', err.message);
    }
  }

  // Graceful deterministic fallback
  const heuristic = generateHeuristicResponse(query, context);
  const formattedReply = `
### ${heuristic.title}
*Source: ${heuristic.source} (Offline-First Resilient Mode)*

${heuristic.summary}

**Primary Physiological Catalysts:**
${heuristic.catalysts.map(c => `• ${c}`).join('\n')}

**Prescribed Interventions:**
${heuristic.recommendations.map(r => `• ${r}`).join('\n')}

💡 **Circadian Anchor:** ${heuristic.circadianNote}
  `.trim();

  res.json({
    success: true,
    source: heuristic.source,
    reply: formattedReply,
    structured: heuristic
  });
});

export default router;
