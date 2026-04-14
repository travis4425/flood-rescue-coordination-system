module.exports = function httpsRedirect(req, res, next) {
  if (
    process.env.NODE_ENV === 'production' &&
    !req.secure &&
    req.headers['x-forwarded-proto'] !== 'https'
  ) {
    return res.redirect(301, 'https://' + req.headers.host + req.url);
  }
  next();
};
