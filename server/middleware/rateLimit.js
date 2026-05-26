const rateLimit = require('express-rate-limit');

/**
 * 速率限制中间件配置
 * 
 * 注意：Render 免费版是单实例，内存存储有效
 * 以后扩到多实例时需要改用 Redis 存储
 */

// AI 接口限制（30次/分钟，测试期放宽）— 成本最高，风险最大
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'AI 请求太频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 注册接口限制（3次/分钟）
const registerLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  message: { error: '注册请求太频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 登录接口限制（5次/分钟）
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: '登录请求太频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 通用限制（100次/分钟，测试期放宽）— 兜底保护
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: '请求太频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  aiLimiter,
  registerLimiter,
  loginLimiter,
  generalLimiter,
};
