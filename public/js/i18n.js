/**
 * SereneTrack Bilingual Internationalization (i18n) Engine
 * Supports English and Hindi (हिंदी) for complete Bharat inclusivity at SIH.
 */

let currentLang = 'en';

export const TRANSLATIONS = {
  en: {
    appTitle: 'SereneTrack Forces',
    appSubtitle: 'AI Predictive Personnel Stress & Welfare Monitoring System (CRPF / MHA PS #26186)',
    tabForces: '🎖️ Uniformed Forces (CRPF / MHA)',
    tabDashboard: 'Daily Dashboard',
    tabTrends: 'Trends & Studio',
    tabVault: 'CBT-I Worry Vault',
    tabSettings: 'Settings & Export',
    serverSynced: 'Server Synced',
    offlineMode: 'Offline Storage',
    bannerTitle: 'Autonomous & Secure Architecture:',
    bannerDesc: 'Running on Node.js backend with persistent SQLite database and instant offline-first fallback.',
    printSummary: 'Print Summary',
    todayProtocol: "Today's Protocol",
    activeCockpit: 'Daily Stress & Restorative Sleep Cockpit',
    cockpitDesc: 'Record working hours, sleep duration, and daily ergonomics to evaluate autonomic strain.',
    autonomicStrain: 'Autonomic Strain Prediction',
    outOf100: 'out of 100',
    lowStrain: 'Low Strain',
    moderateStrain: 'Moderate Strain',
    elevatedStrain: 'Elevated Strain',
    highStrain: 'High Strain',
    driversTitle: 'Primary Stress Catalysts:',
    sleepCalculatorTitle: 'Restorative Sleep Timing & Deficit Calculator',
    clinicalCeiling: 'Max 8.0h Restorative Ceiling',
    actualSleep: 'Actual Sleep Duration',
    recordedLastNight: 'Recorded last night',
    restorativeDeficit: 'Restorative Deficit',
    underLimit: 'Under 8.0h clinical limit',
    targetBedtime: 'Target Bedtime',
    targetAchievement: 'Restorative Sleep Target Achievement',
    biometricFormTitle: 'Biometric & Ergonomic Input Form',
    biometricFormDesc: 'Live predictions update as you adjust sliders',
    workHours: 'Working Hours',
    sleepHours: 'Sleep Duration',
    sleepQuality: 'Sleep Quality',
    fatigueIndex: 'Fatigue Index',
    screenTime: 'Screen Time (h)',
    mindfulBreaks: 'Mindful Breaks',
    hydration: 'Hydration (cups)',
    caffeine: 'Caffeine (cups)',
    movement: 'Movement (mins)',
    subjectiveMood: 'Subjective Mood & Neuro-State',
    moodCalm: '😌 Calm',
    moodEnergetic: '⚡ Energetic',
    moodContent: '🌱 Content',
    moodNeutral: '😐 Neutral',
    moodAnxious: '😰 Anxious',
    moodExhausted: '😴 Exhausted',
    reflectionsNotes: 'Daily Reflections & Physical Triggers (Optional)',
    saveLog: "Save & Update Today's Log",
    savedInstantly: 'Saved instantly to persistent database & local storage',
    
    // Tele-MANAS
    telemanasTitle: 'Tele-MANAS & National Mental Health Support',
    telemanasDesc: 'Elevated acute strain detected. Confidential, stigma-free Govt. of India psychological support is available 24/7.',
    callTelemanas: 'Call Tele-MANAS (14416)',
    callKiran: 'Call KIRAN (1800-599-0019)',
    emergencyBreathe: 'Guided Vagal Reset (2m)',

    // IoT Wearable
    wearableTitle: 'Simulated IoT Smart Wearable Telemetry',
    pulseRate: 'Pulse Rate',
    hrvIndex: 'Heart Rate Variability (HRV)',
    sleepArchitecture: 'Sleep Architecture (Deep N3 / REM / Light)',
    connectWearable: 'Connect Smart Wearable',
    wearableConnected: 'BLE Paired • Live Telemetry Stream',

    // CBT-I Vault
    vaultTitle: 'Bedtime Worry Vault (CBT-I)',
    vaultDesc: 'Offload intrusive thoughts, identify cognitive distortions, and lock worries away until morning.',
    worryInputPlaceholder: "What's looping in your mind or keeping you awake?",
    detectDistortion: 'Analyze & Reframe Thought',
    lockVaultBtn: 'Lock in Vault Until Morning',
    vaultLockedMsg: 'Thought reframed and safely locked in the vault until 08:00 AM. Sleep peacefully.',

    // Circadian & Caffeine
    caffeineTimelineTitle: 'Circadian Caffeine Metabolic Decay Curve',
    caffeineDesc: 'Visualizes 5.5-hour metabolic clearance. Caffeinated adenosine receptor blockade timeline.',
    adenosineClearance: 'Estimated Sleep Readiness Horizon',
    morningSunlightTimer: 'Morning Sunlight (Lux) Reset',

    // Judge Demo
    demoBadge: 'SIH Judge Demo Mode',
    demoNEET: '🎓 NEET / JEE Stressed Student',
    demoIT: '💻 Overworked IT Professional',
    demoRecovered: '🌿 Restored & Balanced Youth'
  },
  hi: {
    appTitle: 'सेरेनट्रैक फोर्सेस (SereneTrack Forces)',
    appSubtitle: 'सशस्त्र पुलिस बलों हेतु एआई-आधारित तनाव एवं कल्याण निगरानी प्रणाली (CRPF / MHA PS #26186)',
    tabForces: '🎖️ वर्दीधारी बल (CRPF / MHA)',
    tabDashboard: 'दैनिक डैशबोर्ड',
    tabTrends: 'प्रवृत्तियां एवं स्टूडियो',
    tabVault: 'चिंता तिजोरी (CBT-I)',
    tabSettings: 'सेटिंग्स व निर्यात',
    serverSynced: 'सर्वर से कनेक्टेड',
    offlineMode: 'ऑफ़लाइन संग्रहण',
    bannerTitle: 'सुरक्षित एवं स्वायत्त संरचना:',
    bannerDesc: 'Node.js बैकएंड और SQLite डेटाबेस पर आधारित। पूर्णतः ऑफ़लाइन संचालित।',
    printSummary: 'रिपोर्ट प्रिंट करें',
    todayProtocol: "आज का प्रोटोकॉल",
    activeCockpit: 'दैनिक तनाव एवं पुनर्स्थापक निद्रा कॉकपिट',
    cockpitDesc: 'स्वायत्त तंत्रिका तंत्र के तनाव का मूल्यांकन करने हेतु कार्य, निद्रा व जीवनशैली दर्ज करें।',
    autonomicStrain: 'स्वायत्त तनाव भार पूर्वानुमान',
    outOf100: '100 में से',
    lowStrain: 'कम तनाव (Low)',
    moderateStrain: 'मध्यम तनाव (Moderate)',
    elevatedStrain: 'बढ़ा हुआ तनाव (Elevated)',
    highStrain: 'अत्यधिक तनाव (High)',
    driversTitle: 'प्रमुख तनाव प्रेरक कारक:',
    sleepCalculatorTitle: 'पुनर्स्थापक निद्रा समय व कमी कैलकुलेटर',
    clinicalCeiling: 'अधिकतम 8.0 घंटे निद्रा सीमा',
    actualSleep: 'वास्तविक निद्रा अवधि',
    recordedLastNight: 'पिछली रात दर्ज',
    restorativeDeficit: 'निद्रा की कमी (Deficit)',
    underLimit: '8.0 घंटे चिकित्सीय सीमा से कम',
    targetBedtime: 'सोने का लक्षित समय',
    targetAchievement: 'निद्रा लक्ष्य उपलब्धि प्रतिशत',
    biometricFormTitle: 'बायोमेट्रिक एवं स्वास्थ्य इनपुट फॉर्म',
    biometricFormDesc: 'स्लाइडर बदलने पर लाइव परिणाम स्वतः अपडेट होते हैं',
    workHours: 'कार्य के घंटे',
    sleepHours: 'सोने की अवधि',
    sleepQuality: 'निद्रा की गुणवत्ता (1-5)',
    fatigueIndex: 'थकान स्तर (1-10)',
    screenTime: 'स्क्रीन समय (घंटे)',
    mindfulBreaks: 'माइंडफुल ब्रेक',
    hydration: 'पानी के गिलास',
    caffeine: 'चाय / कॉफी (कप)',
    movement: 'शारीरिक व्यायाम (मिनट)',
    subjectiveMood: 'मनोस्थिति एवं मानसिक स्थिति',
    moodCalm: '😌 शांत',
    moodEnergetic: '⚡ ऊर्जावान',
    moodContent: '🌱 संतुष्ट',
    moodNeutral: '😐 सामान्य',
    moodAnxious: '😰 चिंतित',
    moodExhausted: '😴 अत्यधिक थका हुआ',
    reflectionsNotes: 'दैनिक विचार व शारीरिक तनाव के कारण (वैकल्पिक)',
    saveLog: 'आज का लॉग सुरक्षित करें',
    savedInstantly: 'डेटाबेस और लोकल स्टोरेज में तुरंत सुरक्षित',

    // Tele-MANAS
    telemanasTitle: 'टेली-मानस (Tele-MANAS) राष्ट्रीय मानसिक स्वास्थ्य सहायता',
    telemanasDesc: 'गंभीर तनाव का पता चला है। भारत सरकार द्वारा 24x7 निःशुल्क एवं गोपनीय मानसिक सहायता उपलब्ध है।',
    callTelemanas: 'कॉल करें Tele-MANAS (14416)',
    callKiran: 'कॉल करें किरण (1800-599-0019)',
    emergencyBreathe: 'आपातकालीन शांत श्वसन (2 मिनट)',

    // IoT Wearable
    wearableTitle: 'सिम्युलेटेड स्मार्ट वियरेबल बायोमेट्रिक्स',
    pulseRate: 'नाड़ी की गति (Pulse)',
    hrvIndex: 'हृदय गति परिवर्तनशीलता (HRV)',
    sleepArchitecture: 'निद्रा संरचना (गहरी N3 / REM / हल्की)',
    connectWearable: 'स्मार्ट वॉच कनेक्ट करें',
    wearableConnected: 'ब्लूटूथ कनेक्टेड • लाइव डेटा स्ट्रीम',

    // CBT-I Vault
    vaultTitle: 'सोने से पहले चिंता तिजोरी (CBT-I)',
    vaultDesc: 'नकारात्मक विचारों को लिखें, उनकी पहचान करें और सुबह तक के लिए तिजोरी में बंद कर दें।',
    worryInputPlaceholder: 'कौन सा विचार आपको सोने नहीं दे रहा है?',
    detectDistortion: 'विचार का विश्लेषण व सुधार',
    lockVaultBtn: 'सुबह तक तिजोरी में बंद करें',
    vaultLockedMsg: 'विचार को सुधार कर सुबह 08:00 बजे तक तिजोरी में सुरक्षित कर दिया गया है। सुखद निद्रा!',

    // Circadian & Caffeine
    caffeineTimelineTitle: 'कैफीन चयापचय विघटन व निद्रा समय रेखा',
    caffeineDesc: '5.5 घंटे के अर्ध-जीवनकाल के आधार पर एडिनोसिन रिसेप्टर्स के मुक्त होने का समय।',
    adenosineClearance: 'अनुमानित निद्रा तत्परता समय',
    morningSunlightTimer: 'प्रातःकालीन सूर्य प्रकाश टाइमर',

    // Judge Demo
    demoBadge: 'SIH जज डेमो मोड',
    demoNEET: '🎓 नीट/जेईई तनावग्रस्त छात्र',
    demoIT: '💻 अत्यधिक व्यस्त आईटी प्रोफेशनल',
    demoRecovered: '🌿 स्वस्थ एवं संतुलित युवा'
  }
};

