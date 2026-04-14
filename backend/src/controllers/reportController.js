const { exportRequestsToExcel, exportMissionsToExcel, exportResourcesToExcel } = require('../services/reportService');
const logger = require('../config/logger');

function sendExcel(res, buffer, filename) {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}-${Date.now()}.xlsx"`);
  res.setHeader('Content-Length', buffer.length);
  res.send(buffer);
}

const ReportController = {
  async requests(req, res, next) {
    try {
      const buf = await exportRequestsToExcel(req.query);
      logger.info(`Report: requests exported by user ${req.user?.id}`);
      sendExcel(res, buf, 'bao-cao-yeu-cau');
    } catch (err) { next(err); }
  },

  async missions(req, res, next) {
    try {
      const buf = await exportMissionsToExcel(req.query);
      logger.info(`Report: missions exported by user ${req.user?.id}`);
      sendExcel(res, buf, 'bao-cao-nhiem-vu');
    } catch (err) { next(err); }
  },

  async resources(req, res, next) {
    try {
      const buf = await exportResourcesToExcel(req.query);
      logger.info(`Report: resources exported by user ${req.user?.id}`);
      sendExcel(res, buf, 'bao-cao-tai-nguyen');
    } catch (err) { next(err); }
  },
};

module.exports = ReportController;
