/**
 * 桌游AI教练 - 首页（推荐和发现）
 */
console.log('[home.js] 文件开始加载');

App.registerPage('home', (function() {
    // ==================== 状态管理 ====================
    var state = {
        allGames: [],
        isLoading: true,
        loadError: null,
        currentBanner: 0,
        bannerTimer: null,
        guessGames: []
    };

    // Banner数据
    var banners = [
        { gradient: 'linear-gradient(135deg, #D4893F, #b8732f)', title: '🔥 热门推荐', subtitle: '最受欢迎的桌游都在这里' },
        { gradient: 'linear-gradient(135deg, #4a6fa5, #2d4a7a)', title: '🌱 新手入门', subtitle: '从这几款开始你的桌游之旅' },
        { gradient: 'linear-gradient(135deg, #6b5b95, #4a3f6b)', title: '⚡ 30分钟速开', subtitle: '时间有限也能玩得开心' }
    ];

    // 分类配置
    var categories = [
        { emoji: '🌱', name: '入门推荐', param: '入门' },
        { emoji: '🎉', name: '聚会必玩', param: '聚会' },
        { emoji: '⚔️', name: '两人对决', param: '双人' },
        { emoji: '🧠', name: '策略烧脑', param: '策略' },
        { emoji: '🔍', name: '推理阵营', param: '推理' },
        { emoji: '🎲', name: '美式冒险', param: '美式' },
        { emoji: '⚒️', name: '德式经典', param: '德式' }
    ];

    // 热门游戏列表
    var hotGameNames = ['卡坦岛', '狼人杀', '阿瓦隆', '璀璨宝石', '情书', '行动代号'];

    // ==================== 工具函数 ====================
    function formatInfo(game) {
        var minP = game.min_players || game.minPlayers || 0;
        var maxP = game.max_players || game.maxPlayers || 0;
        var players = minP === maxP ? minP + '人' : minP + '-' + maxP + '人';
        var dur = game.play_time || game.duration || 30;
        return players + ' · ' + dur + '分钟';
    }

    function getDifficultyStars(difficulty) {
        var level = parseInt(difficulty) || 1;
        if (level > 5) level = 5;
        return '⭐'.repeat(level);
    }

    function shuffleArray(arr) {
        var result = arr.slice();
        for (var i = result.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = result[i];
            result[i] = result[j];
            result[j] = temp;
        }
        return result;
    }

    function getGuessGames() {
        var all = state.allGames;
        if (!all || all.length === 0) return [];

        // 尝试从localStorage获取最近浏览的分类
        var recentCats = localStorage.getItem('recentCategories');
        var result = [];

        if (recentCats) {
            var catArr = recentCats.split(',');
            // 每个分类取一款
            catArr.forEach(function(cat) {
                if (result.length >= 6) return;
                var game = all.find(function(g) {
                    return g.category === cat && result.indexOf(g) === -1;
                });
                if (game) result.push(game);
            });
        }

        // 如果不够6个，随机补充
        if (result.length < 6) {
            var remaining = all.filter(function(g) { return result.indexOf(g) === -1; });
            var shuffled = shuffleArray(remaining);
            for (var i = 0; result.length < 6 && i < shuffled.length; i++) {
                result.push(shuffled[i]);
            }
        }

        return result.slice(0, 6);
    }

    function recordCategory(category) {
        if (!category) return;
        var recent = localStorage.getItem('recentCategories') || '';
        var cats = recent ? recent.split(',').filter(function(c) { return c !== category; }) : [];
        cats.unshift(category);
        localStorage.setItem('recentCategories', cats.slice(0, 5).join(','));
    }

    // ==================== 数据加载 ====================
    async function loadGamesFromDB() {
        console.log('[home.js] 开始加载游戏数据');
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
            state.guessGames = getGuessGames();
            window.homePageRender();
        } catch (error) {
            console.error('[home.js] 加载失败:', error);
            state.loadError = error.message;
            state.isLoading = false;
            window.homePageRender();
        }
    }

    // ==================== 渲染函数 ====================
    function renderLoading() {
        return '<div class="home-loading" style="text-align:center;padding:100px 20px;color:#888;">' +
            '<div style="font-size:24px;margin-bottom:10px;">🎲</div>' +
            '<div>加载中...</div></div>';
    }

    function renderError() {
        return '<div class="home-error" style="text-align:center;padding:100px 20px;color:#888;">' +
            '<div style="font-size:48px;margin-bottom:16px;">😢</div>' +
            '<div style="margin-bottom:16px;">加载失败: ' + (state.loadError || '未知错误') + '</div>' +
            '<button onclick="homePage.reload()" style="padding:12px 24px;background:#D4893F;color:#fff;border:none;border-radius:8px;cursor:pointer;">重新加载</button>' +
            '</div>';
    }

    function renderSearchBar() {
        return '<div class="home-search-bar">' +
            '<div class="home-search-input-wrap">' +
            '<span class="home-search-icon">🔍</span>' +
            '<input type="text" class="home-search-input" placeholder="搜索桌游名称..." readonly onclick="homePage.goLibrary()">' +
            '</div>' +
            '<div class="home-user-avatar">👤</div>' +
            '</div>';
    }

    function renderBanner() {
        var bannerLinks = ['/library', '/library?category=入门', '/library?duration=30'];

        var dots = banners.map(function(b, i) {
            return '<span class="banner-dot ' + (i === state.currentBanner ? 'active' : '') + '" data-index="' + i + '"></span>';
        }).join('');

        var slides = banners.map(function(b, i) {
            return '<div class="banner-slide ' + (i === state.currentBanner ? 'active' : '') + '" style="background:' + b.gradient + '" onclick="window.location.hash=\'' + bannerLinks[i] + '\'">' +
                '<div class="banner-title">' + b.title + '</div>' +
                '<div class="banner-subtitle">' + b.subtitle + '</div>' +
                '</div>';
        }).join('');

        return '<div class="home-banner" id="banner-container">' +
            '<div class="banner-track" id="banner-track">' + slides + '</div>' +
            '<div class="banner-dots">' + dots + '</div>' +
            '</div>';
    }

    function renderCategories() {
        var items = categories.map(function(cat) {
            return '<div class="category-item" onclick="homePage.goLibraryWithCategory(\'' + cat.param + '\')">' +
                '<div class="category-icon">' + cat.emoji + '</div>' +
                '<div class="category-name">' + cat.name + '</div>' +
                '</div>';
        }).join('');

        return '<div class="home-categories-section">' +
            '<div class="categories-scroll">' + items + '</div>' +
            '</div>';
    }

    function renderGameCard(game) {
        var gradients = ['linear-gradient(135deg, #D4893F, #b8732f)', 'linear-gradient(135deg, #4a6fa5, #2d4a7a)',
            'linear-gradient(135deg, #6b5b95, #4a3f6b)', 'linear-gradient(135deg, #7B9E87, #5a7e67)'];
        var bg = gradients[Math.abs(game.id ? game.id.charCodeAt(0) : 0) % gradients.length];

        return '<div class="game-card-small" onclick="homePage.goDetail(\'' + game.id + '\', \'' + (game.category || '') + '\')">' +
            '<div class="game-card-cover" style="background:' + bg + '">' +
            '<span class="game-card-emoji">🎲</span>' +
            '</div>' +
            '<div class="game-card-info">' +
            '<div class="game-card-name">' + (game.name || '未知游戏') + '</div>' +
            '<div class="game-card-meta">' + formatInfo(game) + '</div>' +
            '<div class="game-card-stars">' + getDifficultyStars(game.difficulty) + '</div>' +
            '</div>' +
            '</div>';
    }

    function renderSection(title, titleEmoji, linkText, linkHash, onClick) {
        return '<div class="home-section">' +
            '<div class="section-header">' +
            '<div class="section-title">' + titleEmoji + ' ' + title + '</div>' +
            '<div class="section-more" ' + (onClick ? 'onclick="' + onClick + '"' : 'onclick="homePage.goLibraryWithLink(\'' + linkHash + '\')"') + '>' + linkText + ' &gt;</div>' +
            '</div>';
    }

    function renderNewbieSection() {
        var games = state.allGames.filter(function(g) {
            var diff = parseInt(g.difficulty) || 2;
            return diff === 1;
        }).slice(0, 6);

        var cards = games.map(renderGameCard).join('');
        return renderSection('第一次玩桌游？', '🌱', '查看更多', '?category=入门') +
            '<div class="games-scroll">' + cards + '</div></div>';
    }

    function renderHotSection() {
        var result = [];
        hotGameNames.forEach(function(name) {
            var game = state.allGames.find(function(g) { return g.name === name; });
            if (game && result.indexOf(game) === -1) {
                result.push(game);
            }
        });

        // 如果不够6个，补充allGames的前几个
        if (result.length < 6) {
            state.allGames.forEach(function(g) {
                if (result.length >= 6) return;
                if (result.indexOf(g) === -1) {
                    result.push(g);
                }
            });
        }

        var cards = result.slice(0, 6).map(renderGameCard).join('');
        return renderSection('大家都在玩', '🔥', '查看更多', '?category=热门') +
            '<div class="games-scroll">' + cards + '</div></div>';
    }

    function renderGuessSection() {
        var games = state.guessGames.length > 0 ? state.guessGames : getGuessGames();
        var cards = games.map(renderGameCard).join('');
        return renderSection('猜你想玩', '✨', '换一批', '', 'homePage.refreshGuess()') +
            '<div class="games-scroll">' + cards + '</div></div>';
    }

    function renderQuickPlaySection() {
        var games = state.allGames.filter(function(g) {
            var time = g.play_time || g.duration || 60;
            return time <= 30;
        }).slice(0, 6);

        var cards = games.map(renderGameCard).join('');
        return renderSection('30分钟内能玩完', '⚡', '查看更多', '?duration=30') +
            '<div class="games-scroll">' + cards + '</div></div>';
    }

    function render() {
        if (state.isLoading) {
            return '<div class="home-page" style="background:#12122a;min-height:100vh;">' + renderLoading() + '</div>';
        }
        if (state.loadError) {
            return '<div class="home-page" style="background:#12122a;min-height:100vh;">' + renderError() + '</div>';
        }

        return '<div class="home-page" style="background:#12122a;min-height:100vh;">' +
            renderSearchBar() +
            renderBanner() +
            renderCategories() +
            '<div class="home-sections">' +
            renderNewbieSection() +
            renderHotSection() +
            renderGuessSection() +
            renderQuickPlaySection() +
            '</div></div>';
    }

    // ==================== 事件处理 ====================
    function goLibrary() {
        window.location.hash = '/library';
    }

    function goLibraryWithCategory(category) {
        window.location.hash = '/library?category=' + encodeURIComponent(category);
    }

    function goLibraryWithLink(hash) {
        window.location.hash = '/library' + hash;
    }

    function goDetail(id, category) {
        console.log('[home.js] goDetail, ID:', id);
        if (category) {
            recordCategory(category);
        }
        window.location.hash = '/detail?id=' + encodeURIComponent(id);
    }

    function reload() {
        state.isLoading = true;
        state.loadError = null;
        window.homePageRender();
        loadGamesFromDB();
    }

    function refreshGuess() {
        state.guessGames = shuffleArray(getGuessGames());
        window.homePageRender();
    }

    function startBannerAutoPlay() {
        stopBannerAutoPlay();
        state.bannerTimer = setInterval(function() {
            state.currentBanner = (state.currentBanner + 1) % banners.length;
            updateBannerPosition();
        }, 4000);
    }

    function stopBannerAutoPlay() {
        if (state.bannerTimer) {
            clearInterval(state.bannerTimer);
            state.bannerTimer = null;
        }
    }

    function updateBannerPosition() {
        var track = document.getElementById('banner-track');
        var dots = document.querySelectorAll('.banner-dot');
        if (track) {
            track.style.transform = 'translateX(-' + (state.currentBanner * 100 / banners.length) + '%)';
        }
        dots.forEach(function(dot, i) {
            dot.classList.toggle('active', i === state.currentBanner);
        });
    }

    function bindBannerEvents() {
        var container = document.getElementById('banner-container');
        if (!container) return;

        var startX = 0;
        var isDragging = false;

        container.addEventListener('touchstart', function(e) {
            startX = e.touches[0].clientX;
            isDragging = true;
            stopBannerAutoPlay();
        });

        container.addEventListener('touchmove', function(e) {
            if (!isDragging) return;
        });

        container.addEventListener('touchend', function(e) {
            if (!isDragging) return;
            var endX = e.changedTouches[0].clientX;
            var diff = endX - startX;
            if (Math.abs(diff) > 50) {
                if (diff < 0) {
                    state.currentBanner = (state.currentBanner + 1) % banners.length;
                } else {
                    state.currentBanner = (state.currentBanner - 1 + banners.length) % banners.length;
                }
                updateBannerPosition();
            }
            startBannerAutoPlay();
            isDragging = false;
        });

        // 点击圆点切换
        container.addEventListener('click', function(e) {
            if (e.target.classList.contains('banner-dot')) {
                var index = parseInt(e.target.dataset.index);
                if (!isNaN(index)) {
                    state.currentBanner = index;
                    updateBannerPosition();
                    stopBannerAutoPlay();
                    startBannerAutoPlay();
                }
            }
        });

        startBannerAutoPlay();
    }

    // ==================== 初始化 ====================
    function init() {
        // 加载数据
        if (state.allGames.length === 0) {
            loadGamesFromDB();
        }
        // 绑定Banner事件
        setTimeout(bindBannerEvents, 100);
    }

    // 导出页面对象
    var page = {
        render: render,
        init: init,
        goLibrary: goLibrary,
        goLibraryWithCategory: goLibraryWithCategory,
        goLibraryWithLink: goLibraryWithLink,
        goDetail: goDetail,
        reload: reload,
        refreshGuess: refreshGuess
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
