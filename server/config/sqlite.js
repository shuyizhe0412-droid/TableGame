/**
 * SQLite 本地数据库客户端
 * 提供与 Supabase 兼容的查询接口
 * 用于 local/development 环境
 */

const Database = require(`better-sqlite3`);
const path = require(`path`);

const dbPath = process.env.SQLITE_PATH || path.join(__dirname, `..`, `database.db`);

console.log(`[SQLITE] 打开数据库: ${dbPath}`);

const db = new Database(dbPath);

// 启用 WAL 模式提升并发性能
db.pragma(`journal_mode = WAL`);
db.pragma(`foreign_keys = ON`);

// ============ 表结构自动初始化 ============
// 注意：不会覆盖已有表，仅补建缺失的表
db.exec(`
  CREATE TABLE IF NOT EXISTS stores (
    id TEXT PRIMARY KEY,
    store_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT,
    updated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS global_games (
    id TEXT PRIMARY KEY,
    game_name TEXT NOT NULL UNIQUE,
    cover_url TEXT DEFAULT \`\`,
    player_min INTEGER DEFAULT 2,
    player_max INTEGER DEFAULT 4,
    duration INTEGER DEFAULT 60,
    difficulty INTEGER DEFAULT 3,
    tags TEXT DEFAULT \`\`,
    created_at TEXT
  );

  CREATE TABLE IF NOT EXISTS store_games (
    id TEXT PRIMARY KEY,
    store_id TEXT NOT NULL,
    game_name TEXT NOT NULL,
    cover_url TEXT DEFAULT \`\`,
    player_min INTEGER,
    player_max INTEGER,
    duration INTEGER,
    difficulty INTEGER,
    tags TEXT DEFAULT \`\`,
    status TEXT DEFAULT \`available\`,
    added_at TEXT,
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS game_sessions (
    id TEXT PRIMARY KEY,
    store_id TEXT NOT NULL,
    game_name TEXT NOT NULL,
    table_number TEXT DEFAULT \`\`,
    start_time TEXT,
    end_time TEXT,
    status TEXT DEFAULT \`active\`,
    created_at TEXT,
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS ai_conversations (
    id TEXT PRIMARY KEY,
    store_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT,
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS uploaded_files (
    id TEXT PRIMARY KEY,
    store_id TEXT NOT NULL,
    original_name TEXT NOT NULL,
    stored_name TEXT NOT NULL,
    mime_type TEXT,
    size INTEGER,
    url TEXT NOT NULL,
    created_at TEXT,
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
  );
`);

console.log(`[SQLITE] 数据库表结构已就绪`);

// ============ Supabase 兼容查询接口 ============
function createQueryBuilder(table) {
  return {
    _table: table,
    _select: `*`,
    _where: [],
    _params: [],
    _orderBy: null,
    _orderDir: `ASC`,
    _limit: null,
    _offset: null,
    _single: false,
    _count: null,

    select(columns = `*`, opts) {
      this._select = columns;
      if (opts && opts.count === `exact` && opts.head) {
        this._count = true;
      }
      return this;
    },

    eq(column, value) {
      this._where.push(`${column} = ?`);
      this._params.push(value);
      return this;
    },

    neq(column, value) {
      this._where.push(`${column} != ?`);
      this._params.push(value);
      return this;
    },

    order(column, opts = {}) {
      this._orderBy = column;
      this._orderDir = (opts.ascending === false) ? `DESC` : `ASC`;
      return this;
    },

    limit(n) {
      this._limit = n;
      return this;
    },

    range(start, end) {
      this._offset = start;
      this._limit = end - start + 1;
      return this;
    },

    single() {
      this._single = true;
      this._limit = 1;
      return this;
    },

    _buildSelect() {
      let sql = `SELECT ${this._select} FROM ${this._table}`;
      if (this._where.length > 0) {
        sql += ` WHERE ` + this._where.join(` AND `);
      }
      if (this._orderBy) {
        sql += ` ORDER BY ${this._orderBy} ${this._orderDir}`;
      }
      if (this._limit !== null) {
        sql += ` LIMIT ${this._limit}`;
      }
      if (this._offset !== null) {
        sql += ` OFFSET ${this._offset}`;
      }
      return sql;
    },

    async then(resolve, reject) {
      try {
        const sql = this._buildSelect();
        if (this._count && this._single) {
          const countSql = sql.replace(/SELECT .*? FROM/, `SELECT COUNT(*) as count FROM`);
          const row = db.prepare(countSql).get(...this._params);
          resolve({ data: null, count: row ? row.count : 0, error: null });
        } else if (this._single) {
          const row = db.prepare(sql).get(...this._params);
          resolve({ data: row || null, error: null });
        } else {
          const rows = db.prepare(sql).all(...this._params);
          resolve({ data: rows, error: null });
        }
      } catch (error) {
        resolve({ data: null, error });
      }
    }
  };
}

async function insert(table, rows) {
  try {
    if (!Array.isArray(rows)) rows = [rows];
    const columns = Object.keys(rows[0]);
    const placeholders = columns.map(() => `?`).join(`, `);
    const sql = `INSERT INTO ${table} (${columns.join(`, `)}) VALUES (${placeholders})`;
    const stmt = db.prepare(sql);
    const insertAll = db.transaction((items) => {
      for (const row of items) {
        stmt.run(...columns.map(c => row[c]));
      }
    });
    insertAll(rows);
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

function createUpdateBuilder(table) {
  return {
    _table: table,
    _sets: {},
    _where: [],
    _params: [],

    set(updates) {
      Object.assign(this._sets, updates);
      return this;
    },

    eq(column, value) {
      this._where.push(`${column} = ?`);
      this._params.push(value);
      return this;
    },

    _buildUpdate() {
      const setClauses = Object.keys(this._sets).map(k => `${k} = ?`);
      const allParams = [...Object.values(this._sets), ...this._params];
      let sql = `UPDATE ${this._table} SET ${setClauses.join(`, `)}`;
      if (this._where.length > 0) {
        sql += ` WHERE ` + this._where.join(` AND `);
      }
      return { sql, params: allParams };
    },

    async then(resolve) {
      try {
        const { sql, params } = this._buildUpdate();
        const result = db.prepare(sql).run(...params);
        resolve({ data: result, error: null });
      } catch (error) {
        resolve({ data: null, error });
      }
    }
  };
}

function createDeleteBuilder(table) {
  return {
    _table: table,
    _where: [],
    _params: [],

    eq(column, value) {
      this._where.push(`${column} = ?`);
      this._params.push(value);
      return this;
    },

    async then(resolve) {
      try {
        let sql = `DELETE FROM ${this._table}`;
        if (this._where.length > 0) {
          sql += ` WHERE ` + this._where.join(` AND `);
        }
        db.prepare(sql).run(...this._params);
        resolve({ data: null, error: null });
      } catch (error) {
        resolve({ data: null, error });
      }
    }
  };
}

const sqliteClient = {
  from(table) {
    return createQueryBuilder(table);
  },
  insert,
  update(table) {
    return createUpdateBuilder(table);
  },
  delete(table) {
    return createDeleteBuilder(table);
  },
  prepare(sql) {
    return db.prepare(sql);
  },
  transaction(fn) {
    return db.transaction(fn);
  }
};

module.exports = sqliteClient;
