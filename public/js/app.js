/**
 * CompanionPal: Accessible Frontend Application
 * Designed with patience, warmth, high contrast, and large touch targets.
 */

// Global State
let currentUser = null;
let currentScreen = 'login';
let chatHistory = [];
let currentSteps = null;
let currentStepIndex = 0;

// DOM Elements
const views = {
  login: document.getElementById('view-login'),
  home: document.getElementById('view-home'),
  explain: document.getElementById('view-explain'),
  scam: document.getElementById('view-scam'),
  steps: document.getElementById('view-steps'),
  myday: document.getElementById('view-myday'),
  chat: document.getElementById('view-chat')
};

// 1. Accessibility Management
function applyAccessibilityPreferences() {
  const fontScale = window.CompanionStorage.getFontScale();
  document.documentElement.style.setProperty('--font-scale', fontScale);

  const highContrast = window.CompanionStorage.getHighContrast();
  if (highContrast) {
    document.body.setAttribute('data-high-contrast', 'true');
    const toggleBtn = document.getElementById('btn-high-contrast');
    if (toggleBtn) toggleBtn.setAttribute('aria-pressed', 'true');
  } else {
    document.body.removeAttribute('data-high-contrast');
    const toggleBtn = document.getElementById('btn-high-contrast');
    if (toggleBtn) toggleBtn.setAttribute('aria-pressed', 'false');
  }
}

function adjustFontSize(delta) {
  let current = window.CompanionStorage.getFontScale();
  current = Math.min(1.4, Math.max(0.9, Math.round((current + delta) * 10) / 10));
  window.CompanionStorage.saveFontScale(current);
  document.documentElement.style.setProperty('--font-scale', current);
}

function toggleHighContrast() {
  const current = window.CompanionStorage.getHighContrast();
  const next = !current;
  window.CompanionStorage.saveHighContrast(next);
  applyAccessibilityPreferences();
}

