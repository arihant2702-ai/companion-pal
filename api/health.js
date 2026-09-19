const { callGeminiApi } = require('./_shared/gemini');

module.exports = async function handler(req, res) {
  const envStatus = {
    GEMINI_API_KEY_CONFIGURED: !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY_HERE' && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here',
    DEMO_USER_1_CONFIGURED: !!(process.env.DEMO_USER_1 || 'senior.demo'),
    DEMO_USER_2_CONFIGURED: !!(process.env.DEMO_USER_2 || 'family.demo'),
    SESSION_SECRET_CONFIGURED: !!process.env.SESSION_SECRET,
    MODEL: process.env.GEMINI_MODEL || 'gemini-2.5-flash'
  };

  if (!envStatus.GEMINI_API_KEY_CONFIGURED) {
    return res.status(503).json({
      status: 'DEGRADED',
      message: 'Server is running, but GEMINI_API_KEY is not configured yet.',
      envStatus,
      geminiConnectivity: 'SKIPPED'
    });
  }

  try {
    // Make one tiny real call to verify live upstream Gemini connectivity
    const responseText = await callGeminiApi({
      systemInstruction: 'You are a health checker. Respond with the single word: OK.',
      contents: [{ role: 'user', parts: [{ text: 'Health check ping.' }] }],
      generationConfig: { maxOutputTokens: 200, temperature: 0.0 }
    });

    return res.status(200).json({
      status: 'OK',
      message: 'CompanionPal server and live Gemini API connection are both healthy!',
      upstreamSample: responseText.trim(),
      envStatus
    });
  } catch (err) {
    return res.status(502).json({
      status: 'ERROR',
      message: `Gemini API health check failed: ${err.message}`,
      envStatus
    });
  }
};
