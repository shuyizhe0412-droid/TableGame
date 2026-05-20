/**
 * 桌游AI教练 - 配置文件
 */

// Supabase 配置
const SUPABASE_URL = 'https://theaenpzcmydorhsjqf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoZWFlbnB6Y215ZG9yaHNqcWYiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY0ODEwMjQwMCwiZXhwIjoxOTYzNjc4NDAwfQ.1234567890abcdefghijklmnopqrstuvwxyz';

// DeepSeek API 配置（备用，当前通过 Edge Function 代理）
const DEEPSEEK_API_KEY = 'sk-0a0a3cd834d146dfa131604b1c95481b';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';