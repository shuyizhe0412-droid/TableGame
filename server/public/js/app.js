const API = `${window.location.origin}/api`;

let currentUser = null;
let currentToken = null;
let currentGameId = null;
let currentKeyword = '';
let currentCategory = '';

function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

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
   let url = '/games';
  const params = [];
  if (currentKeyword) params.push('keyword=' + encodeURIComponent(currentKeyword));
  if (currentCategory) params.push('category=' + encodeURIComponent(currentCategory));
  if (params.length) url += '?' + params.join('&');
  const games = await apiFetch(url);
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
  document.body.style.overflow = 'hidden';
  loadExistingRules();
  $('#rules-modal').style.display = '';
}

function closeRulesModal() {
  document.body.style.overflow = '';
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

// ============ 搜索与筛选 ============

// ============ 搜索与筛选 ============
function initSearchAndFilter() {
  const searchInput = document.getElementById('search-input');
  const searchClear = document.getElementById('search-clear');
  const filterTags = document.getElementById('filter-tags');

  if (searchInput) {
    searchInput.addEventListener('input', debounce(() => {
      currentKeyword = searchInput.value.trim();
      searchClear.style.display = currentKeyword ? '' : 'none';
      loadGames();
    }, 300));
  }

  if (searchClear) {
    searchClear.addEventListener('click', () => {
      searchInput.value = '';
      currentKeyword = '';
      searchClear.style.display = 'none';
      loadGames();
    });
  }

  if (filterTags) {
    filterTags.addEventListener('click', (e) => {
      const tag = e.target.closest('.filter-tag');
      if (!tag) return;
      filterTags.querySelectorAll('.filter-tag').forEach(t => t.classList.remove('active'));
      tag.classList.add('active');
      currentCategory = tag.dataset.category || '';
      loadGames();
    });
  }
}

// ============ 初始化 ============

async function init() {
 initAuth();
 initGameModal();
 initUploadModal();
 initDelete();
 initNavigation();

  initRulesModal();
  initSearchAndFilter();
  initBatchQr();

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
// ============ 鎵归噺浜岀淮鐮?============

let batchQrGames = [];
let batchQrCurrentPage = 1;
const batchQrPageSize = 6;

function initBatchQr() {
  const modal = document.getElementById('batch-qr-modal');
  const closeBtn = document.getElementById('batch-qr-close-btn');
  const downloadAllBtn = document.getElementById('batch-qr-download-all');
  const batchQrBtn = document.getElementById('batch-qr-btn');

  if (!modal || !closeBtn || !downloadAllBtn || !batchQrBtn) return;

  // 鎵撳紑寮圭獥
  batchQrBtn.addEventListener('click', openBatchQrModal);

  // 鍏抽棴寮圭獥
  closeBtn.addEventListener('click', closeBatchQrModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeBatchQrModal();
  });

  // 涓嬭浇鍏ㄩ儴
  downloadAllBtn.addEventListener('click', downloadAllQrCodes);
}

async function openBatchQrModal() {
  const modal = document.getElementById('batch-qr-modal');
  if (!modal) return;

  try {
    batchQrGames = await apiFetch('/games');
    batchQrCurrentPage = 1;
    renderBatchQrPage();
    modal.style.display = '';
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function closeBatchQrModal() {
  const modal = document.getElementById('batch-qr-modal');
  if (modal) modal.style.display = 'none';
}

function renderBatchQrPage() {
  const grid = document.getElementById('batch-qr-grid');
  const pagination = document.getElementById('batch-qr-pagination');
  if (!grid) return;

  const totalPages = Math.ceil(batchQrGames.length / batchQrPageSize);
  const start = (batchQrCurrentPage - 1) * batchQrPageSize;
  const end = start + batchQrPageSize;
  const pageGames = batchQrGames.slice(start, end);

  const shopId = currentUser?.id || '';

  grid.innerHTML = pageGames.map(g => {
    const gameUrl = `https://boardgame-ai.pages.dev/#/chat?id=${g.id}&shop=${shopId}`;
    const qrApi = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(gameUrl)}`;
    const players = (g.min_players && g.max_players) ? `${g.min_players}-${g.max_players}浜篳 : '';
    const duration = g.duration ? `${g.duration}鍒嗛挓` : '';

    return `
      <div class="batch-qr-card">
        <img src="${qrApi}" alt="${g.name}">
        <div class="game-name">${g.name}</div>
        <div class="game-meta">${players} ${duration}</div>
        <button class="btn btn-outline btn-download-single" data-id="${g.id}" data-name="${g.name}">涓嬭浇</button>
      </div>
    `;
  }).join('');

  // 鍒嗛〉鎺т欢
  if (pagination) {
    pagination.innerHTML = `
      <button class="btn btn-ghost btn-sm" id="batch-qr-prev" ${batchQrCurrentPage <= 1 ? 'disabled' : ''}>涓婁竴椤?/button>
      <span class="page-info">绗?${batchQrCurrentPage} / ${totalPages} 椤?/span>
      <button class="btn btn-ghost btn-sm" id="batch-qr-next" ${batchQrCurrentPage >= totalPages ? 'disabled' : ''}>涓嬩竴椤?/button>
    `;

    const prevBtn = document.getElementById('batch-qr-prev');
    const nextBtn = document.getElementById('batch-qr-next');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (batchQrCurrentPage > 1) {
          batchQrCurrentPage--;
          renderBatchQrPage();
        }
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (batchQrCurrentPage < totalPages) {
          batchQrCurrentPage++;
          renderBatchQrPage();
        }
      });
    }
  }

  // 鍗曞紶涓嬭浇鎸夐挳
  grid.querySelectorAll('.btn-download-single').forEach(btn => {
    btn.addEventListener('click', () => {
      const gameId = btn.dataset.id;
      const gameName = btn.dataset.name;
      downloadSingleQr(gameId, gameName);
    });
  });
}

