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
        var apiGames = null;
        var apiError = null;

        try {
            if (typeof window.getGames !== 'function') {
                throw new Error('API 未加载');
            }
            apiGames = await window.getGames({});
            console.log('[library.js] API返回游戏数量:', apiGames ? apiGames.length : 0);
        } catch (error) {
            apiError = error;
            console.warn('[library.js] API加载失败:', error.message);
        }

        // Bug 修复：当API数据不足时，合并内置兜底数据（与 home.js 保持一致）
        var fallback = window._fallbackGames;
        if ((!apiGames || apiGames.length < 6) && fallback && fallback.length > 0) {
            console.log('[library.js] API数据不足(' + (apiGames ? apiGames.length : 0) + '款)，合并内置兜底数据(25款)');
            var mergedMap = {};
            fallback.forEach(function(g) { if (g.name) mergedMap[g.name] = g; });
            if (apiGames && apiGames.length > 0) {
                apiGames.forEach(function(g) {
                    if (g.name) mergedMap[g.name] = g;
                });
            }
            var merged = [];
            var keys = Object.keys(mergedMap);
            for (var i = 0; i < keys.length; i++) {
                merged.push(mergedMap[keys[i]]);
            }
            state.allGames = merged;
            state.isLoading = false;
            state.loadError = null;
        } else if (apiGames && apiGames.length > 0) {
            state.allGames = apiGames;
            state.isLoading = false;
            state.loadError = null;
        } else {
            state.loadError = apiError ? apiError.message : '数据库返回空';
            state.isLoading = false;
        }

        // 解析URL参数
        parseUrlParams();
        // 应用筛选
        applyFilters();
        window.libraryPageRender();
    }

    // 解析URL参数，返回 true 表示应用了新参数
    function parseUrlParams() {
        var hash = window.location.hash;
        var params = {};
        var match = hash.match(/\?(.+)$/);
        var applied = false;
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
                if (state.category !== cat) applied = true;
                state.category = cat;
            }
        }
        // 预选时长
        if (params.duration) {
            var dur = params.duration;
            var targetDur = '';
            if (dur === '30') {
                targetDur = '<30';
            } else if (dur === '60') {
                targetDur = '30-60';
            }
            if (targetDur && state.duration !== targetDur) {
                applied = true;
                state.duration = targetDur;
            }
        }
        return applied;
    }

    // ==================== 筛选逻辑 ====================
    function applyFilters() {
        // 【关键】永远从原始数据重新筛选，不累积
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
            var diffVal = parseInt(state.difficulty) || state.difficulty;
            games = games.filter(function(game) {
                return game.difficulty == diffVal;
            });
        }

        // 人数筛选
        if (state.playerCount !== '全部') {
            games = games.filter(function(game) {
                var min = game.min_players || game.minPlayers || 0;
                var max = game.max_players || game.maxPlayers || 99;
                switch (String(state.playerCount)) {
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
                switch (String(state.duration)) {
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

        // 排序 —— 匹配中文键名
        if (state.sortBy !== 'default') {
            games.sort(function(a, b) {
                switch (state.sortBy) {
                    case '名称':
                        var nameA = a.name || '';
                        var nameB = b.name || '';
                        return nameA.localeCompare(nameB, 'zh-CN');
                    case '难度':
                        return (parseInt(a.difficulty) || 0) - (parseInt(b.difficulty) || 0);
                    case '时长':
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
        return '<div class="library-loading" style="text-align:center;padding:100px 20px;color:#8C8578;">' +
            '<div style="font-size:48px;margin-bottom:16px;">🎲</div>' +
            '<div>加载中...</div></div>';
    }

    function renderError() {
        return '<div class="library-error" style="text-align:center;padding:100px 20px;color:#8C8578;">' +
            '<div style="font-size:48px;margin-bottom:16px;">😢</div>' +
            '<div style="margin-bottom:16px;">加载失败: ' + (state.loadError || '未知错误') + '</div>' +
            '<button onclick="libraryPage.reload()" style="padding:12px 24px;background:#C4864B;color:#fff;border:none;border-radius:8px;cursor:pointer;">重新加载</button>' +
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
            // 统一转字符串比较，避免 '1' === 1 为 false
            var isActive = String(selected) === String(value) ? 'active' : '';
            var dataValue = value === '全部' ? '全部' : value;
            return '<div class="filter-tag ' + isActive + '" data-value="' + dataValue + '" onclick="' + onClick + '(\'' + dataValue + '\')">' + label + '</div>';
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
            'linear-gradient(135deg, #F5D5B0, #E8C08A)',
            'linear-gradient(135deg, #C5D5E8, #A8BED8)',
            'linear-gradient(135deg, #D5C8E8, #BFB0D8)',
            'linear-gradient(135deg, #7B9E87, #5a7e67)'
        ];
        // 防御：确保 game.id 有效，否则用 name 兜底（detail.js 的 getFallbackGame 可匹配 name）
        var cardId = game.id || game.name || 'unknown';
        var bg = gradients[Math.abs((cardId ? cardId.charCodeAt(0) : 0)) % gradients.length];

        return '<div class="library-game-card" onclick="libraryPage.goDetail(\'' + cardId + '\')">' +
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
            return '<div class="library-games-grid" id="game-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:16px;text-align:center;">' +
                '<div style="grid-column:1/3;padding:60px 20px;color:#B5AFA6;">' +
                '<div style="font-size:48px;margin-bottom:16px;">🔍</div>' +
                '<div>没有符合条件的游戏</div></div></div>';
        }

        var cards = state.filteredGames.map(renderGameCard).join('');
        return '<div class="library-games-grid" id="game-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:16px;">' + cards + '</div>';
    }

    function renderFooter() {
        return '<div class="library-footer">' +
            '<span id="game-count">共 ' + state.filteredGames.length + ' 款游戏</span>' +
            '</div>';
    }

    function render() {
        // ===== 调试日志 =====
        console.log('=== 游戏库渲染 ===');
        console.log('allGames数量:', state.allGames ? state.allGames.length : 'null');
        console.log('当前筛选:', JSON.stringify({
            searchQuery: state.searchQuery,
            category: state.category,
            difficulty: state.difficulty,
            playerCount: state.playerCount,
            duration: state.duration
        }));
        console.log('当前排序:', state.sortBy);
        console.log('筛选后数量:', state.filteredGames ? state.filteredGames.length : 'null');
        // ===== 调试日志结束 =====

        var content = '';
        if (state.isLoading) {
            content = renderLoading();
        } else if (state.loadError) {
            content = renderError();
        } else {
            content = renderSearchBar() + renderFilters() + renderSortBar() + renderGameList() + renderFooter();
        }

        return '<div class="library-page" style="background:#F8F6F1;min-height:100vh;padding-bottom:80px;">' + content + '</div>';
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
                var tagValue = tag.getAttribute('data-value');
                // 统一转字符串比较，解决数字与字符串类型不一致问题
                tag.classList.toggle('active', String(tagValue) === String(selected));
            });
        }
    }

    function updateSortUI() {
        document.querySelectorAll('.sort-btn').forEach(function(btn) {
            var curSort = state.sortBy;
            var btnText = btn.textContent;
            var isActive = false;
            if (curSort === 'default' && btnText === '默认') {
                isActive = true;
            } else if (curSort === btnText) {
                isActive = true;
            }
            btn.classList.toggle('active', isActive);
        });
    }

    function updateGameList() {
        // 始终保留 #game-grid 容器，只改内部内容，确保双列 grid 不会丢失
        var grid = document.getElementById('game-grid');
        if (grid) {
            if (state.filteredGames.length === 0) {
                grid.innerHTML = '<div style="grid-column:1/3;padding:60px 20px;color:#B5AFA6;">' +
                    '<div style="font-size:48px;margin-bottom:16px;">🔍</div>' +
                    '<div>没有符合条件的游戏</div></div>';
            } else {
                grid.innerHTML = state.filteredGames.map(renderGameCard).join('');
            }
        }
        // 更新底部统计
        var countEl = document.getElementById('game-count');
        if (countEl) {
            countEl.textContent = '共 ' + state.filteredGames.length + ' 款游戏';
        }
    }

    function goDetail(id) {
        console.log('[library.js] goDetail, ID:', id);
        sessionStorage.setItem('chatFrom', '/detail?id=' + id);
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
        // 【关键】每次进入页面先重置所有筛选为默认值
        state.searchQuery = '';
        state.category = '全部';
        state.difficulty = '全部';
        state.playerCount = '全部';
        state.duration = '全部';
        state.sortBy = 'default';

        // 再解析 URL 参数，有的话覆盖对应筛选
        var hasUrlParams = parseUrlParams();

        if (state.allGames.length === 0) {
            loadGamesFromDB();
        } else {
            // 数据已缓存，直接重新筛选
            applyFilters();
            // 更新 UI（搜索框清空 + 筛选标签 + 排序按钮 + 游戏列表）
            var input = document.getElementById('library-search-input');
            if (input) input.value = '';
            updateFiltersUI('category', state.category);
            updateFiltersUI('difficulty', state.difficulty);
            updateFiltersUI('player', state.playerCount);
            updateFiltersUI('duration', state.duration);
            updateSortUI();
            updateGameList();
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
            app.innerHTML = (window.renderShopHeader ? window.renderShopHeader() : '') + page.render() + window.getTabBarHtml('library');
            window.bindTabBarEvents();
            page.init();
        }
    };

    return page;
})());
