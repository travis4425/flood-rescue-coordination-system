# ADR-0001: MFA enforced at login for admin and manager roles

**Status:** Decided
**Date:** 2026-05-01

## Context

CLAUDE.md and Thông tư 13/2023/TT-BTTTT require MFA for privileged accounts. The question was *when* and *how* to enforce it.

## Decision

MFA is mandatory-on-login for `admin` and `manager`. After password verification succeeds, if `mfa_enabled = false` the login is blocked with `MFA_SETUP_REQUIRED`. If `mfa_enabled = true` the login is blocked with `MFA_REQUIRED`. In both cases a short-lived `mfa_pending` httpOnly cookie (5 min) is set to authorize only `POST /auth/mfa/verify`.

Implementation details:
- Library: `speakeasy` (already referenced in project troubleshooting docs)
- Intermediate state: `mfa_pending` httpOnly cookie (not DB-backed)
- Schema: `mfa_secret VARCHAR(64)` + `mfa_enabled BOOLEAN DEFAULT false` added to `users` table via migration
- QR code: server returns `otpauth://` URI; client renders via `qrcode.react`
- Recovery: no recovery codes; admin resets MFA via `PUT /api/users/:id/reset-mfa`

## Alternatives considered

- **Opt-in with grace period:** rejected — no compliance justification for allowing privileged access without MFA, even temporarily.
- **Recovery codes:** deferred — adds storage/UI surface area; admin-reset covers the lost-device scenario for this deployment model.
- **Separate `user_mfa` table:** rejected — no multi-device or recovery-code requirements justify the extra join; `password_hash` precedent is to store auth secrets on the user row.

## Consequences

- First login for any existing `admin`/`manager` account will be blocked until MFA is set up.
- A migration (`002_mfa_columns.sql`) must run before deploying this change.
- Admin UI needs a "Reset MFA" action on the user management page.
