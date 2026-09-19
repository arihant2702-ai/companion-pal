/**
 * Web Speech API helper for voice dictation and read-aloud.
 * Senior-friendly design: large indicators, slow speaking speed option.
 */

let isSlowSpeed = false;
let currentUtterance = null;
let recognition = null;
let isListening = false;

// Initialize Speech Synthesis
function isSpeechSynthesisSupported() {
  return 'speechSynthesis' in window;
}

// Initialize Speech Recognition
function isSpeechRecognitionSupported() {
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
}

/**
 * Toggle between normal (0.9x) and slow (0.75x) speech rate
 */
function toggleSpeechSpeed() {
  isSlowSpeed = !isSlowSpeed;
  return isSlowSpeed;
}

/**
 * Speak text aloud using Web Speech API
 */
function speakText(text, onStart, onEnd) {
  if (!isSpeechSynthesisSupported()) {
    alert('Read-aloud is not supported in this browser.');
    return;
  }

  // Cancel any ongoing speech
  stopSpeaking();

  // Clean text: strip HTML and markdown formatting for clean audio
  const clean = text
    .replace(/<[^>]*>/g, '')
    .replace(/[*#_~`]/g, '')
    .trim();

  if (!clean) return;

  currentUtterance = new SpeechSynthesisUtterance(clean);
  currentUtterance.rate = isSlowSpeed ? 0.75 : 0.90; // gentle, unhurried pace
  currentUtterance.pitch = 1.0;

  if (onStart) currentUtterance.onstart = onStart;
  currentUtterance.onend = () => {
    currentUtterance = null;
    if (onEnd) onEnd();
  };
  currentUtterance.onerror = () => {
    currentUtterance = null;
    if (onEnd) onEnd();
  };

  window.speechSynthesis.speak(currentUtterance);
}

/**
 * Stop speech playback
 */
function stopSpeaking() {
  if (isSpeechSynthesisSupported() && window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
  }
  currentUtterance = null;
}

/**
 * Start or stop voice dictation into a target input or textarea
 */
function toggleDictation(targetInputElement, onStatusChange) {
  if (!isSpeechRecognitionSupported()) {
    alert('Voice input is not supported in this browser. Please type in the box instead.');
    return;
  }

  if (isListening) {
    if (recognition) recognition.stop();
    isListening = false;
    if (onStatusChange) onStatusChange(false);
    return;
  }

  const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognitionClass();
  recognition.lang = navigator.language || 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    isListening = true;
    if (onStatusChange) onStatusChange(true);
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    if (targetInputElement) {
      const existing = targetInputElement.value.trim();
      targetInputElement.value = existing ? `${existing} ${transcript}` : transcript;
      targetInputElement.dispatchEvent(new Event('input', { bubbles: true }));
    }
  };

  recognition.onerror = (err) => {
    console.warn('Speech recognition error:', err.error);
    isListening = false;
    recognition = null;
    if (onStatusChange) onStatusChange(false);
  };

  recognition.onend = () => {
    isListening = false;
    recognition = null;
    if (onStatusChange) onStatusChange(false);
  };

  try {
    recognition.start();
  } catch (err) {
    console.error('Could not start microphone:', err);
    isListening = false;
    recognition = null;
    if (onStatusChange) onStatusChange(false);
  }
}


window.CompanionSpeech = {
  isSpeechSynthesisSupported,
  isSpeechRecognitionSupported,
  speakText,
  stopSpeaking,
  toggleSpeechSpeed,
  toggleDictation
};
