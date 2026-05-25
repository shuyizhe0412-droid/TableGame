/**
 * Supabase 客户端初始化
 * 环境变量：SUPABASE_URL、SUPABASE_KEY（使用 service_role key）
 *   - 本地开发：通过 .env 文件或命令行设置
 *   - Render 部署：在 Dashboard → Environment 中设置
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
const supabaseKey = (process.env.SUPABASE_KEY || '').trim();

console.log('[SUPABASE] 环境变量检查:');
console.log('  SUPABASE_URL:', supabaseUrl ? '✅ 已设置' : '❌ 未设置');
console.log('  SUPABASE_KEY:', supabaseKey ? `✅ 已设置（长度 ${supabaseKey.length}）` : '❌ 未设置');

let supabase = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // 连接测试
  supabase
    .from('stores')
    .select('id', { count: 'exact', head: true })
    .then(({ error }) => {
      if (error) {
        console.error('[SUPABASE] 连接测试失败:', error.message);
        console.error('[SUPABASE] 错误详情:', JSON.stringify(error));
      } else {
        console.log('[SUPABASE] 连接成功:', supabaseUrl);
      }
    });
} else {
  console.error('[SUPABASE] 缺少环境变量，客户端未初始化');
  console.error('[SUPABASE] 请在 .env 文件或 Render Dashboard 中设置 SUPABASE_URL 和 SUPABASE_KEY');
  // 创建一个代理对象，返回友好的错误提示而非崩溃
  supabase = new Proxy({}, {
    get() {
      throw new Error('Supabase 客户端未初始化：请设置 SUPABASE_URL 和 SUPABASE_KEY 环境变量');
    }
  });
}

module.exports = supabase;