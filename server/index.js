/**
 * 桌游店家后台 - 主入口
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// 加载环境变量（如果有 .env 文件）
try {
  require('dotenv').config();
} catch {}

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