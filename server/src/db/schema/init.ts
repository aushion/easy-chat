export const initSql = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  nickname TEXT NOT NULL,
  avatar_file_id INTEGER NULL,
  register_ip TEXT NOT NULL UNIQUE,
  last_login_ip TEXT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  login_ip TEXT NOT NULL,
  user_agent TEXT NULL,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  expired_at TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_status ON user_sessions (user_id, status);

CREATE TABLE IF NOT EXISTS conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  name TEXT NULL,
  created_by INTEGER NOT NULL,
  private_key TEXT NULL UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_conversations_type_updated_at ON conversations (type, updated_at);

CREATE TABLE IF NOT EXISTS conversation_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TEXT NOT NULL,
  UNIQUE(conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_members_user_id ON conversation_members (user_id, joined_at);
CREATE INDEX IF NOT EXISTS idx_conversation_members_conversation_id ON conversation_members (conversation_id, joined_at);

CREATE TABLE IF NOT EXISTS files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  original_name TEXT NOT NULL,
  stored_name TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  uploaded_by INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_files_uploaded_by ON files (uploaded_by, created_at);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL,
  sender_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  content TEXT NULL,
  file_id INTEGER NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages (conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages (sender_id, created_at);

CREATE TABLE IF NOT EXISTS online_connections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  session_token TEXT NOT NULL,
  connection_id TEXT NOT NULL UNIQUE,
  connected_at TEXT NOT NULL,
  last_ping_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_online_connections_user_id ON online_connections (user_id);
CREATE INDEX IF NOT EXISTS idx_online_connections_last_ping_at ON online_connections (last_ping_at);
`;
