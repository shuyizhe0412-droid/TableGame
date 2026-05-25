/**
 * 公开接口路由 - 消费者端（玩家端）调用，无需认证
 */
const express = require('express');
const supabase = require('../config/supabase');

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

module.exports = router;
