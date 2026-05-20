/**
 * 桌游AI教练 - 配置文件
 */

// Supabase 配置
const SUPABASE_URL = 'https://theaenpzcmydorhsjquf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoZWFlbnB6Y215ZG9yaHNqcXVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNjM0MTcsImV4cCI6MjA5NDgzOTQxN30.r2sLp5nbpYzQRkeO6DmqlbcFGYOQ81UekxOm9S18O-g';

// DeepSeek API 配置
const DEEPSEEK_API_KEY = 'sk-0a0a3cd834d146dfa131604b1c95481b';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

// 调试：打印配置
console.log('[config.js] Supabase URL:', SUPABASE_URL);
console.log('[config.js] Supabase Key 前20位:', SUPABASE_ANON_KEY.substring(0, 20) + '...');
