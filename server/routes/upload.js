/**
 * 文件上传路由 - 规则书/封面图上传（Supabase 版）
 * 文件仍存本地 uploads/ 目录（后续可迁 Supabase Storage）
 */
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../config/supabase');
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
  destination: (req, file, cb) => { cb(null, getUploadDir()); },
  filename: (req, file, cb) => { cb(null, uuidv4() + path.extname(file.originalname)); }
});

const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'
];
const MAX_SIZE = 20 * 1024 * 1024;

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    ALLOWED_TYPES.includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error('不支持的文件类型：' + file.mimetype + '。仅支持 PDF、JPG、PNG、GIF、WebP、SVG'), false);
  },
  limits: { fileSize: MAX_SIZE }
});

router.use(authMiddleware);

// POST /api/upload - 上传文件

// POST /api/upload/cover - 上传封面图（不写入 game_files 表）
router.post('/cover', (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      const msg = err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE'
        ? '文件过大，超过20MB限制' : err.message;
      return res.status(400).json({ error: msg });
    }
    if (!req.file) return res.status(400).json({ error: '请选择要上传的文件' });

    try {
      const { game_id } = req.body;

      // 验证 game_id 归属
      if (game_id) {
        const { data: game, error: gErr } = await supabase
          .from('store_games').select('id').eq('id', game_id).eq('store_id', req.store.id).limit(1);
        if (gErr) throw gErr;
        if (!game || game.length === 0) {
          fs.unlinkSync(req.file.path);
          return res.status(404).json({ error: '游戏不存在或无权限' });
        }
      }

      const relativePath = path.relative(path.join(__dirname, '..'), req.file.path).replace(/\\/g, '/');
      const fileUrl = '/uploads/' + relativePath;

      console.log('[UPLOAD] 封面图上传:', req.file.originalname, '|', (req.file.size / 1024).toFixed(1) + 'KB');

      res.status(201).json({
        message: '上传成功',
        file: {
          filename: req.file.filename,
          original_name: req.file.originalname,
          file_type: 'image',
          file_size: req.file.size,
          url: fileUrl
        }
      });
    } catch (err) {
      console.error('[UPLOAD] 封面图上传失败:', err.message);
      if (req.file && req.file.path) fs.unlinkSync(req.file.path);
      res.status(500).json({ error: '上传失败' });
    }
  });
});

router.post('/', (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      const msg = err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE'
        ? '文件大小超过20MB限制' : err.message;
      return res.status(400).json({ error: msg });
    }
    if (!req.file) return res.status(400).json({ error: '请选择要上传的文件' });

    try {
      const { game_id } = req.body;

      // 验证 game_id 归属
      if (game_id) {
        const { data: game, error: gErr } = await supabase
          .from('store_games').select('id').eq('id', game_id).eq('store_id', req.store.id).limit(1);
        if (gErr) throw gErr;
        if (!game || game.length === 0) {
          fs.unlinkSync(req.file.path);
          return res.status(404).json({ error: '游戏不存在或无权操作' });
        }
      }

      // 判断文件类型
      let fileType = 'other';
      if (req.file.mimetype === 'application/pdf') fileType = 'pdf';
      else if (req.file.mimetype.startsWith('image/')) fileType = 'image';

      const id = uuidv4();
      const relativePath = path.relative(path.join(__dirname, '..'), req.file.path).replace(/\\/g, '/');

      const { error: insErr } = await supabase.from('game_files').insert([{
        id,
        game_id: game_id || null,
        store_id: req.store.id,
        filename: req.file.filename,
        original_name: req.file.originalname,
        file_type: fileType,
        file_size: req.file.size
      }]);

      if (insErr) throw insErr;

      console.log('[UPLOAD] 文件上传:', req.file.originalname, '|', (req.file.size / 1024).toFixed(1) + 'KB');

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
      if (req.file && req.file.path) fs.unlinkSync(req.file.path);
      res.status(500).json({ error: '上传失败' });
    }
  });
});

// GET /api/upload/:gameId - 获取桌游的所有文件
router.get('/:gameId', async (req, res) => {
  try {
    const { data: files, error } = await supabase
      .from('game_files')
      .select('*')
      .eq('game_id', req.params.gameId)
      .eq('store_id', req.store.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // 构建 file_url
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const result = (files || []).map(f => {
      let fileUrl = '';
      function findFile(dir) {
        for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
          const fp = path.join(dir, item.name);
          if (item.isDirectory()) { if (findFile(fp)) return true; }
          else if (item.name === f.filename) {
            fileUrl = '/uploads/' + path.relative(uploadsDir, fp).replace(/\\/g, '/');
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
router.delete('/:id', async (req, res) => {
  try {
    const { data: fileArr, error: findErr } = await supabase
      .from('game_files')
      .select('*')
      .eq('id', req.params.id)
      .eq('store_id', req.store.id)
      .limit(1);

    if (findErr) throw findErr;
    if (!fileArr || fileArr.length === 0) {
      return res.status(404).json({ error: '文件不存在或无权删除' });
    }

    const file = fileArr[0];

    // 删除本地文件
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    function findAndDelete(dir) {
      for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
        const fp = path.join(dir, item.name);
        if (item.isDirectory()) { if (findAndDelete(fp)) return true; }
        else if (item.name === file.filename) { fs.unlinkSync(fp); return true; }
      }
      return false;
    }
    findAndDelete(uploadsDir);

    // 删除 DB 记录
    const { error: delErr } = await supabase.from('game_files').delete().eq('id', req.params.id);
    if (delErr) throw delErr;

    console.log('[UPLOAD] 文件删除:', file.original_name);
    res.json({ message: '删除成功' });
  } catch (err) {
    console.error('[UPLOAD] 删除失败:', err.message);
    res.status(500).json({ error: '删除失败' });
  }
});

module.exports = router;