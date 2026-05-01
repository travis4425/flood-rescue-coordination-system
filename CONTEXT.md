# VDRCS — Domain Context

Vietnam Disaster Response & Coordination System. Single bounded context.

---

## Glossary

### RescueRequest
A citizen-submitted request for aid during a disaster. Has a unique `tracking_code` (format `RQ-YYYY-NNNNNN`). Citizens can track status without logging in. Lifecycle: `pending` → `verified` → `assigned` → `in_progress` → `completed` (or `rejected`/`cancelled`).

### Mission
A coordinator-created work assignment that links one RescueRequest to one RescueTeam. A Mission is the unit of dispatch — it is created when a coordinator assigns a RescueRequest to a team. One RescueRequest has at most one active Mission at a time.

### Task
A sub-unit of coordination work managed by coordinators and managers. Tasks are independent of Missions — they cover broader operational actions (e.g., pre-positioning resources, setting up checkpoints) not tied to a specific RescueRequest.

### RescueTeam
A group of users with role `rescue_team`. Has one designated team leader (`is_team_leader`). Teams are scoped to a province. GPS location is broadcast via Socket.io `update_location` event, scoped to the team's province room.

### DisasterEvent
An officially-declared disaster occurrence (one of 8 types: flood, typhoon, landslide, drought, earthquake, wildfire, saltwater, tsunami). Coordinators and managers create DisasterEvents; RescueRequests are associated with a DisasterEvent. ExternalAlerts from USGS/NASA FIRMS are manually linked to DisasterEvents by coordinators.

### ExternalAlert
An automated ingestion from a third-party source (USGS for earthquakes, NASA FIRMS for wildfires). Stored in `external_alert_logs`. Not automatically a DisasterEvent — requires coordinator review to promote to one.

### Warehouse
A physical storage location managed by a `warehouse_manager`. Holds Supplies and Vehicles. Resource transfers and dispatches flow between Warehouses and RescueTeams.

### Resource
Umbrella term covering two subtypes: **Supply** (consumable goods with quantity) and **Vehicle** (discrete, tracked by unit). Resources belong to a Warehouse.

### Region / Province
Administrative hierarchy: Region (7 vùng) → Province (63 tỉnh). Users, RescueTeams, and Warehouses are scoped to a Province. Coordinators can be assigned across multiple provinces via `coordinator_regions`.

### MFA (Multi-Factor Authentication)
TOTP-based second factor using `speakeasy`. Mandatory for `admin` and `manager` roles — enforced at login, not opt-in. See ADR-0001.

### mfa_pending cookie
A short-lived (5-minute) httpOnly JWT set after password verification succeeds for an MFA-required user. Authorizes only `POST /auth/mfa/verify`. Cleared when real `access_token` is issued. Never grants dashboard access.

### MFA Setup Flow
Triggered on first login when `mfa_enabled = false` for an `admin`/`manager`. Server returns `{ status: 'MFA_SETUP_REQUIRED' }` + `mfa_pending` cookie. Client fetches a `otpauth://` URI from the server, renders QR code via `qrcode.react`, user scans with authenticator app, submits confirmation code. MFA reset is admin-only (`PUT /api/users/:id/reset-mfa`); no recovery codes.

### DisasterType vs IncidentType
Two distinct concepts that must not be conflated:
- **DisasterType** — the natural hazard category (one of 8: flood, typhoon, landslide, drought, earthquake, wildfire, saltwater, tsunami). Lives in the `disaster_types` table. Referenced directly on `rescue_requests.disaster_type_id`.
- **IncidentType** — the nature of the emergency operation within a disaster (e.g., person trapped, property damaged). Lives in the `incident_types` table with a `rescue_category` classifier (`cuu_nan`/`cuu_tro`/`cuu_ho`). Referenced on `rescue_requests.incident_type_id`.

A citizen reports a flood (DisasterType) with a trapped person (IncidentType). These are orthogonal axes.

### ExternalAlert
An automated ingestion from a third-party source (USGS for earthquakes, NASA FIRMS for wildfires). Stored in `external_alert_logs` (schema migration pending). Not automatically a DisasterEvent — requires coordinator review to promote to one. Scheduler runs every 5 min (earthquake) and 6 h (wildfire).

---

## Schema migration status (Phase 1 gaps)

The following tables are referenced in code but **not yet in `schema_postgres.sql`** — require migrations before deployment:

| Table | Referenced by | Migration |
|---|---|---|
| `disaster_types` | `disasterEventRepository.js`, `CitizenHome.jsx` | `003_disaster_types.sql` |
| `disaster_events` | `disasterEventRepository.js`, `disasterEventService.js` | `003_disaster_types.sql` |
| `external_alert_logs` | `externalAlertService.js` | `004_external_alerts.sql` |

Also required:
- `ALTER TABLE users ADD COLUMN mfa_secret VARCHAR(64), ADD COLUMN mfa_enabled BOOLEAN DEFAULT false` → `002_mfa_columns.sql`
- `rescue_requests` already has `disaster_event_id` column in repository code — verify column exists in schema

---

## Roles

| Role | Access scope |
|---|---|
| `citizen` | Public portal only (submit RescueRequest, track by code) |
| `rescue_team` | Missions, Tasks, Resources (own team) |
| `coordinator` | Requests, Missions, Teams, Tasks, Resources (province) |
| `warehouse_manager` | Resources, Inventory, Reports |
| `manager` | All operational views + Reports |
| `admin` | Users, Config, Reports — system administration |

MFA enforced for: `admin`, `manager`.

---

## Auth token lifecycle

1. `POST /auth/login` — password check → if MFA required: set `mfa_pending` cookie, return challenge status. Else: set `access_token` + `refresh_token` cookies.
2. `POST /auth/mfa/verify` — reads `mfa_pending` cookie, verifies TOTP → clears `mfa_pending`, sets `access_token` + `refresh_token`.
3. On `TOKEN_EXPIRED`: `api.js` interceptor auto-calls `POST /auth/refresh`, retries original request.
4. All tokens via httpOnly cookies — nothing in localStorage except the user profile object.
