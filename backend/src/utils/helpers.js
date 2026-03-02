const { v4: uuidv4 } = require("uuid");

// Generate tracking code for rescue requests
function generateTrackingCode() {
  const year = new Date().getFullYear();
  const random = Math.floor(100000 + Math.random() * 900000);
  return `RQ-${year}-${random}`;
}

// Calculate distance between two GPS coords (Haversine formula) in km
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

// Calculate priority score
function calculatePriority(
  urgencyScore,
  victimCount,
  floodSeverity,
  hasWeatherAlert,
) {
  return (
    (urgencyScore || 1) * 10 +
    (victimCount || 1) * 2 +
    (floodSeverity || 1) * 5 +
    (hasWeatherAlert ? 15 : 0)
  );
}

// Pagination helper
function getPagination(query) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

// Format response
function formatResponse(data, total, page, limit) {
  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

module.exports = {
  generateTrackingCode,
  calculateDistance,
  calculatePriority,
  getPagination,
  formatResponse,
};
