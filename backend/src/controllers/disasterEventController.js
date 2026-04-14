const DisasterEventService = require("../services/disasterEventService");

const DisasterEventController = {
  async list(req, res, next) {
    try {
      const data = await DisasterEventService.getAll(req.query);
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  async listActive(req, res, next) {
    try {
      const data = await DisasterEventService.getActive();
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  async getById(req, res, next) {
    try {
      const data = await DisasterEventService.getById(parseInt(req.params.id));
      res.json(data);
    } catch (err) {
      if (err.message === "NOT_FOUND")
        return res
          .status(404)
          .json({ error: "Không tìm thấy sự kiện thiên tai." });
      next(err);
    }
  },

  async create(req, res, next) {
    try {
      const event = await DisasterEventService.create(req.body, req.user.id);
      // Emit realtime
      const io = req.app.get("io");
      if (io) io.emit("disaster_event_created", event);
      res.status(201).json(event);
    } catch (err) {
      if (err.message === "MISSING_REQUIRED_FIELDS")
        return res
          .status(400)
          .json({
            error:
              "Thiếu thông tin bắt buộc: tên, loại thiên tai, mức độ nghiêm trọng.",
          });
      if (err.message === "INVALID_SEVERITY")
        return res.status(400).json({ error: "Mức độ phải từ 1 đến 5." });
      if (err.message === "INVALID_DISASTER_TYPE")
        return res.status(400).json({ error: "Loại thiên tai không hợp lệ." });
      next(err);
    }
  },

  async updateStatus(req, res, next) {
    try {
      const event = await DisasterEventService.updateStatus(
        parseInt(req.params.id),
        req.body.status,
        req.user.id,
      );
      const io = req.app.get("io");
      if (io) io.emit("disaster_event_updated", event);
      res.json(event);
    } catch (err) {
      if (err.message === "NOT_FOUND")
        return res.status(404).json({ error: "Không tìm thấy sự kiện." });
      if (err.message === "INVALID_STATUS")
        return res.status(400).json({ error: "Trạng thái không hợp lệ." });
      if (err.message === "EVENT_ALREADY_CLOSED")
        return res
          .status(400)
          .json({ error: "Sự kiện đã đóng, không thể cập nhật." });
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      const event = await DisasterEventService.update(
        parseInt(req.params.id),
        req.body,
        req.user.id,
      );
      const io = req.app.get("io");
      if (io) io.emit("disaster_event_updated", event);
      res.json(event);
    } catch (err) {
      if (err.message === "NOT_FOUND")
        return res.status(404).json({ error: "Không tìm thấy sự kiện." });
      if (err.message === "INVALID_SEVERITY")
        return res.status(400).json({ error: "Mức độ phải từ 1 đến 5." });
      next(err);
    }
  },

  async getTimeline(req, res, next) {
    try {
      const data = await DisasterEventService.getTimeline(
        parseInt(req.params.id),
      );
      res.json(data);
    } catch (err) {
      if (err.message === "NOT_FOUND")
        return res.status(404).json({ error: "Không tìm thấy sự kiện." });
      next(err);
    }
  },

  async getStats(req, res, next) {
    try {
      const data = await DisasterEventService.getStats();
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  async getTypes(req, res, next) {
    try {
      const data = await DisasterEventService.getTypes();
      res.json(data);
    } catch (err) {
      next(err);
    }
  },
};

module.exports = DisasterEventController;
