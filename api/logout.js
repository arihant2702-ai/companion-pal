const { clearSessionCookie } = require('./_shared/auth');

module.exports = async function handler(req, res) {
  const isSecure = process.env.NODE_ENV === 'production' || req.headers['x-forwarded-proto'] === 'https';
  res.setHeader('Set-Cookie', clearSessionCookie(isSecure));
  return res.status(200).json({
    ok: true,
    message: 'You have been logged out safely.'
  });
};
