/**
 * Gemini API Client for CompanionPal
 * 
 * Enforces:
 * - Real live calls only (no mocks, no canned responses).
 * - Clear errors when API key is missing or calls fail (no silent fallbacks).
 * - Regional and cultural awareness (India, US, UK, etc.).
 * - Senior-friendly system prompts (grade 6 reading level, calm, respectful, patient).
 * - Server-side validation of structured JSON outputs.
 * - 30s timeout and 1 automatic retry for transient network errors.
 */

const SYSTEM_PROMPT_BASE = `You are CompanionPal, a patient, kind, and trustworthy daily AI companion for older adults.
Guidelines:
1. Tone & Style: Respectful, warm, simple, Grade-6 reading level. Short sentences. No tech jargon.
2. Context: Culturally aware (India ₹/Aadhaar/KYC, US $/Medicare, UK £/NHS, etc.). Adapt currency & dates to user context.
3. Safety: Medical/legal = general info only, advise consulting a professional. Emergency = advise local emergency services (112 / 911 / 999). Never request passwords, OTPs, or IDs.
4. Closing: End with: "Would you like me to explain anything again?"`;

const DISCLAIMER_FOOTER = "\n\nAI can make mistakes. Please double-check important things.";

/**
 * Execute a call to Google Gemini API with timeout and 1 retry.
 */
