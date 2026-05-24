/**
 * 管理后台路由 - 全局默认桌游管理
 * （测试阶段不需要管理员鉴权）
 */
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

const router = express.Router();

// GET /api/admin/global-games - 获取所有全局默认桌游
router.get('/global-games', (req, res) => {
  try {
    const games = db.prepare('SELECT * FROM global_games ORDER BY created_at DESC').all();
    res.json(games);
  } catch (err) {
    console.error('[ADMIN] 获取全局桌游失败:', err.message);
    res.status(500).json({ error: '获取失败' });
  }
});

// POST /api/admin/global-games - 添加全局默认桌游
router.post('/global-games', (req, res) => {
  try {
    const { game_name, cover_url, player_min, player_max, duration, difficulty, tags } = req.body;

    if (!game_name) {
      return res.status(400).json({ error: '游戏名称为必填项' });
    }

    const id = uuidv4();

    db.prepare(`
      INSERT INTO global_games (id, game_name, cover_url, player_min, player_max, duration, difficulty, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      game_name,
      cover_url || '',
      parseInt(player_min) || 1,
      parseInt(player_max) || 10,
      parseInt(duration) || 30,
      parseInt(difficulty) || 2,
      tags || ''
    );

    console.log('[ADMIN] 添加全局桌游:', game_name);

    const game = db.prepare('SELECT * FROM global_games WHERE id = ?').get(id);

    res.status(201).json({ message: '添加成功', game });
  } catch (err) {
    console.error('[ADMIN] 添加全局桌游失败:', err.message);
    res.status(500).json({ error: '添加失败' });
  }
});

module.exports = router;