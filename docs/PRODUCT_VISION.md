# TẦM NHÌN SẢN PHẨM / PRODUCT VISION

---

# 🇻🇳 HỆ THỐNG PHÒNG CHỐNG THIÊN TAI VIỆT NAM
# Vietnam Disaster Response & Coordination System
## VDRCS v2.0

---

## 📌 VẤN ĐỀ / THE PROBLEM

**VI:**
Việt Nam là một trong 5 quốc gia chịu ảnh hưởng nặng nề nhất bởi thiên tai trên thế giới. Trung bình mỗi năm, thiên tai gây thiệt hại **hơn 1 tỷ USD** và cướp đi sinh mạng của **hàng trăm người**. Tuy nhiên, công tác điều phối ứng phó vẫn còn phụ thuộc nhiều vào điện thoại, bảng trắng, và Excel — dẫn đến:
- Thông tin phân tán, không đồng bộ giữa các cơ quan
- Chậm trễ trong phân công nguồn lực
- Không có bức tranh tổng thể real-time cho người ra quyết định
- Người dân không biết tình trạng yêu cầu cứu trợ của mình

**EN:**
Vietnam ranks among the world's top 5 most disaster-affected countries. Each year, natural disasters cause over **$1 billion in damages** and claim **hundreds of lives**. Yet coordination still relies heavily on phone calls, whiteboards, and spreadsheets — leading to:
- Fragmented, unsynchronized information across agencies
- Delays in resource allocation
- No real-time operational picture for decision-makers
- Citizens left uninformed about their aid request status

---

## 💡 GIẢI PHÁP / THE SOLUTION

**VI:**
VDRCS là nền tảng điều phối ứng phó thiên tai tích hợp đầu tiên tại Việt Nam, được thiết kế đặc biệt cho điều kiện địa lý và pháp lý của Việt Nam.

**EN:**
VDRCS is Vietnam's first integrated disaster response coordination platform, purpose-built for Vietnam's geographic and regulatory context.

---

## 🎯 ĐỐI TƯỢNG / TARGET USERS

| Đối tượng / User | Nhu cầu / Need | Giá trị / Value |
|---|---|---|
| Công dân / Citizens | Gửi yêu cầu cứu trợ, theo dõi trạng thái / Submit aid requests, track status | Kết nối nhanh với đội cứu hộ / Fast connection to rescue teams |
| Đội cứu hộ / Rescue Teams | Nhận nhiệm vụ, báo cáo tiến độ / Receive missions, report progress | Điều phối hiệu quả, không bỏ sót / Efficient coordination, no missed tasks |
| Điều phối viên / Coordinators | Tổng quan real-time, phân công nhanh / Real-time overview, quick assignment | Ra quyết định dựa trên data / Data-driven decisions |
| Quản lý / Managers | Báo cáo, thống kê, giám sát / Reports, analytics, oversight | Minh bạch hoạt động / Operational transparency |
| Chính quyền / Government | Tuân thủ pháp lý, dữ liệu quốc gia / Legal compliance, national data | Công cụ quản lý nhà nước / State management tool |

---

## ✨ TÍNH NĂNG CỐT LÕI / CORE FEATURES

### 🌊 Đa loại thiên tai / Multi-Hazard Support
Hỗ trợ 8 loại thiên tai đặc thù Việt Nam / Supports 8 Vietnam-specific disaster types:

| # | VI | EN | Icon |
|---|----|----|------|
| 1 | Lũ lụt | Flood | 🌊 |
| 2 | Bão, áp thấp nhiệt đới | Typhoon | 🌀 |
| 3 | Sạt lở đất | Landslide | ⛰️ |
| 4 | Hạn hán | Drought | ☀️ |
| 5 | Động đất | Earthquake | 🔴 |
| 6 | Cháy rừng | Wildfire | 🔥 |
| 7 | Xâm nhập mặn | Saltwater Intrusion | 🧂 |
| 8 | Sóng thần | Tsunami | 🌊 |

### ⚡ Real-time Coordination / Điều phối thời gian thực
- Bản đồ tổng quan quốc gia cập nhật liên tục / National map updated continuously
- Thông báo tức thì qua WebSocket / Instant notifications via WebSocket
- Phân công 1-click với gợi ý đội gần nhất / 1-click assignment with nearest team suggestion

