const swaggerJSDoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Flood Rescue Coordination & Relief Management System API",
      version: "1.0.0",
      description: `
## Hệ thống Điều phối Cứu hộ & Quản lý Cứu trợ Lũ lụt

API backend cho hệ thống quản lý, điều phối cứu hộ lũ lụt tại Việt Nam.

### Tính năng chính:
- 🆘 **Citizen**: Gửi yêu cầu cứu hộ (không cần đăng nhập) + Tra cứu bằng mã tracking
- 📋 **Coordinator**: Xác minh, phân công đội cứu hộ cho yêu cầu
- 🚑 **Rescue Team**: Nhận nhiệm vụ, cập nhật trạng thái, báo cáo kết quả
- 📊 **Dashboard**: Thống kê tổng quan, heatmap, workload coordinator
- 🏢 **Admin**: Quản lý người dùng, cấu hình hệ thống, nhật ký

### Xác thực:
- Sử dụng **JWT Bearer Token** (trừ các endpoint công khai)
- Đăng nhập tại \`POST /api/auth/login\` để lấy token
- Gửi header: \`Authorization: Bearer <token>\`

### Tài khoản test:
| Username | Password | Role |
|----------|----------|------|
| admin | 123456 | Admin |
| wm_hcm | 123456 | Warehouse Manager |
| mgr_hcm | 123456 | Manager |
| coord_hcm | 123456 | Coordinator (HCM) |
| coord_la | 123456 | Coordinator (Long An) |
| leader_binhthanh | 123456 | Rescue Team (Trưởng đội) |
| leader_benluc | 123456 | Rescue Team (Trưởng đội Long An) |
| mem_hcm_01 | 123456 | Rescue Team (Thành viên) |
      `,
      contact: { name: "Flood Rescue Team", email: "admin@cuuho.vn" },
      license: { name: "MIT" },
    },
    servers: [
      {
        url: "/api",
        description: "API Server (qua Vite proxy hoặc trực tiếp)",
      },
      { url: "http://localhost:5000/api", description: "Development Server" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Nhập JWT token nhận từ POST /auth/login",
        },
      },
      schemas: {
        // === AUTH ===
        LoginRequest: {
          type: "object",
          required: ["username", "password"],
          properties: {
            username: { type: "string", example: "admin" },
            password: { type: "string", example: "123456" },
          },
        },
        LoginResponse: {
          type: "object",
          properties: {
            token: { type: "string", example: "eyJhbGciOiJIUzI1NiIs..." },
            user: { $ref: "#/components/schemas/User" },
          },
        },
        ChangePasswordRequest: {
          type: "object",
          required: ["current_password", "new_password"],
          properties: {
            current_password: { type: "string" },
            new_password: { type: "string", minLength: 6 },
          },
        },

        // === USER ===
        User: {
          type: "object",
          properties: {
            id: { type: "integer" },
            username: { type: "string" },
            email: { type: "string" },
            full_name: { type: "string" },
            phone: { type: "string" },
            avatar_url: { type: "string", nullable: true },
            role: {
              type: "string",
              enum: ["admin", "manager", "warehouse_manager", "coordinator", "rescue_team"],
            },
            region_id: { type: "integer", nullable: true },
            province_id: { type: "integer", nullable: true },
            is_active: { type: "boolean" },
            last_login: { type: "string", format: "date-time", nullable: true },
            created_at: { type: "string", format: "date-time" },
          },
        },
        CreateUserRequest: {
          type: "object",
          required: ["username", "email", "password", "full_name", "role"],
          properties: {
            username: { type: "string", example: "new_user" },
            email: { type: "string", example: "user@cuuho.vn" },
            password: { type: "string", example: "123456" },
            full_name: { type: "string", example: "Nguyễn Văn X" },
            phone: { type: "string", example: "0901234567" },
            role: {
              type: "string",
              enum: ["admin", "manager", "warehouse_manager", "coordinator", "rescue_team"],
            },
            region_id: { type: "integer", nullable: true },
            province_id: { type: "integer", nullable: true },
          },
        },
        CoordinatorRegion: {
          type: "object",
          properties: {
            id: { type: "integer" },
            user_id: { type: "integer" },
            province_id: { type: "integer" },
            district_id: { type: "integer", nullable: true },
            is_primary: { type: "boolean" },
            max_workload: { type: "integer" },
            current_workload: { type: "integer" },
          },
        },

        // === RESCUE REQUEST ===
        RescueRequest: {
          type: "object",
          properties: {
            id: { type: "integer" },
            tracking_code: { type: "string", example: "RQ-2026-100001" },
            citizen_name: { type: "string" },
            citizen_phone: { type: "string" },
            citizen_address: { type: "string" },
            latitude: { type: "number", format: "float" },
            longitude: { type: "number", format: "float" },
            address: { type: "string" },
            province_id: { type: "integer" },
            district_id: { type: "integer" },
            ward_id: { type: "integer", nullable: true },
            incident_type_id: { type: "integer" },
            urgency_level_id: { type: "integer" },
            description: { type: "string" },
            victim_count: { type: "integer" },
            support_type: { type: "string" },
            flood_severity: { type: "integer", minimum: 1, maximum: 5 },
            priority_score: { type: "integer" },
            status: {
              type: "string",
              enum: [
                "pending",
                "verified",
                "assigned",
                "in_progress",
                "completed",
                "cancelled",
                "rejected",
              ],
            },
            coordinator_id: { type: "integer", nullable: true },
            assigned_team_id: { type: "integer", nullable: true },
            created_at: { type: "string", format: "date-time" },
            verified_at: {
              type: "string",
              format: "date-time",
              nullable: true,
            },
            assigned_at: {
              type: "string",
              format: "date-time",
              nullable: true,
            },
            completed_at: {
              type: "string",
              format: "date-time",
              nullable: true,
            },
            rescued_count: { type: "integer" },
            result_notes: { type: "string", nullable: true },
            reject_reason: { type: "string", nullable: true },
            response_time_minutes: { type: "integer", nullable: true },
          },
        },
        CreateRescueRequest: {
          type: "object",
          required: [
            "citizen_name",
            "citizen_phone",
            "latitude",
            "longitude",
            "province_id",
            "district_id",
            "incident_type_id",
            "urgency_level_id",
            "description",
          ],
          properties: {
            citizen_name: { type: "string", example: "Nguyễn Văn A" },
            citizen_phone: { type: "string", example: "0901111111" },
            citizen_address: { type: "string", example: "123 Lê Lợi, TP Huế" },
            latitude: { type: "number", example: 16.4637 },
            longitude: { type: "number", example: 107.5909 },
            address: { type: "string" },
            province_id: { type: "integer", example: 2 },
            district_id: { type: "integer", example: 1 },
            ward_id: { type: "integer" },
            incident_type_id: { type: "integer", example: 1 },
            urgency_level_id: { type: "integer", example: 1 },
            description: {
              type: "string",
              example: "Nước ngập 1.5m, 5 người mắc kẹt",
            },
            victim_count: { type: "integer", example: 5 },
            support_type: { type: "string", example: "evacuation,medical" },
            flood_severity: {
              type: "integer",
              example: 4,
              minimum: 1,
              maximum: 5,
            },
            images: {
              type: "array",
              items: { type: "string", format: "binary" },
              description: "Ảnh hiện trường (tối đa 5)",
            },
          },
        },
        AssignTeamRequest: {
          type: "object",
          required: ["team_id"],
          properties: {
            team_id: { type: "integer", example: 1 },
            vehicle_id: { type: "integer", nullable: true },
          },
        },

        // === MISSION ===
        Mission: {
          type: "object",
          properties: {
            id: { type: "integer" },
            request_id: { type: "integer" },
            team_id: { type: "integer" },
            vehicle_id: { type: "integer", nullable: true },
            status: {
              type: "string",
              enum: [
                "pending",
                "assigned",
                "accepted",
                "en_route",
                "on_scene",
                "completed",
                "aborted",
              ],
            },
            notes: { type: "string", nullable: true },
            started_at: { type: "string", format: "date-time", nullable: true },
            completed_at: {
              type: "string",
              format: "date-time",
              nullable: true,
            },
            created_at: { type: "string", format: "date-time" },
          },
        },
        MissionLog: {
          type: "object",
          properties: {
            id: { type: "integer" },
            mission_id: { type: "integer" },
            user_id: { type: "integer" },
            action: { type: "string" },
            description: { type: "string" },
            latitude: { type: "number", nullable: true },
            longitude: { type: "number", nullable: true },
            created_at: { type: "string", format: "date-time" },
          },
        },

        // === TEAM ===
        RescueTeam: {
          type: "object",
          properties: {
            id: { type: "integer" },
            name: { type: "string" },
            code: { type: "string" },
            leader_id: { type: "integer" },
            leader_name: { type: "string" },
            province_id: { type: "integer" },
            province_name: { type: "string" },
            district_id: { type: "integer", nullable: true },
            phone: { type: "string" },
            capacity: { type: "integer" },
            member_count: { type: "integer" },
            specialization: { type: "string" },
            status: {
              type: "string",
              enum: ["available", "on_mission", "standby", "off_duty"],
            },
            current_latitude: { type: "number", nullable: true },
            current_longitude: { type: "number", nullable: true },
          },
        },
        CreateTeamRequest: {
          type: "object",
          required: ["name", "code", "province_id"],
          properties: {
            name: { type: "string", example: "Đội Cứu Hộ Mới" },
            code: { type: "string", example: "NEW-01" },
            leader_id: { type: "integer" },
            province_id: { type: "integer", example: 2 },
            district_id: { type: "integer" },
            phone: { type: "string" },
            capacity: { type: "integer", example: 8 },
            specialization: { type: "string", example: "water_rescue" },
          },
        },

        // === RESOURCES ===
        Vehicle: {
          type: "object",
          properties: {
            id: { type: "integer" },
            name: { type: "string" },
            plate_number: { type: "string" },
            type: {
              type: "string",
              enum: ["boat", "truck", "ambulance", "helicopter", "other"],
            },
            capacity: { type: "integer" },
            province_id: { type: "integer" },
            team_id: { type: "integer", nullable: true },
            status: {
              type: "string",
              enum: ["available", "in_use", "maintenance", "retired"],
            },
          },
        },
        Warehouse: {
          type: "object",
          properties: {
            id: { type: "integer" },
            name: { type: "string" },
            address: { type: "string" },
            province_id: { type: "integer" },
            district_id: { type: "integer", nullable: true },
            latitude: { type: "number" },
            longitude: { type: "number" },
            capacity_tons: { type: "number" },
            manager_id: { type: "integer", nullable: true },
            phone: { type: "string" },
            status: { type: "string" },
          },
        },
        ReliefInventory: {
          type: "object",
          properties: {
            id: { type: "integer" },
            warehouse_id: { type: "integer" },
            warehouse_name: { type: "string" },
            item_id: { type: "integer" },
            item_name: { type: "string" },
            quantity: { type: "number" },
            unit: { type: "string" },
            min_threshold: { type: "number" },
            is_low: { type: "boolean" },
          },
        },

        // === REGION/GEO ===
        Region: {
          type: "object",
          properties: {
            id: { type: "integer" },
            name: { type: "string" },
            code: { type: "string" },
            description: { type: "string" },
          },
        },
        Province: {
          type: "object",
          properties: {
            id: { type: "integer" },
            region_id: { type: "integer" },
            name: { type: "string" },
            code: { type: "string" },
            latitude: { type: "number" },
            longitude: { type: "number" },
          },
        },
        District: {
          type: "object",
          properties: {
            id: { type: "integer" },
            province_id: { type: "integer" },
            name: { type: "string" },
            code: { type: "string" },
          },
        },
        IncidentType: {
          type: "object",
          properties: {
            id: { type: "integer" },
            name: { type: "string" },
            code: { type: "string" },
            icon: { type: "string" },
            color: { type: "string" },
          },
        },
        UrgencyLevel: {
          type: "object",
          properties: {
            id: { type: "integer" },
            name: { type: "string" },
            code: { type: "string" },
            priority_score: { type: "integer" },
            color: { type: "string" },
            max_response_minutes: { type: "integer" },
          },
        },
        WeatherAlert: {
          type: "object",
          properties: {
            id: { type: "integer" },
            province_id: { type: "integer" },
            alert_type: { type: "string" },
            severity: {
              type: "string",
              enum: ["low", "medium", "high", "critical"],
            },
            title: { type: "string" },
            description: { type: "string" },
            starts_at: { type: "string", format: "date-time" },
            expires_at: { type: "string", format: "date-time" },
            source: { type: "string" },
          },
        },

        // === NOTIFICATION ===
        Notification: {
          type: "object",
          properties: {
            id: { type: "integer" },
            user_id: { type: "integer", nullable: true },
            tracking_code: { type: "string", nullable: true },
            type: { type: "string" },
            title: { type: "string" },
            message: { type: "string" },
            metadata: { type: "string", nullable: true },
            is_read: { type: "boolean" },
            created_at: { type: "string", format: "date-time" },
          },
        },

        // === CONFIG ===
        SystemConfig: {
          type: "object",
          properties: {
            id: { type: "integer" },
            config_key: { type: "string" },
            config_value: { type: "string" },
            description: { type: "string" },
            updated_at: { type: "string", format: "date-time" },
          },
        },

        // === AUDIT LOG ===
        AuditLog: {
          type: "object",
          properties: {
            id: { type: "integer" },
            user_id: { type: "integer" },
            full_name: { type: "string" },
            action: { type: "string" },
            entity_type: { type: "string" },
            entity_id: { type: "integer" },
            old_values: { type: "string" },
            new_values: { type: "string" },
            ip_address: { type: "string" },
            created_at: { type: "string", format: "date-time" },
          },
        },

        // === COMMON ===
        Error: {
          type: "object",
          properties: {
            error: { type: "string" },
          },
        },
        PaginatedResponse: {
          type: "object",
          properties: {
            data: { type: "array", items: {} },
            pagination: {
              type: "object",
              properties: {
                page: { type: "integer" },
                limit: { type: "integer" },
                total: { type: "integer" },
                totalPages: { type: "integer" },
              },
            },
          },
        },
      },
    },
    tags: [
      { name: "Auth", description: "Xác thực & quản lý tài khoản" },
      {
        name: "Requests",
        description: "Yêu cầu cứu hộ (citizen & coordinator)",
      },
      { name: "Tasks", description: "Nhóm nhiệm vụ (task groups)" },
      { name: "Missions", description: "Nhiệm vụ cứu hộ" },
      { name: "Teams", description: "Đội cứu hộ" },
      {
        name: "Resources",
        description: "Phương tiện, kho hàng, vật phẩm cứu trợ",
      },
      { name: "Users", description: "Quản lý người dùng" },
      { name: "Regions", description: "Dữ liệu địa lý & danh mục (public)" },
      { name: "Dashboard", description: "Thống kê & báo cáo" },
      { name: "Notifications", description: "Thông báo" },
      { name: "Config", description: "Cấu hình hệ thống" },
      { name: "AuditLogs", description: "Nhật ký hoạt động" },
    ],

    // ===============================================
    // PATHS - All 81 endpoints
    // ===============================================
    paths: {
      // ==================== AUTH ====================
      "/auth/login": {
        post: {
          tags: ["Auth"],
          summary: "Đăng nhập",
          description:
            "Đăng nhập bằng username/password, trả về JWT token và thông tin user.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LoginRequest" },
              },
            },
          },
          responses: {
            200: {
              description: "Đăng nhập thành công",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/LoginResponse" },
                },
              },
            },
            401: {
              description: "Sai thông tin đăng nhập",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },
      "/auth/me": {
        get: {
          tags: ["Auth"],
          summary: "Lấy thông tin user hiện tại",
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: "Thông tin user",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/User" },
                },
              },
            },
            401: { description: "Chưa đăng nhập" },
          },
        },
      },
      "/auth/password": {
        put: {
          tags: ["Auth"],
          summary: "Đổi mật khẩu",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ChangePasswordRequest" },
              },
            },
          },
          responses: {
            200: { description: "Đổi mật khẩu thành công" },
            400: { description: "Mật khẩu cũ không đúng" },
          },
        },
      },

      // ==================== REQUESTS ====================
      "/requests": {
        post: {
          tags: ["Requests"],
          summary: "🆘 Gửi yêu cầu cứu hộ (Citizen - không cần login)",
          description:
            "Endpoint công khai cho người dân gửi yêu cầu cứu hộ khẩn cấp. Hỗ trợ upload ảnh hiện trường. Rate limit: 5 req/15 phút.",
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: { $ref: "#/components/schemas/CreateRescueRequest" },
              },
            },
          },
          responses: {
            201: {
              description: "Tạo thành công, trả về tracking_code",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      id: { type: "integer" },
                      tracking_code: { type: "string" },
                      message: { type: "string" },
                    },
                  },
                },
              },
            },
            400: { description: "Thiếu thông tin bắt buộc" },
            429: { description: "Quá nhiều yêu cầu (rate limited)" },
          },
        },
        get: {
          tags: ["Requests"],
          summary: "Danh sách yêu cầu (có phân trang & lọc)",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "page",
              in: "query",
              schema: { type: "integer", default: 1 },
            },
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", default: 20 },
            },
            {
              name: "status",
              in: "query",
              schema: {
                type: "string",
                enum: [
                  "pending",
                  "verified",
                  "assigned",
                  "in_progress",
                  "completed",
                  "cancelled",
                  "rejected",
                ],
              },
            },
            { name: "province_id", in: "query", schema: { type: "integer" } },
            {
              name: "search",
              in: "query",
              schema: { type: "string" },
              description: "Tìm theo tracking_code, tên, SĐT",
            },
          ],
          responses: {
            200: {
              description: "Danh sách yêu cầu phân trang",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/PaginatedResponse" },
                },
              },
            },
          },
        },
      },
      "/requests/track/{trackingCode}": {
        get: {
          tags: ["Requests"],
          summary: "🔍 Tra cứu yêu cầu bằng mã tracking (Public)",
          parameters: [
            {
              name: "trackingCode",
              in: "path",
              required: true,
              schema: { type: "string" },
              example: "RQ-2026-100001",
            },
          ],
          responses: {
            200: {
              description: "Thông tin yêu cầu + timeline",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/RescueRequest" },
                },
              },
            },
            404: { description: "Không tìm thấy mã tracking" },
          },
        },
      },
      "/requests/track/{trackingCode}/notifications": {
        get: {
          tags: ["Requests"],
          summary: "Lấy thông báo cho tracking code (Public)",
          parameters: [
            {
              name: "trackingCode",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: { description: "Danh sách thông báo cho yêu cầu" },
          },
        },
      },
      "/requests/map": {
        get: {
          tags: ["Requests"],
          summary: "Lấy dữ liệu hiển thị bản đồ (Public)",
          parameters: [
            { name: "province_id", in: "query", schema: { type: "integer" } },
            { name: "status", in: "query", schema: { type: "string" } },
          ],
          responses: {
            200: { description: "Danh sách yêu cầu kèm tọa độ cho bản đồ" },
          },
        },
      },
      "/requests/stats/overview": {
        get: {
          tags: ["Requests"],
          summary: "Thống kê tổng quan yêu cầu",
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: "Thống kê",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      total_requests: { type: "integer" },
                      pending: { type: "integer" },
                      verified: { type: "integer" },
                      assigned: { type: "integer" },
                      in_progress: { type: "integer" },
                      completed: { type: "integer" },
                      total_victims: { type: "integer" },
                      total_rescued: { type: "integer" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/requests/{id}": {
        get: {
          tags: ["Requests"],
          summary: "Chi tiết yêu cầu theo ID",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          responses: {
            200: { description: "Chi tiết yêu cầu" },
            404: { description: "Không tìm thấy" },
          },
        },
      },
      "/requests/{id}/verify": {
        put: {
          tags: ["Requests"],
          summary: "✅ Xác minh yêu cầu",
          description:
            "Coordinator/Admin xác minh yêu cầu từ pending → verified",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { notes: { type: "string" } },
                },
              },
            },
          },
          responses: {
            200: { description: "Xác minh thành công" },
            400: { description: "Trạng thái không hợp lệ" },
          },
        },
      },
      "/requests/{id}/reject": {
        put: {
          tags: ["Requests"],
          summary: "❌ Từ chối yêu cầu",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["reason"],
                  properties: {
                    reason: {
                      type: "string",
                      example: "Địa chỉ không xác thực",
                    },
                  },
                },
              },
            },
          },
          responses: { 200: { description: "Từ chối thành công" } },
        },
      },
      "/requests/{id}/assign": {
        put: {
          tags: ["Requests"],
          summary: "🚑 Phân công đội cứu hộ",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AssignTeamRequest" },
              },
            },
          },
          responses: {
            200: { description: "Phân công thành công, tạo mission" },
            400: { description: "Đội không available" },
          },
        },
      },
      "/requests/{id}/status": {
        put: {
          tags: ["Requests"],
          summary: "Cập nhật trạng thái yêu cầu",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string" },
                    rescued_count: { type: "integer" },
                    result_notes: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { 200: { description: "Cập nhật thành công" } },
        },
      },
      "/requests/{id}/suggest-team": {
        get: {
          tags: ["Requests"],
          summary: "Gợi ý đội cứu hộ gần nhất",
          description:
            "Tính khoảng cách GPS từ yêu cầu đến các đội available, trả về danh sách sắp xếp theo khoảng cách.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          responses: {
            200: { description: "Danh sách đội gợi ý kèm khoảng cách (km)" },
          },
        },
      },
      "/requests/{id}/reassign-coordinator": {
        put: {
          tags: ["Requests"],
          summary: "Chuyển coordinator cho yêu cầu",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { coordinator_id: { type: "integer" } },
                },
              },
            },
          },
          responses: { 200: { description: "Chuyển thành công" } },
        },
      },

      // ==================== TASKS ====================
      "/tasks": {
        get: {
          tags: ["Tasks"],
          summary: "Danh sách nhiệm vụ (task groups)",
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: "query", name: "status", schema: { type: "string" }, description: "Lọc theo trạng thái" },
            { in: "query", name: "team_id", schema: { type: "integer" }, description: "Lọc theo đội" },
          ],
          responses: { 200: { description: "Thành công" } },
        },
      },

      // ==================== MISSIONS ====================
      "/missions": {
        get: {
          tags: ["Missions"],
          summary: "Danh sách nhiệm vụ",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "page",
              in: "query",
              schema: { type: "integer", default: 1 },
            },
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", default: 20 },
            },
            { name: "status", in: "query", schema: { type: "string" } },
          ],
          responses: { 200: { description: "Danh sách nhiệm vụ phân trang" } },
        },
      },
      "/missions/{id}": {
        get: {
          tags: ["Missions"],
          summary: "Chi tiết nhiệm vụ",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          responses: {
            200: { description: "Chi tiết nhiệm vụ + request info" },
          },
        },
      },
      "/missions/{id}/status": {
        put: {
          tags: ["Missions"],
          summary: "Cập nhật trạng thái nhiệm vụ",
          description:
            "Flow: assigned → accepted → en_route → on_scene → completed/aborted",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: {
                      type: "string",
                      enum: [
                        "accepted",
                        "en_route",
                        "on_scene",
                        "completed",
                        "aborted",
                      ],
                    },
                    notes: { type: "string" },
                    latitude: { type: "number" },
                    longitude: { type: "number" },
                  },
                },
              },
            },
          },
          responses: { 200: { description: "Cập nhật thành công" } },
        },
      },
      "/missions/{id}/logs": {
        get: {
          tags: ["Missions"],
          summary: "Lịch sử hoạt động nhiệm vụ",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          responses: { 200: { description: "Danh sách mission logs" } },
        },
      },
      "/missions/{id}/result": {
        post: {
          tags: ["Missions"],
          summary: "Gửi kết quả nhiệm vụ (có upload ảnh)",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          requestBody: {
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  properties: {
                    rescued_count: { type: "integer" },
                    result_notes: { type: "string" },
                    images: {
                      type: "array",
                      items: { type: "string", format: "binary" },
                    },
                  },
                },
              },
            },
          },
          responses: { 200: { description: "Gửi kết quả thành công" } },
        },
      },

      // ==================== TEAMS ====================
      "/teams": {
        get: {
          tags: ["Teams"],
          summary: "Danh sách đội cứu hộ",
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: "province_id", in: "query", schema: { type: "integer" } },
            { name: "status", in: "query", schema: { type: "string" } },
          ],
          responses: {
            200: {
              description: "Danh sách đội",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: { $ref: "#/components/schemas/RescueTeam" },
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ["Teams"],
          summary: "Tạo đội cứu hộ mới",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateTeamRequest" },
              },
            },
          },
          responses: { 201: { description: "Tạo thành công" } },
        },
      },
      "/teams/{id}": {
        get: {
          tags: ["Teams"],
          summary: "Chi tiết đội cứu hộ",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          responses: {
            200: { description: "Chi tiết đội + thành viên + nhiệm vụ" },
          },
        },
        put: {
          tags: ["Teams"],
          summary: "Cập nhật đội cứu hộ",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          requestBody: {
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateTeamRequest" },
              },
            },
          },
          responses: { 200: { description: "Cập nhật thành công" } },
        },
      },
      "/teams/{id}/location": {
        put: {
          tags: ["Teams"],
          summary: "Cập nhật vị trí GPS đội",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    latitude: { type: "number" },
                    longitude: { type: "number" },
                  },
                },
              },
            },
          },
          responses: { 200: { description: "Cập nhật vị trí thành công" } },
        },
      },
      "/teams/{id}/members": {
        get: {
          tags: ["Teams"],
          summary: "Danh sách thành viên đội",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          responses: { 200: { description: "Danh sách thành viên" } },
        },
        post: {
          tags: ["Teams"],
          summary: "Thêm thành viên vào đội",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    user_id: { type: "integer" },
                    role_in_team: { type: "string", example: "member" },
                  },
                },
              },
            },
          },
          responses: { 201: { description: "Thêm thành công" } },
        },
      },
      "/teams/{id}/members/{memberId}": {
        delete: {
          tags: ["Teams"],
          summary: "Xóa thành viên khỏi đội",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
            {
              name: "memberId",
              in: "path",
              required: true,
              schema: { type: "integer" },
              description: "user_id của thành viên",
            },
          ],
          responses: { 200: { description: "Xóa thành công" } },
        },
      },

      // ==================== RESOURCES ====================
      "/resources/vehicles": {
        get: {
          tags: ["Resources"],
          summary: "Danh sách phương tiện",
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: "province_id", in: "query", schema: { type: "integer" } },
            { name: "status", in: "query", schema: { type: "string" } },
            { name: "type", in: "query", schema: { type: "string" } },
          ],
          responses: {
            200: {
              description: "Danh sách phương tiện",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: { $ref: "#/components/schemas/Vehicle" },
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ["Resources"],
          summary: "Thêm phương tiện",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    plate_number: { type: "string" },
                    type: { type: "string" },
                    capacity: { type: "integer" },
                    province_id: { type: "integer" },
                    team_id: { type: "integer" },
                  },
                },
              },
            },
          },
          responses: { 201: { description: "Tạo thành công" } },
        },
      },
      "/resources/vehicles/{id}": {
        put: {
          tags: ["Resources"],
          summary: "Cập nhật phương tiện",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          responses: { 200: { description: "Cập nhật thành công" } },
        },
      },
      "/resources/warehouses": {
        get: {
          tags: ["Resources"],
          summary: "Danh sách kho hàng",
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: "Danh sách kho",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: { $ref: "#/components/schemas/Warehouse" },
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ["Resources"],
          summary: "Thêm kho hàng",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    address: { type: "string" },
                    province_id: { type: "integer" },
                    district_id: { type: "integer" },
                    latitude: { type: "number" },
                    longitude: { type: "number" },
                    capacity_tons: { type: "number" },
                    manager_id: { type: "integer" },
                    phone: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { 201: { description: "Tạo thành công" } },
        },
      },
      "/resources/inventory": {
        get: {
          tags: ["Resources"],
          summary: "Danh sách tồn kho (hàng cứu trợ)",
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: "warehouse_id", in: "query", schema: { type: "integer" } },
          ],
          responses: { 200: { description: "Danh sách tồn kho" } },
        },
      },
      "/resources/inventory/{id}": {
        put: {
          tags: ["Resources"],
          summary: "Cập nhật số lượng tồn kho",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    quantity: { type: "number" },
                    min_threshold: { type: "number" },
                  },
                },
              },
            },
          },
          responses: { 200: { description: "Cập nhật thành công" } },
        },
      },
      "/resources/relief-items": {
        get: {
          tags: ["Resources"],
          summary: "Danh sách loại vật phẩm cứu trợ",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "Danh sách vật phẩm" } },
        },
      },

      // ==================== DISTRIBUTIONS (Cấp phát vật tư) ====================
      "/resources/distributions": {
        get: {
          tags: ["Resources"],
          summary: "Danh sách phiếu cấp phát vật tư",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "Danh sách phiếu" } },
        },
        post: {
          tags: ["Resources"],
          summary: "Tạo phiếu cấp phát đơn lẻ",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["team_id", "warehouse_id", "item_id", "quantity"],
                  properties: {
                    team_id: { type: "integer", example: 4 },
                    warehouse_id: { type: "integer", example: 5 },
                    item_id: { type: "integer", example: 1 },
                    quantity: { type: "number", example: 100 },
                    notes: { type: "string", example: "Cứu hộ lũ Long An" },
                  },
                },
              },
            },
          },
          responses: { 201: { description: "Tạo thành công, trả về voucher_code" } },
        },
      },
      "/resources/distributions/batch": {
        post: {
          tags: ["Resources"],
          summary: "Tạo phiếu cấp phát nhiều vật tư (1 phiếu chung)",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["team_id", "warehouse_id", "items"],
                  properties: {
                    team_id: { type: "integer", example: 4 },
                    warehouse_id: { type: "integer", example: 5 },
                    notes: { type: "string", example: "Cứu hộ lũ Long An" },
                    items: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          item_id: { type: "integer", example: 1 },
                          quantity: { type: "number", example: 100 },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: { 201: { description: "Tạo thành công, trả về batch_id và voucher_code" } },
        },
      },
      "/resources/distributions/batch/{batchId}/cancel": {
        put: {
          tags: ["Resources"],
          summary: "Hoàn tác phiếu cấp phát theo lô (chưa bàn giao)",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "batchId", in: "path", required: true, schema: { type: "integer" } }],
          responses: {
            200: { description: "Đã hoàn tác, tồn kho được cộng lại" },
            400: { description: "Phiếu đã bàn giao, không thể hoàn tác" },
          },
        },
      },
      "/resources/distributions/{id}/cancel": {
        put: {
          tags: ["Resources"],
          summary: "Hoàn tác phiếu cấp phát đơn lẻ (chưa bàn giao)",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          responses: {
            200: { description: "Đã hoàn tác, tồn kho được cộng lại" },
            400: { description: "Không thể hoàn tác" },
          },
        },
      },
      "/resources/distributions/{id}/warehouse-confirm": {
        put: {
          tags: ["Resources"],
          summary: "Kho xác nhận đã bàn giao vật tư cho đội",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          responses: { 200: { description: "Xác nhận thành công" } },
        },
      },
      "/resources/distributions/{id}/confirm": {
        put: {
          tags: ["Resources"],
          summary: "Đội xác nhận đã nhận vật tư",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          responses: { 200: { description: "Xác nhận thành công" } },
        },
      },
      "/resources/distributions/{id}/request-return": {
        put: {
          tags: ["Resources"],
          summary: "Đội yêu cầu trả vật tư dư",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    return_quantity: { type: "number", example: 30 },
                    return_note: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { 200: { description: "Đã gửi yêu cầu trả" } },
        },
      },
      "/resources/distributions/{id}/confirm-return": {
        put: {
          tags: ["Resources"],
          summary: "Kho xác nhận đã nhận lại vật tư",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    received_quantity: { type: "number", example: 28 },
                  },
                },
              },
            },
          },
          responses: { 200: { description: "Xác nhận thành công" } },
        },
      },

      // ==================== VEHICLE DISPATCHES (Điều xe cho đội) ====================
      "/resources/vehicle-dispatches": {
        get: {
          tags: ["Resources"],
          summary: "Danh sách lệnh điều xe",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "Danh sách lệnh điều xe" } },
        },
        post: {
          tags: ["Resources"],
          summary: "Tạo lệnh điều xe cho đội",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["vehicle_id", "team_id"],
                  properties: {
                    vehicle_id: { type: "integer", example: 3 },
                    team_id: { type: "integer", example: 4 },
                    mission_note: { type: "string", example: "Hỗ trợ cứu hộ lũ" },
                  },
                },
              },
            },
          },
          responses: { 201: { description: "Tạo lệnh thành công" } },
        },
      },
      "/resources/vehicle-dispatches/{id}/cancel": {
        put: {
          tags: ["Resources"],
          summary: "Hoàn tác lệnh điều xe (chưa kho xác nhận bàn giao)",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          responses: {
            200: { description: "Đã hoàn tác, xe trở về available" },
            400: { description: "Kho đã xác nhận, không thể hoàn tác" },
          },
        },
      },
      "/resources/vehicle-dispatches/{id}/warehouse-confirm": {
        put: {
          tags: ["Resources"],
          summary: "Kho xác nhận đã bàn giao xe cho đội",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          responses: { 200: { description: "Xác nhận thành công" } },
        },
      },
      "/resources/vehicle-dispatches/{id}/confirm": {
        put: {
          tags: ["Resources"],
          summary: "Đội xác nhận đã nhận xe",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          responses: { 200: { description: "Xác nhận thành công" } },
        },
      },
      "/resources/vehicle-dispatches/{id}/return": {
        put: {
          tags: ["Resources"],
          summary: "Đội trả xe sau nhiệm vụ",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          responses: { 200: { description: "Đã ghi nhận trả xe" } },
        },
      },
      "/resources/vehicle-dispatches/{id}/confirm-return": {
        put: {
          tags: ["Resources"],
          summary: "Kho xác nhận đã nhận lại xe",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          responses: { 200: { description: "Xác nhận thành công, xe về available" } },
        },
      },
      "/resources/vehicle-dispatches/{id}/report-incident": {
        put: {
          tags: ["Resources"],
          summary: "Đội báo sự cố xe (hư hỏng / mất xe)",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["incident_type", "incident_note"],
                  properties: {
                    incident_type: { type: "string", enum: ["damaged", "lost"], example: "damaged" },
                    incident_note: { type: "string", example: "Mất bánh xe sau khi qua vùng ngập" },
                  },
                },
              },
            },
          },
          responses: { 200: { description: "Đã ghi nhận sự cố, chờ kho xác nhận" } },
        },
      },
      "/resources/vehicle-dispatches/{id}/confirm-incident": {
        put: {
          tags: ["Resources"],
          summary: "Kho xác nhận tình trạng xe sau sự cố",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    confirmed_status: { type: "string", enum: ["damaged", "lost", "ok"], example: "damaged" },
                    notes: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { 200: { description: "Xác nhận thành công, cập nhật trạng thái xe" } },
        },
      },

      // ==================== USERS ====================
      "/users": {
        get: {
          tags: ["Users"],
          summary: "Danh sách người dùng (phân trang)",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "page",
              in: "query",
              schema: { type: "integer", default: 1 },
            },
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", default: 20 },
            },
            { name: "search", in: "query", schema: { type: "string" } },
            { name: "role", in: "query", schema: { type: "string" } },
          ],
          responses: { 200: { description: "Danh sách user phân trang" } },
        },
        post: {
          tags: ["Users"],
          summary: "Tạo người dùng mới",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateUserRequest" },
              },
            },
          },
          responses: {
            201: { description: "Tạo thành công" },
            400: { description: "Username/email đã tồn tại" },
          },
        },
      },
      "/users/coordinators": {
        get: {
          tags: ["Users"],
          summary: "Danh sách coordinator (có workload)",
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: "Danh sách coordinator kèm workload" },
          },
        },
      },
      "/users/{id}": {
        get: {
          tags: ["Users"],
          summary: "Chi tiết người dùng",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          responses: { 200: { description: "Chi tiết user" } },
        },
        put: {
          tags: ["Users"],
          summary: "Cập nhật người dùng",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          requestBody: {
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateUserRequest" },
              },
            },
          },
          responses: { 200: { description: "Cập nhật thành công" } },
        },
      },
      "/users/{id}/reset-password": {
        put: {
          tags: ["Users"],
          summary: "Reset mật khẩu về 123456 (Admin only)",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          responses: { 200: { description: "Reset thành công" } },
        },
      },
      "/users/{id}/toggle-active": {
        put: {
          tags: ["Users"],
          summary: "Kích hoạt/vô hiệu hóa user",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          responses: { 200: { description: "Toggle thành công" } },
        },
      },
      "/users/{id}/coordinator-regions": {
        get: {
          tags: ["Users"],
          summary: "Vùng phụ trách của coordinator",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          responses: { 200: { description: "Danh sách vùng phụ trách" } },
        },
        post: {
          tags: ["Users"],
          summary: "Thêm vùng phụ trách cho coordinator",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    province_id: { type: "integer" },
                    district_id: { type: "integer" },
                    is_primary: { type: "boolean" },
                    max_workload: { type: "integer" },
                  },
                },
              },
            },
          },
          responses: { 201: { description: "Thêm thành công" } },
        },
      },
      "/users/{id}/coordinator-regions/{regionId}": {
        put: {
          tags: ["Users"],
          summary: "Cập nhật vùng phụ trách",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
            {
              name: "regionId",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          responses: { 200: { description: "Cập nhật thành công" } },
        },
        delete: {
          tags: ["Users"],
          summary: "Xóa vùng phụ trách",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
            {
              name: "regionId",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          responses: { 200: { description: "Xóa thành công" } },
        },
      },

      // ==================== REGIONS (Public) ====================
      "/regions": {
        get: {
          tags: ["Regions"],
          summary: "Danh sách vùng miền",
          responses: {
            200: {
              description: "Danh sách regions",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: { $ref: "#/components/schemas/Region" },
                  },
                },
              },
            },
          },
        },
      },
      "/regions/provinces": {
        get: {
          tags: ["Regions"],
          summary: "Danh sách tỉnh/thành",
          parameters: [
            { name: "region_id", in: "query", schema: { type: "integer" } },
          ],
          responses: { 200: { description: "Danh sách provinces" } },
        },
      },
      "/regions/districts": {
        get: {
          tags: ["Regions"],
          summary: "Danh sách quận/huyện",
          parameters: [
            {
              name: "province_id",
              in: "query",
              required: true,
              schema: { type: "integer" },
            },
          ],
          responses: { 200: { description: "Danh sách districts" } },
        },
      },
      "/regions/wards": {
        get: {
          tags: ["Regions"],
          summary: "Danh sách phường/xã",
          parameters: [
            {
              name: "district_id",
              in: "query",
              required: true,
              schema: { type: "integer" },
            },
          ],
          responses: { 200: { description: "Danh sách wards" } },
        },
      },
      "/regions/incident-types": {
        get: {
          tags: ["Regions"],
          summary: "Danh sách loại sự cố",
          responses: {
            200: {
              description: "Danh sách incident types",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: { $ref: "#/components/schemas/IncidentType" },
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ["Regions"],
          summary: "Tạo loại sự cố mới (Admin)",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    code: { type: "string" },
                    icon: { type: "string" },
                    color: { type: "string" },
                    description: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { 201: { description: "Tạo thành công" } },
        },
      },
      "/regions/incident-types/{id}": {
        put: {
          tags: ["Regions"],
          summary: "Cập nhật loại sự cố (Admin)",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          responses: { 200: { description: "Cập nhật thành công" } },
        },
      },
      "/regions/urgency-levels": {
        get: {
          tags: ["Regions"],
          summary: "Danh sách mức khẩn cấp",
          responses: {
            200: {
              description: "Danh sách urgency levels",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: { $ref: "#/components/schemas/UrgencyLevel" },
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ["Regions"],
          summary: "Tạo mức khẩn cấp mới (Admin)",
          security: [{ bearerAuth: [] }],
          responses: { 201: { description: "Tạo thành công" } },
        },
      },
      "/regions/urgency-levels/{id}": {
        put: {
          tags: ["Regions"],
          summary: "Cập nhật mức khẩn cấp (Admin)",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          responses: { 200: { description: "Cập nhật thành công" } },
        },
      },
      "/regions/weather-alerts": {
        get: {
          tags: ["Regions"],
          summary: "Danh sách cảnh báo thời tiết",
          parameters: [
            { name: "province_id", in: "query", schema: { type: "integer" } },
            {
              name: "active",
              in: "query",
              schema: { type: "boolean" },
              description: "Chỉ lấy cảnh báo còn hiệu lực",
            },
          ],
          responses: {
            200: {
              description: "Danh sách weather alerts",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: { $ref: "#/components/schemas/WeatherAlert" },
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ["Regions"],
          summary: "Tạo cảnh báo thời tiết",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    province_id: { type: "integer" },
                    alert_type: { type: "string" },
                    severity: { type: "string" },
                    title: { type: "string" },
                    description: { type: "string" },
                    starts_at: { type: "string", format: "date-time" },
                    expires_at: { type: "string", format: "date-time" },
                    source: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { 201: { description: "Tạo thành công" } },
        },
      },
      "/regions/weather-alerts/{id}": {
        put: {
          tags: ["Regions"],
          summary: "Cập nhật cảnh báo thời tiết",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          responses: { 200: { description: "Cập nhật thành công" } },
        },
        delete: {
          tags: ["Regions"],
          summary: "Xóa cảnh báo thời tiết",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          responses: { 200: { description: "Xóa thành công" } },
        },
      },

      // ==================== WEATHER API (OpenWeatherMap) ====================
      "/regions/weather-status": {
        get: {
          tags: ["Regions"],
          summary: "🌤 Kiểm tra Weather API đã cấu hình chưa",
          description: "Trả về trạng thái cấu hình OpenWeatherMap API key",
          responses: {
            200: {
              description: "Trạng thái cấu hình",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      configured: { type: "boolean" },
                      message: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/regions/weather-current/{provinceId}": {
        get: {
          tags: ["Regions"],
          summary: "🌡️ Thời tiết hiện tại theo tỉnh/thành",
          description:
            "Gọi OpenWeatherMap API lấy thời tiết realtime. Cần OPENWEATHERMAP_API_KEY trong .env",
          parameters: [
            {
              name: "provinceId",
              in: "path",
              required: true,
              schema: { type: "integer" },
              example: 2,
            },
          ],
          responses: {
            200: {
              description:
                "Dữ liệu thời tiết hiện tại (nhiệt độ, độ ẩm, gió, mưa...)",
            },
            503: { description: "Weather API chưa cấu hình" },
          },
        },
      },
      "/regions/weather-forecast/{provinceId}": {
        get: {
          tags: ["Regions"],
          summary: "📅 Dự báo 5 ngày theo tỉnh/thành",
          description:
            "Gọi OpenWeatherMap API lấy dự báo thời tiết 5 ngày / 3 giờ",
          parameters: [
            {
              name: "provinceId",
              in: "path",
              required: true,
              schema: { type: "integer" },
              example: 2,
            },
          ],
          responses: {
            200: {
              description:
                "Dự báo thời tiết 5 ngày (temp min/max, lượng mưa, gió)",
            },
            503: { description: "Weather API chưa cấu hình" },
          },
        },
      },
      "/regions/weather-multi": {
        get: {
          tags: ["Regions"],
          summary: "🗺️ Thời tiết nhiều tỉnh cùng lúc",
          parameters: [
            {
              name: "province_ids",
              in: "query",
              required: true,
              schema: { type: "string" },
              example: "1,2,3",
              description:
                "Danh sách province_id cách nhau bằng dấu phẩy (tối đa 10)",
            },
          ],
          responses: {
            200: { description: "Mảng thời tiết hiện tại cho từng tỉnh" },
          },
        },
      },
      "/regions/weather-alerts/auto-sync": {
        post: {
          tags: ["Regions"],
          summary: "🔄 Tự động tạo cảnh báo từ Weather API",
          description:
            "Kiểm tra thời tiết các tỉnh miền Trung (hoặc chỉ định), tự động tạo weather_alerts nếu phát hiện mưa lớn/gió mạnh. Manager/Admin only.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    province_ids: {
                      type: "array",
                      items: { type: "integer" },
                      description:
                        "Tùy chọn: chỉ kiểm tra các tỉnh này. Mặc định = miền Trung",
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "Kết quả sync: provinces_checked, alerts_created",
            },
            503: { description: "Weather API chưa cấu hình" },
          },
        },
      },

      // ==================== DASHBOARD ====================
      "/dashboard/overview": {
        get: {
          tags: ["Dashboard"],
          summary: "Thống kê tổng quan",
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: "province_id", in: "query", schema: { type: "integer" } },
            {
              name: "date_from",
              in: "query",
              schema: { type: "string", format: "date" },
            },
            {
              name: "date_to",
              in: "query",
              schema: { type: "string", format: "date" },
            },
          ],
          responses: {
            200: {
              description:
                "Tổng quan: total, pending, verified, assigned, in_progress, completed, total_victims, total_rescued",
            },
          },
        },
      },
      "/dashboard/by-province": {
        get: {
          tags: ["Dashboard"],
          summary: "Thống kê theo tỉnh/thành",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "Số yêu cầu theo từng tỉnh" } },
        },
      },
      "/dashboard/coordinator-workload": {
        get: {
          tags: ["Dashboard"],
          summary: "Workload coordinator",
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description:
                "Danh sách coordinator kèm current_workload / max_workload",
            },
          },
        },
      },
      "/dashboard/heatmap": {
        get: {
          tags: ["Dashboard"],
          summary: "Dữ liệu heatmap (tọa độ yêu cầu)",
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: "Danh sách tọa độ + mức độ nghiêm trọng" },
          },
        },
      },
      "/dashboard/daily-trend": {
        get: {
          tags: ["Dashboard"],
          summary: "Xu hướng yêu cầu theo ngày (30 ngày gần nhất)",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "days",
              in: "query",
              schema: { type: "integer", default: 30 },
            },
          ],
          responses: { 200: { description: "Dữ liệu trend theo ngày" } },
        },
      },
      "/dashboard/resource-usage": {
        get: {
          tags: ["Dashboard"],
          summary: "Thống kê sử dụng tài nguyên",
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: "Vehicles, warehouses, low stock count" },
          },
        },
      },

      // ==================== NOTIFICATIONS ====================
      "/notifications": {
        get: {
          tags: ["Notifications"],
          summary: "Danh sách thông báo của tôi",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", default: 20 },
            },
          ],
          responses: { 200: { description: "Danh sách thông báo" } },
        },
        post: {
          tags: ["Notifications"],
          summary: "Tạo thông báo (Admin/System)",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    user_id: { type: "integer" },
                    type: { type: "string" },
                    title: { type: "string" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { 201: { description: "Tạo thành công" } },
        },
      },
      "/notifications/unread-count": {
        get: {
          tags: ["Notifications"],
          summary: "Số thông báo chưa đọc",
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: "Count",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: { count: { type: "integer" } },
                  },
                },
              },
            },
          },
        },
      },
      "/notifications/{id}/read": {
        put: {
          tags: ["Notifications"],
          summary: "Đánh dấu đã đọc",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          responses: { 200: { description: "OK" } },
        },
      },
      "/notifications/read-all": {
        put: {
          tags: ["Notifications"],
          summary: "Đánh dấu tất cả đã đọc",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "OK" } },
        },
      },
      "/notifications/{id}": {
        delete: {
          tags: ["Notifications"],
          summary: "Xóa thông báo",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          responses: { 200: { description: "Xóa thành công" } },
        },
      },

      // ==================== CONFIG ====================
      "/config": {
        get: {
          tags: ["Config"],
          summary: "Tất cả cấu hình hệ thống",
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: "Danh sách config",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: { $ref: "#/components/schemas/SystemConfig" },
                  },
                },
              },
            },
          },
        },
      },
      "/config/{key}": {
        get: {
          tags: ["Config"],
          summary: "Lấy config theo key",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "key",
              in: "path",
              required: true,
              schema: { type: "string" },
              example: "system_name",
            },
          ],
          responses: {
            200: { description: "Config value" },
            404: { description: "Key không tồn tại" },
          },
        },
        put: {
          tags: ["Config"],
          summary: "Cập nhật config (Admin)",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "key",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { config_value: { type: "string" } },
                },
              },
            },
          },
          responses: { 200: { description: "Cập nhật thành công" } },
        },
        delete: {
          tags: ["Config"],
          summary: "Xóa config (Admin)",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "key",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: { 200: { description: "Xóa thành công" } },
        },
      },

      // ==================== AUDIT LOGS ====================
      "/audit-logs": {
        get: {
          tags: ["AuditLogs"],
          summary: "Nhật ký hoạt động hệ thống",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "page",
              in: "query",
              schema: { type: "integer", default: 1 },
            },
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", default: 50 },
            },
            { name: "action", in: "query", schema: { type: "string" } },
            { name: "user_id", in: "query", schema: { type: "integer" } },
          ],
          responses: {
            200: {
              description: "Danh sách audit logs",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: { $ref: "#/components/schemas/AuditLog" },
                  },
                },
              },
            },
          },
        },
      },
      "/audit-logs/actions": {
        get: {
          tags: ["AuditLogs"],
          summary: "Danh sách action types (for filter)",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "Danh sách action names" } },
        },
      },
    },
  },
  apis: [], // All paths defined inline above
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;
