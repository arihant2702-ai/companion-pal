/**
 * User-isolated localStorage manager for CompanionPal.
 * Ensures each user's reminders stay completely separate.
 */

function getStorageKey(username) {
  return `companionpal_reminders_${username || 'guest'}`;
}

function getReminders(username) {
  try {
    const raw = localStorage.getItem(getStorageKey(username));
    if (!raw) {
      return getDefaultReminders(username);
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveReminders(username, reminders) {
  try {
    localStorage.setItem(getStorageKey(username), JSON.stringify(reminders));
  } catch (err) {
    console.error('Failed to save reminders to localStorage:', err);
  }
}

function addReminder(username, item) {
  const current = getReminders(username);
  const newItem = {
    id: Date.now().toString(),
    time: item.time || '10:00 AM',
    title: item.title || '',
    note: item.note || ''
  };
  current.push(newItem);
  saveReminders(username, current);
  return current;
}

function deleteReminder(username, id) {
  const current = getReminders(username);
  const filtered = current.filter(r => r.id !== id);
  saveReminders(username, filtered);
  return filtered;
}

function getDefaultReminders(username) {
  // Contextual initial sample reminders
  return [
    {
      id: 'default-1',
      time: '08:30 AM',
      title: 'Morning medicine after breakfast',
      note: 'Drink a full glass of warm water'
    },
    {
      id: 'default-2',
      time: '04:00 PM',
      title: 'Tea & video call with family',
      note: 'Show them the new garden flower'
    },
    {
      id: 'default-3',
      time: '06:00 PM',
      title: 'Gentle 15-minute evening stroll',
      note: 'Wear comfortable walking shoes'
    }
  ];
}

// Accessibility preferences
function getFontScale() {
  const saved = localStorage.getItem('companionpal_font_scale');
  return saved ? parseFloat(saved) : 1.0;
}

function saveFontScale(scale) {
  localStorage.setItem('companionpal_font_scale', scale.toString());
}

function getHighContrast() {
  return localStorage.getItem('companionpal_high_contrast') === 'true';
}

function saveHighContrast(enabled) {
  localStorage.setItem('companionpal_high_contrast', enabled ? 'true' : 'false');
}

window.CompanionStorage = {
  getReminders,
  saveReminders,
  addReminder,
  deleteReminder,
  getDefaultReminders,
  getFontScale,
  saveFontScale,
  getHighContrast,
  saveHighContrast
};
