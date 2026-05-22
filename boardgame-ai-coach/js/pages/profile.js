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
        allGamesLoaded: false,
        stats: { total: 0, today: 0, week: 0 },
        statsLoaded: false,
        showGuideModal: false,
        showAboutModal: false
    };

    // ==================== 渲染函数 ====================

    // 1. 标题栏
    function renderPageTitle() {
        return '<div class="profile-page-title" style="background:#FFFFFF;text-align:center;padding:14px 16px;' +
            'border-bottom:1px solid #E5E0D8;font-size:17px;font-weight:600;color:#2D2A26;line-height:1.4;">' +
            '👤 个人中心' +
            '</div>';
    }

    // 2. 扫码统计卡片
    function renderStatsCard() {
        var s = state.stats;
        return '<div style="margin:12px 16px;">' +
            '<div style="background:#FFFFFF;border-radius:16px;padding:20px;">' +
            '<div style="font-size:15px;font-weight:600;color:#2D2A26;margin-bottom:16px;">📊 扫码统计</div>' +
            '<div style="display:flex;justify-content:space-around;text-align:center;">' +
            '<div>' +
            '<div id="stat-total" style="font-size:24px;font-weight:700;color:#C4864B;">' + s.total + '</div>' +
            '<div style="font-size:12px;color:#8C8578;margin-top:4px;">总扫码</div>' +
            '</div>' +
            '<div>' +
            '<div id="stat-today" style="font-size:24px;font-weight:700;color:#C4864B;">' + s.today + '</div>' +
            '<div style="font-size:12px;color:#8C8578;margin-top:4px;">今日</div>' +
            '</div>' +
            '<div>' +
            '<div id="stat-week" style="font-size:24px;font-weight:700;color:#C4864B;">' + s.week + '</div>' +
            '<div style="font-size:12px;color:#8C8578;margin-top:4px;">本周</div>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '</div>';
    }

    // 3. 功能列表
    function renderFeatureItem(icon, title, onclick) {
        return '<div style="display:flex;align-items:center;justify-content:space-between;' +
            'padding:0 16px;height:56px;border-bottom:1px solid #E5E0D8;' +
            (onclick ? 'cursor:pointer;' : '') + '"' +
            (onclick ? ' onclick="' + onclick + '"' : '') + '>' +
            '<div style="display:flex;align-items:center;gap:12px;">' +
            '<span style="font-size:20px;">' + icon + '</span>' +
            '<span style="font-size:15px;color:#2D2A26;">' + title + '</span>' +
            '</div>' +
            '<span style="font-size:16px;color:#B5AFA6;">›</span>' +
            '</div>';
    }

    function renderFeatureList() {
        return '<div style="margin:0 16px;">' +
            '<div style="background:#FFFFFF;border-radius:16px;overflow:hidden;">' +
            renderFeatureItem('📱', '批量二维码', 'profilePage.showBatchQR()') +
            renderFeatureItem('📖', '使用指南', 'profilePage.showGuide()') +
            renderFeatureItem('ℹ️', '关于我们', 'profilePage.showAbout()') +
            '</div>' +
            '</div>';
    }

    // 4. 开发者工具
    function renderDevTools() {
        var isShop = !!(window._shopInfo && window._shopInfo.name);
        var btnText = isShop
            ? '退出店家模式（当前：' + window._shopInfo.name + '）'
            : '切换到店家模式';

        return '<div style="margin:12px 16px;">' +
            '<div style="background:#FFFFFF;border-radius:16px;padding:16px 20px;">' +
            '<div style="font-size:14px;font-weight:600;color:#2D2A26;margin-bottom:12px;">🔧 开发者工具</div>' +
            '<button onclick="profilePage.toggleShopMode()" style="width:100%;padding:10px 0;' +
            'background:#F0EDE6;border:1px solid #E5E0D8;border-radius:8px;' +
            'font-size:14px;color:#2D2A26;cursor:pointer;">' + btnText + '</button>' +
            '</div>' +
            '</div>';
    }

    // 5. 版本信息
    function renderVersion() {
        return '<div style="text-align:center;padding:24px 16px;font-size:12px;color:#B5AFA6;line-height:1.8;">' +
            '<div>桌游AI教练 v1.0</div>' +
            '<div>boardgame-ai.pages.dev</div>' +
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

    function getGuideContent() {
        return '1. 在首页浏览推荐桌游\n' +
            '2. 点击任意游戏查看详情\n' +
            '3. 选择AI教学模式：\n' +
            '   • 摆盘引导：教你摆放配件\n' +
            '   • 规则教学：完整教你玩游戏\n' +
            '   • 规则速查：快速查询规则问题\n' +
            '4. 店家可以在详情页生成二维码\n' +
            '5. 顾客扫码即可开始学习';
    }

    function getAboutContent() {
        return '桌游AI教练 v1.0\n' +
            'AI驱动的桌游教学助手\n' +
            '让桌游入门不再难\n' +
            'boardgame-ai.pages.dev';
    }

    // ==================== 批量二维码页面（保留） ====================
    function renderBatchQRPage() {
        var games = window.allGames || [];
        if (games.length === 0) {
            return '<div class="batch-qr-page">' +
                renderBatchQRHeader() +
                '<div style="text-align:center;padding:60px 20px;color:#8C8578;">' +
                '<div style="font-size:48px;margin-bottom:16px;">📦</div>' +
                '<div>游戏数据加载中，请稍后重试...</div>' +
                '<button onclick="profilePage.loadAllGames()" style="margin-top:16px;padding:10px 20px;' +
                'background:#C4864B;color:#fff;border:none;border-radius:8px;cursor:pointer;">重新加载</button>' +
                '</div>' +
                '</div>';
        }

        var gridHtml = QRUtils.renderBatchQRGrid(games, state.batchQRPage, state.batchQRPerPage);

        return '<div class="batch-qr-page">' +
            renderBatchQRHeader() +
            '<div id="batch-qr-progress" style="display:none;text-align:center;padding:16px;' +
            'color:#C4864B;font-size:14px;font-weight:500;"></div>' +
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

        var modalHtml = '';
        if (state.showGuideModal) {
            modalHtml = renderModal('📖 使用指南', getGuideContent());
        } else if (state.showAboutModal) {
            modalHtml = renderModal('关于我们', getAboutContent());
        }

        return '<div class="profile-page" style="background:#F8F6F1;min-height:100vh;padding-bottom:80px;">' +
            renderPageTitle() +
            renderStatsCard() +
            '<div style="height:12px;"></div>' +
            renderFeatureList() +
            '<div style="height:12px;"></div>' +
            renderDevTools() +
            renderVersion() +
            modalHtml +
            '</div>';
    }

    // ==================== 事件处理 ====================

    // 扫码统计
    async function loadStats() {
        if (state.statsLoaded) return;
        try {
            var shopId = window._shopInfo ? window._shopInfo.id : null;
            if (typeof window.getScanStats === 'function') {
                var result = await window.getScanStats(shopId);
                if (result.data) {
                    state.stats = result.data;
                    state.statsLoaded = true;
                    // 更新DOM中的数字
                    var totalEl = document.getElementById('stat-total');
                    var todayEl = document.getElementById('stat-today');
                    var weekEl = document.getElementById('stat-week');
                    if (totalEl) totalEl.textContent = state.stats.total;
                    if (todayEl) todayEl.textContent = state.stats.today;
                    if (weekEl) weekEl.textContent = state.stats.week;
                }
            }
        } catch (e) {
            console.error('[profile.js] 加载扫码统计失败:', e);
        }
    }

    // 店家模式切换
    async function toggleShopMode() {
        if (window._shopInfo) {
            sessionStorage.removeItem('shopId');
            window._shopInfo = null;
            window.location.hash = '/home';
            location.reload();
            return;
        }
        var shopId = 'd9bb4f57-4b4b-48f7-810f-276266404813';
        if (typeof window.getShopInfo === 'function') {
            var result = await window.getShopInfo(shopId);
            if (result.data) {
                sessionStorage.setItem('shopId', shopId);
                window._shopInfo = result.data;
                window.location.hash = '/home';
                location.reload();
            }
        }
    }

    // 弹窗
    function showGuide() {
        state.showGuideModal = true;
        window.profilePageRender();
    }

    function showAbout() {
        state.showAboutModal = true;
        window.profilePageRender();
    }

    function closeModal() {
        state.showGuideModal = false;
        state.showAboutModal = false;
        window.profilePageRender();
    }

    // ==================== 批量二维码功能（保留） ====================

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
                window.profilePageRender();
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
        window.profilePageRender();

        await loadAllGames();
        setTimeout(function() { loadBatchQRImages(); }, 600);
    }

    /** 隐藏批量二维码页面 */
    function hideBatchQR() {
        state.showBatchQR = false;
        window.profilePageRender();
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

            try {
                if (QRUtils.isQRCodeAvailable()) {
                    var tempDiv = document.createElement('div');
                    tempDiv.style.position = 'absolute';
                    tempDiv.style.left = '-9999px';
                    tempDiv.style.top = '-9999px';
                    document.body.appendChild(tempDiv);

                    (function(container, div, url, idx) {
                        try {
                            new QRCode(div, {
                                text: url,
                                width: 80,
                                height: 80,
                                colorDark: '#2D2A26',
                                colorLight: '#FFFFFF',
                                correctLevel: QRCode.CorrectLevel.L
                            });

                            setTimeout(function() {
                                try {
                                    var qrImg = div.querySelector('img');
                                    var qrCanvas = div.querySelector('canvas');
                                    if (qrImg && qrImg.src) {
                                        container.innerHTML = '<img src="' + qrImg.src +
                                            '" style="width:80px;height:80px;border-radius:4px;">';
                                    } else if (qrCanvas) {
                                        var cloned = qrCanvas.cloneNode(true);
                                        cloned.style.width = '80px';
                                        cloned.style.height = '80px';
                                        container.innerHTML = '';
                                        container.appendChild(cloned);
                                    } else {
                                        loadBatchQRFallback(container, url);
                                    }
                                } catch (e) {
                                    loadBatchQRFallback(container, url);
                                }
                                if (div.parentNode) div.parentNode.removeChild(div);
                            }, 300);
                        } catch (e) {
                            if (div.parentNode) div.parentNode.removeChild(div);
                            loadBatchQRFallback(container, url);
                        }
                    })(imgContainer, tempDiv, QRUtils.getGameUrl(game.id), i);
                } else {
                    loadBatchQRFallback(imgContainer, QRUtils.getGameUrl(game.id));
                }
            } catch (e) {
                console.error('生成小二维码失败:', game.name, e);
                imgContainer.innerHTML = '<span style="font-size:32px;">🎲</span>';
            }
        }
    }

    /** 批量二维码在线API兜底 */
    function loadBatchQRFallback(container, url) {
        var onlineUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=80x80&color=2D2A26&bgcolor=FFFFFF&data=' +
            encodeURIComponent(url);
        container.innerHTML = '<img src="' + onlineUrl +
            '" style="width:80px;height:80px;border-radius:4px;">';
    }

    /** 上一页 */
    function batchQRPrevPage() {
        if (state.batchQRPage > 0) {
            state.batchQRPage--;
            window.profilePageRender();
            setTimeout(function() { loadBatchQRImages(); }, 500);
        }
    }

    /** 下一页 */
    function batchQRNextPage() {
        var games = window.allGames || [];
        var totalPages = Math.ceil(games.length / state.batchQRPerPage);
        if (state.batchQRPage < totalPages - 1) {
            state.batchQRPage++;
            window.profilePageRender();
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
        if (!state.showBatchQR) {
            // 加载扫码统计数据
            loadStats();
        }
    }

    // 导出页面对象
    var page = {
        render: render,
        init: init,
        loadStats: loadStats,
        toggleShopMode: toggleShopMode,
        showGuide: showGuide,
        showAbout: showAbout,
        closeModal: closeModal,
        loadAllGames: loadAllGames,
        showBatchQR: showBatchQR,
        hideBatchQR: hideBatchQR,
        batchQRPrevPage: batchQRPrevPage,
        batchQRNextPage: batchQRNextPage,
        downloadAllQRZip: downloadAllQRZip,
        loadBatchQRImages: loadBatchQRImages,
        loadBatchQRFallback: loadBatchQRFallback
    };

    // 全局暴露
    window.profilePage = page;
    window.profilePageRender = function() {
        var app = document.getElementById('app');
        if (app) {
            app.innerHTML = (window.renderShopHeader ? window.renderShopHeader() : '') + page.render() + window.getTabBarHtml('profile');
            window.bindTabBarEvents();
            page.init();
        }
    };

    return page;
})());
