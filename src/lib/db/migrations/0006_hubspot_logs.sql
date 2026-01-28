CREATE TABLE IF NOT EXISTS hubspot_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    status INTEGER,
    request_body TEXT,
    response_body TEXT,
    error_message TEXT,
    duration INTEGER
);
CREATE INDEX IF NOT EXISTS idx_hubspot_logs_timestamp ON hubspot_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_hubspot_logs_status ON hubspot_logs(status);
