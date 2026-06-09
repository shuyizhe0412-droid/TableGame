const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'boardgame_store_secret_2024';

/**
 * 玩家 JWT 认证中间件
 * 从 Authorization header 提取 Bearer token，验证后挂载 req.player
 */
module.exports = function playerAuthMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({ error: '未提供认证令牌，请先登录' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: '令牌格式错误，应为: Bearer <token>' });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // decoded = { id, email, nickname, role: 'player', iat, exp }
    req.player = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: '令牌已过期，请重新登录' });
    }
    return res.status(401).json({ error: '令牌无效' });
  }
};
