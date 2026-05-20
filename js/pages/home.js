/**
 * 桌游AI教练 - 首页
 */
console.log('[home.js] 文件开始加载');

App.registerPage('home', (function() {
    // ==================== 状态管理 ====================
    var state = {
        currentCategory: '全部',
        searchQuery: '',
        games: [],
        filteredGames: [],
        searchVisible: false,
        favorites: {},
        isLoading: true,
        error: null
    };

    // 搜索防抖定时器
    var searchTimer = null;

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

    // ==================== 工具函数 ====================
    // 获取难度文字
    function getDifficultyText(level) {
        return difficultyMap[level] || '入门';
    }

    // 格式化人数时长
    function formatInfo(game) {
        var players = game.minPlayers === game.maxPlayers
            ? game.minPlayers + '人'
            : game.minPlayers + '-' + game.maxPlayers + '人';
        var duration = game.duration >= 60
            ? Math.floor(game.duration / 60) + '小时' + (game.duration % 60 > 0 ? game.duration % 60 + '分钟' : '')
            : game.duration + '分钟';
        return players + ' · ' + duration;
    }

    // 过滤游戏列表
    function filterGames() {
        var filtered = state.games;

        // 分类筛选
        if (state.currentCategory !== '全部') {
            filtered = filtered.filter(function(game) {
                return game.category === state.currentCategory ||
                       (state.currentCategory === '入门' && game.difficulty === 1) ||
                       (state.currentCategory === '双人' && game.minPlayers <= 2);
            });
        }

        // 搜索筛选
        if (state.searchQuery) {
            var query = state.searchQuery.toLowerCase();
            filtered = filtered.filter(function(game) {
                var matchName = game.name && game.name.toLowerCase().indexOf(query) !== -1;
                var matchTag = game.tags && game.tags.some(function(tag) {
                    return tag.toLowerCase().indexOf(query) !== -1;
                });
                return matchName || matchTag;
            });
        }

        state.filteredGames = filtered;
    }

    // 切换收藏状态（内部）
    function _toggleFavorite(id) {
        state.favorites[id] = !state.favorites[id];
    }

    // ==================== 渲染函数 ====================
    // 渲染头部
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

    // 渲染分类标签
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

    // 渲染游戏卡片
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

    // 渲染游戏列表
    function renderGameList() {
        if (state.isLoading) {
            return '<div class="home-empty">加载中...</div>';
        }
        if (state.error) {
            return '<div class="home-empty">加载失败: ' + state.error + '</div>';
        }
        if (state.filteredGames.length === 0) {
            return '<div class="home-empty">没有找到相关游戏</div>';
        }
        var html = '<div class="home-games-grid">';
        state.filteredGames.forEach(function(game) {
            html += renderGameCard(game);
        });
        html += '</div>';
        return html;
    }

    // 从 API 加载游戏列表
    function loadGames() {
        console.log('[home.js] ★ loadGames() 函数被调用!');
        console.log('[DEBUG] getGames 类型:', typeof window.getGames);
        state.isLoading = true;
        state.error = null;

        if (typeof window.getGames !== 'function') {
            console.error('[DEBUG] getGames 不是函数!');
            state.error = 'API 未加载';
            state.isLoading = false;
            window.homePageRender();
            return;
        }

        getGames({ category: state.currentCategory, search: state.searchQuery })
            .then(function(games) {
                state.games = games;
                state.isLoading = false;
                filterGames();
                window.homePageRender();
            })
            .catch(function(error) {
                console.error('加载游戏失败:', error);
                state.error = error.message || '加载失败';
                state.isLoading = false;
                state.games = [];
                state.filteredGames = [];
                window.homePageRender();
            });
    }

    // 主渲染函数
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
    // 打开搜索
    function openSearch() {
        state.searchVisible = true;
        window.homePageRender();
        // 自动聚焦搜索框
        setTimeout(function() {
            var input = document.getElementById('home-search-input');
            if (input) input.focus();
        }, 50);
    }

    // 关闭搜索
    function closeSearch() {
        state.searchVisible = false;
        state.searchQuery = '';
        window.homePageRender();
    }

    // 设置分类
    function setCategory(category) {
        state.currentCategory = category;
        loadGames();
    }

    // 设置搜索关键词
    function setSearchQuery(query) {
        state.searchQuery = query;
        filterGames();
        // 只更新列表，不重新渲染整个页面
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

    // 跳转详情页
    function goDetail(id) {
        window.location.hash = '/detail?id=' + id;
    }

    // 切换收藏
    function toggleFavorite(id) {
        _toggleFavorite(id);
        window.homePageRender();
    }

    // ==================== 初始化 ====================
    function init() {
        console.log('[home.js] ★ init() 函数被调用!');
        // 加载游戏列表
        loadGames();

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

    // 全局暴露，用于 onclick 调用
    window.homePage = page;
    // 提供重新渲染方法
    window.homePageRender = function() {
        var app = document.getElementById('app');
        if (app) {
            app.innerHTML = page.render() + window.getTabBarHtml('home');
            window.bindTabBarEvents();
            page.init();
        }
    };

    return page;
})();

