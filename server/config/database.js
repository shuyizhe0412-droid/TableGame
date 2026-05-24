/**
 * 数据库配置 - Supabase（原 SQLite 已迁移）
 */

const supabase = require('./supabase');

// 不再需要本地 SQLite 初始化
// Supabase 表结构通过 SQL 在 Supabase Dashboard 执行
// 默认数据（global_games 的 25 款桌游）也通过 SQL 初始化

console.log('[DB] 使用 Supabase 数据库');

module.exports = supabase;
