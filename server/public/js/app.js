const API = `${window.location.origin}/api`;

let currentUser = null;
let currentToken = null;
let currentGameId = null;

// ============ 工具函数 ============

function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }

function showToast(msg, type = 'success') {
 const toast = $('#toast');
 toast.textContent = msg;
 toast.className = `toast ${type} show`;
 setTimeout(() => toast.classList.remove('show'), 3000);
}

async function apiFetch(path, options = {}) {
 const headers = { ...options.headers };
 const token = currentToken || localStorage.getItem('token');
 if (token) headers['Authorization'] = `Bearer ${token}`;
 if (!(options.body instanceof FormData)) {
 headers['Content-Type'] = 'application/json';
 if (options.body && typeof options.body === 'object') {
 options.body = JSON.stringify(options.body);
 }
 }
 const res = await fetch(`${API}${path}`, { ...options, headers });
 const data = await res.json();
 if (!res.ok) throw new Error(data.error || '请求失败');
 return data;
}

function showPage(id) {
 $$('.page').forEach(p => p.style.display = 'none');
 $(`#${id}`).style.display = '';
}

// ============ 登录/注册 ============

function initAuth() {
 $$('.auth-tab').forEach(tab => {
 tab.addEventListener('click', () => {
 $$('.auth-tab').forEach(t => t.classList.remove('active'));
 tab.classList.add('active');
 const which = tab.dataset.tab;
 $('#login-form').style.display = which === 'login' ? '' : 'none';
 $('#register-form').style.display = which === 'register' ? '' : 'none';
 });
 });

 $('#login-form').addEventListener('submit', async (e) => {
 e.preventDefault();
 try {
 const data = await apiFetch('/auth/login', {
 method: 'POST',
 body: {
 email: $('#login-email').value,
 password: $('#login-password').value
 }
 });
 currentToken = data.token;
 currentUser = data.store;
 localStorage.setItem('token', currentToken);
 localStorage.setItem('user', JSON.stringify(currentUser));
 showToast('登录成功');
 enterDashboard();
 } catch (err) {
 showToast(err.message, 'error');
 }
 });

 $('#register-form').addEventListener('submit', async (e) => {
 e.preventDefault();
 try {
 const data = await apiFetch('/auth/register', {
 method: 'POST',
 body: {
 email: $('#reg-email').value,
 password: $('#reg-password').value,
 store_name: $('#reg-store-name').value || undefined
 }
 });
 currentToken = data.token;
 currentUser = data.store;
 localStorage.setItem('token', currentToken);
 localStorage.setItem('user', JSON.stringify(currentUser));
 showToast('注册成功');
 enterDashboard();
 } catch (err) {
 showToast(err.message, 'error');
 }
 });
}

// ============ 首页/桌游列表 ============

function enterDashboard() {
 showPage('dashboard-page');
 $('#store-name-display').textContent = currentUser.store_name || currentUser.email;
 loadGames();
}

async function loadGames() {
 try {
 const games = await apiFetch('/games');
 renderGameGrid(games);
 } catch (err) {
 if (err.message.includes('登录') || err.message.includes('过期')) {
 logout();
 } else {
 showToast(err.message, 'error');
 }
 }
}

function renderGameGrid(games) {
 const grid = $('#game-grid');
 const empty = $('#empty-state');
 const count = $('#game-count');

 count.textContent = games.length;

 if (games.length === 0) {
 grid.innerHTML = '';
 empty.style.display = '';
 return;
 }

 empty.style.display = 'none';
 grid.innerHTML = games.map(g => {
 const sourceLabel = g.source === 'default'
 ? '<span class="tag tag-default">[默认]</span>'
 : '<span class="tag tag-custom">[自定义]</span>';

 return `
 <div class="game-card" data-id="${g.id}">
 <div class="card-cover">
 ${g.cover_url
 ? `<img src="${g.cover_url}" alt="${g.name}">`
 : '🎲'}
 </div>
 <div class="card-body">
 <div class="card-title">
 ${g.name}
 ${sourceLabel}
 </div>
 <div class="card-meta">
 ${g.min_players && g.max_players
 ? `<span>👥 ${g.min_players}-${g.max_players}人</span>`
 : ''}
 ${g.duration
 ? `<span>⏱️ ${g.duration}分钟</span>`
 : ''}
 </div>
 </div>
 </div>
 `;
 }).join('');

 grid.querySelectorAll('.game-card').forEach(card => {
 card.addEventListener('click', () => openGameDetail(card.dataset.id));
 });
}

