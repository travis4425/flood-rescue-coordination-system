const { query } = require('../config/database');
const logger    = require('../config/logger');

function auditLog(action, entityType) {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = async function (data) {
      if (res.statusCode < 400 && req.user) {
        try {
          await query(
            `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values, ip_address)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              req.user.id,
              action,
              entityType,
              data?.id ?? req.params?.id ?? null,
              JSON.stringify({ body: req.body, query: req.query }),
              req.ip
            ]
          );
        } catch (e) {
          logger.error('Audit log error:', e.message);
        }
      }
      return originalJson(data);
    };
    next();
  };
}

module.exports = auditLog;
