/**
 * 数据库配置 - SQLite
 */

const Database = require('better-sqlite3');
const path = require('path');

// 数据库文件路径
const DB_PATH = path.join(__dirname, '..', 'database.db');

// 创建/连接数据库
const db = new Database(DB_PATH);

// 启用 WAL 模式提升并发性能
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ============ 自动建表 ============

// 店家表
db.exec(`
  CREATE TABLE IF NOT EXISTS stores (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    store_name TEXT NOT NULL,
    phone TEXT DEFAULT '',
    address TEXT DEFAULT '',
    avatar TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )
`);

// 桌游表（归属店家）
db.exec(`
  CREATE TABLE IF NOT EXISTS store_games (
    id TEXT PRIMARY KEY,
    store_id TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT DEFAULT '',
    description TEXT DEFAULT '',
    min_players INTEGER DEFAULT 1,
    max_players INTEGER DEFAULT 10,
    duration INTEGER DEFAULT 30,
    difficulty INTEGER DEFAULT 2,
    price REAL DEFAULT 0,
    stock INTEGER DEFAULT 0,
    rating REAL DEFAULT 0,
    cover_image TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
  )
`);

// 文件表（规则书、封面图等）
db.exec(`
  CREATE TABLE IF NOT EXISTS game_files (
    id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL,
    store_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (game_id) REFERENCES store_games(id) ON DELETE CASCADE,
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
  )
`);

// ============ 迁移：为 store_games 新增字段 ============
try {
  db.exec(`ALTER TABLE store_games ADD COLUMN source TEXT DEFAULT 'custom'`);
  console.log('[DB] 已添加 store_games.source 字段');
} catch (e) {
  // 字段已存在则忽略
}
try {
  db.exec(`ALTER TABLE store_games ADD COLUMN tags TEXT DEFAULT ''`);
  console.log('[DB] 已添加 store_games.tags 字段');
} catch (e) {
  // 字段已存在则忽略
}

// ============ 全局默认桌游表 ============
db.exec(`
  CREATE TABLE IF NOT EXISTS global_games (
    id TEXT PRIMARY KEY,
    game_name TEXT NOT NULL,
    cover_url TEXT DEFAULT '',
    player_min INTEGER DEFAULT 1,
    player_max INTEGER DEFAULT 10,
    duration INTEGER DEFAULT 30,
    difficulty INTEGER DEFAULT 2,
    tags TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

// 创建索引
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_store_games_store ON store_games(store_id);
  CREATE INDEX IF NOT EXISTS idx_store_games_category ON store_games(category);
  CREATE INDEX IF NOT EXISTS idx_game_files_game ON game_files(game_id);
  CREATE INDEX IF NOT EXISTS idx_game_files_store ON game_files(store_id);
  CREATE INDEX IF NOT EXISTS idx_global_games_name ON global_games(game_name);
`);

console.log('[DB] SQLite 数据库初始化完成:', DB_PATH);

module.exports = db;