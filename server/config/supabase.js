/**
 * Supabase 客户端初始化
 * 环境变量：SUPABASE_URL、SUPABASE_KEY（使用 service_role key）
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('[SUPABASE] 缺少环境变量 SUPABASE_URL 或 SUPABASE_KEY');
  console.error('[SUPABASE] 请在 .env 中配置：');
  console.error('  SUPABASE_URL=https://xxx.supabase.co');
  console.error('  SUPABASE_KEY=<service_role_key>');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 健康检查（启动后测试连接）
supabase
  .from('stores')
  .select('id', { count: 'exact', head: true })
  .then(({ error }) => {
    if (error) {
      console.error('[SUPABASE] 连接失败:', error.message);
    } else {
      console.log('[SUPABASE] 连接成功:', supabaseUrl);
    }
  });

module.exports = supabase;
