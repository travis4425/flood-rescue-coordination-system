/**
 * OpenWeatherMap API Service
 * Free tier: 1,000 calls/day — đủ cho project học tập
 * Docs: https://openweathermap.org/api
 *
 * Đăng ký miễn phí tại: https://home.openweathermap.org/users/sign_up
 * Sau khi đăng ký, lấy API key tại: https://home.openweathermap.org/api_keys
 * Thêm vào file .env: OPENWEATHERMAP_API_KEY=your_key_here
 */

const https = require("https");
const logger = require("../config/logger");

const API_KEY = process.env.OPENWEATHERMAP_API_KEY || "";
const BASE_URL = "https://api.openweathermap.org/data/2.5";

// ============================================================
// Helper: HTTPS GET request (không cần thêm dependency)
// ============================================================
function httpGet(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error("Invalid JSON response from OpenWeatherMap"));
          }
        });
      })
      .on("error", reject);
  });
}

// ============================================================
// Kiểm tra API key có được cấu hình chưa
// ============================================================
function isConfigured() {
  return API_KEY && API_KEY.length > 0 && API_KEY !== "your_key_here";
}

// ============================================================
// 1. Lấy thời tiết hiện tại cho 1 tọa độ
// ============================================================
async function getCurrentWeather(lat, lon) {
  if (!isConfigured()) {
    throw new Error("OPENWEATHERMAP_API_KEY chưa được cấu hình trong .env");
  }

  const url = `${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=vi`;

  try {
    const data = await httpGet(url);

    if (data.cod && data.cod !== 200) {
      throw new Error(data.message || "OpenWeatherMap API error");
    }

    return {
      temperature: Math.round(data.main.temp),
      feels_like: Math.round(data.main.feels_like),
      temp_min: Math.round(data.main.temp_min),
      temp_max: Math.round(data.main.temp_max),
      humidity: data.main.humidity,
      pressure: data.main.pressure,
      wind_speed: data.wind.speed,
      wind_deg: data.wind.deg,
      weather: data.weather?.[0]?.description || "",
      weather_icon: data.weather?.[0]?.icon || "",
      weather_main: data.weather?.[0]?.main || "",
      clouds: data.clouds?.all || 0,
      visibility: data.visibility || 0,
      rain_1h: data.rain?.["1h"] || 0,
      rain_3h: data.rain?.["3h"] || 0,
      location_name: data.name || "",
      timestamp: new Date(data.dt * 1000).toISOString(),
      sunrise: new Date(data.sys.sunrise * 1000).toISOString(),
      sunset: new Date(data.sys.sunset * 1000).toISOString(),
    };
  } catch (err) {
    logger.error("OpenWeatherMap getCurrentWeather error:", err.message);
    throw err;
  }
}

// ============================================================
// 2. Lấy dự báo 5 ngày / 3 giờ
// ============================================================
async function getForecast(lat, lon) {
  if (!isConfigured()) {
    throw new Error("OPENWEATHERMAP_API_KEY chưa được cấu hình trong .env");
  }

  const url = `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=vi`;

  try {
    const data = await httpGet(url);

    if (data.cod && data.cod !== "200") {
      throw new Error(data.message || "OpenWeatherMap API error");
    }

    // Nhóm forecast theo ngày
    const dailyMap = {};
    (data.list || []).forEach((item) => {
      const date = item.dt_txt.split(" ")[0]; // "2026-02-16"
      if (!dailyMap[date]) {
        dailyMap[date] = {
          date,
          temp_min: Infinity,
          temp_max: -Infinity,
          total_rain: 0,
          humidity_avg: [],
          wind_max: 0,
          weather_main: "",
          weather_desc: "",
          weather_icon: "",
          details: [],
        };
      }
      const d = dailyMap[date];
      d.temp_min = Math.min(d.temp_min, item.main.temp_min);
      d.temp_max = Math.max(d.temp_max, item.main.temp_max);
      d.humidity_avg.push(item.main.humidity);
      d.wind_max = Math.max(d.wind_max, item.wind.speed);
      d.total_rain += item.rain?.["3h"] || 0;

      // Lấy weather description của khung giờ giữa ngày (12:00)
      if (item.dt_txt.includes("12:00:00") || !d.weather_main) {
        d.weather_main = item.weather?.[0]?.main || "";
        d.weather_desc = item.weather?.[0]?.description || "";
        d.weather_icon = item.weather?.[0]?.icon || "";
      }

      d.details.push({
        time: item.dt_txt,
        temp: Math.round(item.main.temp),
        humidity: item.main.humidity,
        rain_3h: item.rain?.["3h"] || 0,
        wind_speed: item.wind.speed,
        weather: item.weather?.[0]?.description || "",
        weather_icon: item.weather?.[0]?.icon || "",
      });
    });

    const daily = Object.values(dailyMap).map((d) => ({
      date: d.date,
      temp_min: Math.round(d.temp_min),
      temp_max: Math.round(d.temp_max),
      total_rain_mm: Math.round(d.total_rain * 10) / 10,
      humidity_avg: Math.round(
        d.humidity_avg.reduce((a, b) => a + b, 0) / d.humidity_avg.length,
      ),
      wind_max: d.wind_max,
      weather_main: d.weather_main,
      weather_desc: d.weather_desc,
      weather_icon: d.weather_icon,
      details: d.details,
    }));

    return {
      city: data.city?.name || "",
      country: data.city?.country || "",
      daily,
    };
  } catch (err) {
    logger.error("OpenWeatherMap getForecast error:", err.message);
    throw err;
  }
}