// ============ 桌游详情 ============

async function openGameDetail(gameId) {
 currentGameId = gameId;
 showPage('detail-page');
 try {
 const data = await apiFetch(`/games/${gameId}`);
 renderGameDetail(data.game);
 } catch (err) {
 showToast(err.message, 'error');
 showPage('dashboard-page');
 }
}

function renderGameDetail(game) {
 $('#detail-header-title').textContent = game.name;
 $('#detail-name').textContent = game.name;

 // 封面
 const cover = $('#detail-cover');
 if (game.cover_url) {
 cover.innerHTML = `<img src="${game.cover_url}" alt="${game.name}">`;
 } else {
 cover.innerHTML = '<span class="cover-placeholder">🎲</span>';
 }

 // 基本信息
 const players = game.min_players && game.max_players
 ? `${game.min_players}-${game.max_players} 人` : '未设置';
 const duration = game.duration ? `${game.duration} 分钟` : '未设置';
 const diff = game.difficulty || 3;
 const diffStars = '★'.repeat(diff) + '☆'.repeat(5 - diff);

 $('#detail-players').textContent = players;
 $('#detail-duration').textContent = duration;
 $('#detail-difficulty').textContent = diffStars;

 // 标签
 const tagsEl = $('#detail-tags');
 if (game.tags) {
 const tags = typeof game.tags === 'string' ? game.tags.split(',') : game.tags;
 tagsEl.innerHTML = tags.map(t => `<span class="tag">${t.trim()}</span>`).join('');
 } else {
 tagsEl.innerHTML = '';
 }

 // 规则书文件
 loadGameFiles(game.id);

 // 二维码
 const playUrl = `${window.location.origin}/index.html#/play/${game.store_id || currentUser.id}/${game.id}`;
 const qrApi = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(playUrl)}`;
 $('#qr-code').innerHTML = `<img src="${qrApi}" alt="QR Code">`;
}

async function loadGameFiles(gameId) {
 const filesEl = $('#detail-files');
 try {
 const files = await apiFetch(`/upload/${gameId}`);
 if (!files || files.length === 0) {
 filesEl.innerHTML = '<p class="text-muted">暂无规则书文件</p>';
 return;
 }
 filesEl.innerHTML = files.map(f => `
 <div class="file-item">
 <span>${f.file_type === 'pdf' ? '📄' : '🖼️'} ${f.file_type.toUpperCase()} 文件</span>
 <a href="${f.file_url}" target="_blank">查看</a>
 </div>
 `).join('');
 } catch {
 filesEl.innerHTML = '<p class="text-muted">暂无规则书文件</p>';
 }
}

// ============ 添加/编辑桌游弹窗 ============

let editingGameId = null;

function openGameModal(game = null) {
 editingGameId = game ? game.id : null;
 $('#modal-title').textContent = game ? '编辑桌游' : '添加桌游';
 $('#form-game-name').value = game?.name || '';
 $('#form-min-players').value = game?.min_players || '';
 $('#form-max-players').value = game?.max_players || '';
 $('#form-duration').value = game?.duration || '';
 $('#form-tags').value = game?.tags || '';
 $('#form-cover').value = '';
 $('#form-rulebook').value = '';

 const diff = game?.difficulty || 3;
 $$('#difficulty-stars .star').forEach(s => {
 s.classList.toggle('active', parseInt(s.dataset.value) <= diff);
 });

 $('#game-modal').style.display = '';
}

function closeGameModal() {
 $('#game-modal').style.display = 'none';
 editingGameId = null;
}

function initGameModal() {
 // 难度星星
 $$('#difficulty-stars .star').forEach(star => {
 star.addEventListener('click', () => {
 const val = parseInt(star.dataset.value);
 $$('#difficulty-stars .star').forEach(s => {
 s.classList.toggle('active', parseInt(s.dataset.value) <= val);
 });
 });
 });

 // 关闭弹窗
 $('#modal-close-btn').addEventListener('click', closeGameModal);
 $('#modal-cancel-btn').addEventListener('click', closeGameModal);
 $('#game-modal').addEventListener('click', (e) => {
 if (e.target === $('#game-modal')) closeGameModal();
 });

 // 添加按钮
 $('#add-game-btn').addEventListener('click', () => openGameModal());

 // 表单提交
 $('#game-form').addEventListener('submit', async (e) => {
 e.preventDefault();
 const submitBtn = $('#modal-submit-btn');
 submitBtn.disabled = true;
 submitBtn.textContent = '保存中...';

 try {
 const difficulty = $$('#difficulty-stars .star.active').length;

 const gameData = {
 name: $('#form-game-name').value,
 min_players: parseInt($('#form-min-players').value) || null,
 max_players: parseInt($('#form-max-players').value) || null,
 duration: parseInt($('#form-duration').value) || null,
 difficulty: difficulty,
 tags: $('#form-tags').value || null
 };

 let gameId;
 if (editingGameId) {
 await apiFetch(`/games/${editingGameId}`, {
 method: 'PUT',
 body: gameData
 });
 gameId = editingGameId;
 } else {
 const result = await apiFetch('/games', {
 method: 'POST',
 body: gameData
 });
 gameId = result.game.id;
 }

 // 上传封面
 const coverFile = $('#form-cover').files[0];
 if (coverFile) {
 const fd = new FormData();
 fd.append('file', coverFile);
 fd.append('game_id', gameId);
 const res = await fetch(`${API}/upload/cover`, {
 method: 'POST',
 headers: { 'Authorization': `Bearer ${currentToken}` },
 body: fd
 });
 if (!res.ok) {
 const err = await res.json();
 console.warn('封面上传失败:', err.error);
 }
 }

 // 上传规则书
 const rulebookFile = $('#form-rulebook').files[0];
 if (rulebookFile) {
 const fd = new FormData();
 fd.append('file', rulebookFile);
 fd.append('game_id', gameId);
 const res = await fetch(`${API}/upload`, {
 method: 'POST',
 headers: { 'Authorization': `Bearer ${currentToken}` },
 body: fd
 });
 if (!res.ok) {
 const err = await res.json();
 console.warn('规则书上传失败:', err.error);
 }
 }

 showToast(editingGameId ? '更新成功' : '添加成功');
 closeGameModal();
 loadGames();
 } catch (err) {
 showToast(err.message, 'error');
 } finally {
 submitBtn.disabled = false;
 submitBtn.textContent = '保存';
 }
 });
}

// ============ 上传规则书 ============

function initUploadModal() {
 $('#upload-rulebook-btn').addEventListener('click', () => {
 $('#upload-modal').style.display = '';
 });

 $('#upload-modal-close-btn').addEventListener('click', () => {
 $('#upload-modal').style.display = 'none';
 });
 $('#upload-cancel-btn').addEventListener('click', () => {
 $('#upload-modal').style.display = 'none';
 });
 $('#upload-modal').addEventListener('click', (e) => {
 if (e.target === $('#upload-modal')) $('#upload-modal').style.display = 'none';
 });

 $('#upload-form').addEventListener('submit', async (e) => {
 e.preventDefault();
 const file = $('#upload-file-input').files[0];
 if (!file) return;

 try {
 const fd = new FormData();
 fd.append('file', file);
 fd.append('game_id', currentGameId);
 await fetch(`${API}/upload`, {
 method: 'POST',
 headers: { 'Authorization': `Bearer ${currentToken}` },
 body: fd
 }).then(r => r.json());

 showToast('上传成功');
 $('#upload-modal').style.display = 'none';
 $('#upload-file-input').value = '';
 loadGameFiles(currentGameId);
 } catch (err) {
 showToast('上传失败', 'error');
 }
 });

 // 封面上传
 $('#upload-cover-btn').addEventListener('click', () => {
 $('#cover-file-input').click();
 });
 $('#cover-file-input').addEventListener('change', async (e) => {
 const file = e.target.files[0];
 if (!file) return;
 try {
 const fd = new FormData();
 fd.append('file', file);
 fd.append('game_id', currentGameId);
 await fetch(`${API}/upload/cover`, {
 method: 'POST',
 headers: { 'Authorization': `Bearer ${currentToken}` },
 body: fd
 }).then(r => r.json());
 showToast('封面更新成功');
 openGameDetail(currentGameId);
 } catch {
 showToast('封面上传失败', 'error');
 }
 });
}

// ============ 删除桌游 ============

function initDelete() {
 $('#delete-game-btn').addEventListener('click', async () => {
 if (!confirm('确定要删除这个桌游吗？此操作不可撤销。')) return;
 try {
 await apiFetch(`/games/${currentGameId}`, { method: 'DELETE' });
 showToast('删除成功');
 showPage('dashboard-page');
 loadGames();
 } catch (err) {
 showToast(err.message, 'error');
 }
 });
}

// ============ 导航 ============

function initNavigation() {
 $('#back-btn').addEventListener('click', () => {
 showPage('dashboard-page');
 loadGames();
 });

 $('#logout-btn').addEventListener('click', logout);

  $('#view-player-btn').addEventListener('click', () => {
    window.open('https://boardgame-ai.pages.dev/#/home', '_blank');
  });
}

function logout() {
 currentToken = null;
 currentUser = null;
 localStorage.removeItem('token');
 localStorage.removeItem('user');
 showPage('auth-page');
}


// ===== 规则编辑弹窗 =====

function openRulesModal() {
  loadExistingRules();
  $('#rules-modal').style.display = '';
}

function closeRulesModal() {
  $('#rules-modal').style.display = 'none';
}

async function loadExistingRules() {
  try {
    const data = await apiFetch(`/games/${currentGameId}/rules`);
    $('#rules-textarea').value = data.rules_text || '';
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function initRulesModal() {
  $('#edit-rules-btn').addEventListener('click', () => {
    openRulesModal();
  });

  $('#rules-modal-close-btn').addEventListener('click', closeRulesModal);
  $('#rules-modal-cancel-btn').addEventListener('click', closeRulesModal);
  $('#rules-modal').addEventListener('click', (e) => {
    if (e.target === $('#rules-modal')) closeRulesModal();
  });

  $('#rules-modal-save-btn').addEventListener('click', async () => {
    try {
      await apiFetch(`/games/${currentGameId}/rules`, {
        method: 'PUT',
        body: { rules_text: $('#rules-textarea').value }
      });
      showToast('规则保存成功');
      closeRulesModal();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

// ============ 初始化 ============

async function init() {
 initAuth();
 initGameModal();
 initUploadModal();
 initDelete();
 initNavigation();

 // 检查已登录状态
 currentToken = localStorage.getItem('token');
 const savedUser = localStorage.getItem('user');
 if (currentToken && savedUser) {
 try {
 currentUser = JSON.parse(savedUser);
 const me = await apiFetch('/auth/me');
 currentUser = me.store || currentUser;
 enterDashboard();
 } catch {
 logout();
 }
 } else {
 showPage('auth-page');
 }

 $('#loading').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', init);
