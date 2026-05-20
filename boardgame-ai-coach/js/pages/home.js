/**
 * 桌游AI教练 - 首页
 */
App.registerPage('home', (function() {
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
        games: [],         // 当前显示的游戏
        allGames: [],      // 全部游戏（缓存）
        searchVisible: false,
        favorites: {},
        isLoading: true,
        error: null
    };

    // 搜索防抖定时器
    var searchTimer = null;

    // ==================== 数据加载 ====================
    async function loadGames() {
        state.isLoading = true;
        state.error = null;
        window.homePageRender();
        try {
            console.log('[home] 开始加载游戏列表...');
            if (typeof window.getGames !== 'function') {
                throw new Error('getGames 未加载，请确认 api.js 已引入');
            }
            var games = await window.getGames();
            console.log('[home] 加载完成，共 ' + games.length + ' 款游戏');
            state.allGames = games;
            state.isLoading = false;
            // 初始化收藏
            games.forEach(function(game) {
                if (state.favorites[game.id] === undefined) {
                    state.favorites[game.id] = false;
                }
            });
            window.homePageRender();
        } catch (err) {
            console.error('[home] 加载失败:', err);
            state.error = err.message || '加载失败';
            state.isLoading = false;
            window.homePageRender();
        }
    }

    // ==================== 工具函数 ====================
    function getDifficultyText(level) {
        return difficultyMap[level] || '入门';
    }

    function formatInfo(game) {
        var minP = game.min_players || game.minPlayers || 0;
        var maxP = game.max_players || game.maxPlayers || 0;
        var players = minP === maxP
            ? minP + '人'
            : minP + '-' + maxP + '人';
        var duration = game.duration >= 60
            ? Math.floor(game.duration / 60) + '小时' + (game.duration % 60 > 0 ? game.duration % 60 + '分钟' : '')
            : game.duration + '分钟';
        return players + ' · ' + duration;
    }

    function filterGames() {
        var filtered = state.allGames;

        // 分类筛选
        if (state.currentCategory !== '全部') {
            filtered = filtered.filter(function(game) {
                return game.category === state.currentCategory ||
                       (state.currentCategory === '入门' && game.difficulty === 1) ||
                       (state.currentCategory === '双人' && (game.min_players || game.minPlayers) <= 2);
            });
        }

        // 搜索筛选
        if (state.searchQuery) {
            var query = state.searchQuery.toLowerCase();
            filtered = filtered.filter(function(game) {
                var matchName = (game.name || '').toLowerCase().indexOf(query) !== -1;
                var matchTag = (game.tags || []).some(function(tag) {
                    return (tag || '').toLowerCase().indexOf(query) !== -1;
                });
                return matchName || matchTag;
            });
        }

        state.games = filtered;
    }

    function _toggleFavorite(id) {
        state.favorites[id] = !state.favorites[id];
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
            '<span class="home-game-difficulty">' + getDifficultyText(game.difficulty) + '</span>' +
            '</div>' +
            '</div>' +
            '</div>';
    }

    function renderLoading() {
        return '<div class="home-empty">⏳ 加载中...</div>';
    }

    function renderError() {
        return '<div class="home-empty" style="color:#d32f2f;">' +
            '⚠️ ' + state.error + '<br><br>' +
            '<button onclick="homePage.reload()" style="padding:8px 16px;border:none;background:#D4893F;color:#fff;border-radius:6px;cursor:pointer;">重试</button>' +
            '</div>';
    }

    function renderGameList() {
        if (state.isLoading) {
            return renderLoading();
        }
        if (state.error) {
            return renderError();
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

    function reload() {
        loadGames();
    }

    // ==================== 初始化 ====================
    function init() {
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

        // 首次加载数据
        loadGames();
    }

    // 导出页面对象
    var page = {
        render: render,
        init: init,
        loadGames: loadGames,
        reload: reload,
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