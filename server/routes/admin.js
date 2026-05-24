/**
 * 管理后台路由 - 全局默认桌游管理 / 店家管理（Supabase 版）
 * （测试阶段不需要管理员鉴权）
 */
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../config/supabase');

const router = express.Router();

/** GET /api/admin/init-global-games — 初始化默认桌游（幂等） */
router.get('/init-global-games', async (req, res) => {
  try {
    const { count, error } = await supabase
      .from('global_games')
      .select('*', { count: 'exact', head: true });

    if (error) throw error;

    if (count > 0) {
      return res.json({ message: '已有数据，跳过初始化', count, skipped: true });
    }

    const DEFAULT_GAMES = [
      { game_name: '卡坦岛',     player_min: 3, player_max: 4,  duration: 60,  difficulty: 3, tags: '策略,交易' },
      { game_name: '璀璨宝石',   player_min: 2, player_max: 4,  duration: 30,  difficulty: 2, tags: '策略,收集' },
      { game_name: '卡卡颂',     player_min: 2, player_max: 5,  duration: 45,  difficulty: 2, tags: '家庭,策略' },
      { game_name: '七大奇迹',   player_min: 2, player_max: 7,  duration: 30,  difficulty: 3, tags: '策略,卡牌' },
      { game_name: '花砖物语',   player_min: 2, player_max: 4,  duration: 30,  difficulty: 2, tags: '策略,收集' },
      { game_name: '波多黎各',   player_min: 2, player_max: 5,  duration: 90,  difficulty: 4, tags: '策略,经营' },
      { game_name: '农场主',     player_min: 1, player_max: 4,  duration: 120, difficulty: 4, tags: '策略,经营' },
      { game_name: '银河竞逐',   player_min: 2, player_max: 4,  duration: 60,  difficulty: 4, tags: '策略,卡牌' },
      { game_name: '阿瓦隆',     player_min: 5, player_max: 10, duration: 30,  difficulty: 2, tags: '聚会,推理,嘴炮' },
      { game_name: '三国杀',     player_min: 4, player_max: 10, duration: 60,  difficulty: 3, tags: '聚会,推理' },
      { game_name: '风声',       player_min: 3, player_max: 9,  duration: 60,  difficulty: 3, tags: '聚会,推理,嘴炮' },
      { game_name: '狼人杀',     player_min: 6, player_max: 18, duration: 30,  difficulty: 2, tags: '聚会,推理' },
      { game_name: '抵抗组织',   player_min: 5, player_max: 10, duration: 30,  difficulty: 2, tags: '聚会,推理' },
      { game_name: '谁是卧底',   player_min: 4, player_max: 18, duration: 20,  difficulty: 1, tags: '聚会,派对' },
      { game_name: '瘟疫危机',   player_min: 2, player_max: 4,  duration: 45,  difficulty: 3, tags: '合作,策略' },
      { game_name: '机密代号',   player_min: 4, player_max: 8,  duration: 15,  difficulty: 2, tags: '聚会,派对' },
      { game_name: '谋杀之谜',   player_min: 4, player_max: 8,  duration: 120, difficulty: 2, tags: '推理,剧情' },
      { game_name: '优诺',       player_min: 2, player_max: 10, duration: 30,  difficulty: 1, tags: '家庭,聚会' },
      { game_name: '拉密',       player_min: 2, player_max: 4,  duration: 60,  difficulty: 2, tags: '家庭,数字' },
      { game_name: '拼布对决',   player_min: 2, player_max: 2,  duration: 30,  difficulty: 2, tags: '家庭,策略' },
      { game_name: '多米诺王国', player_min: 2, player_max: 4,  duration: 20,  difficulty: 1, tags: '家庭,轻度' },
      { game_name: '卡坦骰子版', player_min: 2, player_max: 4,  duration: 30,  difficulty: 2, tags: '家庭,策略' },
      { game_name: '万智牌',     player_min: 2, player_max: 2,  duration: 60,  difficulty: 4, tags: '策略,竞技,集换式' },
      { game_name: '游戏王',     player_min: 2, player_max: 2,  duration: 40,  difficulty: 4, tags: '策略,竞技,集换式' },
      { game_name: '宝可梦集换式卡牌', player_min: 2, player_max: 2, duration: 30, difficulty: 3, tags: '策略,竞技,集换式' },
    ];

    const rows = DEFAULT_GAMES.map(g => ({
      id: uuidv4(), game_name: g.game_name, cover_url: '',
      player_min: g.player_min, player_max: g.player_max,
      duration: g.duration, difficulty: g.difficulty, tags: g.tags
    }));

    const { error: insErr } = await supabase.from('global_games').insert(rows);
    if (insErr) throw insErr;

    console.log('[ADMIN] 初始化', rows.length, '款默认桌游');
    res.json({ message: '成功初始化 ' + rows.length + ' 款默认桌游', count: rows.length, skipped: false });
  } catch (err) {
    console.error('[ADMIN] 初始化失败:', err.message);
    res.status(500).json({ error: '初始化失败: ' + err.message });
  }
});

/** GET /api/admin/global-games — 获取所有全局默认桌游 */
router.get('/global-games', async (req, res) => {
  try {
    const { data: games, error } = await supabase
      .from('global_games')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(games || []);
  } catch (err) {
    console.error('[ADMIN] 获取全局桌游失败:', err.message);
    res.status(500).json({ error: '获取失败' });
  }
});

/** GET /api/admin/global-games/:id — 获取单个全局桌游 */
router.get('/global-games/:id', async (req, res) => {
  try {
    const { data: games, error } = await supabase
      .from('global_games')
      .select('*')
      .eq('id', req.params.id)
      .limit(1);

    if (error) throw error;
    if (!games || games.length === 0) {
      return res.status(404).json({ error: '桌游不存在' });
    }
    res.json(games[0]);
  } catch (err) {
    console.error('[ADMIN] 获取桌游详情失败:', err.message);
    res.status(500).json({ error: '获取失败' });
  }
});

/** POST /api/admin/global-games — 添加全局默认桌游 */
router.post('/global-games', async (req, res) => {
  try {
    const { game_name, cover_url, player_min, player_max, duration, difficulty, tags } = req.body;

    if (!game_name) {
      return res.status(400).json({ error: '游戏名称为必填项' });
    }

    const { data, error } = await supabase
      .from('global_games')
      .insert([{
        id: uuidv4(), game_name,
        cover_url: cover_url || '',
        player_min: parseInt(player_min) || 1,
        player_max: parseInt(player_max) || 10,
        duration: parseInt(duration) || 30,
        difficulty: parseInt(difficulty) || 2,
        tags: tags || ''
      }])
      .select()
      .single();

    if (error) throw error;

    console.log('[ADMIN] 添加全局桌游:', game_name);
    res.status(201).json({ message: '添加成功', game: data });
  } catch (err) {
    console.error('[ADMIN] 添加全局桌游失败:', err.message);
    res.status(500).json({ error: '添加失败' });
  }
});

/** GET /api/admin/stores — 查看所有注册店家 */
router.get('/stores', async (req, res) => {
  try {
    const { data: stores, error } = await supabase
      .from('stores')
      .select('id, email, store_name, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json((stores || []).map(s => ({ ...s, status: 'active' })));
  } catch (err) {
    console.error('[ADMIN] 获取店家列表失败:', err.message);
    res.status(500).json({ error: '获取失败' });
  }
});

module.exports = router;