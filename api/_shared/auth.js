const crypto = require('crypto');

// Rate limiting store for login attempts: ip -> [timestamps]
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60 * 1000; // 1 minute

// Prune expired rate limit entries every 5 minutes to prevent memory leaks
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [ip, attempts] of loginAttempts.entries()) {
      const valid = attempts.filter(time => now - time < WINDOW_MS);
      if (valid.length === 0) {
        loginAttempts.delete(ip);
      } else {
        loginAttempts.set(ip, valid);
      }
    }
  }, 5 * 60 * 1000).unref();
}

/**
 * Perform a constant-time string comparison to prevent timing attacks.
 */
function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Perform dummy timing safe equal on itself to equalize execution time
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Check if an IP has exceeded the login rate limit.
 */
function checkRateLimit(ip) {
  const now = Date.now();
  const attempts = loginAttempts.get(ip) || [];
  const recent = attempts.filter(time => now - time < WINDOW_MS);
  loginAttempts.set(ip, recent);

  if (recent.length >= MAX_ATTEMPTS) {
    return false;
  }
  return true;
}

/**
 * Record a failed login attempt for an IP.
 */
function recordFailedAttempt(ip) {
  const now = Date.now();
  const attempts = loginAttempts.get(ip) || [];
  attempts.push(now);
  loginAttempts.set(ip, attempts);
}

/**
 * Verify username and password against configured demo accounts.
 */
function verifyCredentials(username, password) {
  const user1 = process.env.DEMO_USER_1 || 'senior.demo';
  const pass1 = process.env.DEMO_PASS_1 || 'Comfort#2026';
  const user2 = process.env.DEMO_USER_2 || 'family.demo';
  const pass2 = process.env.DEMO_PASS_2 || 'Helper#2026';

  const match1 = safeCompare(username, user1) && safeCompare(password, pass1);
  const match2 = safeCompare(username, user2) && safeCompare(password, pass2);

  if (match1) return { valid: true, username: user1 };
  if (match2) return { valid: true, username: user2 };
  return { valid: false };
}

/**
 * Create an HMAC-SHA256 signed session token lasting 8 hours.
 */
function createSessionToken(username) {
  const secret = process.env.SESSION_SECRET || 'companionpal_default_dev_secret_change_in_prod';
  const exp = Date.now() + 8 * 60 * 60 * 1000; // 8 hours
  const payload = JSON.stringify({ username, exp, nonce: crypto.randomBytes(8).toString('hex') });
  const payloadB64 = Buffer.from(payload).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');
  return `${payloadB64}.${signature}`;
}

/**
 * Verify a signed session token and return the payload if valid.
 */
function verifySessionToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadB64, signature] = parts;
  const secret = process.env.SESSION_SECRET || 'companionpal_default_dev_secret_change_in_prod';
  const expectedSig = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');

  if (!safeCompare(signature, expectedSig)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (Date.now() > payload.exp) {
      return null; // Expired
    }
    return payload;
  } catch {
    return null;
  }
}

/**
 * Extract the session cookie from request headers and verify it.
 */
function getAuthenticatedUser(req) {
  const cookieHeader = req.headers.cookie || '';
  const cookies = {};
  cookieHeader.split(';').forEach(pair => {
    const [key, ...rest] = pair.trim().split('=');
    if (key) cookies[key] = rest.join('=');
  });

  let sessionToken = cookies.session;

  // Fallback: check Authorization: Bearer <token> for environments where cookies are restricted
  if (!sessionToken && req.headers.authorization) {
    const auth = req.headers.authorization;
    if (auth.startsWith('Bearer ')) {
      sessionToken = auth.slice(7).trim();
    }
  }

  if (!sessionToken) return null;

  return verifySessionToken(sessionToken);
}

/**
 * Create a Set-Cookie header string for an 8-hour session.
 */
function serializeSessionCookie(token, isSecure = false) {
  const maxAge = 8 * 60 * 60; // 8 hours in seconds
  const secureFlag = isSecure ? ' Secure;' : '';
  return `session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge};${secureFlag}`;
}

/**
 * Create a Set-Cookie header string to clear the session cookie.
 */
function clearSessionCookie(isSecure = false) {
  const secureFlag = isSecure ? ' Secure;' : '';
  return `session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT;${secureFlag}`;
}

module.exports = {
  checkRateLimit,
  recordFailedAttempt,
  verifyCredentials,
  createSessionToken,
  verifySessionToken,
  getAuthenticatedUser,
  serializeSessionCookie,
  clearSessionCookie
};
