DROP TABLE IF EXISTS hubspot_logs;

CREATE TABLE IF NOT EXISTS integration_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    provider TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    status INTEGER,
    request_body TEXT,
    response_body TEXT,
    error_message TEXT,
    duration INTEGER
);

CREATE INDEX IF NOT EXISTS idx_integration_logs_timestamp ON integration_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_integration_logs_provider ON integration_logs(provider);
CREATE INDEX IF NOT EXISTS idx_integration_logs_status ON integration_logs(status);
