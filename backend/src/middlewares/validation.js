const logger = require('../config/logger');

// Global error handler
function errorHandler(err, req, res, next) {
  logger.error('Unhandled error:', { error: err.message, stack: err.stack, path: req.path });
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Đã xảy ra lỗi hệ thống.' 
      : err.message
  });
}

// Validate required fields
function validateRequired(fields) {
  return (req, res, next) => {
    const missing = fields.filter(f => {
      const val = req.body[f];
      return val === undefined || val === null || val === '';
    });
    if (missing.length > 0) {
      return res.status(400).json({
        error: `Thiếu thông tin bắt buộc: ${missing.join(', ')}`
      });
    }
    next();
  };
}

// Sanitize input - basic XSS prevention
function sanitizeInput(req, res, next) {
  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      return obj.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/on\w+\s*=/gi, '');
    }
    if (typeof obj === 'object' && obj !== null) {
      Object.keys(obj).forEach(key => { obj[key] = sanitize(obj[key]); });
    }
    return obj;
  };
  if (req.body) req.body = sanitize(req.body);
  next();
}

module.exports = { errorHandler, validateRequired, sanitizeInput };