async function downloadAllQrCodes() {
  if (batchQrGames.length === 0) {
    showToast('娌℃湁鍙笅杞界殑浜岀淮鐮?, 'error');
    return;
  }

  showToast('姝ｅ湪鎵撳寘涓嬭浇锛岃绋嶅€?..', 'success');

  try {
    // 鍔ㄦ€佸姞杞?JSZip 鍜?FileSaver
    if (typeof JSZip === 'undefined') {
      await loadScript('https://cdn.jsdelivr.net/npm/jszip@3/dist/jszip.min.js');
    }
    if (typeof saveAs === 'undefined') {
      await loadScript('https://cdn.jsdelivr.net/npm/file-saver@2/dist/FileSaver.min.js');
    }

    const zip = new JSZip();
    const shopId = currentUser?.id || '';

    for (const g of batchQrGames) {
      const gameUrl = `https://boardgame-ai.pages.dev/#/chat?id=${g.id}&shop=${shopId}`;
      const qrApi = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(gameUrl)}`;
      
      try {
        const response = await fetch(qrApi);
        const blob = await response.blob();
        zip.file(`${g.name}.png`, blob);
      } catch {
        console.warn(`Failed to download QR code for ${g.name}`);
      }
    }

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, `妗屾父浜岀淮鐮乢${currentUser?.store_name || '搴楀'}.zip`);
    showToast('涓嬭浇瀹屾垚');
  } catch (err) {
    showToast('鎵撳寘澶辫触: ' + err.message, 'error');
  }
}

function downloadSingleQr(gameId, gameName) {
  const shopId = currentUser?.id || '';
  const gameUrl = `https://boardgame-ai.pages.dev/#/chat?id=${gameId}&shop=${shopId}`;
  const qrApi = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(gameUrl)}`;
  
  const link = document.createElement('a');
  link.href = qrApi;
  link.download = `${gameName}_浜岀淮鐮?png`;
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

