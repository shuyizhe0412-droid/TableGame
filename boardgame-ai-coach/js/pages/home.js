/**
 * 桌游AI教练 - 首页
 */
console.log('[home.js] 文件开始加载');
console.log('[home.js] App:', typeof App);

App.registerPage('home', (function() {
    console.log('[home.js] IIFE 开始执行');
    // ==================== 模拟数据（兜底用）====================
    var mockGames = [
        { id: '1', name: '卡坦岛', minPlayers: 3, maxPlayers: 4, duration: 90, difficulty: 2, tags: ['策略', '资源管理'], category: '德式' },
        { id: '2', name: '狼人杀', minPlayers: 6, maxPlayers: 12, duration: 30, difficulty: 1, tags: ['推理', '社交'], category: '聚会' },
        { id: '3', name: '三国杀', minPlayers: 4, maxPlayers: 10, duration: 40, difficulty: 2, tags: ['角色', '对抗'], category: '聚会' },
        { id: '4', name: '情书', minPlayers: 2, maxPlayers: 6, duration: 15, difficulty: 1, tags: ['卡牌', '推理'], category: '入门' },
        { id: '5', name: '宝石商人', minPlayers: 2, maxPlayers: 4, duration: 30, difficulty: 1, tags: ['收集', '成套'], category: '入门' },
        { id: '6', name: '德国心脏病', minPlayers: 3, maxPlayers: 6, duration: 20, difficulty: 1, tags: ['反应', '欢乐'], category: '聚会' },
        { id: '7', name: '行动代号', minPlayers: 4, maxPlayers: 8, duration: 15, difficulty: 1, tags: ['配合', '词汇'], category: '聚会' },
        { id: '8', name: '阿瓦隆', minPlayers: 5, maxPlayers: 10, duration: 30, difficulty: 2, tags: ['推理', '隐藏身份'], category: '推理' },
        { id: '9', name: '璀璨宝石', minPlayers: 2, maxPlayers: 4, duration: 30, difficulty: 1, tags: ['收集', '策略'], category: '入门' },
        { id: '10', name: '七大奇迹', minPlayers: 3, maxPlayers: 7, duration: 30, difficulty: 2, tags: ['文明', '卡牌'], category: '策略' }
    ];

    // 难度配置
    var difficultyMap = { 1: '入门', 2: '简单', 3: '中等', 4: '困难', 5: '专家' };
    var categories = ['全部', '入门', '聚会', '推理', '双人', '策略', '美式', '德式'];

    // ==================== 状态管理 ====================
    var state = {
        currentCategory: '全部',
        searchQuery: '',
        games: [],
        allGames: [], // 从数据库加载的所有游戏
        searchVisible: false,
        favorites: {},
        isLoading: true,
        fromDatabase: false
    };

    var searchTimer = null;

    // ==================== 工具函数 ====================
    function getDifficultyText(level) {
        return difficultyMap[level] || '入门';
    }

    function formatInfo(game) {
        var minP = game.min_players || game.minPlayers || 0;
        var maxP = game.max_players || game.maxPlayers || 0;
        var players = minP === maxP ? minP + '人' : minP + '-' + maxP + '人';
        var dur = game.duration || 30;
        var duration = dur >= 60
            ? Math.floor(dur / 60) + '小时' + (dur % 60 > 0 ? dur % 60 + '分钟' : '')
            : dur + '分钟';
        return players + ' · ' + duration;
    }

    // 过滤游戏列表（基于 allGames）
    function filterGames() {
        var filtered = state.allGames;

        if (state.currentCategory !== '全部') {
            filtered = filtered.filter(function(game) {
                return game.category === state.currentCategory ||
                       (state.currentCategory === '入门' && (game.difficulty === 1 || game.difficulty === '入门')) ||
                       (state.currentCategory === '双人' && ((game.min_players || game.minPlayers || 0) <= 2));
            });
        }

        if (state.searchQuery) {
            var query = state.searchQuery.toLowerCase();
            filtered = filtered.filter(function(game) {
                var matchName = game.name && game.name.toLowerCase().indexOf(query) !== -1;
                var tags = game.tags || [];
                var matchTag = tags.some(function(tag) {
                    return tag.toLowerCase().indexOf(query) !== -1;
                });
                return matchName || matchTag;
            });
        }

        state.games = filtered;
    }

    function _toggleFavorite(id) {
        state.favorites[id] = !state.favorites[id];
    }

    // ==================== 从Supabase加载数据 ====================
    async function loadGamesFromDB() {
        console.log('========== [home.js] loadGamesFromDB 开始 ==========');
        console.log('[home] window.getGames 类型:', typeof window.getGames);
        
        try {
            if (typeof window.getGames !== 'function') {
                console.error('[home] window.getGames 不是函数!');
                throw new Error('API 未加载');
            }
            
            console.log('[home] 开始调用 window.getGames({})');
            var games = await window.getGames({});
            console.log('[home] 调用完成，返回类型:', typeof games, '长度:', games ? games.length : 'null');
            
            if (!games || games.length === 0) {
                console.warn('[home] 数据库返回空数组，使用兜底数据');
                throw new Error('数据库返回空');
            }
            
            console.log('[home] 从Supabase获取到 ' + games.length + ' 个游戏');
            state.allGames = games;
            state.isLoading = false;
            state.fromDatabase = true;
            filterGames();
            window.homePageRender();
            console.log('========== [home.js] loadGamesFromDB 成功 ==========');
        } catch (error) {
            console.error('[home] Supabase加载失败:', error);
            console.log('[home] 使用兜底数据（10个游戏）');
            state.allGames = mockGames;
            state.isLoading = false;
            state.fromDatabase = false;
            filterGames();
            window.homePageRender();
            console.log('========== [home.js] loadGamesFromDB 失败(使用兜底) ==========');
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
        var html = '<div class="home-categories"><div class="home-categories-scroll">';
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
        var name = game.name || '未知游戏';
        var diff = game.difficulty || 2;

        return '<div class="home-game-card" onclick="homePage.goDetail(\'' + game.id + '\')">' +
            '<div class="home-game-cover" style="' + coverBg + '">' +
            '<span class="home-game-cover-text">🎲</span>' +
            '<span class="home-game-favorite" onclick="event.stopPropagation();homePage.toggleFavorite(\'' + game.id + '\')">' +
            isFavorite + '</span>' +
            '</div>' +
            '<div class="home-game-content">' +
            '<div class="home-game-name">' + name + '</div>' +
            '<div class="home-game-info">' + formatInfo(game) + '</div>' +
            '<div class="home-game-footer">' +
            '<span class="home-game-difficulty">' + getDifficultyText(diff) + '</span>' +
            '</div></div></div>';
    }

    function renderGameList() {
        if (state.isLoading) {
            return '<div class="home-loading">加载中...</div>';
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
        var sourceNote = state.fromDatabase ? '' : ' <small>(离线数据)</small>';
        return '<div class="home-page">' +
            renderHeader() +
            renderCategories() +
            '<div class="home-content">' +
            '<div style="text-align:center;color:#888;font-size:12px;padding:8px;">' +
            '共 ' + state.games.length + ' 个游戏' + sourceNote +
            '</div>' +
            renderGameList() +
            '</div></div>';
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
                content.innerHTML = '<div style="text-align:center;color:#888;font-size:12px;padding:8px;">共 ' + state.games.length + ' 个游戏</div>' + renderGameList();
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
        // 初始化收藏状态
        state.allGames.forEach(function(game) {
            if (!state.favorites[game.id]) {
                state.favorites[game.id] = false;
            }
        });

        // 如果还没加载过数据，从数据库加载
        if (state.allGames.length === 0 && state.isLoading) {
            loadGamesFromDB();
        }

        // 绑定搜索框事件
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

    // 导出页面对象
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

    // 全局暴露
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
