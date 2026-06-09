/**
 * 桌游AI教练 - 玩家个人中心页
 */
console.log('[profile.js] 文件开始加载');

App.registerPage('profile', (function() {
    // ==================== 状态管理 ====================
    var state = {
        showGuideModal: false,
        showAboutModal: false,
        playerGames: []       // 从 localStorage 读取的桌游记录
    };

    // ==================== 渲染函数 ====================

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function loadPlayerGames() {
        try {
            var raw = localStorage.getItem('player_games') || '[]';
            state.playerGames = JSON.parse(raw);
        } catch (e) {
            state.playerGames = [];
        }
    }

    // 1. 标题栏（含登录状态）
    function renderPageTitle() {
        var loggedIn = window.isPlayerLoggedIn && window.isPlayerLoggedIn();
        if (loggedIn) {
            return '<div style="background:#FFFFFF;padding:16px 16px 12px;border-bottom:1px solid #E5E0D8;text-align:center;">' +
                '<div style="font-size:48px;margin-bottom:8px;">👤</div>' +
                '<div style="font-size:18px;font-weight:700;color:#2D2A26;">' + escapeHtml(window._playerInfo ? window._playerInfo.nickname : '玩家') + '</div>' +
                '<div style="font-size:12px;color:#8C8578;margin-top:4px;">' + escapeHtml(window._playerInfo ? window._playerInfo.email : '') + '</div>' +
                '<button onclick="profilePage.playerLogout()" style="margin-top:10px;padding:6px 18px;background:#E8E0D8;color:#8C8578;border:none;' +
                'border-radius:6px;font-size:12px;cursor:pointer;">退出登录</button>' +
                '</div>';
        } else {
            return '<div style="background:#FFFFFF;padding:24px 16px;border-bottom:1px solid #E5E0D8;text-align:center;">' +
                '<div style="font-size:48px;margin-bottom:12px;">👤</div>' +
                '<div style="font-size:17px;font-weight:600;color:#2D2A26;margin-bottom:4px;">个人中心</div>' +
                '<div style="font-size:13px;color:#8C8578;margin-bottom:16px;">登录后解锁收藏、记录等功能</div>' +
                '<button onclick="window.location.hash=\'/auth\'" style="padding:10px 32px;background:#C4864B;color:#FFFFFF;' +
                'border:none;border-radius:20px;font-size:14px;font-weight:500;cursor:pointer;">登录 / 注册</button>' +
                '</div>';
        }
    }

    // 2. 功能列表项
    function renderFeatureItem(icon, title, subtitle, onclick) {
        return '<div style="display:flex;align-items:center;padding:14px 16px;border-bottom:1px solid #F0EDE6;' +
            (onclick ? 'cursor:pointer;' : '') + '"' +
            (onclick ? ' onclick="' + onclick + '"' : '') + '>' +
            '<span style="font-size:22px;margin-right:14px;">' + icon + '</span>' +
            '<div style="flex:1;">' +
            '<div style="font-size:15px;color:#2D2A26;font-weight:500;">' + title + '</div>' +
            (subtitle ? '<div style="font-size:12px;color:#B5AFA6;margin-top:2px;">' + subtitle + '</div>' : '') +
            '</div>' +
            '<span style="font-size:16px;color:#B5AFA6;">›</span>' +
            '</div>';
    }

    function renderFeatureList() {
        var loggedIn = window.isPlayerLoggedIn && window.isPlayerLoggedIn();
        var html = '<div style="margin:12px 16px;">' +
            '<div style="background:#FFFFFF;border-radius:16px;overflow:hidden;">';

        // 桌游记录
        html += renderFeatureItem('📋', '我的桌游记录',
            loggedIn ? '已记录 ' + state.playerGames.length + ' 款桌游' : '登录后可查看',
            loggedIn ? null : null);

        // 收藏
        html += renderFeatureItem('❤️', '我的收藏',
            loggedIn ? '查看收藏的桌游' : '登录后可收藏',
            null);

        // 评价
        html += renderFeatureItem('⭐', '我的评价',
            loggedIn ? '查看我的评价历史' : '登录后可评价',
            null);

        html += '</div></div>';

        // 分享 & 关于
        html += '<div style="margin:12px 16px;">' +
            '<div style="background:#FFFFFF;border-radius:16px;overflow:hidden;">';

        html += renderFeatureItem('📱', '分享给朋友',
            '把桌游AI教练推荐给朋友',
            'profilePage.shareApp()');

        html += renderFeatureItem('ℹ️', '关于 BoardGame Hub',
            '了解我们',
            'profilePage.showAbout()');

        html += '</div></div>';

        return html;
    }

    // 3. 版本信息
    function renderVersion() {
        return '<div style="text-align:center;padding:24px 16px;font-size:12px;color:#B5AFA6;line-height:1.8;">' +
            '<div>BoardGame Hub v1.0</div>' +
            '<div>boardgame-hub-deploy.pages.dev</div>' +
            '</div>';
    }

    // ==================== 弹窗 ====================
    function renderModal(title, content) {
        return '<div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);' +
            'z-index:9999;display:flex;align-items:center;justify-content:center;" onclick="profilePage.closeModal()">' +
            '<div style="background:#FFFFFF;border-radius:16px;padding:24px;margin:0 24px;max-width:320px;width:100%;' +
            'box-shadow:0 8px 32px rgba(0,0,0,0.12);" onclick="event.stopPropagation()">' +
            '<div style="font-size:17px;font-weight:600;color:#2D2A26;margin-bottom:16px;">' + title + '</div>' +
            '<div style="font-size:14px;color:#4A4540;line-height:1.8;white-space:pre-line;">' + content + '</div>' +
            '<button onclick="profilePage.closeModal()" style="margin-top:20px;width:100%;padding:12px 0;' +
            'background:#C4864B;color:#FFFFFF;border:none;border-radius:8px;font-size:15px;cursor:pointer;">关闭</button>' +
            '</div>' +
            '</div>';
    }

    function getAboutContent() {
        return 'BoardGame Hub v1.0\n' +
            'AI驱动的桌游教学助手\n' +
            '让桌游入门不再难\n\n' +
            '扫码进入店铺，学习桌游规则\n' +
            '收藏你喜爱的桌游，记录每次游戏体验\n\n' +
            'boardgame-hub-deploy.pages.dev';
    }

    // ==================== 主渲染 ====================
    function render() {
        var modalHtml = '';
        if (state.showAboutModal) {
            modalHtml = renderModal('关于 BoardGame Hub', getAboutContent());
        }

        return '<div class="profile-page" style="background:#F8F6F1;min-height:100vh;padding-bottom:80px;">' +
            renderPageTitle() +
            '<div style="height:4px;"></div>' +
            renderFeatureList() +
            renderVersion() +
            modalHtml +
            '</div>';
    }

    // ==================== 事件处理 ====================

    function showAbout() {
        state.showAboutModal = true;
        window.profilePageRender();
    }

    function closeModal() {
        state.showAboutModal = false;
        window.profilePageRender();
    }

    function playerLogout() {
        if (window.playerLogout) {
            window.playerLogout();
        }
        // 重置首页加载状态
        if (window.homeState) {
            window.homeState._loading = false;
            window.homeState.allGames = [];
        }
        window.location.hash = '/home';
        location.reload();
    }

    function shareApp() {
        var url = 'https://boardgame-hub-deploy.pages.dev';
        if (navigator.share) {
            navigator.share({
                title: 'BoardGame Hub - 桌游AI教练',
                text: '扫码学习桌游规则，让桌游入门不再难！',
                url: url
            }).catch(function() {});
        } else {
            // Fallback: copy link
            if (navigator.clipboard) {
                navigator.clipboard.writeText(url).then(function() {
                    alert('链接已复制到剪贴板：' + url);
                }).catch(function() {
                    alert('分享链接：' + url);
                });
            } else {
                alert('分享链接：' + url);
            }
        }
    }

    // ==================== 初始化 ====================
    async function init() {
        loadPlayerGames();

        // 如果已登录但 _playerInfo 未加载，尝试从 token 读取
        var loggedIn = window.isPlayerLoggedIn && window.isPlayerLoggedIn();
        if (loggedIn && !window._playerInfo) {
            // 从 localStorage 读取缓存的玩家信息
            try {
                var cached = localStorage.getItem('player_info');
                if (cached) {
                    window._playerInfo = JSON.parse(cached);
                }
            } catch (e) {
                window._playerInfo = null;
            }
        }
    }

    // 导出页面对象
    var page = {
        render: render,
        init: init,
        playerLogout: playerLogout,
        showAbout: showAbout,
        closeModal: closeModal,
        shareApp: shareApp
    };

    // 全局暴露
    window.profilePage = page;
    window.profilePageRender = function() {
        if (window._activePage !== 'profile') return;
        var app = document.getElementById('app');
        if (app) {
            app.innerHTML = (window.renderShopHeader ? window.renderShopHeader() : '') + page.render() + window.getTabBarHtml('profile');
            window.bindTabBarEvents();
            page.init();
        }
    };

    return page;
})());
