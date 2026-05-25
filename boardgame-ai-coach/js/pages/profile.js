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
        qrLoaded: false,
        showGuideModal: false,
        showAboutModal: false,
        showReviewPage: false,
        reviewGames: [],
        reviewLoaded: false,
        reviewStats: { pending: 0, approved: 0 },
        reviewStatsLoaded: false,
        reviewExpanded: {},
        showMyGames: false,
        myGames: [],
        myGamesLoaded: false,
        showStoreSettings: false,
        storeSettingsName: '',
        storeSettingsLoading: false,
        storeSettingsError: '',
        storeSettingsSuccess: ''
    };

    // ==================== 渲染函数 ====================

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // 1. 标题栏（含登录状态）
    function renderPageTitle() {
        var loggedIn = window.isLoggedIn && window.isLoggedIn();
        var shopInfo = window._shopInfo;
        var titleHtml = '';
        if (loggedIn && shopInfo && shopInfo.name) {
            titleHtml = '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;">' +
                '<div style="display:flex;align-items:center;gap:8px;">' +
                '<span style="font-size:12px;color:#4CAF50;">● 已登录</span>' +
                '<span style="font-size:15px;font-weight:600;">' + shopInfo.name + '</span>' +
                '</div>' +
                '<button onclick="profilePage.logout()" style="padding:6px 14px;background:#E8E0D8;color:#8C8578;border:none;' +
                'border-radius:6px;font-size:12px;cursor:pointer;">退出登录</button>' +
                '</div>';
        } else {
            titleHtml = '<div style="text-align:center;padding:6px 0;">' +
                '<span style="font-size:17px;font-weight:600;color:#2D2A26;">👤 个人中心</span>' +
                '<div style="margin-top:8px;">' +
                '<button onclick="window.location.hash=\'/auth\'" style="padding:8px 24px;background:#C4864B;color:#FFFFFF;' +
                'border:none;border-radius:8px;font-size:14px;cursor:pointer;">🔑 店家登录</button>' +
                '</div>' +
                '</div>';
        }
        return '<div class="profile-page-title" style="background:#FFFFFF;padding:12px 16px;' +
            'border-bottom:1px solid #E5E0D8;font-size:17px;color:#2D2A26;line-height:1.4;">' +
            titleHtml +
            '</div>';
    }

    // 2. 二维码管理（仅登录店家显示）
    function renderQRCodeSection() {
        var loggedIn = window.isLoggedIn && window.isLoggedIn();
        var shopInfo = window._shopInfo;
        if (!loggedIn || !shopInfo || !shopInfo.name) {
            // 未登录用户：不显示二维码模块
            return '';
        }

        // 店家模式：两个二维码
        return '<div style="margin:12px 16px;">' +
            '<div style="background:#FFFFFF;border-radius:16px;padding:20px;">' +
            '<div style="font-size:15px;font-weight:600;color:#2D2A26;margin-bottom:16px;">📱 二维码管理</div>' +
            // 顾客入口二维码
            '<div style="background:#F8F6F1;border-radius:12px;padding:16px;margin-bottom:12px;">' +
            '<div style="font-size:14px;font-weight:600;color:#2D2A26;margin-bottom:4px;">👥 顾客入口二维码</div>' +
            '<div style="font-size:12px;color:#8C8578;margin-bottom:12px;">贴在桌游盒子上，顾客扫码学习</div>' +
            '<div id="customer-qr-wrap" style="text-align:center;margin-bottom:8px;">' +
            '<div style="width:200px;height:200px;margin:0 auto;background:#E5E0D8;border-radius:8px;' +
            'display:flex;align-items:center;justify-content:center;color:#B5AFA6;font-size:14px;">加载中...</div>' +
            '</div>' +
            '<div style="font-size:11px;color:#8C8578;text-align:center;margin-bottom:10px;">扫码进入AI桌游教学</div>' +
            '<button onclick="profilePage.downloadCustomerQR()" style="width:100%;padding:10px 0;' +
            'background:#C4864B;color:#FFFFFF;border:none;border-radius:8px;font-size:14px;cursor:pointer;">💾 保存二维码</button>' +
            '</div>' +
            // 店家管理入口二维码
            '<div style="background:#F8F6F1;border-radius:12px;padding:16px;">' +
            '<div style="font-size:14px;font-weight:600;color:#2D2A26;margin-bottom:4px;">🔧 店家管理入口</div>' +
            '<div style="font-size:12px;color:#8C8578;margin-bottom:12px;">自己查看数据用，请勿公开</div>' +
            '<div id="admin-qr-wrap" style="text-align:center;margin-bottom:8px;">' +
            '<div style="width:200px;height:200px;margin:0 auto;background:#E5E0D8;border-radius:8px;' +
            'display:flex;align-items:center;justify-content:center;color:#B5AFA6;font-size:14px;">加载中...</div>' +
            '</div>' +
            '<div style="font-size:11px;color:#8C8578;text-align:center;margin-bottom:10px;">扫码进入管理页面</div>' +
            '<button onclick="profilePage.downloadAdminQR()" style="width:100%;padding:10px 0;' +
            'background:#C4864B;color:#FFFFFF;border:none;border-radius:8px;font-size:14px;cursor:pointer;">💾 保存二维码</button>' +
            '</div>' +
            '</div>' +
            '</div>';
    }

    // 店家门店模式的二维码信息卡下载
    function makeShopCardCanvas(title, subtitle, urlText) {
        var dpr = window.devicePixelRatio || 1;
        if (QRUtils.isRestrictedBrowser() && dpr > 2) dpr = 2;
        var W = QRUtils.CARD_W;
        var H = QRUtils.CARD_H;
        var canvas = document.createElement('canvas');
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';
        var ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);

        // 白色背景圆角
        ctx.fillStyle = '#FFFFFF';
        roundRectCanvas(ctx, 0, 0, W, H, 16);
        ctx.fill();
        ctx.strokeStyle = '#E5E0D8';
        ctx.lineWidth = 1;
        roundRectCanvas(ctx, 0.5, 0.5, W - 1, H - 1, 16);
        ctx.stroke();

        // 标题
        ctx.fillStyle = '#2D2A26';
        ctx.font = 'bold 16px "PingFang SC","Microsoft YaHei",sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(title, W / 2, 40);

        // 副标题
        ctx.fillStyle = '#8C8578';
        ctx.font = '12px "PingFang SC","Microsoft YaHei",sans-serif';
        ctx.fillText(subtitle, W / 2, 62);

        // URL
        ctx.fillStyle = '#B5AFA6';
        ctx.font = '11px "PingFang SC","Microsoft YaHei",sans-serif';
        ctx.fillText(urlText, W / 2, H - 20);

        return canvas;
    }

    function roundRectCanvas(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    // 3. 扫码统计卡片
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
        var html = '<div style="margin:0 16px;">' +
            '<div style="background:#FFFFFF;border-radius:16px;overflow:hidden;">';

        // 已登录店家模式：显示管理功能
        var loggedIn = window.isLoggedIn && window.isLoggedIn();
        if (loggedIn && window._shopInfo) {
            html += renderFeatureItem('⚙️', '店铺设置', 'profilePage.showStoreSettings()');
            html += renderFeatureItem('📱', '批量二维码', 'profilePage.showBatchQR()');
            html += renderFeatureItem('🎮', '我的桌游', 'profilePage.showReviewPage()');
            html += renderFeatureItem('🔧', '进入管理后台', "window.open('https://boardgame-hub.onrender.com','_blank')");
        }

        html += renderFeatureItem('📖', '使用指南', 'profilePage.showGuide()') +
            renderFeatureItem('ℹ️', '关于我们', 'profilePage.showAbout()') +
            '</div>' +
            '</div>';
        return html;
    }

    // 4. 账号操作
    function renderDevTools() {
        var loggedIn = window.isLoggedIn && window.isLoggedIn();
        if (loggedIn) {
            var shopInfo = window._shopInfo;
            return '<div style="margin:12px 16px;">' +
                '<div style="background:#FFFFFF;border-radius:16px;padding:16px 20px;">' +
                '<div style="font-size:14px;font-weight:600;color:#2D2A26;margin-bottom:12px;">🔧 账号管理</div>' +
                '<button onclick="profilePage.logout()" style="width:100%;padding:10px 0;' +
                'background:#F0EDE6;border:1px solid #E5E0D8;border-radius:8px;' +
                'font-size:14px;color:#D32F2F;cursor:pointer;">退出登录（' + (shopInfo ? shopInfo.name : '') + '）</button>' +
                '</div>' +
                '</div>';
        }
        // 未登录也显示一个入口
        return '<div style="margin:12px 16px;">' +
            '<div style="background:#FFFFFF;border-radius:16px;padding:16px 20px;">' +
            '<div style="font-size:14px;font-weight:600;color:#2D2A26;margin-bottom:12px;">🔧 账号管理</div>' +
            '<button onclick="window.location.hash=\'/auth\'" style="width:100%;padding:10px 0;' +
            'background:#C4864B;color:#FFFFFF;border:none;border-radius:8px;' +
            'font-size:14px;cursor:pointer;">🔑 店家登录</button>' +
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

    // ==================== 规则审核页面渲染 ====================

    function renderReviewHeader() {
        return '<div style="background:#FFFFFF;display:flex;align-items:center;padding:12px 16px;' +
            'border-bottom:1px solid #E5E0D8;">' +
            '<span onclick="profilePage.hideReviewPage()" style="font-size:18px;color:#C4864B;' +
            'cursor:pointer;margin-right:12px;">←</span>' +
            '<span style="font-size:17px;font-weight:600;color:#2D2A26;">🎮 我的桌游</span>' +
            '</div>';
    }

    function renderReviewStats() {
        var s = state.reviewStats;
        return '<div style="margin:12px 16px;">' +
            '<div style="background:#FFFFFF;border-radius:16px;padding:20px;">' +
            '<div style="font-size:15px;font-weight:600;color:#2D2A26;margin-bottom:16px;">📊 桌游统计</div>' +
            '<div style="display:flex;justify-content:space-around;text-align:center;">' +
            '<div>' +
            '<div id="review-pending-count" style="font-size:28px;font-weight:700;color:#E67E22;">' + s.pending + '</div>' +
            '<div style="font-size:12px;color:#8C8578;margin-top:4px;">桌游总数</div>' +
            '</div>' +
            '<div>' +
            '<div id="review-approved-count" style="font-size:28px;font-weight:700;color:#4CAF50;">' + s.approved + '</div>' +
            '<div style="font-size:12px;color:#8C8578;margin-top:4px;">已发布</div>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '</div>';
    }

    function renderReviewActions() {
        return '<div style="margin:0 16px 12px;">' +
            '<button onclick="profilePage.refreshMyGames()" style="width:100%;padding:10px 0;' +
            'background:#C4864B;color:#FFFFFF;border:none;border-radius:8px;font-size:14px;' +
            'cursor:pointer;">🔄 刷新列表</button>' +
            '</div>';
    }

    function renderReviewGameCard(game) {
        var isExpanded = state.reviewExpanded[game.id] || false;
        var emoji = game.emoji || '🎲';
        var name = game.name || '未知游戏';
        var tags = (game.tags && Array.isArray(game.tags)) ? game.tags.join(' | ') : '';
        var desc = game.description || '';
        var shortDesc = desc.length > 80 ? desc.substring(0, 80) + '...' : desc;

        var html = '<div id="review-card-' + game.id + '" style="background:#FFFFFF;border-radius:12px;' +
            'padding:16px;margin:0 0 10px 0;">';

        html += '<div style="display:flex;align-items:flex-start;gap:12px;">' +
            '<span style="font-size:28px;flex-shrink:0;">' + emoji + '</span>' +
            '<div style="flex:1;min-width:0;">' +
            '<div style="font-size:18px;font-weight:600;color:#2D2A26;margin-bottom:4px;">' + name + '</div>';
        if (tags) {
            html += '<div style="font-size:12px;color:#C4864B;margin-bottom:6px;">' + tags + '</div>';
        }
        html += '<div style="font-size:14px;color:#8C8578;line-height:1.5;">' + shortDesc + '</div>';

        html += '<div style="margin-top:10px;">' +
            '<span onclick="profilePage.toggleReviewCard(\'' + game.id + '\')" style="font-size:13px;' +
            'color:#C4864B;cursor:pointer;">' + (isExpanded ? '🔼 收起' : '🔽 展开查看规则') + '</span>' +
            '</div>';

        if (isExpanded) {
            html += '<div style="margin-top:12px;background:#F5F3EE;border-radius:8px;padding:12px;' +
                'max-height:300px;overflow-y:auto;">' +
                '<div style="font-size:12px;font-weight:600;color:#2D2A26;margin-bottom:8px;">📜 完整规则内容：</div>' +
                '<div style="font-size:12px;color:#555555;line-height:1.7;white-space:pre-wrap;">' +
                (game.rules || '暂无规则文本') +
                '</div>' +
                '</div>';
        }

        html += '<div style="display:flex;gap:10px;margin-top:12px;">' +
            '<button onclick="profilePage.approveGame(\'' + game.id + '\')" style="flex:1;padding:8px 0;' +
            'background:#4CAF50;color:#FFFFFF;border:none;border-radius:8px;font-size:14px;cursor:pointer;">✏️ 编辑</button>' +
            '<button onclick="profilePage.deleteGameById(\'' + game.id + '\')" style="flex:1;padding:8px 0;' +
            'background:#E8E0D8;color:#D32F2F;border:none;border-radius:8px;font-size:14px;cursor:pointer;">🗑️ 删除</button>' +
            '</div>';

        // 三层嵌套: 内容区(flex:1) > flex容器 > 卡片外层
        html += '</div></div></div>';
        return html;
    }

    function renderReviewGameList() {
        var games = state.reviewGames;
        if (!state.reviewLoaded) {
            return '<div style="margin:0 16px;text-align:center;padding:40px 0;color:#8C8578;">' +
                '<div style="font-size:32px;margin-bottom:12px;">⏳</div>' +
                '<div>加载桌游列表...</div>' +
                '</div>';
        }
        if (games.length === 0) {
            return '<div style="margin:12px 16px;">' +
                '<div style="background:#FFFFFF;border-radius:16px;padding:32px 20px;text-align:center;">' +
                '<div style="font-size:48px;margin-bottom:12px;">📦</div>' +
                '<div style="font-size:16px;font-weight:600;color:#2D2A26;margin-bottom:8px;">还没有添加桌游</div>' +
                '<div style="font-size:13px;color:#8C8578;">去管理后台添加桌游吧</div>' +
                '</div>' +
                '</div>';
        }
        var html = '<div style="margin:0;padding:0;">';
        for (var i = 0; i < games.length; i++) {
            html += renderReviewGameCard(games[i]);
        }
        html += '</div>';
        return html;
    }

    function renderReviewPage() {
        return '<div class="review-page" style="background:#F8F6F1;min-height:100vh;padding-bottom:80px;">' +
            renderReviewHeader() +
            renderReviewStats() +
            renderReviewActions() +
            renderReviewGameList() +
            '</div>';
    }

    // ==================== 店铺设置页面渲染 ====================

    function renderStoreSettingsHeader() {
        return '<div style="background:#FFFFFF;display:flex;align-items:center;padding:12px 16px;' +
            'border-bottom:1px solid #E5E0D8;">' +
            '<span onclick="profilePage.hideStoreSettings()" style="font-size:18px;color:#C4864B;' +
            'cursor:pointer;margin-right:12px;">←</span>' +
            '<span style="font-size:17px;font-weight:600;color:#2D2A26;">⚙️ 店铺设置</span>' +
            '</div>';
    }

    function renderStoreSettingsForm() {
        var shopInfo = window._shopInfo;
        var currentName = state.storeSettingsName || (shopInfo && shopInfo.name) || '';
        var errorHtml = state.storeSettingsError ?
            '<div style="background:#FFF0F0;color:#D32F2F;padding:10px 14px;border-radius:8px;font-size:13px;margin-bottom:16px;">' +
            state.storeSettingsError + '</div>' : '';
        var successHtml = state.storeSettingsSuccess ?
            '<div style="background:#F0FFF0;color:#2E7D32;padding:10px 14px;border-radius:8px;font-size:13px;margin-bottom:16px;">' +
            state.storeSettingsSuccess + '</div>' : '';

        return '<div style="margin:12px 16px;">' +
            '<div style="background:#FFFFFF;border-radius:16px;padding:20px;">' +
            '<div style="font-size:15px;font-weight:600;color:#2D2A26;margin-bottom:16px;">🏪 修改店铺名称</div>' +
            errorHtml +
            successHtml +
            '<div style="margin-bottom:16px;">' +
            '<label style="display:block;font-size:13px;color:#4A4540;margin-bottom:6px;font-weight:500;">店铺名称</label>' +
            '<input type="text" id="store-settings-name" value="' + escapeHtml(currentName) + '" ' +
            'placeholder="请输入店铺名称" maxlength="50" ' +
            'style="width:100%;padding:12px 14px;border:1px solid #E5E0D8;border-radius:10px;font-size:14px;' +
            'color:#2D2A26;background:#F8F6F1;outline:none;box-sizing:border-box;transition:border 0.2s;" ' +
            'onfocus="this.style.borderColor=\'#C4864B\'" onblur="this.style.borderColor=\'#E5E0D8\'">' +
            '<div style="font-size:11px;color:#B5AFA6;margin-top:4px;">顾客扫码时将看到此名称</div>' +
            '</div>' +
            '<button id="store-settings-save-btn" onclick="profilePage.saveStoreName()" ' +
            'style="width:100%;padding:12px 0;background:#C4864B;color:#FFFFFF;border:none;border-radius:10px;' +
            'font-size:15px;font-weight:600;cursor:pointer;transition:background 0.2s;" ' +
            'onmouseenter="this.style.background=\'#B0763B\'" onmouseleave="this.style.background=\'#C4864B\'"' +
            (state.storeSettingsLoading ? 'disabled' : '') + '>' +
            (state.storeSettingsLoading ? '保存中...' : '💾 保存修改') +
            '</button>' +
            '</div>' +
            // 其他信息
            '<div style="background:#FFFFFF;border-radius:16px;padding:20px;margin-top:12px;">' +
            '<div style="font-size:15px;font-weight:600;color:#2D2A26;margin-bottom:12px;">ℹ️ 店铺信息</div>' +
            '<div style="font-size:14px;color:#8C8578;line-height:1.8;">' +
            '<div>店铺ID：<span style="color:#4A4540;">' + (shopInfo ? shopInfo.id : '—') + '</span></div>' +
            '<div>当前名称：<span style="color:#4A4540;">' + (shopInfo ? shopInfo.name : '—') + '</span></div>' +
            '</div>' +
            '</div>' +
            '</div>';
    }

    function renderStoreSettings() {
        return '<div class="store-settings-page" style="background:#F8F6F1;min-height:100vh;padding-bottom:80px;">' +
            renderStoreSettingsHeader() +
            renderStoreSettingsForm() +
            '</div>';
    }

    // ==================== 主渲染 ====================
    function render() {
        // 批量二维码视图
        if (state.showBatchQR) {
            return renderBatchQRPage();
        }

        // 规则审核视图
        if (state.showReviewPage) {
            return renderReviewPage();
        }

        // 店铺设置视图
        if (state.showStoreSettings) {
            return renderStoreSettings();
        }

        var modalHtml = '';
        if (state.showGuideModal) {
            modalHtml = renderModal('📖 使用指南', getGuideContent());
        } else if (state.showAboutModal) {
            modalHtml = renderModal('关于我们', getAboutContent());
        }

        return '<div class="profile-page" style="background:#F8F6F1;min-height:100vh;padding-bottom:80px;">' +
            renderPageTitle() +
            renderQRCodeSection() +
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

    // 二维码生成（仅登录店家模式）
    function generateQRCodes() {
        var loggedIn = window.isLoggedIn && window.isLoggedIn();
        var shopInfo = window._shopInfo;
        // 未登录或shopInfo未就绪：不生成二维码，也不标记qrLoaded
        if (!loggedIn || !shopInfo || !shopInfo.id) return;
        // 已登录且shopInfo就绪：生成二维码并标记已加载
        state.qrLoaded = true;
        generateCustomerQR();
        generateAdminQR();
    }

    async function generateCustomerQR() {
        var container = document.getElementById('customer-qr-wrap');
        if (!container) return;
        var shopInfo = window._shopInfo;
        var url = QRUtils.SITE_URL + '/#/?shop=' + shopInfo.id;
        try {
            var canvas = document.createElement('canvas');
            await QRUtils.drawQRCard(canvas, url, {
                title: '扫码学习桌游规则',
                subtitle: shopInfo.name,
                urlText: 'boardgame-ai.pages.dev'
            });
            canvas.style.width = '200px';
            canvas.style.height = Math.round(200 * QRUtils.CARD_H / QRUtils.CARD_W) + 'px';
            container.innerHTML = '';
            container.appendChild(canvas);
        } catch (e) {
            console.error('[profile.js] 生成顾客二维码失败:', e);
            container.innerHTML = '<div style="color:#8C8578;font-size:13px;">二维码生成失败</div>';
        }
    }

    async function generateAdminQR() {
        var container = document.getElementById('admin-qr-wrap');
        if (!container) return;
        var shopInfo = window._shopInfo;
        var url = QRUtils.SITE_URL + '/#/profile?shop=' + shopInfo.id;
        try {
            var canvas = document.createElement('canvas');
            await QRUtils.drawQRCard(canvas, url, {
                title: shopInfo.name + '·管理入口',
                subtitle: '仅限店家使用',
                urlText: 'boardgame-ai.pages.dev'
            });
            canvas.style.width = '200px';
            canvas.style.height = Math.round(200 * QRUtils.CARD_H / QRUtils.CARD_W) + 'px';
            container.innerHTML = '';
            container.appendChild(canvas);
        } catch (e) {
            console.error('[profile.js] 生成管理二维码失败:', e);
            container.innerHTML = '<div style="color:#8C8578;font-size:13px;">二维码生成失败</div>';
        }
    }

    async function generateGeneralQR() {
        var container = document.getElementById('general-qr-wrap');
        if (!container) return;
        try {
            var canvas = document.createElement('canvas');
            await QRUtils.drawQRCard(canvas, QRUtils.SITE_URL, {
                title: '桌游AI教练',
                subtitle: '扫码开始学习桌游规则',
                urlText: 'boardgame-ai.pages.dev'
            });
            canvas.style.width = '200px';
            canvas.style.height = Math.round(200 * QRUtils.CARD_H / QRUtils.CARD_W) + 'px';
            container.innerHTML = '';
            container.appendChild(canvas);
        } catch (e) {
            console.error('[profile.js] 生成通用二维码失败:', e);
            container.innerHTML = '<div style="color:#8C8578;font-size:13px;">二维码生成失败</div>';
        }
    }

    // 下载二维码
    async function downloadCustomerQR() {
        var shopInfo = window._shopInfo;
        if (!shopInfo) return;
        var url = QRUtils.SITE_URL + '/#/?shop=' + shopInfo.id;
        try {
            var canvas = document.createElement('canvas');
            await QRUtils.drawQRCard(canvas, url, {
                title: '扫码学习桌游规则',
                subtitle: shopInfo.name,
                urlText: 'boardgame-ai.pages.dev'
            });
            QRUtils.saveQRImage(canvas, '顾客入口二维码-' + shopInfo.name + '.png');
        } catch (e) {
            console.error('[profile.js] 下载顾客二维码失败:', e);
            alert('保存失败，请重试');
        }
    }

    async function downloadAdminQR() {
        var shopInfo = window._shopInfo;
        if (!shopInfo) return;
        var url = QRUtils.SITE_URL + '/#/profile?shop=' + shopInfo.id;
        try {
            var canvas = document.createElement('canvas');
            await QRUtils.drawQRCard(canvas, url, {
                title: shopInfo.name + '·管理入口',
                subtitle: '仅限店家使用',
                urlText: 'boardgame-ai.pages.dev'
            });
            QRUtils.saveQRImage(canvas, '店家管理入口-' + shopInfo.name + '.png');
        } catch (e) {
            console.error('[profile.js] 下载管理二维码失败:', e);
            alert('保存失败，请重试');
        }
    }

    async function downloadGeneralQR() {
        try {
            var canvas = document.createElement('canvas');
            await QRUtils.drawQRCard(canvas, QRUtils.SITE_URL, {
                title: '桌游AI教练',
                subtitle: '扫码开始学习桌游规则',
                urlText: 'boardgame-ai.pages.dev'
            });
            QRUtils.saveQRImage(canvas, '桌游AI教练-入口二维码.png');
        } catch (e) {
            console.error('[profile.js] 下载通用二维码失败:', e);
            alert('保存失败，请重试');
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

    // ==================== 桌游管理 API 操作 ====================

    async function loadReviewStats() {
        if (state.reviewStatsLoaded) return;
        try {
            if (typeof window.getMyGames === 'function') {
                var games = await window.getMyGames();
                var all = games || [];
                state.reviewStats = { pending: all.length, approved: 0 };
            }
        } catch (e) {
            console.error('[review] 加载统计失败:', e);
        }
        state.reviewStatsLoaded = true;
    }

    async function loadPendingGames() {
        if (state.reviewLoaded) return;
        try {
            if (typeof window.getMyGames === 'function') {
                var games = await window.getMyGames();
                state.reviewGames = games || [];
            }
        } catch (e) {
            console.error('[review] 加载游戏列表失败:', e);
            state.reviewGames = [];
        }
        state.reviewLoaded = true;
    }

    async function approveGame(gameId) {
        try {
            if (typeof window.updateGame === 'function') {
                await window.updateGame(gameId, { reviewed: true });
            }
            state.reviewGames = state.reviewGames.filter(function(g) { return g.id !== gameId; });
            state.reviewStats.pending = Math.max(0, state.reviewStats.pending - 1);
            state.reviewStats.approved = state.reviewStats.approved + 1;
            updateReviewStatsDOM();

            var card = document.getElementById('review-card-' + gameId);
            if (card) {
                card.style.transition = 'opacity 0.3s';
                card.style.opacity = '0';
                setTimeout(function() {
                    if (card.parentNode) card.parentNode.removeChild(card);
                    if (state.reviewGames.length === 0) {
                        state.reviewLoaded = false;
                        state.reviewLoaded = true;
                        window.profilePageRender();
                    }
                }, 300);
            }
        } catch (e) {
            console.error('[review] 操作失败:', e);
            alert('操作失败，请重试');
        }
    }

    async function approveAllGames() {
        if (!confirm('确定要标记所有游戏吗？')) return;
        try {
            for (var i = 0; i < state.reviewGames.length; i++) {
                var game = state.reviewGames[i];
                if (typeof window.updateGame === 'function') {
                    await window.updateGame(game.id, { reviewed: true });
                }
            }
            state.reviewStats.approved = state.reviewStats.approved + state.reviewStats.pending;
            state.reviewStats.pending = 0;
            state.reviewGames = [];
            updateReviewStatsDOM();
            window.profilePageRender();
        } catch (e) {
            console.error('[review] 批量操作失败:', e);
            alert('操作失败，请重试');
        }
    }

    function rejectGame(gameId) {
        state.reviewGames = state.reviewGames.filter(function(g) { return g.id !== gameId; });
        state.reviewStats.pending = Math.max(0, state.reviewStats.pending - 1);
        updateReviewStatsDOM();

        var card = document.getElementById('review-card-' + gameId);
        if (card) {
            card.style.transition = 'opacity 0.3s';
            card.style.opacity = '0';
            setTimeout(function() {
                if (card.parentNode) card.parentNode.removeChild(card);
                if (state.reviewGames.length === 0) {
                    state.reviewLoaded = false;
                    state.reviewLoaded = true;
                    window.profilePageRender();
                }
            }, 300);
        }
        alert('已移除');
    }

    async function deleteGameById(gameId) {
        if (!confirm('确定删除这款桌游吗？此操作不可恢复。')) return;
        try {
            if (typeof window.deleteGame === 'function') {
                await window.deleteGame(gameId);
            }
            state.reviewGames = state.reviewGames.filter(function(g) { return g.id !== gameId; });
            state.reviewStats.pending = Math.max(0, state.reviewStats.pending - 1);
            updateReviewStatsDOM();

            var card = document.getElementById('review-card-' + gameId);
            if (card) {
                card.style.transition = 'opacity 0.3s';
                card.style.opacity = '0';
                setTimeout(function() {
                    if (card.parentNode) card.parentNode.removeChild(card);
                    if (state.reviewGames.length === 0) {
                        state.reviewLoaded = false;
                        state.reviewLoaded = true;
                        window.profilePageRender();
                    }
                }, 300);
            }
        } catch (e) {
            console.error('[review] 删除失败:', e);
            alert('删除失败，请重试');
        }
    }

    function toggleReviewCard(gameId) {
        state.reviewExpanded[gameId] = !state.reviewExpanded[gameId];
        var card = document.getElementById('review-card-' + gameId);
        if (card) {
            var game = null;
            for (var i = 0; i < state.reviewGames.length; i++) {
                if (state.reviewGames[i].id === gameId) { game = state.reviewGames[i]; break; }
            }
            if (game) {
                var parent = card.parentNode;
                var tempDiv = document.createElement('div');
                tempDiv.innerHTML = renderReviewGameCard(game);
                var newCard = tempDiv.firstChild;
                parent.replaceChild(newCard, card);
            }
        }
    }

    function updateReviewStatsDOM() {
        var pendingEl = document.getElementById('review-pending-count');
        var approvedEl = document.getElementById('review-approved-count');
        if (pendingEl) pendingEl.textContent = state.reviewStats.pending;
        if (approvedEl) approvedEl.textContent = state.reviewStats.approved;
    }

    async function showReviewPage() {
        var loggedIn = window.isLoggedIn && window.isLoggedIn();
        if (!loggedIn) {
            window.location.hash = '/auth';
            return;
        }
        state.showReviewPage = true;
        state.reviewLoaded = false;
        state.reviewStatsLoaded = false;
        state.reviewExpanded = {};
        window.profilePageRender();
        await loadReviewStats();
        await loadPendingGames();
        window.profilePageRender();
    }

    function hideReviewPage() {
        state.showReviewPage = false;
        state.reviewLoaded = false;
        state.reviewStatsLoaded = false;
        state.reviewExpanded = {};
        window.profilePageRender();
    }

    async function refreshMyGames() {
        state.reviewLoaded = false;
        state.reviewStatsLoaded = false;
        window.profilePageRender();
        await loadReviewStats();
        await loadPendingGames();
        window.profilePageRender();
    }

    function logout() {
        if (window.authLogout) {
            window.authLogout();
        }
        window.location.hash = '/home';
        location.reload();
    }

    // ==================== 初始化 ====================
    async function init() {
        if (!state.showBatchQR && !state.showReviewPage && !state.showStoreSettings) {
            // 刷新店铺信息（从后端获取真实店名）
            await refreshShopInfo();
            // 加载扫码统计数据
            loadStats();
            // 生成二维码（shopInfo已就绪）
            state.qrLoaded = false;  // 重置标志，确保每次进入都重新生成
            setTimeout(function() { generateQRCodes(); }, 100);
        }
    }

    // ==================== 店铺设置事件处理 ====================

    async function refreshShopInfo() {
        var loggedIn = window.isLoggedIn && window.isLoggedIn();
        if (!loggedIn) return;
        if (!window.authGetMe) return;
        try {
            var me = await window.authGetMe();
            if (me) {
                window._shopInfo = {
                    id: me.id || me.store_id || (window._shopInfo && window._shopInfo.id) || '',
                    name: me.store_name || me.name || (window._shopInfo && window._shopInfo.name) || '我的桌游吧',
                    logo_url: me.logo_url || (window._shopInfo && window._shopInfo.logo_url) || '',
                    theme_color: me.theme_color || (window._shopInfo && window._shopInfo.theme_color) || '#C4864B'
                };
                sessionStorage.setItem('shopId', window._shopInfo.id);
                console.log('[profile.js] 店铺信息已刷新:', window._shopInfo.name);
            }
        } catch (e) {
            console.error('[profile.js] 刷新店铺信息失败:', e);
        }
    }

    function showStoreSettings() {
        state.showStoreSettings = true;
        state.storeSettingsName = (window._shopInfo && window._shopInfo.name) || '';
        state.storeSettingsError = '';
        state.storeSettingsSuccess = '';
        state.storeSettingsLoading = false;
        window.profilePageRender();
    }

    function hideStoreSettings() {
        state.showStoreSettings = false;
        state.storeSettingsError = '';
        state.storeSettingsSuccess = '';
        state.storeSettingsLoading = false;
        window.profilePageRender();
    }

    async function saveStoreName() {
        var newName = (document.getElementById('store-settings-name') || {}).value || '';
        newName = newName.trim();

        if (!newName) {
            state.storeSettingsError = '店铺名称不能为空';
            state.storeSettingsSuccess = '';
            window.profilePageRender();
            return;
        }

        if (newName.length > 50) {
            state.storeSettingsError = '店铺名称不能超过50个字符';
            state.storeSettingsSuccess = '';
            window.profilePageRender();
            return;
        }

        state.storeSettingsLoading = true;
        state.storeSettingsError = '';
        state.storeSettingsSuccess = '';
        // 更新按钮状态
        var btn = document.getElementById('store-settings-save-btn');
        if (btn) { btn.disabled = true; btn.textContent = '保存中...'; }

        try {
            if (window.updateStoreProfile) {
                var result = await window.updateStoreProfile({ store_name: newName });
                console.log('[profile.js] 店铺名称更新成功:', result);
            }

            // 更新本地缓存
            if (window._shopInfo) {
                window._shopInfo.name = newName;
            }
            state.storeSettingsName = newName;
            state.storeSettingsSuccess = '✅ 店铺名称已更新为：' + newName;
            state.storeSettingsLoading = false;
            window.profilePageRender();

            // 3秒后清除成功提示
            setTimeout(function() {
                state.storeSettingsSuccess = '';
                window.profilePageRender();
            }, 3000);
        } catch (e) {
            console.error('[profile.js] 更新店铺名称失败:', e);
            state.storeSettingsError = '更新失败：' + (e.message || '网络错误，请重试');
            state.storeSettingsSuccess = '';
            state.storeSettingsLoading = false;
            window.profilePageRender();
        }
    }

    // 导出页面对象
    var page = {
        render: render,
        init: init,
        logout: logout,
        loadStats: loadStats,
        generateQRCodes: generateQRCodes,
        downloadCustomerQR: downloadCustomerQR,
        downloadAdminQR: downloadAdminQR,
        downloadGeneralQR: downloadGeneralQR,
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
        loadBatchQRFallback: loadBatchQRFallback,
        // 桌游管理
        showReviewPage: showReviewPage,
        hideReviewPage: hideReviewPage,
        refreshMyGames: refreshMyGames,
        approveGame: approveGame,
        approveAllGames: approveAllGames,
        rejectGame: rejectGame,
        deleteGameById: deleteGameById,
        toggleReviewCard: toggleReviewCard,
        loadReviewStats: loadReviewStats,
        loadPendingGames: loadPendingGames,
        // 店铺设置
        showStoreSettings: showStoreSettings,
        hideStoreSettings: hideStoreSettings,
        saveStoreName: saveStoreName,
        refreshShopInfo: refreshShopInfo
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
