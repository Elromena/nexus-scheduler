// Cloudflare Workers environment types
interface CloudflareEnv {
  // SQLite Database binding
  DB: D1Database;
  
  // Environment variables
  HUBSPOT_ACCESS_TOKEN: string;
  GOOGLE_SERVICE_ACCOUNT: string;
  GOOGLE_CALENDAR_EMAIL?: string; // Optional - can be set in admin settings
  ADMIN_PASSWORD: string;
  DEBUG_LOGGING?: string;
  APP_URL?: string;
  RESEND_API_KEY?: string; // For sending verification emails
}

// D1 Database types
interface D1Database {
  prepare(query: string): D1PreparedStatement;
  dump(): Promise<ArrayBuffer>;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<D1ExecResult>;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run<T = unknown>(): Promise<D1Result<T>>;
  all<T = unknown>(): Promise<D1Result<T>>;
  raw<T = unknown>(): Promise<T[]>;
}

interface D1Result<T = unknown> {
  results?: T[];
  success: boolean;
  error?: string;
  meta: {
    duration: number;
    changes: number;
    last_row_id: number;
    rows_read: number;
    rows_written: number;
  };
}

interface D1ExecResult {
  count: number;
  duration: number;
}