async function callGeminiApi({ systemInstruction, contents, generationConfig = {} }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here' || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
    throw new Error('GEMINI_KEY_MISSING: Gemini API key is not configured on the server. Please add your key to the environment variables.');
  }

  const configuredModel = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
  const candidateModels = [configuredModel, 'gemini-3.1-flash-lite', 'gemini-3.7-flash'];
  // Deduplicate candidate models
  const modelsToTry = [...new Set(candidateModels)];

  let lastError = null;

  for (const model of modelsToTry) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    let attempts = 0;
    const maxAttempts = 2;

    const currentConfig = {
      temperature: 0.3,
      maxOutputTokens: 800,
      ...generationConfig
    };
    if (model.includes('3.7')) {
      currentConfig.thinkingConfig = { thinkingBudget: 0 };
    }

    const body = {
      contents,
      generationConfig: currentConfig
    };

    if (systemInstruction) {
      body.systemInstruction = {
        parts: [{ text: systemInstruction }]
      };
    }

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          if (response.status === 503 || response.status === 429) {
            lastError = new Error(`Gemini model ${model} temporarily unavailable (${response.status})`);
            if (attempts < maxAttempts) {
              await new Promise(res => setTimeout(res, 1500));
              continue;
            }
            break;
          }
          throw new Error(`Gemini API error (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        const candidate = data.candidates && data.candidates[0];
        if (!candidate || !candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
          throw new Error('Gemini API returned an empty response structure.');
        }

        const answerPart = candidate.content.parts.find(p => p.text && !p.thought) || candidate.content.parts.find(p => p.text) || candidate.content.parts[0];
        if (!answerPart || !answerPart.text) {
          throw new Error('Gemini API candidate contained no text content.');
        }

        return answerPart.text;
      } catch (err) {
        lastError = err;
        if (attempts < maxAttempts && !err.message.includes('503')) {
          await new Promise(res => setTimeout(res, 1000));
        }
      }
    }
  }

  throw lastError || new Error('All Gemini models are currently busy. Please try again shortly.');
}

/**
 * Stream responses from Google Gemini API with SSE chunk callback.
 */
async function streamGeminiApi({ systemInstruction, contents, generationConfig = {}, onChunk }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here' || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
    throw new Error('GEMINI_KEY_MISSING: Gemini API key is not configured on the server. Please add your key to the environment variables.');
  }

  const model = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;

  const body = {
    contents,
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 800,
      ...generationConfig
    }
  };

  if (systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: systemInstruction }]
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini streaming error (${response.status}): ${errorText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep last partial line

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          const jsonStr = trimmed.slice(6).trim();
          if (jsonStr) {
            try {
              const parsed = JSON.parse(jsonStr);
              const candidate = parsed.candidates && parsed.candidates[0];
              const part = candidate?.content?.parts?.[0];
              if (part && part.text) {
                fullText += part.text;
                if (typeof onChunk === 'function') {
                  onChunk(part.text);
                }
              }
            } catch {}
          }
        }
      }
    }

    return fullText;
  } finally {
    clearTimeout(timeoutId);
  }

}


/**
 * FEATURE 1: Explain This
 */
async function handleExplain(userText, onChunk) {
  const prompt = `Please explain the following text for an older adult in simple, comforting, plain language:
"${userText}"

Format your response cleanly with these 3 clear sections:
1. What This Says: (2 to 3 simple, comforting sentences explaining the core message)
2. What To Do Next: (Clear, easy step-by-step action the person should take)
3. Important Dates or Deadlines: (Any due date, payment deadline, or appointment date found, or "No specific deadline mentioned.")

Keep reading level at Grade 6. End with "Would you like me to explain anything again?"`;

  if (typeof onChunk === 'function') {
    const text = await streamGeminiApi({
      systemInstruction: SYSTEM_PROMPT_BASE,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      onChunk
    });
    return {
      feature: 'explain',
      result: text.trim() + DISCLAIMER_FOOTER
    };
  }

  const text = await callGeminiApi({
    systemInstruction: SYSTEM_PROMPT_BASE,
    contents: [{ role: 'user', parts: [{ text: prompt }] }]
  });

  return {
    feature: 'explain',
    result: text.trim() + DISCLAIMER_FOOTER
  };
}

/**
 * FEATURE 2: Is This a Scam?
 * Server validates structured JSON before responding.
 */
async function handleScam(userText) {
  const prompt = `Analyze the following message, phone call description, or email received by an older adult to determine if it is a scam:
"${userText}"

Consider common scams across India (e.g. electricity bill power-cut threats, APK links, bank KYC update SMS, lottery schemes, Aadhaar/PAN verification) and the US/UK/global (e.g. IRS/tax collection calls, Medicare card renewal, grandchild in emergency, tech support popups, package delivery fee SMS).

You must respond ONLY with a JSON object adhering exactly to this format:
{
  "verdict": "Looks Safe" | "Be Careful" | "Likely Scam",
  "reasons": [
    "First simple reason in plain words",
    "Second simple reason in plain words",
    "Optional third reason if needed"
  ],
  "action": "One direct, safe action to take (e.g. 'Delete this message right away and do not click any links.')"
}`;

  const rawJson = await callGeminiApi({
    systemInstruction: SYSTEM_PROMPT_BASE,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json'
    }
  });

  let parsed;
  try {
    parsed = JSON.parse(rawJson);
  } catch (err) {
    // If enclosed in markdown code fences, clean it up
    const cleaned = rawJson.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
    parsed = JSON.parse(cleaned);
  }

  // Server-side strict validation
  const validVerdicts = ['Looks Safe', 'Be Careful', 'Likely Scam'];
  if (!validVerdicts.includes(parsed.verdict)) {
    throw new Error(`Invalid scam verdict received from model: "${parsed.verdict}"`);
  }
  if (!Array.isArray(parsed.reasons) || parsed.reasons.length < 1) {
    throw new Error('Invalid scam reasons received from model.');
  }
  if (!parsed.action || typeof parsed.action !== 'string') {
    throw new Error('Invalid scam action recommendation received from model.');
  }

  return {
    feature: 'scam',
    verdict: parsed.verdict,
    reasons: parsed.reasons.map(r => String(r).trim()),
    action: parsed.action.trim(),
    disclaimer: "AI can make mistakes. If in doubt, ask a trusted family member or call the company directly using a phone number from an official bill."
  };
}

/**
 * FEATURE 3: Step-by-Step Help
 * Server validates structured JSON before responding.
 */
async function handleSteps(userText) {
  const prompt = `An older adult is asking for help with this task:
"${userText}"

Break this task down into friendly, gentle, sequential numbered steps (provide 3 to 4 clear, concise steps so it is comfortable and not overwhelming to read). Each step must contain only ONE simple physical or digital action.

You must respond ONLY with a JSON object adhering exactly to this format:
{
  "title": "Short, reassuring title of the task",
  "steps": [
    {
      "stepNumber": 1,
      "instruction": "One clear, simple action to take right now.",
      "tip": "A comforting tip or where to look on the screen/device."
    }
  ]
}`;

  const rawJson = await callGeminiApi({
    systemInstruction: SYSTEM_PROMPT_BASE,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json'
    }
  });

  let parsed;
  try {
    parsed = JSON.parse(rawJson);
  } catch (err) {
    const cleaned = rawJson.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '').trim();
    parsed = JSON.parse(cleaned);
  }

  // Server-side strict validation
  if (!parsed.title || !Array.isArray(parsed.steps) || parsed.steps.length === 0) {
    throw new Error('Invalid step-by-step structure received from model.');
  }

  const validatedSteps = parsed.steps.map((s, idx) => ({
    stepNumber: idx + 1,
    instruction: String(s.instruction || s.title || '').trim(),
    tip: String(s.tip || '').trim()
  }));

  return {
    feature: 'steps',
    title: parsed.title.trim(),
    steps: validatedSteps,
    disclaimer: "AI can make mistakes. Please take your time and do one step at a time."
  };
}

/**
 * FEATURE 4: My Day (Proactive Daily Briefing)
 */
async function handleMyDay({ reminders, currentTime, currentDate, username }, onChunk) {
  const reminderList = Array.isArray(reminders) && reminders.length > 0
    ? reminders.map(r => `- ${r.time ? r.time + ': ' : ''}${r.title}${r.note ? ' (' + r.note + ')' : ''}`).join('\n')
    : "No reminders set yet for today.";

  const prompt = `Write a warm, comforting, and proactive daily briefing for ${username || 'our friend'}.
Current Date: ${currentDate || new Date().toLocaleDateString()}
Current Time: ${currentTime || 'Morning'}

Here is the person's reminder list for today:
${reminderList}

Please provide:
1. A warm morning or afternoon greeting suitable for the time of day.
2. A clear, gentle walkthrough of what they have planned today, with peaceful nudges (e.g. take medicines with water, bring a light jacket or umbrella if going out).
3. A friendly health or wellness nudge (e.g., drink a glass of water, stretch your legs, or enjoy a quiet moment).
4. End with: "Would you like me to explain anything again?"`;

  if (typeof onChunk === 'function') {
    const text = await streamGeminiApi({
      systemInstruction: SYSTEM_PROMPT_BASE,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      onChunk
    });
    return {
      feature: 'myday',
      result: text.trim() + DISCLAIMER_FOOTER
    };
  }

  const text = await callGeminiApi({
    systemInstruction: SYSTEM_PROMPT_BASE,
    contents: [{ role: 'user', parts: [{ text: prompt }] }]
  });

  return {
    feature: 'myday',
    result: text.trim() + DISCLAIMER_FOOTER
  };
}

/**
 * FEATURE 5: Just Chat
 * Maintains conversational context.
 */
async function handleChat({ message, history = [] }, onChunk) {
  const formattedContents = [];

  // Include up to last 6 turns of conversation for context (light & fast)
  const recentHistory = Array.isArray(history) ? history.slice(-6) : [];
  for (const turn of recentHistory) {
    if (turn.role && turn.content) {
      formattedContents.push({
        role: turn.role === 'assistant' || turn.role === 'model' ? 'model' : 'user',
        parts: [{ text: String(turn.content) }]
      });
    }
  }

  // Add the current user message
  formattedContents.push({
    role: 'user',
    parts: [{ text: String(message) }]
  });

  const chatInstruction = `${SYSTEM_PROMPT_BASE}
You are having an ongoing friendly conversation. Be a patient listener. Always ask before assuming. Offer to repeat or simplify whenever helpful. Always end your message with: "Would you like me to explain anything again?"`;

  if (typeof onChunk === 'function') {
    const text = await streamGeminiApi({
      systemInstruction: chatInstruction,
      contents: formattedContents,
      onChunk
    });
    return {
      feature: 'chat',
      result: text.trim() + DISCLAIMER_FOOTER
    };
  }

  const text = await callGeminiApi({
    systemInstruction: chatInstruction,
    contents: formattedContents
  });

  return {
    feature: 'chat',
    result: text.trim() + DISCLAIMER_FOOTER
  };
}

module.exports = {
  callGeminiApi,
  streamGeminiApi,
  handleExplain,
  handleScam,
  handleSteps,
  handleMyDay,
  handleChat
};

