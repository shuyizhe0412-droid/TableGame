/**
 * 文件上传路由 - 规则书/封面图上传
 */
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// 上传目录
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

// 按日期分目录
function getUploadDir() {
  const now = new Date();
  const dir = path.join(UPLOADS_DIR,
    String(now.getFullYear()),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0')
  );
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// Multer 配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, getUploadDir());
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = uuidv4() + ext;
    cb(null, uniqueName);
  }
});

// 文件过滤：只允许 PDF 和图片
const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'
];
const MAX_SIZE = 20 * 1024 * 1024; // 20MB

const fileFilter = (req, file, cb) => {
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('不支持的文件类型：' + file.mimetype + '。仅支持 PDF、JPG、PNG、GIF、WebP、SVG'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE }
});

// 所有上传路由需要认证
router.use(authMiddleware);

// POST /api/upload - 上传文件
router.post('/', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: '文件大小超过20MB限制' });
        }
        return res.status(400).json({ error: '上传错误: ' + err.message });
      }
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: '请选择要上传的文件' });
    }

    try {
      const { game_id } = req.body;

      // 如果有 game_id，验证游戏存在且属于当前店家
      if (game_id) {
        const game = db.prepare('SELECT id FROM store_games WHERE id = ? AND store_id = ?').get(game_id, req.store.id);
        if (!game) {
          // 删除已上传的文件
          fs.unlink(req.file.path, () => {});
          return res.status(404).json({ error: '游戏不存在或无权操作' });
        }
      }

      // 判断文件类型分类
      const mimetype = req.file.mimetype;
      let fileType = 'other';
      if (mimetype === 'application/pdf') fileType = 'pdf';
      else if (mimetype.startsWith('image/')) fileType = 'image';

      const id = uuidv4();
      const relativePath = path.relative(path.join(__dirname, '..'), req.file.path).replace(/\\/g, '/');

      db.prepare(`
        INSERT INTO game_files (id, game_id, store_id, filename, original_name, file_type, file_size)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        game_id || '',
        req.store.id,
        req.file.filename,
        req.file.originalname,
        fileType,
        req.file.size
      );

      console.log('[UPLOAD] 文件上传:', req.file.originalname, '大小:', (req.file.size / 1024).toFixed(1) + 'KB');

      res.status(201).json({
        message: '上传成功',
        file: {
          id,
          game_id: game_id || null,
          filename: req.file.filename,
          original_name: req.file.originalname,
          file_type: fileType,
          file_size: req.file.size,
          url: '/uploads/' + relativePath
        }
      });
    } catch (err) {
      console.error('[UPLOAD] 保存记录失败:', err.message);
      res.status(500).json({ error: '上传失败' });
    }
  });
});

// GET /api/upload/:gameId - 获取桌游的所有文件
router.get('/:gameId', (req, res) => {
  try {
    const files = db.prepare(
      'SELECT * FROM game_files WHERE game_id = ? AND store_id = ? ORDER BY created_at DESC'
    ).all(req.params.gameId, req.store.id);

    // 构建 file_url：在 uploads 目录中查找实际路径
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const result = files.map(f => {
      let fileUrl = '';
      function findFile(dir) {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        for (const item of items) {
          const fullPath = path.join(dir, item.name);
          if (item.isDirectory()) {
            if (findFile(fullPath)) return true;
          } else if (item.name === f.filename) {
            const relativePath = path.relative(uploadsDir, fullPath).replace(/\\/g, '/');
            fileUrl = '/uploads/' + relativePath;
            return true;
          }
        }
        return false;
      }
      findFile(uploadsDir);
      return { ...f, file_url: fileUrl };
    });

    res.json(result);
  } catch (err) {
    console.error('[UPLOAD] 获取文件列表失败:', err.message);
    res.status(500).json({ error: '获取失败' });
  }
});

// DELETE /api/upload/:id - 删除文件
router.delete('/:id', (req, res) => {
  try {
    const file = db.prepare('SELECT * FROM game_files WHERE id = ? AND store_id = ?').get(req.params.id, req.store.id);
    if (!file) {
      return res.status(404).json({ error: '文件不存在或无权删除' });
    }

    // 删除物理文件（通过遍历 uploads 目录查找）
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    function findAndDelete(dir) {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
          findAndDelete(fullPath);
        } else if (item.name === file.filename) {
          fs.unlinkSync(fullPath);
          return true;
        }
      }
      return false;
    }
    findAndDelete(uploadsDir);

    // 删除数据库记录
    db.prepare('DELETE FROM game_files WHERE id = ?').run(req.params.id);

    console.log('[UPLOAD] 文件删除:', file.original_name);

    res.json({ message: '删除成功' });
  } catch (err) {
    console.error('[UPLOAD] 删除失败:', err.message);
    res.status(500).json({ error: '删除失败' });
  }
});

module.exports = router;