export function getLanguage() {
  return currentLang;
}

export function setLanguage(lang) {
  if (lang !== 'en' && lang !== 'hi') return;
  currentLang = lang;
  try {
    localStorage.setItem('serenetrack_lang', lang);
  } catch(e) {}
  applyTranslations();
}

export function t(key) {
  const dict = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
  return dict[key] || TRANSLATIONS.en[key] || key;
}

export function applyTranslations() {
  if (typeof document === 'undefined') return;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const val = t(key);
    if (val) {
      if (el.tagName === 'INPUT' && el.getAttribute('placeholder')) {
        el.setAttribute('placeholder', val);
      } else {
        el.innerText = val;
      }
    }
  });

  const btnEn = document.getElementById('lang-btn-en');
  const btnHi = document.getElementById('lang-btn-hi');
  if (btnEn && btnHi) {
    if (currentLang === 'en') {
      btnEn.className = 'px-2 py-0.5 rounded text-xs font-bold bg-teal-600 text-white shadow-xs';
      btnHi.className = 'px-2 py-0.5 rounded text-xs font-semibold text-slate-600 hover:text-slate-900';
    } else {
      btnHi.className = 'px-2 py-0.5 rounded text-xs font-bold bg-teal-600 text-white shadow-xs';
      btnEn.className = 'px-2 py-0.5 rounded text-xs font-semibold text-slate-600 hover:text-slate-900';
    }
  }
}

// Global window mapping
if (typeof window !== 'undefined') {
  window.setLanguage = setLanguage;
}
