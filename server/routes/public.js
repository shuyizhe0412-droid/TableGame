/**
 * 公开接口路由 - 消费者端（玩家端）调用，无需认证
 */
const express = require('express');
const supabase = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

/**
 * GET /api/public/games/:storeId
 * 获取指定店家的所有桌游
 * 返回格式与 GET /api/admin/global-games 一致（数组）
 */
router.get('/games/:storeId', async (req, res) => {
  try {
    const { data: games, error } = await supabase
      .from('store_games')
      .select('id, name, category, description, min_players, max_players, duration, difficulty, cover_image, tags, source')
      .eq('store_id', req.params.storeId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(games || []);
  } catch (err) {
    console.error('[PUBLIC] 获取桌游列表失败:', err.message);
    res.status(500).json({ error: '获取失败' });
  }
});

/**
 * GET /api/public/game/:id
 * 获取单个桌游详情
 * 返回格式与 GET /api/admin/global-games/:id 一致（单个对象）
 */
router.get('/game/:id', async (req, res) => {
  try {
    const { data: games, error } = await supabase
      .from('store_games')
      .select('*')
      .eq('id', req.params.id)
      .limit(1);

    if (error) throw error;
    if (!games || games.length === 0) {
      return res.status(404).json({ error: '游戏不存在' });
    }
    res.json(games[0]);
  } catch (err) {
    console.error('[PUBLIC] 获取桌游详情失败:', err.message);
    res.status(500).json({ error: '获取失败' });
  }
});


/**
 * GET /api/public/shop/:shopId
 * 获取店家公开信息（无需认证）
 */
router.get('/shop/:shopId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('stores')
      .select('id, store_name, avatar')
      .eq('id', req.params.shopId)
      .limit(1);

    if (error) throw error;
    if (!data || data.length === 0) {
      return res.status(404).json({ error: '店铺不存在' });
    }
    res.json(data[0]);
  } catch (err) {
    console.error('[PUBLIC] 获取店铺信息失败:', err.message);
    res.status(500).json({ error: '获取失败' });
  }
});


/** GET /api/public/all-games
 * 获取所有店家的游戏（用于C端无storeId时的兜底）
 */
router.get('/all-games', async (req, res) => {
  try {
    const { data: games, error } = await supabase
      .from('store_games')
      .select('id, name, game_name, category, description, min_players, max_players, duration, difficulty, cover_image, tags, store_id')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // 归一化字段名
    const normalized = (games || []).map(g => ({
      ...g,
      name: g.name || g.game_name,
      min_players: g.min_players || g.player_min || 2,
      max_players: g.max_players || g.player_max || 4,
      play_time: g.play_time || g.duration || 30,
      cover: g.cover_image || g.cover_url || ''
    }));

    res.json(normalized);
  } catch (err) {
    console.error('[PUBLIC] 获取全部游戏失败:', err.message);
    res.status(500).json({ error: '获取失败' });
  }
});


/**
 * POST /api/public/scan
 * 记录扫码事件（无需认证）
 * Body: { game_id, shop_id }
 */
router.post('/scan', async (req, res) => {
  try {
    const { game_id, shop_id } = req.body;
    if (!game_id || !shop_id) {
      return res.status(400).json({ error: '缺少 game_id 或 shop_id' });
    }
    const id = uuidv4();
    const { error } = await supabase
      .from('scan_logs')
      .insert([{ id, game_id, shop_id, created_at: new Date().toISOString() }]);
    if (error) throw error;
    res.status(201).json({ message: 'ok' });
  } catch (err) {
    console.error('[PUBLIC] 扫码记录失败:', err.message);
    res.status(500).json({ error: '记录失败' });
  }
});


// ============ AI 对话持久化 ============

/**
 * POST /api/public/conversations
 * 保存对话消息（无需认证，用于C端页面持久化）
 * Body: { store_id, game_id, session_id, role, content }
 */
router.post('/conversations', async (req, res) => {
  try {
    const { store_id, game_id, session_id, role, content } = req.body;
    if (!session_id || !role || !content) {
      return res.status(400).json({ error: '缺少必要参数' });
    }
    const id = uuidv4();
    const { error } = await supabase
      .from('ai_conversations')
      .insert([{
        id,
        store_id: store_id || '',
        game_id: game_id || '',
        session_id,
        role,
        content,
        created_at: new Date().toISOString()
      }]);
    if (error) throw error;
    res.status(201).json({ message: 'ok' });
  } catch (err) {
    console.error('[PUBLIC] 保存对话失败:', err.message);
    res.status(500).json({ error: '保存失败' });
  }
});

/**
 * GET /api/public/conversations/:sessionId
 * 获取会话的对话历史（无需认证）
 */
router.get('/conversations/:sessionId', async (req, res) => {
  try {
    const { data: msgs, error } = await supabase
      .from('ai_conversations')
      .select('role, content, created_at')
      .eq('session_id', req.params.sessionId)
      .order('created_at', { ascending: true })
      .limit(50);
    if (error) throw error;
    res.json(msgs || []);
  } catch (err) {
    console.error('[PUBLIC] 获取对话失败:', err.message);
    res.status(500).json({ error: '获取失败' });
  }
});


module.exports = router;


