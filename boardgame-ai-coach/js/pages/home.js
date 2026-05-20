/**
 * 桌游AI教练 - 首页
 */
App.registerPage('home', (function() {
    // ==================== 模拟数据 ====================
    var mockGames = [
        {
            id: '1',
            name: '卡坦岛',
            cover: '',
            minPlayers: 3,
            maxPlayers: 4,
            duration: 90,
            difficulty: 2,
            tags: ['策略', '资源管理'],
            category: '德式'
        },
        {
            id: '2',
            name: '狼人杀',
            cover: '',
            minPlayers: 6,
            maxPlayers: 12,
            duration: 30,
            difficulty: 1,
            tags: ['推理', '社交'],
            category: '聚会'
        },
        {
            id: '3',
            name: '三国杀',
            cover: '',
            minPlayers: 4,
            maxPlayers: 10,
            duration: 40,
            difficulty: 2,
            tags: ['角色', '对抗'],
            category: '聚会'
        },
        {
            id: '4',
            name: '情书',
            cover: '',
            minPlayers: 2,
            maxPlayers: 6,
            duration: 15,
            difficulty: 1,
            tags: ['卡牌', '推理'],
            category: '入门'
        },
        {
            id: '5',
            name: '宝石商人',
            cover: '',
            minPlayers: 2,
            maxPlayers: 4,
            duration: 30,
            difficulty: 1,
            tags: ['收集', '成套'],
            category: '入门'
        },
        {
            id: '6',
            name: '德国心脏病',
            cover: '',
            minPlayers: 3,
            maxPlayers: 6,
            duration: 20,
            difficulty: 1,
            tags: ['反应', '欢乐'],
            category: '聚会'
        },
        {
            id: '7',
            name: '行动代号',
            cover: '',
            minPlayers: 4,
            maxPlayers: 8,
            duration: 15,
            difficulty: 1,
            tags: ['配合', '词汇'],
            category: '聚会'
        },
        {
            id: '8',
            name: '阿瓦隆',
            cover: '',
            minPlayers: 5,
            maxPlayers: 10,
            duration: 30,
            difficulty: 2,
            tags: ['推理', '隐藏身份'],
            category: '推理'
        },
        {
            id: '9',
            name: '璀璨宝石',
            cover: '',
            minPlayers: 2,
            maxPlayers: 4,
            duration: 30,
            difficulty: 1,
            tags: ['收集', '策略'],
            category: '入门'
        },
        {
            id: '10',
            name: '七大奇迹',
            cover: '',
            minPlayers: 3,
            maxPlayers: 7,
            duration: 30,
            difficulty: 2,
            tags: ['文明', '卡牌'],
            category: '策略'
        }
    ];

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
        searchVisible: false,
        favorites: {}
    };

    // 搜索防抖定时器
    var searchTimer = null;

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
        var filtered = mockGames;

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
                var matchName = game.name.toLowerCase().indexOf(query) !== -1;
                var matchTag = game.tags.some(function(tag) {
                    return tag.toLowerCase().indexOf(query) !== -1;
                });
                return matchName || matchTag;
            });
        }

        state.games = filtered;
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
        window.homePageRender();
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
        // 初始化收藏状态
        mockGames.forEach(function(game) {
            if (!state.favorites[game.id]) {
                state.favorites[game.id] = false;
            }
        });

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
})());
