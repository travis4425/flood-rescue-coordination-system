-- Migration: Add refresh_tokens table
-- Run once on existing database

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='refresh_tokens' AND xtype='U')
BEGIN
  CREATE TABLE refresh_tokens (
    id INT IDENTITY(1,1) PRIMARY KEY,
    token UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    user_id INT NOT NULL,
    expires_at DATETIME2 NOT NULL,
    revoked_at DATETIME2 NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_refresh_tokens_user FOREIGN KEY (user_id)
      REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE UNIQUE INDEX idx_refresh_token_token
    ON refresh_tokens(token) WHERE revoked_at IS NULL;

  CREATE INDEX idx_refresh_token_user
    ON refresh_tokens(user_id);

  PRINT 'Created refresh_tokens table';
END
ELSE
  PRINT 'refresh_tokens table already exists';
