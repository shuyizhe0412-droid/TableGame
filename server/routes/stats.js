/**
 * 统计路由 - 热度排行等统计数据
 */
const express = require('express');
const supabase = require('../config/supabase');

const router = express.Router();

/**
 * GET /api/stats/hot-games?shopId=xxx
 * 桌游热度排行（扫码次数 TOP 10）
 * 如果 shopId 为空，查所有店家的总数据
 */
router.get('/hot-games', async (req, res) => {
  try {
    const { shopId } = req.query;

    // 1. 查询 scan_logs，按 game_id 分组计数
    //    Supabase JS 客户端不支持 GROUP BY，分两步：先取数据，再在 JS 里聚合
    let query = supabase
      .from('scan_logs')
      .select('game_id, shop_id');

    if (shopId) {
      query = query.eq('shop_id', shopId);
    }

    const { data: scanData, error: scanError } = await query;
    if (scanError) throw scanError;

    if (!scanData || scanData.length === 0) {
      return res.json([]);
    }

    // 2. 按 game_id 计数
    const countMap = {};
    for (const row of scanData) {
      countMap[row.game_id] = (countMap[row.game_id] || 0) + 1;
    }

    // 3. 排序取前 10
    const sorted = Object.entries(countMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const gameIds = sorted.map(([id]) => id);

    // 4. 批量查游戏名称（store_games）
    const { data: games, error: gameError } = await supabase
      .from('store_games')
      .select('id, name')
      .in('id', gameIds);

    if (gameError) throw gameError;

    const nameMap = {};
    (games || []).forEach(g => {
      nameMap[g.id] = g.name;
    });

    // 5. 组装结果（保持排序）
    const result = sorted.map(([gameId, scanCount]) => ({
      game_id: gameId,
      game_name: nameMap[gameId] || '未知游戏',
      scan_count: scanCount
    }));

    res.json(result);
  } catch (err) {
    console.error('[STATS] 获取热度排行失败:', err.message);
    res.status(500).json({ error: '获取失败' });
  }
});

module.exports = router;
