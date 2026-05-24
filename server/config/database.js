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

// ============ 自动初始化全局默认桌游 ============
// 每次服务启动时检查，Render 重部署后 SQLite 清空会自动重建

const { randomUUID } = require('crypto');

const DEFAULT_GAMES = [
  // 策略类（8款）
  { game_name: '卡坦岛',     player_min: 3, player_max: 4,  duration: 60,  difficulty: 3, tags: '策略,交易' },
  { game_name: '璀璨宝石',   player_min: 2, player_max: 4,  duration: 30,  difficulty: 2, tags: '策略,收集' },
  { game_name: '卡卡颂',     player_min: 2, player_max: 5,  duration: 45,  difficulty: 2, tags: '家庭,策略' },
  { game_name: '七大奇迹',   player_min: 2, player_max: 7,  duration: 30,  difficulty: 3, tags: '策略,卡牌' },
  { game_name: '花砖物语',   player_min: 2, player_max: 4,  duration: 30,  difficulty: 2, tags: '策略,收集' },
  { game_name: '波多黎各',   player_min: 2, player_max: 5,  duration: 90,  difficulty: 4, tags: '策略,经营' },
  { game_name: '农场主',     player_min: 1, player_max: 4,  duration: 120, difficulty: 4, tags: '策略,经营' },
  { game_name: '银河竞逐',   player_min: 2, player_max: 4,  duration: 60,  difficulty: 4, tags: '策略,卡牌' },
  // 聚会/嘴炮类（6款）
  { game_name: '阿瓦隆',     player_min: 5, player_max: 10, duration: 30,  difficulty: 2, tags: '聚会,推理,嘴炮' },
  { game_name: '三国杀',     player_min: 4, player_max: 10, duration: 60,  difficulty: 3, tags: '聚会,推理' },
  { game_name: '风声',       player_min: 3, player_max: 9,  duration: 60,  difficulty: 3, tags: '聚会,推理,嘴炮' },
  { game_name: '狼人杀',     player_min: 6, player_max: 18, duration: 30,  difficulty: 2, tags: '聚会,推理' },
  { game_name: '抵抗组织',   player_min: 5, player_max: 10, duration: 30,  difficulty: 2, tags: '聚会,推理' },
  { game_name: '谁是卧底',   player_min: 4, player_max: 18, duration: 20,  difficulty: 1, tags: '聚会,派对' },
  // 推理/剧情类（3款）
  { game_name: '瘟疫危机',   player_min: 2, player_max: 4,  duration: 45,  difficulty: 3, tags: '合作,策略' },
  { game_name: '机密代号',   player_min: 4, player_max: 8,  duration: 15,  difficulty: 2, tags: '聚会,派对' },
  { game_name: '谋杀之谜',   player_min: 4, player_max: 8,  duration: 120, difficulty: 2, tags: '推理,剧情' },
  // 家庭/轻度类（5款）
  { game_name: '优诺',       player_min: 2, player_max: 10, duration: 30,  difficulty: 1, tags: '家庭,聚会' },
  { game_name: '拉密',       player_min: 2, player_max: 4,  duration: 60,  difficulty: 2, tags: '家庭,数字' },
  { game_name: '拼布对决',   player_min: 2, player_max: 2,  duration: 30,  difficulty: 2, tags: '家庭,策略' },
  { game_name: '多米诺王国', player_min: 2, player_max: 4,  duration: 20,  difficulty: 1, tags: '家庭,轻度' },
  { game_name: '卡坦骰子版', player_min: 2, player_max: 4,  duration: 30,  difficulty: 2, tags: '家庭,策略' },
  // 卡牌/集换类（3款）
  { game_name: '万智牌',     player_min: 2, player_max: 2,  duration: 60,  difficulty: 4, tags: '策略,竞技,集换式' },
  { game_name: '游戏王',     player_min: 2, player_max: 2,  duration: 40,  difficulty: 4, tags: '策略,竞技,集换式' },
  { game_name: '宝可梦集换式卡牌', player_min: 2, player_max: 2, duration: 30, difficulty: 3, tags: '策略,竞技,集换式' },
];

const existingCount = db.prepare('SELECT COUNT(*) as c FROM global_games').get().c;
if (existingCount === 0) {
  const insertStmt = db.prepare(
    'INSERT INTO global_games (id, game_name, cover_url, player_min, player_max, duration, difficulty, tags) ' +
    'VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const insertAll = db.transaction((games) => {
    for (const g of games) {
      insertStmt.run(randomUUID(), g.game_name, '', g.player_min, g.player_max, g.duration, g.difficulty, g.tags);
    }
  });
  insertAll(DEFAULT_GAMES);
  console.log('[DB] 自动初始化 global_games 完成，插入', DEFAULT_GAMES.length, '款默认桌游');
} else {
  console.log('[DB] global_games 已有', existingCount, '条数据，跳过自动初始化');
}

module.exports = db;