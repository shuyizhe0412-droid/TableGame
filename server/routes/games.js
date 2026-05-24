/**
 * 桌游路由 - 增删改查
 */
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// 所有路由都需要认证
router.use(authMiddleware);

// GET /api/games - 获取游戏列表
router.get('/', (req, res) => {
  try {
    var { page, pageSize, category, difficulty, min_players, max_players, keyword, sort } = req.query;

    page = parseInt(page) || 1;
    pageSize = parseInt(pageSize) || 100;
    var offset = (page - 1) * pageSize;

    // 构建查询条件
    var conditions = ['g.store_id = ?'];
    var params = [req.store.id];

    if (category) {
      conditions.push('g.category = ?');
      params.push(category);
    }
    if (difficulty) {
      conditions.push('g.difficulty = ?');
      params.push(parseInt(difficulty));
    }
    if (min_players !== undefined) {
      conditions.push('g.max_players >= ?');
      params.push(parseInt(min_players));
    }
    if (max_players !== undefined) {
      conditions.push('g.min_players <= ?');
      params.push(parseInt(max_players));
    }
    if (keyword) {
      conditions.push("g.name LIKE ?");
      params.push('%' + keyword + '%');
    }

    var whereClause = conditions.join(' AND ');

    // 排序
    var orderBy = 'g.created_at DESC';
    switch (sort) {
      case 'name': orderBy = 'g.name ASC'; break;
      case 'difficulty': orderBy = 'g.difficulty ASC'; break;
      case 'duration': orderBy = 'g.duration ASC'; break;
      case 'rating': orderBy = 'g.rating DESC'; break;
      case 'price': orderBy = 'g.price ASC'; break;
    }

    // 查询总数
    var countRow = db.prepare('SELECT COUNT(*) as total FROM store_games g WHERE ' + whereClause).get(...params);
    var total = countRow.total;

    // 查询列表
    var games = db.prepare(
      'SELECT g.*, (SELECT COUNT(*) FROM game_files f WHERE f.game_id = g.id) as file_count ' +
      'FROM store_games g WHERE ' + whereClause +
      ' ORDER BY ' + orderBy +
      ' LIMIT ? OFFSET ?'
    ).all(...params, pageSize, offset);

    res.json(games);
  } catch (err) {
    console.error('[GAMES] 列表查询失败:', err.message);
    res.status(500).json({ error: '查询失败' });
  }
});

// GET /api/games/:id - 获取游戏详情
router.get('/:id', (req, res) => {
  try {
    var game = db.prepare(
      'SELECT * FROM store_games WHERE id = ? AND store_id = ?'
    ).get(req.params.id, req.store.id);

    if (!game) {
      return res.status(404).json({ error: '游戏不存在' });
    }

    // 查询关联文件
    var files = db.prepare(
      'SELECT * FROM game_files WHERE game_id = ? ORDER BY created_at DESC'
    ).all(req.params.id);

    res.json({ game, files });
  } catch (err) {
    console.error('[GAMES] 详情查询失败:', err.message);
    res.status(500).json({ error: '查询失败' });
  }
});

// POST /api/games - 创建游戏
router.post('/', (req, res) => {
  try {
    var { name, category, description, min_players, max_players, duration, difficulty, price, stock, cover_image } = req.body;

    if (!name) {
      return res.status(400).json({ error: '游戏名称为必填项' });
    }

    var id = uuidv4();

    db.prepare(`
      INSERT INTO store_games (id, store_id, name, category, description, min_players, max_players, duration, difficulty, price, stock, cover_image)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, req.store.id, name,
      category || '', description || '',
      parseInt(min_players) || 1, parseInt(max_players) || 10,
      parseInt(duration) || 30, parseInt(difficulty) || 2,
      parseFloat(price) || 0, parseInt(stock) || 0,
      cover_image || ''
    );

    console.log('[GAMES] 创建游戏:', name, '| 店家:', req.store.store_name);

    var game = db.prepare('SELECT * FROM store_games WHERE id = ?').get(id);

    res.status(201).json({ message: '创建成功', game });
  } catch (err) {
    console.error('[GAMES] 创建失败:', err.message);
    res.status(500).json({ error: '创建失败' });
  }
});

// PUT /api/games/:id - 更新游戏
router.put('/:id', (req, res) => {
  try {
    // 验证所有权
    var existing = db.prepare('SELECT * FROM store_games WHERE id = ? AND store_id = ?').get(req.params.id, req.store.id);
    if (!existing) {
      return res.status(404).json({ error: '游戏不存在或无权修改' });
    }

    var { name, category, description, min_players, max_players, duration, difficulty, price, stock, cover_image } = req.body;

    // 合并更新
    var updated = {
      name: name !== undefined ? name : existing.name,
      category: category !== undefined ? category : existing.category,
      description: description !== undefined ? description : existing.description,
      min_players: min_players !== undefined ? parseInt(min_players) : existing.min_players,
      max_players: max_players !== undefined ? parseInt(max_players) : existing.max_players,
      duration: duration !== undefined ? parseInt(duration) : existing.duration,
      difficulty: difficulty !== undefined ? parseInt(difficulty) : existing.difficulty,
      price: price !== undefined ? parseFloat(price) : existing.price,
      stock: stock !== undefined ? parseInt(stock) : existing.stock,
      cover_image: cover_image !== undefined ? cover_image : existing.cover_image
    };

    db.prepare(`
      UPDATE store_games SET
        name = ?, category = ?, description = ?, min_players = ?, max_players = ?,
        duration = ?, difficulty = ?, price = ?, stock = ?, cover_image = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      updated.name, updated.category, updated.description,
      updated.min_players, updated.max_players, updated.duration,
      updated.difficulty, updated.price, updated.stock,
      updated.cover_image, req.params.id
    );

    console.log('[GAMES] 更新游戏:', updated.name);

    var game = db.prepare('SELECT * FROM store_games WHERE id = ?').get(req.params.id);

    res.json({ message: '更新成功', game });
  } catch (err) {
    console.error('[GAMES] 更新失败:', err.message);
    res.status(500).json({ error: '更新失败' });
  }
});

// DELETE /api/games/:id - 删除游戏
router.delete('/:id', (req, res) => {
  try {
    var existing = db.prepare('SELECT * FROM store_games WHERE id = ? AND store_id = ?').get(req.params.id, req.store.id);
    if (!existing) {
      return res.status(404).json({ error: '游戏不存在或无权删除' });
    }

    // 外键级联删除会自动删除关联的 game_files
    db.prepare('DELETE FROM store_games WHERE id = ?').run(req.params.id);

    console.log('[GAMES] 删除游戏:', existing.name);

    res.json({ message: '删除成功' });
  } catch (err) {
    console.error('[GAMES] 删除失败:', err.message);
    res.status(500).json({ error: '删除失败' });
  }
});

module.exports = router;