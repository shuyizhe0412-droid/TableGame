/**
 * 桌游AI教练 - 个人中心页
 */
console.log('[profile.js] 文件开始加载');

App.registerPage('profile', (function() {
    // ==================== 状态管理 ====================
    var state = {
        isLoggedIn: false,
        user: null,
        showBatchQR: false,
        batchQRPage: 0,
        batchQRPerPage: 6,
        allGamesLoaded: false
    };

    // ==================== 渲染函数 ====================
    function renderHeader() {
        return '<div class="profile-header">' +
            '<div class="profile-avatar">' +
            (state.isLoggedIn ? '<img src="' + state.user.avatar + '" alt="avatar">' : '<span>👤</span>') +
            '</div>' +
            '<div class="profile-login-tip">登录后解锁更多功能</div>' +
            '</div>';
    }

    function renderMenuItem(icon, title, badge, onclick) {
        var badgeHtml = badge ? '<span class="menu-badge">' + badge + '</span>' : '';
        var arrowText = onclick ? '›' : '即将上线';
        var clickAttr = onclick ? ' onclick="' + onclick + '"' : '';
        return '<div class="profile-menu-item"' + clickAttr + ' style="' + (onclick ? 'cursor:pointer;' : '') + '">' +
            '<div class="menu-left">' +
            '<span class="menu-icon">' + icon + '</span>' +
            '<span class="menu-title">' + title + '</span>' +
            '</div>' +
            '<div class="menu-right">' +
            badgeHtml +
            '<span class="menu-arrow">' + arrowText + '</span>' +
            '</div>' +
            '</div>';
    }

    function renderMenu() {
        return '<div class="profile-menu">' +
            renderMenuItem('⭐', '我的收藏') +
            renderMenuItem('📜', '浏览记录') +
            renderMenuItem('📦', '批量生成二维码', null, 'profilePage.showBatchQR()') +
            renderMenuItem('⚙️', '设置') +
            '</div>';
    }

    // ==================== 分享二维码区块 ====================
    function renderShareQR() {
        return '<div class="share-qr-section">' +
            '<div class="section-title">📤 分享给朋友</div>' +
            '<div class="section-subtitle">让更多桌游爱好者加入我们</div>' +
            '<div class="share-qr-canvas-wrap" id="share-qr-canvas-wrap">' +
            '<div style="width:200px;height:200px;background:#F0EDE6;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#B5AFA6;font-size:14px;">二维码加载中...</div>' +
            '</div>' +
            '<div class="share-qr-tip">扫码进入桌游AI教练</div>' +
            '<button class="share-qr-btn" onclick="profilePage.downloadSiteQR()">💾 保存二维码图片</button>' +
            '</div>';
    }

    // ==================== 批量二维码入口 ====================
    function renderBatchQREntry() {
        return '<div class="batch-qr-entry" onclick="profilePage.showBatchQR()">' +
            '<div class="batch-qr-entry-left">' +
            '<span class="batch-qr-entry-icon">📦</span>' +
            '<span class="batch-qr-entry-text">批量生成二维码</span>' +
            '</div>' +
            '<span class="batch-qr-entry-arrow">为所有游戏生成分享码 ›</span>' +
            '</div>';
    }

    // ==================== 批量二维码页面 ====================
    function renderBatchQRPage() {
        var games = window.allGames || [];
        if (games.length === 0) {
            return '<div class="batch-qr-page">' +
                renderBatchQRHeader() +
                '<div style="text-align:center;padding:60px 20px;color:#8C8578;">' +
                '<div style="font-size:48px;margin-bottom:16px;">📦</div>' +
                '<div>游戏数据加载中，请稍后重试...</div>' +
                '<button onclick="profilePage.loadAllGames()" style="margin-top:16px;padding:10px 20px;background:#C4864B;color:#fff;border:none;border-radius:8px;cursor:pointer;">重新加载</button>' +
                '</div>' +
                '</div>';
        }

        var gridHtml = QRUtils.renderBatchQRGrid(games, state.batchQRPage, state.batchQRPerPage);

        return '<div class="batch-qr-page">' +
            renderBatchQRHeader() +
            '<div id="batch-qr-progress" style="display:none;text-align:center;padding:16px;color:#C4864B;font-size:14px;font-weight:500;"></div>' +
            gridHtml +
            '</div>';
    }

    function renderBatchQRHeader() {
        return '<div class="batch-qr-header">' +
            '<span class="batch-qr-back" onclick="profilePage.hideBatchQR()">← 返回</span>' +
            '<span class="batch-qr-header-title">批量二维码</span>' +
            '<button class="batch-qr-header-btn" onclick="profilePage.downloadAllQRZip()">下载全部</button>' +
            '</div>';
    }

    // ==================== 主渲染 ====================
    function render() {
        // 批量二维码视图
        if (state.showBatchQR) {
            return renderBatchQRPage();
        }

        return '<div class="profile-page" style="background:#F8F6F1;min-height:100vh;padding-bottom:56px;">' +
            '<div class="profile-container">' +
            renderHeader() +
            renderMenu() +
            renderShareQR() +
            renderBatchQREntry() +
            '</div>' +
            '</div>';
    }

    // ==================== 事件处理 ====================
    function goLogin() {
        alert('登录功能即将上线');
    }

    // ==================== 二维码相关 ====================

    /** 加载总入口二维码到 canvas */
    async function loadSiteQR() {
        var wrap = document.getElementById('share-qr-canvas-wrap');
        if (!wrap) return;

        try {
            var canvas = await QRUtils.generateSiteQRCard();
            canvas.style.width = '200px';
            canvas.style.height = (200 * QRUtils.CARD_H / QRUtils.CARD_W) + 'px';
            wrap.innerHTML = '';
            wrap.appendChild(canvas);
        } catch (e) {
            console.error('生成总入口二维码失败:', e);
            wrap.innerHTML = '<div style="width:200px;height:200px;background:#F0EDE6;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#B5AFA6;font-size:14px;">二维码生成失败</div>';
        }
    }

    /** 下载总入口二维码 */
    async function downloadSiteQR() {
        try {
            var canvas = await QRUtils.generateSiteQRCard();
            QRUtils.downloadCanvas(canvas, '桌游AI教练-入口二维码.png');
        } catch (e) {
            console.error('下载失败:', e);
            alert('下载失败: ' + e.message);
        }
    }

    /** 加载所有游戏数据 */
    async function loadAllGames() {
        if (state.allGamesLoaded && window.allGames && window.allGames.length > 0) {
            return;
        }
        try {
            if (typeof window.getGames === 'function') {
                var games = await window.getGames();
                window.allGames = games || [];
                state.allGamesLoaded = true;
                render();
                // 重新渲染后需要重新渲染批量视图中的二维码
                setTimeout(function() { loadBatchQRImages(); }, 500);
            }
        } catch (e) {
            console.error('加载游戏列表失败:', e);
            if (!window.allGames) {
                window.allGames = [];
            }
        }
    }

    /** 显示批量二维码页面 */
    async function showBatchQR() {
        state.showBatchQR = true;
        state.batchQRPage = 0;
        render();

        // 确保有数据
        await loadAllGames();
        setTimeout(function() { loadBatchQRImages(); }, 600);
    }

    /** 隐藏批量二维码页面 */
    function hideBatchQR() {
        state.showBatchQR = false;
        render();
        // 恢复总入口二维码
        setTimeout(function() { loadSiteQR(); }, 100);
    }

    /** 在批量视图中渲染所有可见的二维码 */
    async function loadBatchQRImages() {
        var games = window.allGames || [];
        var start = state.batchQRPage * state.batchQRPerPage;
        var end = Math.min(start + state.batchQRPerPage, games.length);

        for (var i = start; i < end; i++) {
            var game = games[i];
            var imgContainer = document.getElementById('batch-qr-img-' + i);
            if (!imgContainer) continue;

            // 使用简化二维码（仅QR码，80x80）
            try {
                var tempDiv = document.createElement('div');
                tempDiv.style.position = 'absolute';
                tempDiv.style.left = '-9999px';
                document.body.appendChild(tempDiv);

                var qrCode = new QRCode(tempDiv, {
                    text: QRUtils.getGameUrl(game.id),
                    width: 80,
                    height: 80,
                    colorDark: '#2D2A26',
                    colorLight: '#FFFFFF',
                    correctLevel: QRCode.CorrectLevel.L
                });

                setTimeout(function() {
                    var qrImg = tempDiv.querySelector('img');
                    var qrCanvas = tempDiv.querySelector('canvas');
                    if (qrImg) {
                        imgContainer.innerHTML = '<img src="' + qrImg.src + '" style="width:80px;height:80px;border-radius:4px;">';
                    } else if (qrCanvas) {
                        imgContainer.innerHTML = '';
                        qrCanvas.style.width = '80px';
                        qrCanvas.style.height = '80px';
                        imgContainer.appendChild(qrCanvas.cloneNode(true));
                    }
                    document.body.removeChild(tempDiv);
                }, 200);
            } catch (e) {
                console.error('生成小二维码失败:', game.name, e);
                imgContainer.innerHTML = '<span style="font-size:32px;">🎲</span>';
            }
        }
    }

    /** 上一页 */
    function batchQRPrevPage() {
        if (state.batchQRPage > 0) {
            state.batchQRPage--;
            render();
            setTimeout(function() { loadBatchQRImages(); }, 500);
        }
    }

    /** 下一页 */
    function batchQRNextPage() {
        var games = window.allGames || [];
        var totalPages = Math.ceil(games.length / state.batchQRPerPage);
        if (state.batchQRPage < totalPages - 1) {
            state.batchQRPage++;
            render();
            setTimeout(function() { loadBatchQRImages(); }, 500);
        }
    }

    /** 下载全部ZIP */
    async function downloadAllQRZip() {
        var games = window.allGames || [];
        if (games.length === 0) {
            await loadAllGames();
            games = window.allGames || [];
        }
        if (games.length === 0) {
            alert('暂无游戏数据');
            return;
        }
        await QRUtils.downloadAllQRZip(games);
    }

    // ==================== 初始化 ====================
    function init() {
        // 初始化用户状态
        // 页面渲染后延迟加载总入口二维码
        if (!state.showBatchQR) {
            setTimeout(function() { loadSiteQR(); }, 300);
        }
    }

    // 导出页面对象
    var page = {
        render: render,
        init: init,
        goLogin: goLogin,
        loadSiteQR: loadSiteQR,
        downloadSiteQR: downloadSiteQR,
        showBatchQR: showBatchQR,
        hideBatchQR: hideBatchQR,
        batchQRPrevPage: batchQRPrevPage,
        batchQRNextPage: batchQRNextPage,
        downloadAllQRZip: downloadAllQRZip,
        loadAllGames: loadAllGames
    };

    // 全局暴露
    window.profilePage = page;
    window.profilePageRender = function() {
        var app = document.getElementById('app');
        if (app) {
            app.innerHTML = page.render() + window.getTabBarHtml('profile');
            window.bindTabBarEvents();
            page.init();
        }
    };

    return page;
})());
