const { getAuthenticatedUser } = require('./_shared/auth');
const {
  handleExplain,
  handleScam,
  handleSteps,
  handleMyDay,
  handleChat
} = require('./_shared/gemini');

// Rate limiting store for AI calls: username -> [timestamps]
const userCallHistory = new Map();
const MAX_CALLS_PER_MINUTE = 20;

// Prune expired AI call records every 5 minutes to prevent memory leaks
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [user, times] of userCallHistory.entries()) {
      const valid = times.filter(t => now - t < 60000);
      if (valid.length === 0) {
        userCallHistory.delete(user);
      } else {
        userCallHistory.set(user, valid);
      }
    }
  }, 5 * 60 * 1000).unref();
}

function checkUserAiRateLimit(username) {
  const now = Date.now();
  const times = userCallHistory.get(username) || [];
  const recent = times.filter(t => now - t < 60000);
  userCallHistory.set(username, recent);

  if (recent.length >= MAX_CALLS_PER_MINUTE) {
    return false;
  }
  recent.push(now);
  return true;
}

/**
 * Sanitize and strip HTML tags from input string to prevent injection.
 */
function sanitizeInput(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/<[^>]*>/g, '') // remove HTML tags
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '') // remove hidden control characters
    .trim();
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed. Please use POST.' });
  }

  // 1. Enforce Authentication
  const user = getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({
      error: 'Please log in first to use CompanionPal.',
      code: 'UNAUTHORIZED'
    });
  }

  // 2. Check AI call rate limiting
  if (!checkUserAiRateLimit(user.username)) {
    return res.status(429).json({
      error: 'CompanionPal is busy thinking. Please wait a moment and try again.'
    });
  }

  // 3. Parse Body
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }

  const { feature, text, reminders, currentTime, currentDate, history, stream } = body || {};

  if (!feature) {
    return res.status(400).json({ error: 'Please choose which feature you would like to use.' });
  }

  // 4. Validate and execute feature
  try {
    if (stream && (feature === 'explain' || feature === 'myday' || feature === 'chat')) {
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const sendChunk = (chunk) => {
        res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
      };

      let resultData;
      if (feature === 'explain') {
        const sanitized = sanitizeInput(text);
        if (!sanitized) return res.status(400).json({ error: 'Please enter or paste the letter or notice you would like explained.' });
        resultData = await handleExplain(sanitized, sendChunk);
      } else if (feature === 'myday') {
        const safeReminders = Array.isArray(reminders)
          ? reminders.map(r => ({
              title: sanitizeInput(r.title),
              time: sanitizeInput(r.time),
              note: sanitizeInput(r.note)
            }))
          : [];
        resultData = await handleMyDay({
          reminders: safeReminders,
          currentTime: sanitizeInput(currentTime),
          currentDate: sanitizeInput(currentDate),
          username: user.username
        }, sendChunk);
      } else if (feature === 'chat') {
        const sanitized = sanitizeInput(text);
        if (!sanitized) return res.status(400).json({ error: 'Please type a message to chat with CompanionPal.' });
        const safeHistory = Array.isArray(history)
          ? history.map(h => ({
              role: h.role === 'model' || h.role === 'assistant' ? 'model' : 'user',
              content: sanitizeInput(h.content)
            }))
          : [];
        resultData = await handleChat({ message: sanitized, history: safeHistory }, sendChunk);
      }

      res.write(`data: ${JSON.stringify({ done: true, full: resultData.result })}\n\n`);
      res.end();
      return;
    }

    if (feature === 'explain') {
      const sanitized = sanitizeInput(text);
      if (!sanitized) {
        return res.status(400).json({ error: 'Please enter or paste the letter or notice you would like explained.' });
      }
      if (sanitized.length > 5000) {
        return res.status(400).json({ error: 'That text is quite long. Please paste a shorter section (under 5,000 letters).' });
      }
      const data = await handleExplain(sanitized);
      return res.status(200).json(data);
    }

    if (feature === 'scam') {
      const sanitized = sanitizeInput(text);
      if (!sanitized) {
        return res.status(400).json({ error: 'Please paste the message or describe the phone call to check.' });
      }
      if (sanitized.length > 5000) {
        return res.status(400).json({ error: 'That message is too long. Please share a shorter note or summary.' });
      }
      const data = await handleScam(sanitized);
      return res.status(200).json(data);
    }

    if (feature === 'steps') {
      const sanitized = sanitizeInput(text);
      if (!sanitized) {
        return res.status(400).json({ error: 'Please enter what you would like step-by-step help with.' });
      }
      if (sanitized.length > 1000) {
        return res.status(400).json({ error: 'Please describe the task in a few sentences.' });
      }
      const data = await handleSteps(sanitized);
      return res.status(200).json(data);
    }

    if (feature === 'myday') {
      const safeReminders = Array.isArray(reminders)
        ? reminders.map(r => ({
            title: sanitizeInput(r.title),
            time: sanitizeInput(r.time),
            note: sanitizeInput(r.note)
          }))
        : [];
      const data = await handleMyDay({
        reminders: safeReminders,
        currentTime: sanitizeInput(currentTime),
        currentDate: sanitizeInput(currentDate),
        username: user.username
      });
      return res.status(200).json(data);
    }

    if (feature === 'chat') {
      const sanitized = sanitizeInput(text);
      if (!sanitized) {
        return res.status(400).json({ error: 'Please type a message to chat with CompanionPal.' });
      }
      if (sanitized.length > 2000) {
        return res.status(400).json({ error: 'Your message is a bit long. Please shorten it so we can chat comfortably.' });
      }
      const safeHistory = Array.isArray(history)
        ? history.map(h => ({
            role: h.role === 'model' || h.role === 'assistant' ? 'model' : 'user',
            content: sanitizeInput(h.content)
          }))
        : [];
      const data = await handleChat({ message: sanitized, history: safeHistory });
      return res.status(200).json(data);
    }


    return res.status(400).json({ error: `Unknown feature: "${feature}".` });
  } catch (err) {
    console.error('Error during AI feature execution:', err.message);

    if (err.message.includes('GEMINI_KEY_MISSING')) {
      return res.status(500).json({
        error: 'The Gemini API key is missing on the server. Please add your GEMINI_API_KEY to continue.'
      });
    }

    if (err.name === 'AbortError' || err.message.includes('timeout')) {
      return res.status(504).json({
        error: 'Thinking took a little longer than expected. Please try again in a moment.'
      });
    }

    return res.status(500).json({
      error: 'Something went wrong while thinking. Please try again in a moment.'
    });
  }
};