### 📱 Offline-First PWA
- Hoạt động khi mất mạng (thiên tai thường làm đứt internet) / Works when network fails (disasters often cut internet)
- Tự đồng bộ khi có lại kết nối / Auto-syncs when connection restored

### 🗺️ Bản đồ Chủ quyền / Sovereignty-Compliant Map
- Sử dụng Viettel Maps — tuân thủ quy định Bộ TN&MT / Using Viettel Maps — compliant with MONRE regulations
- Hiển thị đúng chủ quyền lãnh thổ Việt Nam / Correct Vietnamese territorial sovereignty display

### 🔗 Tích hợp Cảnh báo / Alert Integration
- USGS: cảnh báo động đất tự động / Automatic earthquake alerts
- NASA FIRMS: điểm nóng cháy rừng / Wildfire hotspots
- VNMHA: thời tiết và bão / Weather and typhoon data

### 🔒 Bảo mật Chuẩn Chính phủ / Government-Grade Security
- Xác thực 2 yếu tố (TOTP) bắt buộc cho tài khoản quản lý / MFA required for management accounts
- Mã hóa TLS 1.3 toàn bộ giao tiếp / TLS 1.3 encryption for all communications
- Audit log đầy đủ mọi thao tác / Complete audit trail for all operations
- Tuân thủ Thông tư 13/2023/TT-BTTTT / Compliant with Circular 13/2023/TT-BTTTT

### 🌐 Giao diện Song ngữ / Bilingual Interface
- Tiếng Việt và Tiếng Anh, đổi được ngay lập tức / Vietnamese and English, instantly switchable

---

## 🏗️ KIẾN TRÚC / ARCHITECTURE

```
┌─────────────────────────────────────────────────────────┐
│                    NGƯỜI DÙNG / USERS                    │
│         Công dân  │  Đội cứu hộ  │  Điều phối  │  Admin │
└─────────┬──────────┴──────────────┴─────────────┴────────┘
          │ HTTPS / TLS 1.3
┌─────────▼────────────────────────────────────────────────┐
│                 FRONTEND (React 18 + PWA)                 │
│  Dashboard  │  Map (Vmap)  │  Forms  │  Reports  │  Chat  │
└─────────────────────────┬────────────────────────────────┘
                          │ REST API + WebSocket
┌─────────────────────────▼────────────────────────────────┐
│              BACKEND (Node.js + Express)                  │
│  Auth+MFA  │  Disaster Events  │  Requests  │  Resources  │
│  Missions  │  Teams  │  Reports  │  Alerts  │  Socket.io  │
└──────────────┬─────────────────────────┬─────────────────┘
               │                         │
┌──────────────▼──────────┐  ┌──────────▼──────────────────┐
│   PostgreSQL 16          │  │   External APIs              │
│   33+ tables             │  │   USGS (Earthquake)          │
│   PostGIS (spatial)      │  │   NASA FIRMS (Wildfire)      │
│   Audit logs             │  │   VNMHA (Weather/Typhoon)    │
└─────────────────────────┘  └─────────────────────────────┘
```

---

## 📊 STACK KỸ THUẬT / TECH STACK

| Layer | Technology | Lý do / Reason |
|-------|-----------|----------------|
| Frontend | React 18 + Vite + Tailwind | Performance, ecosystem |
| State | Zustand | Lightweight, simple |
| Map | React-Leaflet + Viettel Maps | Chủ quyền VN / VN sovereignty |
| Real-time | Socket.io | Proven, reliable |
| Charts | Recharts | React-native, lightweight |
| PWA | Vite Plugin PWA + Workbox | Offline support |
| i18n | i18next | Industry standard |
| Backend | Node.js + Express | JavaScript fullstack |
| Auth | JWT + httpOnly Cookie + TOTP | Security best practice |
| Validation | Zod | Type-safe, fast |
| Database | PostgreSQL 16 | ACID, free, powerful |
| ORM | Raw SQL (pg driver) | Performance, control |
| Logging | Winston | Structured logs |
| Docs | Swagger/OpenAPI 3.0 | API documentation |
| Container | Docker + Docker Compose | Reproducible deployment |
| Process | PM2 | Production Node.js |

---

## 🗺️ ROADMAP