// ============================================================
// 3. Phân tích mức cảnh báo lũ từ dữ liệu thời tiết
//    Dùng lượng mưa + gió để tự động đánh giá severity
// ============================================================
function analyzeFloodRisk(currentWeather, forecastDaily) {
  const risks = [];

  // Kiểm tra mưa hiện tại
  if (currentWeather.rain_1h >= 30 || currentWeather.rain_3h >= 60) {
    risks.push({
      type: "heavy_rain_now",
      severity: currentWeather.rain_1h >= 50 ? "critical" : "high",
      title: `Mưa rất lớn (${currentWeather.rain_1h || currentWeather.rain_3h}mm)`,
      description: `Lượng mưa hiện tại rất lớn tại ${currentWeather.location_name}. Nguy cơ ngập lụt cao.`,
    });
  } else if (currentWeather.rain_1h >= 15 || currentWeather.rain_3h >= 30) {
    risks.push({
      type: "moderate_rain_now",
      severity: "medium",
      title: `Mưa lớn (${currentWeather.rain_1h || currentWeather.rain_3h}mm)`,
      description: `Mưa lớn tại ${currentWeather.location_name}. Cần theo dõi mực nước.`,
    });
  }

  // Kiểm tra gió mạnh
  if (currentWeather.wind_speed >= 20) {
    risks.push({
      type: "strong_wind",
      severity: currentWeather.wind_speed >= 30 ? "critical" : "high",
      title: `Gió mạnh (${currentWeather.wind_speed} m/s)`,
      description: `Gió mạnh cấp ${Math.round(currentWeather.wind_speed / 5)} tại ${currentWeather.location_name}.`,
    });
  }

  // Kiểm tra dự báo mưa lớn trong 3 ngày tới
  if (forecastDaily && forecastDaily.length > 0) {
    forecastDaily.slice(0, 3).forEach((day) => {
      if (day.total_rain_mm >= 100) {
        risks.push({
          type: "forecast_heavy_rain",
          severity: day.total_rain_mm >= 200 ? "critical" : "high",
          title: `Dự báo mưa rất lớn ngày ${day.date} (${day.total_rain_mm}mm)`,
          description: `Dự báo lượng mưa ${day.total_rain_mm}mm. Nguy cơ ngập lụt nghiêm trọng.`,
        });
      } else if (day.total_rain_mm >= 50) {
        risks.push({
          type: "forecast_rain",
          severity: "medium",
          title: `Dự báo mưa lớn ngày ${day.date} (${day.total_rain_mm}mm)`,
          description: `Dự báo lượng mưa ${day.total_rain_mm}mm. Cần chuẩn bị phòng chống.`,
        });
      }
    });
  }

  return risks;
}

// ============================================================
// 4. Helper: Lấy icon URL từ mã icon OpenWeatherMap
// ============================================================
function getIconUrl(iconCode, size = 2) {
  // size: 1 = nhỏ, 2 = lớn, 4 = rất lớn
  return `https://openweathermap.org/img/wn/${iconCode}@${size}x.png`;
}

module.exports = {
  isConfigured,
  getCurrentWeather,
  getForecast,
  analyzeFloodRisk,
  getIconUrl,
};
