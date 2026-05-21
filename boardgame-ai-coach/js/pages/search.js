/**
 * 桌游AI教练 - 游戏库页（搜索和筛选）
 */
console.log('[search.js] 文件开始加载');

App.registerPage('library', (function() {
    // ==================== 状态管理 ====================
    var state = {
        allGames: [],
        filteredGames: [],
        isLoading: true,
        loadError: null,
        searchQuery: '',
        category: '全部',
        difficulty: '全部',
        playerCount: '全部',
        duration: '全部',
        sortBy: 'default'
    };

    // 筛选配置
    var categoryOptions = ['全部', '入门', '聚会', '推理', '双人', '策略', '美式', '德式'];
    var difficultyOptions = ['全部', { label: '入门', value: 1 }, { label: '简单', value: 2 }, { label: '中等', value: 3 }, { label: '困难', value: 4 }];
    var playerOptions = ['全部', { label: '2人', value: '2' }, { label: '3-4人', value: '3-4' }, { label: '5-6人', value: '5-6' }, { label: '7+人', value: '7+' }];
    var durationOptions = ['全部', { label: '<30min', value: '<30' }, { label: '30-60min', value: '30-60' }, { label: '60-90min', value: '60-90' }, { label: '>90min', value: '>90' }];
    var sortOptions = ['默认', '名称', '难度', '时长'];

    var searchTimer = null;

    // ==================== 数据加载 ====================
    async function loadGamesFromDB() {
        console.log('[library.js] 开始加载游戏数据');
        try {
            if (typeof window.getGames !== 'function') {
                throw new Error('API 未加载');
            }
            var games = await window.getGames({});
            if (!games || games.length === 0) {
                throw new Error('数据库返回空');
            }
            state.allGames = games;
            state.isLoading = false;
            // 解析URL参数
            parseUrlParams();
            // 应用筛选
            applyFilters();
            window.libraryPageRender();
        } catch (error) {
            console.error('[library.js] 加载失败:', error);
            state.loadError = error.message;
            state.isLoading = false;
            window.libraryPageRender();
        }
    }

    // 解析URL参数
    function parseUrlParams() {
        var hash = window.location.hash;
        var params = {};
        var match = hash.match(/\?(.+)$/);
        if (match) {
            match[1].split('&').forEach(function(pair) {
                var parts = pair.split('=');
                params[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1] || '');
            });
        }
        // 预选分类
        if (params.category) {
            var cat = params.category;
            if (categoryOptions.indexOf(cat) !== -1) {
                state.category = cat;
            }
        }
        // 预选时长
        if (params.duration) {
            var dur = params.duration;
            if (dur === '30') {
                state.duration = '30-60';
            } else if (dur === '60') {
                state.duration = '60-90';
            }
        }
    }

    // ==================== 筛选逻辑 ====================
    function applyFilters() {
        var games = state.allGames.slice();

        // 搜索过滤
        if (state.searchQuery) {
            var query = state.searchQuery.toLowerCase();
            games = games.filter(function(game) {
                var matchName = game.name && game.name.toLowerCase().indexOf(query) !== -1;
                var tags = game.tags || [];
                var matchTag = typeof tags === 'string' ? tags.toLowerCase().indexOf(query) !== -1 : false;
                var categories = game.category || '';
                var matchCat = categories.toLowerCase().indexOf(query) !== -1;
                return matchName || matchTag || matchCat;
            });
        }

        // 分类筛选
        if (state.category !== '全部') {
            games = games.filter(function(game) {
                var cat = game.category || '';
                if (state.category === '入门') {
                    return (game.difficulty == 1) || cat === '入门';
                }
                if (state.category === '双人') {
                    var min = game.min_players || game.minPlayers || 0;
                    var max = game.max_players || game.maxPlayers || 99;
                    return min <= 2 && max >= 2;
                }
                return cat === state.category;
            });
        }

        // 难度筛选
        if (state.difficulty !== '全部') {
            games = games.filter(function(game) {
                return game.difficulty == state.difficulty;
            });
        }

        // 人数筛选
        if (state.playerCount !== '全部') {
            games = games.filter(function(game) {
                var min = game.min_players || game.minPlayers || 0;
                var max = game.max_players || game.maxPlayers || 99;
                switch (state.playerCount) {
                    case '2':
                        return min <= 2 && max >= 2;
                    case '3-4':
                        return min <= 3 && max >= 4;
                    case '5-6':
                        return min <= 5 && max >= 5;
                    case '7+':
                        return max >= 7;
                    default:
                        return true;
                }
            });
        }

        // 时长筛选
        if (state.duration !== '全部') {
            games = games.filter(function(game) {
                var dur = game.play_time || game.duration || 0;
                switch (state.duration) {
                    case '<30':
                        return dur < 30;
                    case '30-60':
                        return dur >= 30 && dur <= 60;
                    case '60-90':
                        return dur > 60 && dur <= 90;
                    case '>90':
                        return dur > 90;
                    default:
                        return true;
                }
            });
        }

        // 排序
        if (state.sortBy !== 'default') {
            games.sort(function(a, b) {
                switch (state.sortBy) {
                    case 'name':
                        var nameA = a.name || '';
                        var nameB = b.name || '';
                        return nameA.localeCompare(nameB, 'zh-CN');
                    case 'difficulty':
                        return (parseInt(a.difficulty) || 0) - (parseInt(b.difficulty) || 0);
                    case 'duration':
                        return (a.play_time || a.duration || 0) - (b.play_time || b.duration || 0);
                    default:
                        return 0;
                }
            });
        }

        state.filteredGames = games;
    }

    // ==================== 工具函数 ====================
    function formatInfo(game) {
        var minP = game.min_players || game.minPlayers || 0;
        var maxP = game.max_players || game.maxPlayers || 0;
        var players = minP === maxP ? minP + '人' : minP + '-' + maxP + '人';
        var dur = game.play_time || game.duration || 30;
        return players + ' · ' + dur + '分钟';
    }

    function getDifficultyText(difficulty) {
        var level = parseInt(difficulty) || 1;
        var map = { 1: '入门', 2: '简单', 3: '中等', 4: '困难', 5: '专家' };
        return map[level] || '入门';
    }

    // ==================== 渲染函数 ====================
    function renderLoading() {
        return '<div class="library-loading" style="text-align:center;padding:100px 20px;color:#888;">' +
            '<div style="font-size:48px;margin-bottom:16px;">🎲</div>' +
            '<div>加载中...</div></div>';
    }

    function renderError() {
        return '<div class="library-error" style="text-align:center;padding:100px 20px;color:#888;">' +
            '<div style="font-size:48px;margin-bottom:16px;">😢</div>' +
            '<div style="margin-bottom:16px;">加载失败: ' + (state.loadError || '未知错误') + '</div>' +
            '<button onclick="libraryPage.reload()" style="padding:12px 24px;background:#D4893F;color:#fff;border:none;border-radius:8px;cursor:pointer;">重新加载</button>' +
            '</div>';
    }

    function renderSearchBar() {
        return '<div class="library-search-bar">' +
            '<div class="library-search-wrap">' +
            '<span class="library-search-icon">🔍</span>' +
            '<input type="text" id="library-search-input" class="library-search-input" ' +
            'placeholder="搜索桌游名称..." value="' + state.searchQuery + '">' +
            (state.searchQuery ? '<span class="library-search-clear" onclick="libraryPage.clearSearch()">✕</span>' : '') +
            '</div>' +
            '</div>';
    }

    function renderFilterBar(items, selected, onClick, type) {
        var html = items.map(function(item) {
            var label = typeof item === 'object' ? item.label : item;
            var value = typeof item === 'object' ? item.value : item;
            var isActive = selected === value ? 'active' : '';
            return '<div class="filter-tag ' + isActive + '" onclick="' + onClick + '(\'' + value + '\')">' + label + '</div>';
        }).join('');
        return '<div class="filter-row" id="filter-' + type + '">' + html + '</div>';
    }

    function renderFilters() {
        return '<div class="library-filters">' +
            renderFilterBar(categoryOptions, state.category, 'libraryPage.setCategory', 'category') +
            renderFilterBar(difficultyOptions, state.difficulty, 'libraryPage.setDifficulty', 'difficulty') +
            renderFilterBar(playerOptions, state.playerCount, 'libraryPage.setPlayerCount', 'player') +
            renderFilterBar(durationOptions, state.duration, 'libraryPage.setDuration', 'duration') +
            '</div>';
    }

    function renderSortBar() {
        var items = sortOptions.map(function(option) {
            var isActive = state.sortBy === option || (option === '默认' && state.sortBy === 'default');
            return '<div class="sort-btn ' + (isActive ? 'active' : '') + '" onclick="libraryPage.setSort(\'' + (option === '默认' ? 'default' : option) + '\')">' + option + '</div>';
        }).join('');
        return '<div class="library-sort-bar">' + items + '</div>';
    }

    function renderGameCard(game) {
        var gradients = [
            'linear-gradient(135deg, #D4893F, #b8732f)',
            'linear-gradient(135deg, #4a6fa5, #2d4a7a)',
            'linear-gradient(135deg, #6b5b95, #4a3f6b)',
            'linear-gradient(135deg, #7B9E87, #5a7e67)'
        ];
        var bg = gradients[Math.abs((game.id ? game.id.charCodeAt(0) : 0)) % gradients.length];

        return '<div class="library-game-card" onclick="libraryPage.goDetail(\'' + game.id + '\')">' +
            '<div class="library-game-cover" style="background:' + bg + '">' +
            '<span class="library-game-emoji">🎲</span>' +
            '</div>' +
            '<div class="library-game-info">' +
            '<div class="library-game-name">' + (game.name || '未知游戏') + '</div>' +
            '<div class="library-game-meta">' + formatInfo(game) + '</div>' +
            '<div class="library-game-diff">' + getDifficultyText(game.difficulty) + '</div>' +
            '</div>' +
            '</div>';
    }

    function renderGameList() {
        if (state.filteredGames.length === 0) {
            return '<div class="library-empty" style="text-align:center;padding:60px 20px;color:#666;">' +
                '<div style="font-size:48px;margin-bottom:16px;">🔍</div>' +
                '<div>没有符合条件的游戏</div></div>';
        }

        var cards = state.filteredGames.map(renderGameCard).join('');
        return '<div class="library-games-grid">' + cards + '</div>';
    }

    function renderFooter() {
        return '<div class="library-footer">' +
            '<span>共 ' + state.filteredGames.length + ' 款游戏</span>' +
            '</div>';
    }

    function render() {
        var content = '';
        if (state.isLoading) {
            content = renderLoading();
        } else if (state.loadError) {
            content = renderError();
        } else {
            content = renderSearchBar() + renderFilters() + renderSortBar() + renderGameList() + renderFooter();
        }

        return '<div class="library-page" style="background:#12122a;min-height:100vh;padding-bottom:56px;">' + content + '</div>';
    }

    // ==================== 事件处理 ====================
    function setSearch(query) {
        state.searchQuery = query;
        applyFilters();
        updateGameList();
    }

    function clearSearch() {
        state.searchQuery = '';
        applyFilters();
        var input = document.getElementById('library-search-input');
        if (input) input.value = '';
        updateGameList();
    }

    function setCategory(value) {
        state.category = value;
        applyFilters();
        updateFiltersUI('category', value);
        updateGameList();
    }

    function setDifficulty(value) {
        state.difficulty = value;
        applyFilters();
        updateFiltersUI('difficulty', value);
        updateGameList();
    }

    function setPlayerCount(value) {
        state.playerCount = value;
        applyFilters();
        updateFiltersUI('player', value);
        updateGameList();
    }

    function setDuration(value) {
        state.duration = value;
        applyFilters();
        updateFiltersUI('duration', value);
        updateGameList();
    }

    function setSort(value) {
        state.sortBy = value;
        applyFilters();
        updateSortUI();
        updateGameList();
    }

    function updateFiltersUI(type, selected) {
        var row = document.getElementById('filter-' + type);
        if (row) {
            row.querySelectorAll('.filter-tag').forEach(function(tag) {
                tag.classList.toggle('active', tag.textContent.includes(selected) || tag.getAttribute('onclick').indexOf("'" + selected + "'") !== -1);
            });
        }
    }

    function updateSortUI() {
        document.querySelectorAll('.sort-btn').forEach(function(btn) {
            var isActive = (state.sortBy === 'default' && btn.textContent === '默认') ||
                (state.sortBy === btn.textContent);
            btn.classList.toggle('active', isActive);
        });
    }

    function updateGameList() {
        var container = document.querySelector('.library-games-grid');
        if (container) {
            container.outerHTML = renderGameList();
        }
        var footer = document.querySelector('.library-footer');
        if (footer) {
            footer.innerHTML = '<span>共 ' + state.filteredGames.length + ' 款游戏</span>';
        }
    }

    function goDetail(id) {
        console.log('[library.js] goDetail, ID:', id);
        window.location.hash = '/detail?id=' + encodeURIComponent(id);
    }

    function reload() {
        state.isLoading = true;
        state.loadError = null;
        state.allGames = [];
        state.filteredGames = [];
        window.libraryPageRender();
        loadGamesFromDB();
    }

    function bindSearchEvents() {
        var input = document.getElementById('library-search-input');
        if (input) {
            input.addEventListener('input', function() {
                var value = this.value;
                clearTimeout(searchTimer);
                searchTimer = setTimeout(function() {
                    setSearch(value);
                }, 300);
            });
        }
    }

    // ==================== 初始化 ====================
    function init() {
        if (state.allGames.length === 0) {
            loadGamesFromDB();
        }
        setTimeout(bindSearchEvents, 100);
    }

    // 导出页面对象
    var page = {
        render: render,
        init: init,
        setSearch: setSearch,
        clearSearch: clearSearch,
        setCategory: setCategory,
        setDifficulty: setDifficulty,
        setPlayerCount: setPlayerCount,
        setDuration: setDuration,
        setSort: setSort,
        goDetail: goDetail,
        reload: reload
    };

    // 全局暴露
    window.libraryPage = page;
    window.libraryPageRender = function() {
        var app = document.getElementById('app');
        if (app) {
            app.innerHTML = page.render() + window.getTabBarHtml('library');
            window.bindTabBarEvents();
            page.init();
        }
    };

    return page;
})());
