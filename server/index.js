/**
 * 桌游店家后台 - 主入口
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// 加载环境变量
// 本地开发：从 .env 文件读取
// Render 部署：环境变量由 Render Dashboard 直接注入 process.env
// dotenv 默认不会覆盖已存在的环境变量，所以 Render 上的设置是安全的
try {
  const result = require('dotenv').config({ quiet: true });
  if (result.parsed) {
    console.log('[ENV] 从 .env 文件加载了', Object.keys(result.parsed).length, '个变量');
  } else {
    console.log('[ENV] 未找到 .env 文件，将使用系统环境变量（Render 部署正常行为）');
  }
} catch {
  console.log('[ENV] dotenv 未安装或加载失败，将使用系统环境变量');
}

const app = express();
const PORT = process.env.PORT || 3000;

// ============ 中间件 ============
app.use(cors()); // 允许跨域
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件服务：前端页面
app.use(express.static(path.join(__dirname, 'public')));

// 静态文件服务：上传的文件
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 请求日志
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(`[${new Date().toLocaleString('zh-CN')}] ${req.method} ${req.originalUrl} → ${res.statusCode} (${ms}ms)`);
  });
  next();
});

// ============ 路由 ============
app.use('/api/auth', require('./routes/auth'));
app.use('/api/games', require('./routes/games'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/public', require('./routes/public'));
app.use('/api/stats', require('./routes/stats'));

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({ error: '接口不存在: ' + req.method + ' ' + req.originalUrl });
});

// 全局错误处理
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.stack);
  res.status(500).json({ error: err.message || '服务器内部错误' });
});

// ============ 启动服务 ============
const server = app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════╗');
  console.log('║     桌游店家后台 API 服务启动成功     ║');
  console.log('╠══════════════════════════════════════╣');
  console.log('║  地址: http://localhost:' + String(PORT).padEnd(22, ' ') + '║');
  console.log('║  健康检查: /api/health                  ║');
  console.log('║  上传目录: /uploads                     ║');
  console.log('╚══════════════════════════════════════╝');
  console.log('');
});

// 优雅退出
process.on('SIGINT', () => {
  console.log('\n正在关闭服务器...');
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});

module.exports = app;