/**
 * 认证路由 - 店家注册/登录（Supabase 版）
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'boardgame_store_secret_2024';
const TOKEN_EXPIRES = '7d';

// 辅助：查单行
async function getOne(table, column, value) {
  const { data, error } = await supabase
    .from(table).select('*').eq(column, value).limit(1);
  if (error) throw error;
  return (data && data.length > 0) ? data[0] : null;
}

// 辅助：COUNT
async function countRows(table, column, value) {
  const { count, error } = await supabase
    .from(table).select('*', { count: 'exact', head: true }).eq(column, value);
  if (error) throw error;
  return count;
}

// POST /api/auth/register - 店家注册
router.post('/register', async (req, res) => {
  try {
    const { email, password, store_name, phone, address } = req.body;

    if (!email || !password || !store_name) {
      return res.status(400).json({ error: '邮箱、密码和店名为必填项' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: '密码至少6位' });
    }

    // 检查重复邮箱
    const existing = await getOne('stores', 'email', email);
    if (existing) {
      return res.status(409).json({ error: '该邮箱已注册' });
    }

    // 创建店家
    const id = uuidv4();
    const password_hash = bcrypt.hashSync(password, 10);
    const storeData = { id, email, password_hash, store_name, phone: phone || '', address: address || '' };

    const { error: insertErr } = await supabase.from('stores').insert([storeData]);
    if (insertErr) throw insertErr;

    console.log('[AUTH] 新店家注册:', email, store_name, '| 不自动复制全局桌游，店家自行选择');

    const token = jwt.sign({ id, email, store_name }, JWT_SECRET, { expiresIn: TOKEN_EXPIRES });

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
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: '邮箱和密码为必填项' });
    }

    const store = await getOne('stores', 'email', email);
    if (!store) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }

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
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const store = await getOne('stores', 'id', req.store.id);
    if (!store) {
      return res.status(404).json({ error: '店家不存在' });
    }

    const gameCount = await countRows('store_games', 'store_id', req.store.id);
    const fileCount = await countRows('game_files', 'store_id', req.store.id);

    res.json({
      id: store.id,
      email: store.email,
      store_name: store.store_name,
      phone: store.phone,
      address: store.address,
      avatar: store.avatar,
      created_at: store.created_at,
      game_count: gameCount,
      file_count: fileCount
    });
  } catch (err) {
    console.error('[AUTH] 获取信息失败:', err.message);
    res.status(500).json({ error: '获取信息失败' });
  }
});

// PUT /api/auth/update-profile - 更新店铺名称（需认证）
router.put('/update-profile', authMiddleware, async (req, res) => {
  try {
    const { store_name } = req.body;

    if (!store_name || !store_name.trim()) {
      return res.status(400).json({ error: '店铺名称不能为空' });
    }
    if (store_name.length > 50) {
      return res.status(400).json({ error: '店铺名称不能超过50个字符' });
    }

    const { error: updErr } = await supabase
      .from('stores')
      .update({ store_name: store_name.trim(), updated_at: new Date().toISOString() })
      .eq('id', req.store.id);

    if (updErr) throw updErr;

    console.log('[AUTH] 更新店铺名称:', req.store.email, '→', store_name.trim());

    const store = await getOne('stores', 'id', req.store.id);

    res.json({ message: '更新成功', store });
  } catch (err) {
    console.error('[AUTH] 更新店铺信息失败:', err.message);
    res.status(500).json({ error: '更新失败' });
  }
});

// ============ 玩家认证 ============

const playerAuthMiddleware = require('../middleware/player-auth');

// POST /api/auth/player-register - 玩家注册
router.post('/player-register', async (req, res) => {
  try {
    const { email, password, nickname, phone } = req.body;

    if (!email || !password || !nickname) {
      return res.status(400).json({ error: '昵称、邮箱和密码为必填项' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: '密码至少6位' });
    }

    // 检查重复邮箱
    const existing = await getOne('players', 'email', email);
    if (existing) {
      return res.status(409).json({ error: '该邮箱已注册' });
    }

    // 创建玩家
    const id = uuidv4();
    const password_hash = bcrypt.hashSync(password, 10);
    const playerData = { id, email, password_hash, nickname: nickname.trim(), phone: phone || '', avatar: '' };

    const { error: insertErr } = await supabase.from('players').insert([playerData]);
    if (insertErr) throw insertErr;

    console.log('[AUTH] 新玩家注册:', email, nickname);

    const token = jwt.sign({ id, email, nickname, role: 'player' }, JWT_SECRET, { expiresIn: TOKEN_EXPIRES });

    res.status(201).json({
      message: '注册成功',
      token,
      player: { id, email, nickname: nickname.trim(), phone: phone || '' }
    });
  } catch (err) {
    console.error('[AUTH] 玩家注册失败:', err.message);
    res.status(500).json({ error: '注册失败，请稍后重试' });
  }
});

// POST /api/auth/player-login - 玩家登录
router.post('/player-login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: '邮箱和密码为必填项' });
    }

    const player = await getOne('players', 'email', email);
    if (!player) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }

    const valid = bcrypt.compareSync(password, player.password_hash);
    if (!valid) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }

    console.log('[AUTH] 玩家登录:', email);

    const token = jwt.sign(
      { id: player.id, email: player.email, nickname: player.nickname, role: 'player' },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRES }
    );

    res.json({
      message: '登录成功',
      token,
      player: {
        id: player.id,
        email: player.email,
        nickname: player.nickname,
        phone: player.phone,
        avatar: player.avatar
      }
    });
  } catch (err) {
    console.error('[AUTH] 玩家登录失败:', err.message);
    res.status(500).json({ error: '登录失败，请稍后重试' });
  }
});

// GET /api/auth/player-me - 获取当前玩家信息（需认证）
router.get('/player-me', playerAuthMiddleware, async (req, res) => {
  try {
    const player = await getOne('players', 'id', req.player.id);
    if (!player) {
      return res.status(404).json({ error: '玩家不存在' });
    }

    res.json({
      id: player.id,
      email: player.email,
      nickname: player.nickname,
      phone: player.phone,
      avatar: player.avatar,
      created_at: player.created_at
    });
  } catch (err) {
    console.error('[AUTH] 获取玩家信息失败:', err.message);
    res.status(500).json({ error: '获取信息失败' });
  }
});

module.exports = router;