// 2. Navigation & Screen Management
function formatDisplayName(username) {
  if (!username) return 'Friend';
  if (username === 'senior.demo') return 'Senior Friend';
  if (username === 'family.demo') return 'Family Helper';
  const clean = username.split('@')[0].split('.')[0];
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function showScreen(screenName) {
  currentScreen = screenName;
  window.CompanionSpeech.stopSpeaking();

  // Reset any loading boxes or error banners so they never show prematurely
  ['login', 'explain', 'scam', 'steps', 'briefing', 'chat'].forEach(prefix => {
    const loading = document.getElementById(`${prefix}-loading`);
    if (loading) loading.hidden = true;
    const error = document.getElementById(`${prefix}-error`);
    if (error) {
      error.hidden = true;
      error.textContent = '';
    }
  });

  // Hide all screens
  Object.keys(views).forEach(key => {
    if (views[key]) {
      views[key].hidden = key !== screenName;
    }
  });

  // Top navigation bar visibility (hide on login)
  const navBar = document.getElementById('main-nav-bar');
  if (navBar) {
    navBar.hidden = (screenName === 'login');
  }

  // Update personalized greetings on home
  if (screenName === 'home') {
    updateHomeGreeting();
  }

  // Reload reminders when entering My Day
  if (screenName === 'myday') {
    renderRemindersList();
  }

  // Scroll smoothly to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Base URL for API requests (connects to local server if opened via file:// or another port)
const API_BASE = (window.location.protocol === 'file:' || (window.location.port && window.location.port !== '3000' && window.location.hostname === 'localhost'))
  ? 'http://localhost:3000'
  : '';

function updateHomeGreeting() {
  const greetingEl = document.getElementById('home-greeting');
  const dateEl = document.getElementById('home-date');
  const userGreetingEl = document.getElementById('home-user-name');

  const now = new Date();
  const hours = now.getHours();
  let timeGreeting = 'Good day';
  if (hours < 12) timeGreeting = 'Good morning';
  else if (hours < 17) timeGreeting = 'Good afternoon';
  else timeGreeting = 'Good evening';

  const dateStr = now.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  if (greetingEl) greetingEl.textContent = timeGreeting;
  if (dateEl) dateEl.textContent = `Today is ${dateStr}.`;
  if (userGreetingEl) userGreetingEl.textContent = `${formatDisplayName(currentUser)}!`;
}

// 3. Authentication
async function handleLogin(username, password) {
  const errorEl = document.getElementById('login-error');
  if (errorEl) {
    errorEl.hidden = true;
    errorEl.textContent = '';
  }

  try {
    const res = await fetch(`${API_BASE}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (!res.ok) {
      if (errorEl) {
        errorEl.textContent = data.error || 'That did not match. Please try again.';
        errorEl.hidden = false;
      }
      return;
    }

    currentUser = data.username;
    localStorage.setItem('companionpal_user', currentUser);
    if (data.token) {
      localStorage.setItem('companionpal_token', data.token);
    }
    showScreen('home');
  } catch (err) {
    if (errorEl) {
      if (window.location.protocol === 'file:') {
        errorEl.innerHTML = 'You opened this file directly from your computer folder. Please type <strong>http://localhost:3000</strong> in your browser address bar to connect to the server.';
      } else {
        errorEl.textContent = 'Could not connect to the server. Please check your connection and try again.';
      }
      errorEl.hidden = false;
    }
  }
}

async function handleLogout() {
  try {
    await fetch(`${API_BASE}/api/logout`, { method: 'POST', credentials: 'include' });
  } catch (err) {
    console.warn('Logout network error:', err);
  }

  currentUser = null;
  localStorage.removeItem('companionpal_user');
  localStorage.removeItem('companionpal_token');
  chatHistory = [];
  currentSteps = null;
  showScreen('login');
}

// 4. API Request Wrapper with 401 handling
async function callAiApi(payload) {
  const token = localStorage.getItem('companionpal_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(payload)
  });

  if (res.status === 401) {
    currentUser = null;
    localStorage.removeItem('companionpal_user');
    localStorage.removeItem('companionpal_token');
    showScreen('login');
    const loginErr = document.getElementById('login-error');
    if (loginErr) {
      loginErr.textContent = 'Your session has expired. Please log in again to continue.';
      loginErr.hidden = false;
    }
    throw new Error('Please log in again.');
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong. Please try again.');
  }

  return data;
}

// 4b. Streaming API Request Wrapper with live chunks
async function callAiApiStream(payload, onChunk) {
  const token = localStorage.getItem('companionpal_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({ ...payload, stream: true })
  });

  if (res.status === 401) {
    currentUser = null;
    localStorage.removeItem('companionpal_user');
    localStorage.removeItem('companionpal_token');
    showScreen('login');
    const loginErr = document.getElementById('login-error');
    if (loginErr) {
      loginErr.textContent = 'Your session has expired. Please log in again to continue.';
      loginErr.hidden = false;
    }
    throw new Error('Please log in again.');
  }

  if (!res.ok) {
    let errMsg = 'Something went wrong. Please try again.';
    try {
      const errData = await res.json();
      if (errData.error) errMsg = errData.error;
    } catch {}
    throw new Error(errMsg);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('data: ')) {
        try {
          const parsed = JSON.parse(trimmed.slice(6).trim());
          if (parsed.chunk) {
            full += parsed.chunk;
            if (typeof onChunk === 'function') {
              onChunk(full);
            }
          } else if (parsed.done && parsed.full) {
            full = parsed.full;
            if (typeof onChunk === 'function') {
              onChunk(full);
            }
          }
        } catch {}
      }
    }
  }

  return { result: full };
}

// 5. Feature 1: Explain This
async function runExplain() {
  const btn = document.getElementById('btn-explain');
  const inputEl = document.getElementById('explain-input');
  const resultContainer = document.getElementById('explain-result');
  const contentEl = document.getElementById('explain-content');
  const loadingEl = document.getElementById('explain-loading');
  const errorEl = document.getElementById('explain-error');

  const text = inputEl.value.trim();
  if (!text) {
    alert('Please type or paste the notice or letter you want explained.');
    return;
  }

  resultContainer.hidden = true;
  errorEl.hidden = true;
  loadingEl.hidden = false;
  if (btn) btn.disabled = true;

  try {
    contentEl.textContent = '';
    const data = await callAiApiStream({ feature: 'explain', text }, (accumulated) => {
      loadingEl.hidden = true;
      contentEl.textContent = accumulated;
      resultContainer.hidden = false;
    });
    loadingEl.hidden = true;
    contentEl.textContent = data.result;
    resultContainer.hidden = false;
    resultContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (err) {
    loadingEl.hidden = true;
    errorEl.textContent = err.message;
    errorEl.hidden = false;
  } finally {
    if (btn) btn.disabled = false;
  }
}

// 6. Feature 2: Is This a Scam?
async function runScamCheck() {
  const btn = document.getElementById('btn-scam');
  const inputEl = document.getElementById('scam-input');
  const resultContainer = document.getElementById('scam-result');
  const badgeEl = document.getElementById('scam-badge');
  const reasonsListEl = document.getElementById('scam-reasons');
  const actionEl = document.getElementById('scam-action');
  const loadingEl = document.getElementById('scam-loading');
  const errorEl = document.getElementById('scam-error');

  const text = inputEl.value.trim();
  if (!text) {
    alert('Please paste the message or describe what someone told you.');
    return;
  }

  resultContainer.hidden = true;
  errorEl.hidden = true;
  loadingEl.hidden = false;
  if (btn) btn.disabled = true;

  try {
    const data = await callAiApi({ feature: 'scam', text });
    loadingEl.hidden = true;

    // Set Verdict Badge
    badgeEl.className = 'scam-badge';
    let iconSvg = '';
    if (data.verdict === 'Looks Safe') {
      badgeEl.classList.add('verdict-safe');
      iconSvg = `<svg class="icon" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path></svg>`;
    } else if (data.verdict === 'Be Careful') {
      badgeEl.classList.add('verdict-careful');
      iconSvg = `<svg class="icon" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
    } else {
      badgeEl.classList.add('verdict-scam');
      iconSvg = `<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
    }
    badgeEl.innerHTML = `${iconSvg} <span>Verdict: ${data.verdict}</span>`;

    // Populate Reasons
    reasonsListEl.innerHTML = '';
    data.reasons.forEach(reason => {
      const li = document.createElement('li');
      li.textContent = reason;
      reasonsListEl.appendChild(li);
    });

    // Action step
    actionEl.textContent = data.action;

    resultContainer.hidden = false;
    resultContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (err) {
    loadingEl.hidden = true;
    errorEl.textContent = err.message;
    errorEl.hidden = false;
  } finally {
    if (btn) btn.disabled = false;
  }
}

// 7. Feature 3: Step-by-Step Help
async function runStepsHelp() {
  const btn = document.getElementById('btn-steps');
  const inputEl = document.getElementById('steps-input');
  const viewerEl = document.getElementById('steps-viewer');
  const loadingEl = document.getElementById('steps-loading');
  const errorEl = document.getElementById('steps-error');

  const text = inputEl.value.trim();
  if (!text) {
    alert('Please type what task you would like help with.');
    return;
  }

  viewerEl.hidden = true;
  errorEl.hidden = true;
  loadingEl.hidden = false;
  if (btn) btn.disabled = true;

  try {
    const data = await callAiApi({ feature: 'steps', text });
    loadingEl.hidden = true;
    currentSteps = data;
    currentStepIndex = 0;
    renderCurrentStep();
    viewerEl.hidden = false;
    viewerEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (err) {
    loadingEl.hidden = true;
    errorEl.textContent = err.message;
    errorEl.hidden = false;
  } finally {
    if (btn) btn.disabled = false;
  }
}

function renderCurrentStep() {
  if (!currentSteps || !currentSteps.steps || currentSteps.steps.length === 0) return;

  const total = currentSteps.steps.length;
  const step = currentSteps.steps[currentStepIndex];

  document.getElementById('steps-title').textContent = currentSteps.title;
  document.getElementById('step-indicator').textContent = `Step ${currentStepIndex + 1} of ${total}`;
  document.getElementById('step-instruction').textContent = step.instruction;
  
  const tipEl = document.getElementById('step-tip');
  if (step.tip) {
    tipEl.textContent = `Tip: ${step.tip}`;
    tipEl.hidden = false;
  } else {
    tipEl.hidden = true;
  }

  // Manage Nav Buttons
  const prevBtn = document.getElementById('btn-prev-step');
  const nextBtn = document.getElementById('btn-next-step');

  prevBtn.disabled = (currentStepIndex === 0);
  nextBtn.textContent = (currentStepIndex === total - 1) ? 'Finished! All Done' : 'Next Step →';
}

function stepNavigate(delta) {
  if (!currentSteps) return;
  const newIndex = currentStepIndex + delta;
  if (newIndex >= 0 && newIndex < currentSteps.steps.length) {
    currentStepIndex = newIndex;
    renderCurrentStep();
  } else if (newIndex >= currentSteps.steps.length) {
    alert('Wonderful job! You have completed all the steps.');
  }
}

// 8. Feature 4: My Day (Reminders & Briefing)
function renderRemindersList() {
  const container = document.getElementById('myday-reminders-list');
  const items = window.CompanionStorage.getReminders(currentUser);

  container.innerHTML = '';
  if (items.length === 0) {
    container.innerHTML = '<p class="sub-greeting">You have no reminders set yet. Click "Add a Reminder" below to create one!</p>';
    return;
  }

  items.forEach(item => {
    const row = document.createElement('div');
    row.className = 'reminder-item';
    row.innerHTML = `
      <div class="reminder-content">
        <span class="reminder-time">${escapeHtml(item.time)}</span>
        <span class="reminder-title">${escapeHtml(item.title)}</span>
        ${item.note ? `<span style="color: var(--text-muted); font-size: 0.9em;">${escapeHtml(item.note)}</span>` : ''}
      </div>
      <button class="btn-tool btn-danger" aria-label="Delete reminder ${escapeHtml(item.title)}" onclick="removeReminder('${item.id}')">
        <svg class="icon" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        <span>Delete</span>
      </button>
    `;
    container.appendChild(row);
  });
}

function removeReminder(id) {
  window.CompanionStorage.deleteReminder(currentUser, id);
  renderRemindersList();
}

function addNewReminder() {
  const time = document.getElementById('rem-time').value.trim();
  const title = document.getElementById('rem-title').value.trim();
  const note = document.getElementById('rem-note').value.trim();

  if (!title) {
    alert('Please provide a short description for your reminder (like medicine or doctor call).');
    return;
  }

  window.CompanionStorage.addReminder(currentUser, { time, title, note });
  document.getElementById('rem-title').value = '';
  document.getElementById('rem-note').value = '';
  document.getElementById('add-reminder-form').hidden = true;
  renderRemindersList();
}

async function runDailyBriefing() {
  const btn = document.getElementById('btn-refresh-briefing');
  const resultContainer = document.getElementById('myday-briefing-result');
  const contentEl = document.getElementById('myday-briefing-content');
  const loadingEl = document.getElementById('myday-loading');
  const errorEl = document.getElementById('myday-error');

  const reminders = window.CompanionStorage.getReminders(currentUser);
  const now = new Date();

  resultContainer.hidden = true;
  errorEl.hidden = true;
  loadingEl.hidden = false;
  if (btn) btn.disabled = true;

  try {
    contentEl.textContent = '';
    const data = await callAiApiStream({
      feature: 'myday',
      reminders,
      currentTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      currentDate: now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    }, (accumulated) => {
      loadingEl.hidden = true;
      contentEl.textContent = accumulated;
      resultContainer.hidden = false;
    });

    loadingEl.hidden = true;
    contentEl.textContent = data.result;
    resultContainer.hidden = false;
    resultContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (err) {
    loadingEl.hidden = true;
    errorEl.textContent = err.message;
    errorEl.hidden = false;
  } finally {
    if (btn) btn.disabled = false;
  }
}

// 9. Feature 5: Just Chat
async function sendChatMessage() {
  const btn = document.getElementById('btn-send-chat');
  const inputEl = document.getElementById('chat-input');
  const windowEl = document.getElementById('chat-window');
  const loadingEl = document.getElementById('chat-loading');
  const errorEl = document.getElementById('chat-error');

  const text = inputEl.value.trim();
  if (!text) return;

  // Append user bubble
  inputEl.value = '';
  errorEl.hidden = true;
  appendChatBubble('user', text);
  chatHistory.push({ role: 'user', content: text });

  loadingEl.hidden = false;
  windowEl.scrollTop = windowEl.scrollHeight;

  if (btn) btn.disabled = true;
  if (inputEl) inputEl.disabled = true;

  let modelBubble = null;
  let modelTextNode = null;

  try {
    const data = await callAiApiStream({
      feature: 'chat',
      text,
      history: chatHistory.slice(0, -1)
    }, (accumulated) => {
      loadingEl.hidden = true;
      if (!modelBubble) {
        modelBubble = document.createElement('div');
        modelBubble.className = 'chat-bubble chat-bubble-model';
        modelTextNode = document.createTextNode(accumulated);
        modelBubble.appendChild(modelTextNode);
        windowEl.appendChild(modelBubble);
      } else {
        modelTextNode.nodeValue = accumulated;
      }
      windowEl.scrollTop = windowEl.scrollHeight;
    });

    loadingEl.hidden = true;
    if (modelBubble) {
      modelBubble.remove();
    }
    appendChatBubble('model', data.result);
    chatHistory.push({ role: 'model', content: data.result });
  } catch (err) {
    loadingEl.hidden = true;
    if (modelBubble) modelBubble.remove();
    errorEl.textContent = err.message;
    errorEl.hidden = false;
  } finally {
    if (btn) btn.disabled = false;
    if (inputEl) {
      inputEl.disabled = false;
      inputEl.focus();
    }
  }
}

function appendChatBubble(role, content) {
  const windowEl = document.getElementById('chat-window');
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble chat-bubble-${role}`;
  bubble.textContent = content;

  if (role === 'model') {
    // Add read-aloud button to assistant messages
    const speakBtn = document.createElement('button');
    speakBtn.className = 'btn-tool';
    speakBtn.style.marginTop = '10px';
    speakBtn.style.padding = '4px 10px';
    speakBtn.style.minHeight = '38px';
    speakBtn.innerHTML = `
      <svg class="icon" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
      <span>Read Aloud</span>
    `;
    speakBtn.onclick = () => window.CompanionSpeech.speakText(content);
    bubble.appendChild(speakBtn);
  }

  windowEl.appendChild(bubble);
  windowEl.scrollTop = windowEl.scrollHeight;
}

// Utility
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// 10. Initialization and Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  applyAccessibilityPreferences();

  // A11y bar listeners
  document.getElementById('btn-font-inc')?.addEventListener('click', () => adjustFontSize(0.1));
  document.getElementById('btn-font-dec')?.addEventListener('click', () => adjustFontSize(-0.1));
  document.getElementById('btn-high-contrast')?.addEventListener('click', toggleHighContrast);

  // Global Navigation
  document.getElementById('nav-home-btn')?.addEventListener('click', () => showScreen('home'));
  document.getElementById('nav-back-btn')?.addEventListener('click', () => showScreen('home'));
  document.getElementById('nav-logout-btn')?.addEventListener('click', handleLogout);

  // Login Form
  const loginForm = document.getElementById('login-form');
  loginForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const user = document.getElementById('login-username').value;
    const pass = document.getElementById('login-password').value;
    handleLogin(user, pass);
  });

  // Feature Card Clicks (Home Screen)
  document.getElementById('card-explain')?.addEventListener('click', () => showScreen('explain'));
  document.getElementById('card-scam')?.addEventListener('click', () => showScreen('scam'));
  document.getElementById('card-steps')?.addEventListener('click', () => showScreen('steps'));
  document.getElementById('card-myday')?.addEventListener('click', () => showScreen('myday'));
  document.getElementById('card-chat')?.addEventListener('click', () => showScreen('chat'));

  // Feature Action Buttons
  document.getElementById('btn-run-explain')?.addEventListener('click', runExplain);
  document.getElementById('btn-clear-explain')?.addEventListener('click', () => {
    document.getElementById('explain-input').value = '';
    document.getElementById('explain-result').hidden = true;
  });

  document.getElementById('btn-run-scam')?.addEventListener('click', runScamCheck);
  document.getElementById('btn-clear-scam')?.addEventListener('click', () => {
    document.getElementById('scam-input').value = '';
    document.getElementById('scam-result').hidden = true;
  });

  document.getElementById('btn-run-steps')?.addEventListener('click', runStepsHelp);
  document.getElementById('btn-prev-step')?.addEventListener('click', () => stepNavigate(-1));
  document.getElementById('btn-next-step')?.addEventListener('click', () => stepNavigate(1));

  document.getElementById('btn-run-briefing')?.addEventListener('click', runDailyBriefing);
  document.getElementById('btn-show-add-reminder')?.addEventListener('click', () => {
    const f = document.getElementById('add-reminder-form');
    f.hidden = !f.hidden;
  });
  document.getElementById('btn-save-reminder')?.addEventListener('click', addNewReminder);
  document.getElementById('btn-cancel-reminder')?.addEventListener('click', () => {
    document.getElementById('add-reminder-form').hidden = true;
  });

  document.getElementById('btn-send-chat')?.addEventListener('click', sendChatMessage);
  document.getElementById('chat-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  });

  // Read Aloud Buttons
  document.getElementById('btn-speak-explain')?.addEventListener('click', () => {
    const text = document.getElementById('explain-content').textContent;
    window.CompanionSpeech.speakText(text);
  });

  document.getElementById('btn-speak-scam')?.addEventListener('click', () => {
    const badgeText = document.getElementById('scam-badge').textContent;
    const reasons = Array.from(document.querySelectorAll('#scam-reasons li')).map(li => li.textContent).join('. ');
    const action = document.getElementById('scam-action').textContent;
    window.CompanionSpeech.speakText(`${badgeText}. Reasons: ${reasons}. Recommended action: ${action}`);
  });

  document.getElementById('btn-speak-step')?.addEventListener('click', () => {
    const stepInd = document.getElementById('step-indicator').textContent;
    const stepInst = document.getElementById('step-instruction').textContent;
    const stepTip = document.getElementById('step-tip').textContent;
    window.CompanionSpeech.speakText(`${stepInd}. ${stepInst}. ${stepTip}`);
  });

  document.getElementById('btn-speak-briefing')?.addEventListener('click', () => {
    const text = document.getElementById('myday-briefing-content').textContent;
    window.CompanionSpeech.speakText(text);
  });

  // Microphone Voice Dictation Buttons
  document.getElementById('btn-mic-explain')?.addEventListener('click', function() {
    const input = document.getElementById('explain-input');
    window.CompanionSpeech.toggleDictation(input, (active) => {
      this.classList.toggle('btn-accent', active);
      this.querySelector('span').textContent = active ? 'Listening...' : 'Dictate with Voice';
    });
  });

  document.getElementById('btn-mic-scam')?.addEventListener('click', function() {
    const input = document.getElementById('scam-input');
    window.CompanionSpeech.toggleDictation(input, (active) => {
      this.classList.toggle('btn-accent', active);
      this.querySelector('span').textContent = active ? 'Listening...' : 'Dictate with Voice';
    });
  });

  document.getElementById('btn-mic-steps')?.addEventListener('click', function() {
    const input = document.getElementById('steps-input');
    window.CompanionSpeech.toggleDictation(input, (active) => {
      this.classList.toggle('btn-accent', active);
      this.querySelector('span').textContent = active ? 'Listening...' : 'Ask by Voice';
    });
  });

  document.getElementById('btn-mic-chat')?.addEventListener('click', function() {
    const input = document.getElementById('chat-input');
    window.CompanionSpeech.toggleDictation(input, (active) => {
      this.classList.toggle('btn-accent', active);
      this.querySelector('span').textContent = active ? 'Listening...' : 'Speak';
    });
  });

  // Slow Speech Toggle
  document.getElementById('btn-toggle-speed')?.addEventListener('click', function() {
    const isSlow = window.CompanionSpeech.toggleSpeechSpeed();
    this.textContent = isSlow ? 'Reading Pace: Slow & Gentle' : 'Reading Pace: Normal';
  });

  // Always force the Sign In screen as the first view on page load
  currentUser = null;
  localStorage.removeItem('companionpal_user');
  localStorage.removeItem('companionpal_token');
  showScreen('login');
});


// Demo Account Quick-Fill Helpers for Reviewers
window.fillDemoAccount = function(username, password) {
  const userEl = document.getElementById('login-username');
  const passEl = document.getElementById('login-password');
  if (userEl && passEl) {
    userEl.value = username;
    passEl.value = password;
  }
};
