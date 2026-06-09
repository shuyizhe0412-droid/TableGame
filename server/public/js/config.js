/**
 * 桌游AI教练 - 配置文件
 * 支持根据域名自动切换环境（production / staging / local）
 */

// ==================== 环境检测 ====================
function detectEnv() {
    var hostname = window.location.hostname;
    var protocol = window.location.protocol;
    // 本地文件打开（file://）→ 本地开发
    if (protocol === 'file:') return 'local';
    // 生产域名
    if (hostname === 'boardgame-hub-deploy.pages.dev') return 'production';
    if (hostname === 'boardgame-ai.pages.dev') return 'production';
    // Staging 域名
    if (hostname === 'boardgame-hub-staging.onrender.com') return 'staging';
    if (hostname.endsWith('.boardgame-hub-deploy.pages.dev') && hostname.indexOf('.') !== hostname.lastIndexOf('.')) return 'staging';
    if (hostname.indexOf('staging') !== -1) return 'staging';
    if (hostname === 'localhost' || hostname === '127.0.0.1') return 'local';
    // 默认当做 production
    return 'production';
}

function getApiBaseUrl(env) {
    var urls = {
        production: 'https://boardgame-hub-staging.onrender.com/api',
        staging:    'https://boardgame-hub-staging.onrender.com/api',
        local:      'http://localhost:3000/api'
    };
    return urls[env] || urls.production;
}

function getSupabaseUrl(env) {
    var urls = {
        production: 'https://ploumkvctjnfmrzyzfnw.supabase.co',
        staging:    'https://ploumkvctjnfmrzyzfnw.supabase.co',
        local:      'https://theaenpzcmydorhsjquf.supabase.co'
    };
    return urls[env] || urls.production;
}

function getSupabaseAnonKey(env) {
    var keys = {
        production: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsb3Vta3ZjdGpuZm1yenl6Zm53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2OTY3NjMsImV4cCI6MjA5NjI3Mjc2M30.RZUpW_3o2gVQPWxkrXWI4l6qsqOPRdJ9-jJh--ehOH8',
        staging:    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsb3Vta3ZjdGpuZm1yenl6Zm53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2OTY3NjMsImV4cCI6MjA5NjI3Mjc2M30.RZUpW_3o2gVQPWxkrXWI4l6qsqOPRdJ9-jJh--ehOH8',
        local:      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoZWFlbnB6Y215ZG9yaHNqcXVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNjM0MTcsImV4cCI6MjA5NDgzOTQxN30.r2sLp5nbpYzQRkeO6DmqlbcFGYOQ81UekxOm9S18O-g'
    };
    return keys[env] || keys.production;
}

// ==================== 环境变量 ====================
var ENV = detectEnv();

// 桌游管理后端 API（根据域名自动切换）
var API_BASE_URL = getApiBaseUrl(ENV);

// ==================== 全局配置对象 ====================
window.APP_CONFIG = {
    ENV: ENV,
    API_BASE_URL: API_BASE_URL
};

// ==================== 静态配置（所有环境共用） ====================

// Supabase 配置（根据域名自动切换生产和 staging 数据库）
const SUPABASE_URL = getSupabaseUrl(ENV);
const SUPABASE_ANON_KEY = getSupabaseAnonKey(ENV);

// DeepSeek API 配置
const DEEPSEEK_API_KEY = 'sk-0a0a3cd834d146dfa131604b1c95481b';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

// 调试：打印配置
console.log('[config.js] 当前环境:', ENV);
console.log('[config.js] API Base URL:', API_BASE_URL);
console.log('[config.js] Supabase URL:', SUPABASE_URL);
console.log('[config.js] APP_CONFIG:', JSON.stringify(window.APP_CONFIG));
