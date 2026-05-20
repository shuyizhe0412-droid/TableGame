/**
 * 桌游AI教练 - 游戏详情页
 */
App.registerPage('detail', (function() {
    // ==================== 状态管理 ====================
    var state = {
        gameId: '',
        game: null,
        isFavorite: false,
        descExpanded: false,
        isLoading: true,
        error: null
    };

    // ==================== 工具函数 ====================
    // 从 URL hash 解析游戏 ID
    function getGameIdFromHash() {
        var hash = window.location.hash || '';
        var match = hash.match(/[?&]id=([^&]+)/);
        return match ? match[1] : '1';
    }

    // 从 API 加载游戏详情
    function loadGameDetail(id) {
        state.isLoading = true;
        state.error = null;

        getGameDetail(id)
            .then(function(game) {
                state.game = game;
                state.isLoading = false;
                window.detailPageRender();
            })
            .catch(function(error) {
                console.error('加载游戏详情失败:', error);
                state.error = error.message || '加载失败';
                state.isLoading = false;
                state.game = null;
                window.detailPageRender();
            });
    }

    function formatDuration(minutes) {
        if (minutes >= 60) {
            var h = Math.floor(minutes / 60);
            var m = minutes % 60;
            return m > 0 ? h + '小时' + m + '分钟' : h + '小时';
        }
        return minutes + '分钟';
    }

    function getDifficultyText(level) {
        var map = { 1: '入门', 2: '简单', 3: '中等', 4: '困难', 5: '专家' };
        return map[level] || '入门';
    }

    function renderStars(rating) {
        var full = Math.floor(rating);
        var half = rating % 1 >= 0.5;
        var empty = 5 - full - (half ? 1 : 0);
        return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
    }

    function renderRatingBar(value) {
        var percent = (value / 5) * 100;
        return '<div class="detail-rating-bar">' +
            '<div class="detail-rating-fill" style="width:' + percent + '%"></div>' +
            '</div>';
    }

    // ==================== 渲染函数 ====================
    function renderHeader() {
        return '<div class="detail-header">' +
            '<span class="detail-back" onclick="detailPage.goBack()">← 返回</span>' +
            '<span class="detail-share" onclick="detailPage.share()">📤</span>' +
            '</div>';
    }

    function renderCover() {
        var game = state.game;
        return '<div class="detail-cover" style="background: linear-gradient(135deg, #D4893F, #7B9E87);">' +
            '<span class="detail-cover-text">🎲</span>' +
            '</div>';
    }

    function renderInfo() {
        var game = state.game;
        var desc = state.descExpanded ? game.description :
            game.description.substring(0, 60) + (game.description.length > 60 ? '...' : '');
        var expandText = state.descExpanded ? '收起' : '展开';

        return '<div class="detail-info card">' +
            '<h1 class="detail-title">' + game.name + '</h1>' +
            '<p class="detail-subtitle">' + game.nameEn + '</p>' +
            '<div class="detail-stats">' +
            '<div class="detail-stat"><span>👥</span><span>' + game.minPlayers + '-' + game.maxPlayers + '人</span></div>' +
            '<div class="detail-stat"><span>⏱️</span><span>' + formatDuration(game.duration) + '</span></div>' +
            '<div class="detail-stat"><span>📊</span><span>' + getDifficultyText(game.difficulty) + '</span></div>' +
            '</div>' +
            '<div class="detail-tags">' +
            game.tags.map(function(tag) {
                return '<span class="detail-tag">' + tag + '</span>';
            }).join('') +
            '</div>' +
            '<p class="detail-desc">' + desc + '</p>' +
            '<span class="detail-expand" onclick="detailPage.toggleDesc()">' + expandText + '</span>' +
            '</div>';
    }

    function renderAIButtons() {
        return '<div class="detail-ai-buttons">' +
            '<button class="detail-ai-btn" onclick="detailPage.goChat(\'setup\')">' +
            '<span>🎯</span><span>摆盘引导</span></button>' +
            '<button class="detail-ai-btn" onclick="detailPage.goChat(\'rules\')">' +
            '<span>📖</span><span>规则教学</span></button>' +
            '<button class="detail-ai-btn" onclick="detailPage.goChat(\'faq\')">' +
            '<span>🔍</span><span>规则速查</span></button>' +
            '</div>';
    }

    function renderRatings() {
        var game = state.game;
        var ratings = game.ratings;
        var avgRating = ((ratings.difficulty + ratings.fun + ratings.replay + ratings.上手) / 4).toFixed(1);

        return '<div class="detail-ratings card">' +
            '<h3>玩家评分</h3>' +
            '<div class="detail-rating-item"><span>难度</span>' + renderRatingBar(ratings.difficulty) + '<span>' + ratings.difficulty + '</span></div>' +
            '<div class="detail-rating-item"><span>趣味</span>' + renderRatingBar(ratings.fun) + '<span>' + ratings.fun + '</span></div>' +
            '<div class="detail-rating-item"><span>重玩</span>' + renderRatingBar(ratings.replay) + '<span>' + ratings.replay + '</span></div>' +
            '<div class="detail-rating-item"><span>上手</span>' + renderRatingBar(ratings.上手) + '<span>' + ratings.上手 + '</span></div>' +
            '<div class="detail-avg-rating"><span>综合</span><span class="detail-avg-num">' + avgRating + '</span></div>' +
            '</div>';
    }

    function renderComments() {
        var game = state.game;
        var comments = game.comments;

        var commentsHtml = '';
        if (comments.length === 0) {
            commentsHtml = '<p class="detail-no-comment">暂无评论，成为第一个评论者吧！</p>';
        } else {
            commentsHtml = comments.map(function(c) {
                return '<div class="detail-comment card">' +
                    '<div class="detail-comment-header">' +
                    '<div class="detail-comment-avatar">👤</div>' +
                    '<div class="detail-comment-meta">' +
                    '<span class="detail-comment-name">' + c.user + '</span>' +
                    '<span class="detail-comment-stars">' + renderStars(c.rating) + '</span>' +
                    '</div>' +
                    '</div>' +
                    '<div class="detail-comment-tags">' +
                    c.tags.map(function(t) { return '<span class="detail-tag">' + t + '</span>'; }).join('') +
                    '</div>' +
                    '<p class="detail-comment-content">' + c.content + '</p>' +
                    '</div>';
            }).join('');
        }

        return '<div class="detail-comments">' +
            '<h3>精选评论</h3>' +
            commentsHtml +
            '<button class="detail-write-btn" onclick="detailPage.writeComment()">✏️ 写评论</button>' +
            '</div>';
    }

    function renderFavoriteBtn() {
        var icon = state.isFavorite ? '❤️' : '🤍';
        return '<div class="detail-favorite-btn" onclick="detailPage.toggleFavorite()">' + icon + '</div>';
    }

    function render(params) {
        // 如果外部传入了 gameId，优先使用
        if (params && params.id) {
            state.gameId = params.id;
        }

        // 加载状态
        if (state.isLoading) {
            return '<div class="detail-page">' +
                renderHeader() +
                '<div class="detail-loading">加载中...</div>' +
                '</div>';
        }

        // 错误状态
        if (state.error) {
            return '<div class="detail-page">' +
                renderHeader() +
                '<div class="detail-error">加载失败: ' + state.error + '</div>' +
                '</div>';
        }

        // 无游戏数据
        if (!state.game) {
            return '<div class="detail-page">' +
                renderHeader() +
                '<div class="detail-error">游戏不存在</div>' +
                '</div>';
        }

        return '<div class="detail-page">' +
            renderHeader() +
            renderCover() +
            '<div class="detail-content">' +
            renderInfo() +
            renderAIButtons() +
            renderRatings() +
            renderComments() +
            '</div>' +
            renderFavoriteBtn() +
            '</div>';
    }

    // ==================== 事件处理 ====================
    function init(params) {
        // 优先使用 params 中的 id，其次从 URL hash 解析
        if (params && params.id) {
            state.gameId = params.id;
        } else {
            state.gameId = getGameIdFromHash();
        }
        state.isFavorite = false;
        state.descExpanded = false;

        // 从 API 加载游戏详情
        loadGameDetail(state.gameId);
    }

    function goBack() {
        window.location.hash = '/home';
    }

    function share() {
        alert('分享功能即将上线！');
    }

    function toggleDesc() {
        state.descExpanded = !state.descExpanded;
        window.detailPageRender();
    }

    function goChat(mode) {
        window.location.hash = '/chat?gameId=' + state.gameId + '&mode=' + mode;
    }

    function toggleFavorite() {
        state.isFavorite = !state.isFavorite;
        window.detailPageRender();
    }

    function writeComment() {
        alert('评论功能即将上线！');
    }

    // 导出页面对象
    var page = {
        render: render,
        init: init,
        goBack: goBack,
        share: share,
        toggleDesc: toggleDesc,
        goChat: goChat,
        toggleFavorite: toggleFavorite,
        writeComment: writeComment
    };

    // 全局暴露
    window.detailPage = page;
    window.detailPageRender = function() {
        var app = document.getElementById('app');
        if (app) {
            app.innerHTML = page.render();
            window.bindTabBarEvents();
            page.init();
        }
    };

    return page;
})());
