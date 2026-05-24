/**
 * 初始化全局默认桌游数据
 * 运行方式：node init-global-games.js
 * 每次运行先清空 global_games 表再重新插入
 */
const db = require('./config/database');
const { v4: uuidv4 } = require('uuid');

console.log('========================================');
console.log('  初始化全局默认桌游数据');
console.log('========================================\n');

// 先清空旧数据
const deleted = db.prepare('DELETE FROM global_games').run();
console.log('已清空 global_games 表 (删除 ' + deleted.changes + ' 条)\n');

// 25 款默认桌游数据
const games = [
  // ===== 策略类（8款）=====
  { game_name: '卡坦岛', cover_url: '', player_min: 3, player_max: 4, duration: 60, difficulty: 3, tags: '策略,交易' },
  { game_name: '璀璨宝石', cover_url: '', player_min: 2, player_max: 4, duration: 30, difficulty: 2, tags: '策略,收集' },
  { game_name: '卡卡颂', cover_url: '', player_min: 2, player_max: 5, duration: 45, difficulty: 2, tags: '家庭,策略' },
  { game_name: '七大奇迹', cover_url: '', player_min: 2, player_max: 7, duration: 30, difficulty: 3, tags: '策略,卡牌' },
  { game_name: '花砖物语', cover_url: '', player_min: 2, player_max: 4, duration: 30, difficulty: 2, tags: '策略,收集' },
  { game_name: '波多黎各', cover_url: '', player_min: 2, player_max: 5, duration: 90, difficulty: 4, tags: '策略,经营' },
  { game_name: '农场主', cover_url: '', player_min: 1, player_max: 4, duration: 120, difficulty: 4, tags: '策略,经营' },
  { game_name: '银河竞逐', cover_url: '', player_min: 2, player_max: 4, duration: 60, difficulty: 4, tags: '策略,卡牌' },

  // ===== 聚会/嘴炮类（6款）=====
  { game_name: '阿瓦隆', cover_url: '', player_min: 5, player_max: 10, duration: 30, difficulty: 2, tags: '聚会,推理,嘴炮' },
  { game_name: '三国杀', cover_url: '', player_min: 4, player_max: 10, duration: 60, difficulty: 3, tags: '聚会,推理' },
  { game_name: '风声', cover_url: '', player_min: 3, player_max: 9, duration: 60, difficulty: 3, tags: '聚会,推理,嘴炮' },
  { game_name: '狼人杀', cover_url: '', player_min: 6, player_max: 18, duration: 30, difficulty: 2, tags: '聚会,推理' },
  { game_name: '抵抗组织', cover_url: '', player_min: 5, player_max: 10, duration: 30, difficulty: 2, tags: '聚会,推理' },
  { game_name: '谁是卧底', cover_url: '', player_min: 4, player_max: 18, duration: 20, difficulty: 1, tags: '聚会,派对' },

  // ===== 推理/剧情类（3款）=====
  { game_name: '瘟疫危机', cover_url: '', player_min: 2, player_max: 4, duration: 45, difficulty: 3, tags: '合作,策略' },
  { game_name: '机密代号', cover_url: '', player_min: 4, player_max: 8, duration: 15, difficulty: 2, tags: '聚会,派对' },
  { game_name: '谋杀之谜', cover_url: '', player_min: 4, player_max: 8, duration: 120, difficulty: 2, tags: '推理,剧情' },

  // ===== 家庭/轻度类（5款）=====
  { game_name: '优诺', cover_url: '', player_min: 2, player_max: 10, duration: 30, difficulty: 1, tags: '家庭,聚会' },
  { game_name: '拉密', cover_url: '', player_min: 2, player_max: 4, duration: 60, difficulty: 2, tags: '家庭,数字' },
  { game_name: '拼布对决', cover_url: '', player_min: 2, player_max: 2, duration: 30, difficulty: 2, tags: '家庭,策略' },
  { game_name: '多米诺王国', cover_url: '', player_min: 2, player_max: 4, duration: 20, difficulty: 1, tags: '家庭,轻度' },
  { game_name: '卡坦骰子版', cover_url: '', player_min: 2, player_max: 4, duration: 30, difficulty: 2, tags: '家庭,策略' },

  // ===== 卡牌/集换类（3款）=====
  { game_name: '万智牌', cover_url: '', player_min: 2, player_max: 2, duration: 60, difficulty: 4, tags: '策略,竞技,集换式' },
  { game_name: '游戏王', cover_url: '', player_min: 2, player_max: 2, duration: 40, difficulty: 4, tags: '策略,竞技,集换式' },
  { game_name: '宝可梦集换式卡牌', cover_url: '', player_min: 2, player_max: 2, duration: 30, difficulty: 3, tags: '策略,竞技,集换式' },
];

// 批量插入（事务）
const insertStmt = db.prepare(`
  INSERT INTO global_games (id, game_name, cover_url, player_min, player_max, duration, difficulty, tags)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertAll = db.transaction((gamesArray) => {
  for (const g of gamesArray) {
    insertStmt.run(
      uuidv4(), g.game_name, g.cover_url,
      g.player_min, g.player_max, g.duration, g.difficulty, g.tags
    );
  }
});

insertAll(games);

console.log('成功插入 ' + games.length + ' 款默认桌游到 global_games 表\n');

// 分类统计
console.log('分类统计：');
const categories = [
  { name: '策略类', count: 8 },
  { name: '聚会/嘴炮类', count: 6 },
  { name: '推理/剧情类', count: 3 },
  { name: '家庭/轻度类', count: 5 },
  { name: '卡牌/集换类', count: 3 },
];
categories.forEach(c => console.log('  ' + c.name + ': ' + c.count + ' 款'));
console.log('  总计: ' + games.length + ' 款\n');

// 验证结果
const count = db.prepare('SELECT COUNT(*) as total FROM global_games').get();
console.log('验证：global_games 表当前共 ' + count.total + ' 条记录');
console.log('\n=== 初始化完成 ===\n');

// 列出所有游戏
const all = db.prepare('SELECT id, game_name, player_min, player_max, duration, difficulty, tags FROM global_games ORDER BY id').all();
all.forEach((g, i) => {
  console.log('  ' + (i + 1) + '. ' + g.game_name + ' (' + g.player_min + '-' + g.player_max + '人, ' + g.duration + 'min, ★' + g.difficulty + ') [' + g.tags + ']');
});

process.exit(0);