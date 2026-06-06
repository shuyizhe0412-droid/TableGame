/**
 * 数据库配置 - 多环境适配
 * local/development: SQLite
 * staging/production:  Supabase
 */

const env = require(`./env`);

if (env.db.useSQLite) {
  // ============ 本地环境：SQLite ============
  console.log(`[DB] 使用 SQLite 数据库: ${env.db.sqlitePath}`);
  module.exports = require(`./sqlite`);
} else {
  // ============ 云端环境：Supabase ============
  console.log(`[DB] 使用 Supabase 数据库`);
  module.exports = require(`./supabase`);
}
