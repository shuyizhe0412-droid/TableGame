/**
 * 桌游AI教练 - 首页（接入Supabase真实数据）
 */
App.registerPage('home', (function() {
 console.log('[home.js] 文件开始加载');

 // 难度配置
 var difficultyMap = {
 1: '入门',
 2: '简单',
 3: '中等',
 4: '困难',
 5: '专家'
 };

 // 分类配置
 var categories = ['全部', '入门', '聚会', '推理', '双人', '策略', '美式', '德式'];

 // ==================== 状态管理 ====================
 var state = {
 currentCategory: '全部',
 searchQuery: '',
 games: [],
 allGames: [], // 存储所有从API获取的游戏
 isLoading: true,
 error: null,
 searchVisible: false,
 favorites: {}
 };

 var searchTimer = null;

 // ==================== 工具函数 ====================
 function getDifficultyText(level) {
 return difficultyMap[level] || '入门';
 }

 function formatInfo(game) {
 var players = game.min_players === game.max_players
 ? game.min_players + '人'
 : game.min_players + '-' + game.max_players + '人';
 var duration = game.duration >= 60
 ? Math.floor(game.duration / 60) + '小时' + (game.duration % 60 > 0 ? game.duration % 60 + '分钟' : '')
 : game.duration + '分钟';
 return players + ' · ' + duration;
 }

 // 过滤游戏列表（基于 allGames）
 function filterGames() {
 var filtered = state.allGames;

 if (state.currentCategory !== '全部') {
 filtered = filtered.filter(function(game) {
 return game.category === state.currentCategory;
 });
 }

 if (state.searchQuery) {
 var query = state.searchQuery.toLowerCase();
 filtered = filtered.filter(function(game) {
 return game.name.toLowerCase().indexOf(query) !== -1;
 });
 }

 state.games = filtered;
 }

 function _toggleFavorite(id) {
 state.favorites[id] = !state.favorites[id];
 }

 // ==================== 从Supabase加载数据 ====================
 async function loadGames() {
 console.log('[home.js] ★ loadGames() 开始执行');
 state.isLoading = true;
 state.error = null;
 window.homePageRender();

 try {
 console.log('[home.js] 调用 window.getGames()...');
 var games = await window.getGames({ limit: 200 });
 console.log('[home.js] 获取到游戏数量:', games.length);
 state.allGames = games;
 state.isLoading = false;
 filterGames();
 window.homePageRender();
 } catch (e) {
 console.error('[home.js] 加载失败:', e);
 state.isLoading = false;
 state.error = '加载失败，请刷新重试';
 window.homePageRender();
 }
 }

 // ==================== 渲染函数 ====================
 function renderHeader() {
 if (state.searchVisible) {
 return '<div class="home-header home-header-search">' +
 '<input type="text" id="home-search-input" class="home-search-input" ' +
 'placeholder="搜索桌游名称..." value="' + state.searchQuery + '">' +
 '<span class="home-search-close" onclick="homePage.closeSearch()">✕</span>' +
 '</div>';
 }
 return '<div class="home-header">' +
 '<span class="home-logo">🎲 桌游AI教练</span>' +
 '<span class="home-search-btn" onclick="homePage.openSearch()">🔍</span>' +
 '</div>';
 }

 function renderCategories() {
 var html = '<div class="home-categories">';
 html += '<div class="home-categories-scroll">';
 categories.forEach(function(cat) {
 var active = cat === state.currentCategory ? ' active' : '';
 html += '<button class="home-category-btn' + active + '" ' +
 'onclick="homePage.setCategory(\'' + cat + '\')">' + cat + '</button>';
 });
 html += '</div></div>';
 return html;
 }

 function renderGameCard(game) {
 var isFavorite = state.favorites[game.id] ? '★' : '☆';
 var coverBg = 'background: linear-gradient(135deg, #D4893F, #7B9E87)';
 var coverContent = '🎲';

 return '<div class="home-game-card" onclick="homePage.goDetail(\'' + game.id + '\')">' +
 '<div class="home-game-cover" style="' + coverBg + '">' +
 '<span class="home-game-cover-text">' + coverContent + '</span>' +
 '<span class="home-game-favorite" onclick="event.stopPropagation();homePage.toggleFavorite(\'' + game.id + '\')">' +
 isFavorite + '</span>' +
 '</div>' +
 '<div class="home-game-content">' +
 '<div class="home-game-name">' + game.name + '</div>' +
 '<div class="home-game-info">' + formatInfo(game) + '</div>' +
 '<div class="home-game-footer">' +
 '<span class="home-game-difficulty">' + getDifficultyText(game.difficulty || 2) + '</span>' +
 '</div>' +
 '</div>' +
 '</div>';
 }

 function renderGameList() {
 if (state.isLoading) {
 return '<div class="home-loading">加载中...</div>';
 }
 if (state.error) {
 return '<div class="home-empty">' + state.error + '</div>';
 }
 if (state.games.length === 0) {
 return '<div class="home-empty">没有找到相关游戏</div>';
 }
 var html = '<div class="home-games-grid">';
 state.games.forEach(function(game) {
 html += renderGameCard(game);
 });
 html += '</div>';
 return html;
 }

 function render() {
 filterGames();
 return '<div class="home-page">' +
 renderHeader() +
 renderCategories() +
 '<div class="home-content">' +
 renderGameList() +
 '</div>' +
 '</div>';
 }

 // ==================== 事件处理 ====================
 function openSearch() {
 state.searchVisible = true;
 window.homePageRender();
 setTimeout(function() {
 var input = document.getElementById('home-search-input');
 if (input) input.focus();
 }, 50);
 }

 function closeSearch() {
 state.searchVisible = false;
 state.searchQuery = '';
 window.homePageRender();
 }

 function setCategory(category) {
 state.currentCategory = category;
 filterGames();
 window.homePageRender();
 }

 function setSearchQuery(query) {
 state.searchQuery = query;
 filterGames();
 var container = document.querySelector('.home-games-grid');
 if (container) {
 container.outerHTML = renderGameList();
 } else {
 var content = document.querySelector('.home-content');
 if (content) {
 content.innerHTML = renderGameList();
 }
 }
 }

 function goDetail(id) {
 window.location.hash = '/detail?id=' + id;
 }

 function toggleFavorite(id) {
 _toggleFavorite(id);
 window.homePageRender();
 }

 // ==================== 初始化 ====================
 function init() {
 console.log('[home.js] ★ init() 被调用，开始加载游戏数据');
 loadGames();

 setTimeout(function() {
 var input = document.getElementById('home-search-input');
 if (input) {
 input.addEventListener('input', function() {
 var value = this.value;
 clearTimeout(searchTimer);
 searchTimer = setTimeout(function() {
 setSearchQuery(value);
 }, 300);
 });
 }
 }, 100);
 }

 var page = {
 render: render,
 init: init,
 openSearch: openSearch,
 closeSearch: closeSearch,
 setCategory: setCategory,
 setSearchQuery: setSearchQuery,
 goDetail: goDetail,
 toggleFavorite: toggleFavorite
 };

 window.homePage = page;
 window.homePageRender = function() {
 var app = document.getElementById('app');
 if (app) {
 app.innerHTML = page.render() + window.getTabBarHtml('home');
 window.bindTabBarEvents();
 page.init();
 }
 };

 return page;
})());
