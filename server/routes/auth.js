/**
 * 认证路由 - 店家注册/登录
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'boardgame_store_secret_2024';
const TOKEN_EXPIRES = '7d';

// POST /api/auth/register - 店家注册
router.post('/register', (req, res) => {
  try {
    const { email, password, store_name, phone, address } = req.body;

    // 校验
    if (!email || !password || !store_name) {
      return res.status(400).json({ error: '邮箱、密码和店名为必填项' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: '密码至少6位' });
    }

    // 检查是否已注册
    const existing = db.prepare('SELECT id FROM stores WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ error: '该邮箱已注册' });
    }

    // 创建店家
    const id = uuidv4();
    const password_hash = bcrypt.hashSync(password, 10);

    db.prepare(`
      INSERT INTO stores (id, email, password_hash, store_name, phone, address)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, email, password_hash, store_name, phone || '', address || '');

    console.log('[AUTH] 新店家注册:', email, store_name);

    // 自动复制全局默认桌游到新店家的游戏列表
    const globalGames = db.prepare('SELECT * FROM global_games').all();
    if (globalGames.length > 0) {
      const insertStmt = db.prepare(`
        INSERT INTO store_games (id, store_id, name, cover_image, min_players, max_players, duration, difficulty, tags, source)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const copyMany = db.transaction((games) => {
        for (const g of games) {
          insertStmt.run(
            uuidv4(), id, g.game_name, g.cover_url,
            g.player_min, g.player_max, g.duration, g.difficulty,
            g.tags, 'default'
          );
        }
      });

      copyMany(globalGames);
      console.log('[AUTH] 已为新店家复制', globalGames.length, '款默认桌游');
    }

    // 返回 JWT
    const token = jwt.sign(
      { id, email, store_name },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRES }
    );

    res.status(201).json({
      message: '注册成功',
      token,
      store: { id, email, store_name, phone: phone || '', address: address || '' }
    });
  } catch (err) {
    console.error('[AUTH] 注册失败:', err.message);
    res.status(500).json({ error: '注册失败，请稍后重试' });
  }
});

// POST /api/auth/login - 店家登录
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: '邮箱和密码为必填项' });
    }

    // 查找用户
    const store = db.prepare('SELECT * FROM stores WHERE email = ?').get(email);
    if (!store) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }

    // 验证密码
    const valid = bcrypt.compareSync(password, store.password_hash);
    if (!valid) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }

    console.log('[AUTH] 店家登录:', email);

    const token = jwt.sign(
      { id: store.id, email: store.email, store_name: store.store_name },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRES }
    );

    res.json({
      message: '登录成功',
      token,
      store: {
        id: store.id,
        email: store.email,
        store_name: store.store_name,
        phone: store.phone,
        address: store.address,
        avatar: store.avatar
      }
    });
  } catch (err) {
    console.error('[AUTH] 登录失败:', err.message);
    res.status(500).json({ error: '登录失败，请稍后重试' });
  }
});

// GET /api/auth/me - 获取当前店家信息（需认证）
router.get('/me', authMiddleware, (req, res) => {
  try {
    const store = db.prepare(
      'SELECT id, email, store_name, phone, address, avatar, created_at FROM stores WHERE id = ?'
    ).get(req.store.id);

    if (!store) {
      return res.status(404).json({ error: '店家不存在' });
    }

    // 统计
    const gameCount = db.prepare('SELECT COUNT(*) as count FROM store_games WHERE store_id = ?').get(req.store.id);
    const fileCount = db.prepare('SELECT COUNT(*) as count FROM game_files WHERE store_id = ?').get(req.store.id);

    // 扁平返回，兼容前端直接读取 store_name / id
    res.json({
      id: store.id,
      email: store.email,
      store_name: store.store_name,
      phone: store.phone,
      address: store.address,
      avatar: store.avatar,
      created_at: store.created_at,
      game_count: gameCount.count,
      file_count: fileCount.count
    });
  } catch (err) {
    console.error('[AUTH] 获取信息失败:', err.message);
    res.status(500).json({ error: '获取信息失败' });
  }
});

// PUT /api/auth/update-profile - 更新店铺名称（需认证）
router.put('/update-profile', authMiddleware, (req, res) => {
  try {
    const { store_name } = req.body;

    if (!store_name || !store_name.trim()) {
      return res.status(400).json({ error: '店铺名称不能为空' });
    }

    if (store_name.length > 50) {
      return res.status(400).json({ error: '店铺名称不能超过50个字符' });
    }

    db.prepare('UPDATE stores SET store_name = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .run(store_name.trim(), req.store.id);

    console.log('[AUTH] 更新店铺名称:', req.store.email, '→', store_name.trim());

    const store = db.prepare(
      'SELECT id, email, store_name, phone, address, avatar, created_at, updated_at FROM stores WHERE id = ?'
    ).get(req.store.id);

    res.json({
      message: '更新成功',
      store: store
    });
  } catch (err) {
    console.error('[AUTH] 更新店铺信息失败:', err.message);
    res.status(500).json({ error: '更新失败' });
  }
});

module.exports = router;