### Giai đoạn 1 — MVP / Phase 1: MVP (Hiện tại / Current)
- ✅ Flood rescue coordination
- ✅ Real-time dashboard
- ✅ PostgreSQL + layered architecture
- ✅ PWA offline support
- ✅ Vmap sovereignty-compliant
- 🔄 Multi-hazard expansion (8 types)
- 🔄 MFA security
- 🔄 Bilingual UI
- 🔄 External alert integration

### Giai đoạn 2 — Pilot Tỉnh / Phase 2: Provincial Pilot (6 tháng / 6 months)
- [ ] Pilot tại 1-2 tỉnh miền Trung / Pilot in 1-2 Central Vietnam provinces
- [ ] SMS/Zalo OA notification integration
- [ ] Mobile app (React Native)
- [ ] Advanced GIS: risk zone mapping
- [ ] Inter-agency resource sharing

### Giai đoạn 3 — Scale Quốc gia / Phase 3: National Scale (1-2 năm / 1-2 years)
- [ ] Tích hợp với VNDMS / Integration with VNDMS
- [ ] AI-powered resource prediction
- [ ] Satellite imagery integration
- [ ] Multi-province coordination
- [ ] Government data exchange standards

### Giai đoạn 4 — Khu vực / Phase 4: Regional (3+ năm / 3+ years)
- [ ] ASEAN disaster coordination protocol
- [ ] Cross-border event management

---

## ⚖️ TUÂN THỦ PHÁP LÝ / LEGAL COMPLIANCE

| Quy định / Regulation | Nội dung / Content | Trạng thái / Status |
|----------------------|-------------------|---------------------|
| Thông tư 13/2023/TT-BTTTT | An toàn thông tin / Information security | ✅ Tuân thủ / Compliant |
| Nghị định 13/2023/NĐ-CP | Bảo vệ dữ liệu cá nhân / Personal data protection | ✅ Tuân thủ / Compliant |
| Nghị định 66/2021/NĐ-CP | Phòng chống thiên tai / Disaster prevention | ✅ Phù hợp / Aligned |
| Luật An ninh mạng 2018 | Cybersecurity law | ✅ Tuân thủ / Compliant |
| Quy định Bộ TN&MT | Bản đồ / Map data | ✅ Dùng Vmap / Using Vmap |
| Luật PCTT 2013 (sửa 2020) | Phòng chống thiên tai / Disaster risk reduction | ✅ Phù hợp / Aligned |

---

## 💰 MÔ HÌNH TRIỂN KHAI / DEPLOYMENT MODEL

**Mô hình đề xuất / Proposed Model:**

```
Tổng cục Phòng chống thiên tai           ← Giám sát quốc gia / National oversight
    │
    ├── Ban Chỉ đạo cấp Vùng             ← 7 vùng / 7 regions
    │       │
    │       └── UBND Tỉnh (63 tỉnh)      ← Triển khai thực tế / Actual deployment
    │               │
    │               ├── Điều phối viên    ← Người dùng chính / Primary users
    │               ├── Đội cứu hộ
    │               └── Kho cứu trợ
    │
    └── Công dân toàn quốc               ← Public portal (không cần đăng nhập)
```

**Hướng tiếp cận / Approach:**
1. **Bottom-up:** Bắt đầu từ cấp huyện → tỉnh → vùng → quốc gia
2. **Open source:** Publish lên GitHub, cho phép địa phương tự deploy
3. **Tích hợp:** Complement VNDMS, không cạnh tranh

---

## 📞 LIÊN HỆ & ĐÓNG GÓP / CONTACT & CONTRIBUTING

**Phát triển bởi / Developed by:** [Tên / Name]
**Trường / University:** Đại học FPT TP.HCM
**Email:** [email]
**GitHub:** [repo URL]
**Demo:** [demo URL]

**Đóng góp / Contributing:** Pull requests welcome. Xem / See `CONTRIBUTING.md`.

**Giấy phép / License:** MIT License — miễn phí cho mục đích phi lợi nhuận và chính phủ / Free for non-profit and government use.

---

> *"Mỗi phút trong thiên tai đều có giá trị. VDRCS được xây dựng để không lãng phí một phút nào."*
>
> *"Every minute in a disaster counts. VDRCS is built so none are wasted."*
