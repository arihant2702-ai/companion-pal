const { checkRateLimit, recordFailedAttempt, verifyCredentials, createSessionToken, serializeSessionCookie } = require('./_shared/auth');

module.exports = async function handler(req, res) {
  // Only accept POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed. Please use POST.' });
  }

  // Extract client IP for rate limiting
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded ? forwarded.split(',')[0].trim() : req.socket?.remoteAddress || '127.0.0.1';

  if (!checkRateLimit(ip)) {
    return res.status(429).json({
      error: 'Too many login attempts. Please wait a minute and try again.'
    });
  }

  // Parse body if needed
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }

  const { username, password } = body || {};

  if (!username || !password) {
    recordFailedAttempt(ip);
    return res.status(400).json({ error: 'Please enter both your username and password.' });
  }

  const result = verifyCredentials(username.trim(), password);

  if (!result.valid) {
    recordFailedAttempt(ip);
    return res.status(401).json({ error: 'That did not match. Please try again.' });
  }

  // Successful login: create session token and cookie
  const token = createSessionToken(result.username);
  const isSecure = process.env.NODE_ENV === 'production' || req.headers['x-forwarded-proto'] === 'https';
  const cookie = serializeSessionCookie(token, isSecure);

  res.setHeader('Set-Cookie', cookie);
  return res.status(200).json({
    ok: true,
    token: token,
    username: result.username,
    message: 'Welcome back!'
  });
};
